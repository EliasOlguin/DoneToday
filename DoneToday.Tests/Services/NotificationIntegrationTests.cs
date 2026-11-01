using System.Net;
using System.Text.Json;
using DoneToday.Api.Data;
using DoneToday.Api.Services.Notifications;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DoneToday.Tests.Services;

public partial class GuestSecurityIntegrationTests
{
    private static object Subscription(string suffix = "device")
    {
        using var key = System.Security.Cryptography.ECDsa.Create(System.Security.Cryptography.ECCurve.NamedCurves.nistP256);
        var point = key.ExportParameters(false).Q;
        return new { endpoint = "https://fcm.googleapis.com/fcm/send/" + suffix,
            p256dh = Microsoft.AspNetCore.WebUtilities.WebEncoders.Base64UrlEncode(new byte[] { 4 }.Concat(point.X!).Concat(point.Y!).ToArray()),
            auth = Microsoft.AspNetCore.WebUtilities.WebEncoders.Base64UrlEncode(System.Security.Cryptography.RandomNumberGenerator.GetBytes(16)) };
    }

    [SecurityPostgresFact]
    public async Task NotificationDevicesRequireAccountOwnershipAndProtectedStorage()
    {
        await using var host = await TestHost.Start();
        await host.Seed("notify-owner@example.test");
        await host.Seed("notify-other@example.test");
        var owner = host.Browser(); var other = host.Browser(); var guest = host.Browser();
        await owner.Post("/api/auth/login", new { email = "notify-owner@example.test", password = Password }, 200);
        using (var http = new HttpClient { BaseAddress = new Uri(host.App.Urls.Single()) })
        {
            using var mutation = new HttpRequestMessage(HttpMethod.Post, "/api/notifications/devices") { Content = System.Net.Http.Json.JsonContent.Create(Subscription("no-csrf")) };
            mutation.Headers.Add("Cookie", owner.Cookie);
            using var response = await http.SendAsync(mutation);
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }
        await other.Post("/api/auth/login", new { email = "notify-other@example.test", password = Password }, 200);
        await guest.Post("/api/auth/guest", new { }, 200);
        await guest.Get("/api/notifications", 403);
        var body = await owner.Post("/api/notifications/devices", Subscription(), 200);
        var id = JsonDocument.Parse(body).RootElement.GetProperty("id").GetInt32();
        await other.Post($"/api/notifications/devices/{id}/remove", new { }, 404);
        await other.Post($"/api/notifications/devices/{id}/test", new { language = "en" }, 404);
        await owner.Post("/api/notifications/devices", new { endpoint = "https://127.0.0.1/push", p256dh = "bad", auth = "bad" }, 400);
        using var scope = host.App.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var device = await db.NotificationDevices.SingleAsync();
        Assert.DoesNotContain("fcm.googleapis.com", device.ProtectedSubscription);
        await owner.Post($"/api/notifications/devices/{id}/test", new { language = "es" }, 204);
        await owner.Post($"/api/notifications/devices/{id}/test", new { language = "es" }, 429);
        await owner.Post("/api/auth/logout", new { }, 204);
        await owner.Post("/api/auth/login", new { email = "notify-owner@example.test", password = Password }, 200);
        await owner.Post($"/api/notifications/devices/{id}/test", new { language = "en" }, 404);
    }

