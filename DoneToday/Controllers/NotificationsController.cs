using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using DoneToday.Api.Data;
using DoneToday.Api.Entities;
using DoneToday.Api.Services.Notifications;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace DoneToday.Api.Controllers;

[ApiController, Route("api/notifications"), ValidateCsrf]
public class NotificationsController(AppDbContext db, IOptions<PushOptions> options, IDataProtectionProvider protection,
    IPushTransport transport, TimeProvider clock) : AuthenticatedController
{
    private async Task<User?> Account() => await db.Users.SingleOrDefaultAsync(u => u.Id == CurrentUserId);
    private static bool Eligible(User? user) => user is { EmailConfirmed: true, IsGuest: false };

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var user = await Account();
        if (!Eligible(user)) return StatusCode(403);
        if (!options.Value.Ready) return Ok(new { available = false });
        var preferences = await db.NotificationPreferences.AsNoTracking().SingleOrDefaultAsync(p => p.UserId == CurrentUserId)
            ?? new NotificationPreferences { UserId = CurrentUserId };
        var stamp = DeviceAuthorization.Stamp(user!);
        var devices = await db.NotificationDevices.Where(d => d.UserId == CurrentUserId && d.AuthorizationStampHash == stamp)
            .Select(d => new { d.Id, d.CreatedAt }).ToListAsync();
        return Ok(new { available = true, publicKey = options.Value.PublicKey, timeZoneId = user!.TimeZoneId ?? "UTC",
            preferences = new { preferences.MorningEnabled, preferences.MorningTime, preferences.EveningEnabled, preferences.EveningTime, preferences.Language,
                preferences.WeeklyEnabled, preferences.WeeklyDay, preferences.WeeklyTime, preferences.QuietEnabled, preferences.QuietStart, preferences.QuietEnd, preferences.PausedThrough, preferences.ShowHabitNames }, devices });
    }

    [HttpPost("preferences")]
    public async Task<IActionResult> Save(NotificationsRequest request)
    {
        if (!Eligible(await Account())) return StatusCode(403);
        if (!options.Value.Ready) return StatusCode(503);
        var today = DoneToday.Api.Services.UserDateService.GetDate(clock.GetUtcNow(), (await Account())!.TimeZoneId);
        if ((request.QuietEnabled && request.QuietStart == request.QuietEnd) || request.PausedThrough > today.AddDays(90)) return BadRequest();
        await using var transaction = await db.Database.BeginTransactionAsync(HttpContext.RequestAborted);
        await db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock(71651, {CurrentUserId})");
        var preferences = await db.NotificationPreferences.SingleOrDefaultAsync(p => p.UserId == CurrentUserId);
        if (preferences == null) { preferences = new() { UserId = CurrentUserId }; db.Add(preferences); }
        preferences.MorningEnabled = request.MorningEnabled;
        preferences.MorningTime = request.MorningTime;
        preferences.EveningEnabled = request.EveningEnabled;
        preferences.EveningTime = request.EveningTime;
        preferences.Language = request.Language;
        preferences.WeeklyEnabled = request.WeeklyEnabled; preferences.WeeklyDay = request.WeeklyDay; preferences.WeeklyTime = request.WeeklyTime;
        preferences.QuietEnabled = request.QuietEnabled; preferences.QuietStart = request.QuietStart; preferences.QuietEnd = request.QuietEnd;
        preferences.PausedThrough = request.PausedThrough >= today ? request.PausedThrough : null; preferences.ShowHabitNames = request.ShowHabitNames;
        await db.SaveChangesAsync();
        // A change of settings cancels queued reminders; the next tick re-evaluates eligibility.
        await db.NotificationDeliveries.Where(d => d.Device.UserId == CurrentUserId && !d.Finished)
            .ExecuteUpdateAsync(set => set.SetProperty(d => d.Finished, true));
        await transaction.CommitAsync();
        return NoContent();
    }

    [HttpPost("devices")]
    public async Task<IActionResult> Subscribe(SubscribeRequest request)
    {
        var user = await Account();
        if (!Eligible(user)) return StatusCode(403);
        if (!options.Value.Ready) return StatusCode(503);
        var subscription = new BrowserPushSubscription(request.Endpoint, request.P256dh, request.Auth);
        if (!PushSubscriptionValidation.Valid(subscription)) return BadRequest();
        await using var transaction = await db.Database.BeginTransactionAsync(HttpContext.RequestAborted);
        await db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock(71651, {CurrentUserId})");
        var hash = DeviceAuthorization.Hash(request.Endpoint);
        var stamp = DeviceAuthorization.Stamp(user!);
        await db.NotificationDevices.Where(d => d.UserId == CurrentUserId && d.AuthorizationStampHash != stamp).ExecuteDeleteAsync();
        var device = await db.NotificationDevices.SingleOrDefaultAsync(d => d.EndpointHash == hash);
        var protector = protection.CreateProtector("DoneToday.PushSubscription.v1");
        if (device != null && device.UserId != CurrentUserId)
        {
            // Rebinding a browser requires possession of its subscription encryption secrets.
            BrowserPushSubscription? previous;
            try { previous = JsonSerializer.Deserialize<BrowserPushSubscription>(protector.Unprotect(device.ProtectedSubscription)); }
            catch (System.Security.Cryptography.CryptographicException) { return Conflict(); }
            if (previous?.P256dh != request.P256dh || previous.Auth != request.Auth) return Conflict();
            await db.NotificationDeliveries.Where(d => d.DeviceId == device.Id).ExecuteDeleteAsync();
        }
        if (await db.NotificationDevices.CountAsync(d => d.UserId == CurrentUserId && d.Id != (device == null ? 0 : device.Id)) >= 5)
            return StatusCode(429);
        if (device == null) { device = new() { EndpointHash = hash, CreatedAt = clock.GetUtcNow() }; db.Add(device); }
        device.UserId = CurrentUserId;
        device.AuthorizationStampHash = DeviceAuthorization.Stamp(user!);
        device.ProtectedSubscription = protector.Protect(JsonSerializer.Serialize(subscription));
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        return Ok(new { device.Id });
    }

    [HttpPost("devices/{id:int}/remove")]
    public async Task<IActionResult> Remove(int id)
    {
        if (!Eligible(await Account())) return StatusCode(403);
        return await db.NotificationDevices.Where(d => d.Id == id && d.UserId == CurrentUserId).ExecuteDeleteAsync() == 1 ? NoContent() : NotFound();
    }

    [HttpGet("habits/{id:int}")]
    public async Task<IActionResult> HabitReminder(int id)
    {
        var user = await Account();
        if (!Eligible(user)) return StatusCode(403);
        if (!options.Value.Ready) return Ok(new { available = false });
        if (!await db.Habits.AnyAsync(h => h.Id == id && h.UserId == CurrentUserId && !h.IsArchived)) return NotFound();
        var reminder = await db.HabitReminders.AsNoTracking().SingleOrDefaultAsync(r => r.HabitId == id && r.UserId == CurrentUserId);
        return Ok(new { available = true, enabled = reminder?.Enabled ?? false, time = reminder?.Time ?? new TimeOnly(18, 0),
            timeZoneId = user!.TimeZoneId ?? "UTC", snoozedUntil = reminder?.SnoozedUntil,
            snoozedToday = reminder?.SnoozedDate == DoneToday.Api.Services.UserDateService.GetDate(clock.GetUtcNow(), user.TimeZoneId) });
    }

    [HttpPost("habits/{id:int}")]
    public async Task<IActionResult> SaveHabitReminder(int id, HabitReminderRequest request)
    {
        if (!Eligible(await Account())) return StatusCode(403);
        if (!options.Value.Ready) return StatusCode(503);
        await using var transaction = await db.Database.BeginTransactionAsync(HttpContext.RequestAborted);
        await db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock(71651, {CurrentUserId})");
        if (!await db.Habits.AnyAsync(h => h.Id == id && h.UserId == CurrentUserId && !h.IsArchived)) return NotFound();
        if (request.Enabled && await db.HabitReminders.CountAsync(r => r.UserId == CurrentUserId && r.Enabled && r.HabitId != id && !r.Habit.IsArchived) >= 3)
            return BadRequest(new { code = "reminderQuota" });
        var reminder = await db.HabitReminders.SingleOrDefaultAsync(r => r.HabitId == id);
        if (reminder == null) { reminder = new() { HabitId = id, UserId = CurrentUserId }; db.Add(reminder); }
        reminder.Enabled = request.Enabled; reminder.Time = request.Time;
        reminder.SnoozedUntil = null;
        var preferences = await db.NotificationPreferences.SingleOrDefaultAsync(p => p.UserId == CurrentUserId);
        if (preferences == null) { preferences = new() { UserId = CurrentUserId }; db.Add(preferences); }
        preferences.Language = request.Language;
        await db.SaveChangesAsync();
        await db.NotificationDeliveries.Where(d => d.Device.UserId == CurrentUserId && d.HabitId == id && !d.Finished)
            .ExecuteUpdateAsync(set => set.SetProperty(d => d.Finished, true));
        await transaction.CommitAsync();
        return NoContent();
    }

    [HttpPost("habits/{id:int}/snooze")]
    public async Task<IActionResult> Snooze(int id)
    {
        var user = await Account();
        if (!Eligible(user)) return StatusCode(403);
        if (!options.Value.Ready) return StatusCode(503);
        var now = clock.GetUtcNow(); var date = DoneToday.Api.Services.UserDateService.GetDate(now, user!.TimeZoneId);
        if (DoneToday.Api.Services.UserDateService.GetDate(now.AddMinutes(30), user.TimeZoneId) != date) return BadRequest();
        var habit = await db.Habits.AsNoTracking().Include(h => h.Schedules).Include(h => h.Completions.Where(c => c.Date == date))
            .SingleOrDefaultAsync(h => h.Id == id && h.UserId == CurrentUserId);
        if (habit == null) return NotFound();
        if (!NotificationPolicy.Pending(habit, date)) return BadRequest();
        var changed = await db.HabitReminders.Where(r => r.HabitId == id && r.UserId == CurrentUserId && r.Enabled && (r.SnoozedDate == null || r.SnoozedDate != date))
            .ExecuteUpdateAsync(set => set.SetProperty(r => r.SnoozedDate, date).SetProperty(r => r.SnoozedUntil, now.AddMinutes(30)));
        return changed == 1 ? NoContent() : BadRequest();
    }

    [HttpPost("devices/{id:int}/test"), EnableRateLimiting("authentication")]
    public async Task<IActionResult> Test(int id, TestPushRequest request)
    {
        var user = await Account();
        if (!Eligible(user)) return StatusCode(403);
        if (!options.Value.Ready) return StatusCode(503);
        var device = await db.NotificationDevices.AsNoTracking().SingleOrDefaultAsync(d => d.Id == id && d.UserId == CurrentUserId);
        if (device == null || !DeviceAuthorization.IsCurrent(device, user!)) return NotFound();
        var now = clock.GetUtcNow();
        if (await db.NotificationDevices.Where(d => d.Id == id && (d.LastTestAt == null || d.LastTestAt < now.AddMinutes(-1)))
            .ExecuteUpdateAsync(set => set.SetProperty(d => d.LastTestAt, now)) != 1) return StatusCode(429);
        var result = await transport.SendAsync(device, NotificationText.Create("test", request.Language, 0), "donetoday-test", 60, HttpContext.RequestAborted);
        if (result == PushResult.Expired) await db.NotificationDevices.Where(d => d.Id == id && d.UserId == CurrentUserId).ExecuteDeleteAsync();
        return result == PushResult.Sent ? NoContent() : StatusCode(503);
    }
}

public record NotificationsRequest(bool MorningEnabled, TimeOnly MorningTime, bool EveningEnabled, TimeOnly EveningTime,
    [Required, RegularExpression("^(en|es|de)$")] string Language)
{
    public bool WeeklyEnabled { get; init; }
    [Range(0,6)] public int WeeklyDay { get; init; } = 1;
    public TimeOnly WeeklyTime { get; init; } = new(9,0);
    public bool QuietEnabled { get; init; }
    public TimeOnly QuietStart { get; init; } = new(22,0);
    public TimeOnly QuietEnd { get; init; } = new(8,0);
    public DateOnly? PausedThrough { get; init; }
    public bool ShowHabitNames { get; init; }
}
public record SubscribeRequest([Required, MaxLength(2048)] string Endpoint,
    [Required, MaxLength(100)] string P256dh, [Required, MaxLength(30)] string Auth);
public record TestPushRequest([Required, RegularExpression("^(en|es|de)$")] string Language);
public record HabitReminderRequest(bool Enabled, TimeOnly Time, [Required, RegularExpression("^(en|es|de)$")] string Language);
