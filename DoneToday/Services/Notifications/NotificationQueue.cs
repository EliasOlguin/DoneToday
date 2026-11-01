using DoneToday.Api.Data;
using DoneToday.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace DoneToday.Api.Services.Notifications;

public class NotificationQueue(AppDbContext db, TimeProvider clock, IPushTransport transport)
{
    public async Task Tick(CancellationToken cancellation)
    {
        var now = clock.GetUtcNow();
        var cursor = 0;
        while (!cancellation.IsCancellationRequested)
        {
            var preferences = await db.NotificationPreferences.AsNoTracking().Include(p => p.User)
                .Where(p => p.UserId > cursor && p.User.EmailConfirmed && (p.MorningEnabled || p.EveningEnabled || p.WeeklyEnabled || db.HabitReminders.Any(r => r.UserId == p.UserId && r.Enabled)))
                .OrderBy(p => p.UserId).Take(100).ToListAsync(cancellation);
            if (preferences.Count == 0) break;
            cursor = preferences[^1].UserId;
            foreach (var preference in preferences)
            {
                var date = UserDateService.GetDate(now, preference.User.TimeZoneId);
                var habits = await Habits(preference.UserId, date, cancellation);
                var candidates = await Candidates(preference, now, preference.User.TimeZoneId, habits, cancellation);
                if (candidates.Count == 0) continue;
                var devices = await db.NotificationDevices.AsNoTracking().Where(d => d.UserId == preference.UserId).ToListAsync(cancellation);
                foreach (var device in devices.Where(d => DeviceAuthorization.IsCurrent(d, preference.User)))
                    foreach (var candidate in candidates)
                        await db.Database.ExecuteSqlInterpolatedAsync($"""
                            INSERT INTO "NotificationDeliveries" ("DeviceId", "Key", "Kind", "Date", "Count", "HabitId", "ExpiresAt", "NextAttemptAt", "Attempts", "Finished")
                            VALUES ({device.Id}, {candidate.Key}, {candidate.Kind}, {candidate.Date}, {candidate.Count}, {candidate.HabitId}, {candidate.ExpiresAt}, {now}, 0, FALSE)
                            ON CONFLICT ("DeviceId", "Key") DO NOTHING
                            """, cancellation);
            }
        }
        await db.NotificationDeliveries.Where(d => !d.Finished && (d.ExpiresAt <= now || (d.Attempts >= 3 && (d.LockedUntil == null || d.LockedUntil < now))))
            .ExecuteUpdateAsync(set => set.SetProperty(d => d.Finished, true), cancellation);
        var pending = await db.NotificationDeliveries.AsNoTracking().Include(d => d.Device).ThenInclude(d => d.User)
            .Where(d => !d.Finished && d.Attempts < 3 && d.NextAttemptAt <= now && (d.LockedUntil == null || d.LockedUntil < now))
            .OrderBy(d => d.Id).Take(100).ToListAsync(cancellation);
        foreach (var delivery in pending)
        {
            var claimed = await db.NotificationDeliveries.Where(d => d.Id == delivery.Id && !d.Finished && d.Attempts < 3 && d.NextAttemptAt <= now && d.ExpiresAt > now && (d.LockedUntil == null || d.LockedUntil < now))
                .ExecuteUpdateAsync(set => set.SetProperty(d => d.LockedUntil, now.AddMinutes(1)).SetProperty(d => d.Attempts, d => d.Attempts + 1), cancellation);
            if (claimed != 1) continue;
            var currentDevice = await db.NotificationDevices.AsNoTracking().Include(d => d.User).SingleOrDefaultAsync(d => d.Id == delivery.DeviceId, cancellation);
            var preference = await db.NotificationPreferences.AsNoTracking().SingleOrDefaultAsync(p => p.UserId == delivery.Device.UserId, cancellation);
            var habits = await Habits(delivery.Device.UserId, delivery.Date, cancellation);
            var candidate = preference == null ? null : (await Candidates(preference, clock.GetUtcNow(), delivery.Device.User.TimeZoneId, habits, cancellation)).Find(c => c.Key == delivery.Key);
            var result = PushResult.Rejected;
            if (candidate != null && currentDevice != null && currentDevice.UserId == delivery.Device.UserId && DeviceAuthorization.IsCurrent(currentDevice, currentDevice.User))
                result = await transport.SendAsync(delivery.Device, candidate.HabitId is { } habitId
                    ? NotificationText.Habit(preference!.Language, habitId, preference.ShowHabitNames ? habits.First(h => h.Id == habitId).Name : null)
                    : delivery.Kind == "weekly" ? NotificationText.Weekly(preference!.Language, candidate.Count, candidate.Total) : NotificationText.Create(delivery.Kind, preference!.Language, candidate.Count),
                    delivery.Key, (int)(delivery.ExpiresAt - clock.GetUtcNow()).TotalSeconds, cancellation);
            if (result == PushResult.Expired)
                await db.NotificationDevices.Where(d => d.Id == delivery.DeviceId).ExecuteDeleteAsync(cancellation);
            else
                await db.NotificationDeliveries.Where(d => d.Id == delivery.Id).ExecuteUpdateAsync(set =>
                    set.SetProperty(d => d.Finished, result != PushResult.Retry || delivery.Attempts >= 2)
                       .SetProperty(d => d.NextAttemptAt, clock.GetUtcNow().AddSeconds(30 * (delivery.Attempts + 1)))
                       .SetProperty(d => d.LockedUntil, (DateTimeOffset?)null), cancellation);
        }
        await db.NotificationDeliveries.Where(d => d.ExpiresAt < now.AddDays(-30)).ExecuteDeleteAsync(cancellation);
    }

    private async Task<List<NotificationCandidate>> Candidates(NotificationPreferences preferences, DateTimeOffset now, string? zone, List<Habit> habits, CancellationToken cancellation)
    {
        if (!NotificationPolicy.Allowed(preferences, now, zone)) return [];
        var reminders = await db.HabitReminders.AsNoTracking().Where(r => r.UserId == preferences.UserId && r.Enabled && !r.Habit.IsArchived)
            .OrderBy(r => r.HabitId).Take(3).ToListAsync(cancellation);
        return NotificationPolicy.Daily(preferences, now, zone, habits).Concat(NotificationPolicy.HabitReminders(now, zone, habits, reminders))
            .Concat(NotificationPolicy.Weekly(preferences, now, zone, habits))
            .Where(candidate => NotificationPolicy.Allowed(preferences, candidate.ExpiresAt.AddMinutes(-15), zone)).ToList();
    }

    private Task<List<Habit>> Habits(int userId, DateOnly date, CancellationToken cancellation) => db.Habits.AsNoTracking()
        .Where(h => h.UserId == userId && !h.IsArchived).Include(h => h.Schedules)
        .Include(h => h.Completions.Where(c => c.Date >= date.AddDays(-14) && c.Date <= date))
        .AsSplitQuery().ToListAsync(cancellation);
}

public class NotificationWorker(IServiceScopeFactory scopes, Microsoft.Extensions.Options.IOptions<PushOptions> options,
    ILogger<NotificationWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!options.Value.Ready) return;
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(30));
        do
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                await scope.ServiceProvider.GetRequiredService<NotificationQueue>().Tick(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception e) { logger.LogWarning("Notification tick failed ({Category}); will retry without logging subscriptions or message contents.", e.GetType().Name); }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