    [SecurityPostgresFact]
    public async Task NotificationQueueDeduplicatesPersistsRetriesAndRechecksCompletion()
    {
        await using var host = await TestHost.Start();
        host.Clock.Now = DateTimeOffset.Parse("2026-11-02T08:02:00Z");
        await host.Seed("notify-queue@example.test");
        var browser = host.Browser();
        await browser.Post("/api/auth/login", new { email = "notify-queue@example.test", password = Password }, 200);
        await browser.Post("/api/profile/time-zone", new { timeZoneId = "Europe/Berlin" }, 200);
        await browser.Post("/api/Habits", new { name = "Read", daysOfWeek = new[] { 0, 1, 2, 3, 4, 5, 6 } }, 201);
        var habitId = (await browser.Get("/api/Habits", 200)).EnumerateArray().Single().GetProperty("id").GetInt32();
        await browser.Post("/api/notifications/devices", Subscription("queue"), 200);
        await browser.Post("/api/notifications/preferences", new { morningEnabled = true, morningTime = "09:00", eveningEnabled = true, eveningTime = "20:00", language = "es" }, 204);
        host.Push.Result = PushResult.Retry;
        async Task Tick() { await using var scope = host.App.Services.CreateAsyncScope(); await scope.ServiceProvider.GetRequiredService<NotificationQueue>().Tick(default); }
        await Tick();
        Assert.Single(host.Push.Messages);
        host.Clock.Now = host.Clock.Now.AddSeconds(31);
        host.Push.Result = PushResult.Sent;
        await Tick(); await Tick();
        Assert.Equal(2, host.Push.Messages.Count);
        using (var scope = host.App.Services.CreateScope())
        {
            var row = await scope.ServiceProvider.GetRequiredService<AppDbContext>().NotificationDeliveries.SingleAsync();
            Assert.True(row.Finished); Assert.Equal(2, row.Attempts);
            // Simulate a restart after three claimed sends without a final response update.
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.NotificationDeliveries.ExecuteUpdateAsync(set => set.SetProperty(d => d.Finished, false)
                .SetProperty(d => d.Attempts, 3).SetProperty(d => d.LockedUntil, host.Clock.Now.AddSeconds(-1))
                .SetProperty(d => d.NextAttemptAt, host.Clock.Now));
        }
        await Tick(); Assert.Equal(2, host.Push.Messages.Count);
        await browser.Post($"/api/Habits/{habitId}/complete", new { }, 204);
        host.Clock.Now = DateTimeOffset.Parse("2026-11-02T19:02:00Z");
        await Tick();
        Assert.Equal(2, host.Push.Messages.Count);
    }

    [SecurityPostgresFact]
    public async Task HabitReminderOwnershipQuotaAndSnoozeAreEnforcedByTheServer()
    {
        await using var host = await TestHost.Start();
        host.Clock.Now = DateTimeOffset.Parse("2026-11-02T17:02:00Z");
        await host.Seed("habit-notify@example.test");
        await host.Seed("habit-other@example.test");
        var browser = host.Browser(); var other = host.Browser();
        await browser.Post("/api/auth/login", new { email = "habit-notify@example.test", password = Password }, 200);
        await other.Post("/api/auth/login", new { email = "habit-other@example.test", password = Password }, 200);
        await browser.Post("/api/profile/time-zone", new { timeZoneId = "Europe/Berlin" }, 200);
        for (var i = 0; i < 4; i++) await browser.Post("/api/Habits", new { name = "Habit " + i, daysOfWeek = new[] { 0,1,2,3,4,5,6 } }, 201);
        var ids = (await browser.Get("/api/Habits", 200)).EnumerateArray().Select(h => h.GetProperty("id").GetInt32()).ToArray();
        await browser.Post("/api/notifications/devices", Subscription("habit-reminders"), 200);
        foreach (var id in ids.Take(3)) await browser.Post($"/api/notifications/habits/{id}", new { enabled = true, time = "18:00", language = "de" }, 204);
        await browser.Post($"/api/notifications/habits/{ids[3]}", new { enabled = true, time = "18:00", language = "de" }, 400);
        await other.Get($"/api/notifications/habits/{ids[0]}", 404);
        await other.Post($"/api/notifications/habits/{ids[0]}", new { enabled = true, time = "18:00", language = "en" }, 404);
        async Task Tick() { await using var scope = host.App.Services.CreateAsyncScope(); await scope.ServiceProvider.GetRequiredService<NotificationQueue>().Tick(default); }
        await Tick(); await Tick();
        Assert.Equal(3, host.Push.Messages.Count);
        await browser.Post($"/api/notifications/habits/{ids[0]}/snooze", new { }, 204);
        await browser.Post($"/api/notifications/habits/{ids[0]}/snooze", new { }, 400);
        host.Clock.Now = host.Clock.Now.AddMinutes(31);
        await Tick();
        Assert.Equal(4, host.Push.Messages.Count);
        await browser.Post($"/api/notifications/habits/{ids[0]}", new { enabled = true, time = "19:00", language = "de" }, 204);
        await browser.Post($"/api/notifications/habits/{ids[0]}/snooze", new { }, 400);
        await browser.Post($"/api/Habits/{ids[0]}/complete", new { }, 204);
        await Tick(); Assert.Equal(4, host.Push.Messages.Count);
    }

    [SecurityPostgresFact]
    public async Task NotificationQuietHoursAndPausesSuppressScheduledDelivery()
    {
        await using var host = await TestHost.Start();
        host.Clock.Now = DateTimeOffset.Parse("2026-11-02T17:02:00Z");
        await host.Seed("quiet-notify@example.test");
        var browser = host.Browser();
        await browser.Post("/api/auth/login", new { email = "quiet-notify@example.test", password = Password }, 200);
        await browser.Post("/api/profile/time-zone", new { timeZoneId = "Europe/Berlin" }, 200);
        await browser.Post("/api/Habits", new { name = "Read", daysOfWeek = new[] { 0,1,2,3,4,5,6 } }, 201);
        var id = (await browser.Get("/api/Habits", 200)).EnumerateArray().Single().GetProperty("id").GetInt32();
        await browser.Post("/api/notifications/devices", Subscription("quiet"), 200);
        await browser.Post($"/api/notifications/habits/{id}", new { enabled = true, time = "18:00", language = "es" }, 204);
        async Task Save(bool quiet, string? pause) => await browser.Post("/api/notifications/preferences", new { morningEnabled = false, morningTime = "09:00", eveningEnabled = false, eveningTime = "20:00", language = "es", quietEnabled = quiet, quietStart = "17:00", quietEnd = "19:00", pausedThrough = pause }, 204);
        async Task Tick() { await using var scope = host.App.Services.CreateAsyncScope(); await scope.ServiceProvider.GetRequiredService<NotificationQueue>().Tick(default); }
        await Save(true, null); await Tick(); Assert.Empty(host.Push.Messages);
        await Save(false, "2026-11-02"); await Tick(); Assert.Empty(host.Push.Messages);
        await Save(false, null); await Tick(); Assert.Single(host.Push.Messages);
    }

    [SecurityPostgresFact]
    public async Task NotificationSqlUpgradeIsIdempotentAndPreservesExistingAccountData()
    {
        await using var host = await TestHost.Start();
        await host.Seed("sql-upgrade@example.test");
        var browser = host.Browser();
        await browser.Post("/api/auth/login", new { email = "sql-upgrade@example.test", password = Password }, 200);
        await browser.Post("/api/Habits", new { name = "Preserved", daysOfWeek = new[] {1} }, 201);
        using var scope = host.App.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var migrator = Microsoft.EntityFrameworkCore.Infrastructure.AccessorExtensions.GetService<Microsoft.EntityFrameworkCore.Migrations.IMigrator>(db);
        await migrator.MigrateAsync("20261014181123_AddHabitGoalsAndProgress");
        var sql = await File.ReadAllTextAsync(Path.Combine(AppContext.BaseDirectory, "notifications-1.4.0.sql"));
        await db.Database.ExecuteSqlRawAsync(sql);
        await db.Database.ExecuteSqlRawAsync(sql);
        Assert.Single(await db.Users.ToListAsync());
        Assert.Equal("Preserved", (await db.Habits.SingleAsync()).Name);
        Assert.Empty(await db.NotificationPreferences.ToListAsync());
        Assert.Empty(await db.NotificationDevices.ToListAsync());
    }

    private sealed class CapturePush : IPushTransport
    {
        public PushResult Result = PushResult.Sent;
        public List<PushMessage> Messages { get; } = [];
        public Task<PushResult> SendAsync(DoneToday.Api.Entities.NotificationDevice device, PushMessage message, string tag, int ttlSeconds, CancellationToken cancellation)
        { Messages.Add(message); return Task.FromResult(Result); }
    }
}
