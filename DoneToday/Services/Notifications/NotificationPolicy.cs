using DoneToday.Api.Entities;

namespace DoneToday.Api.Services.Notifications;

public record NotificationCandidate(string Key, string Kind, DateOnly Date, int Count, DateTimeOffset ExpiresAt, int? HabitId = null, int Total = 0);

public static class NotificationPolicy
{
    private static TimeZoneInfo Zone(string? zone) => UserDateService.TryGetZone(zone, out var found) ? found! : TimeZoneInfo.Utc;
    private static DateTimeOffset DueAt(DateOnly date, TimeOnly time, string? zone)
    {
        var info = Zone(zone);
        var local = date.ToDateTime(time, DateTimeKind.Unspecified);
        // Spring-forward gaps move to the first valid minute. Fall-back uses the first occurrence only.
        while (info.IsInvalidTime(local)) local = local.AddMinutes(1);
        var offset = info.IsAmbiguousTime(local) ? info.GetAmbiguousTimeOffsets(local).Max() : info.GetUtcOffset(local);
        return new DateTimeOffset(local, offset).ToUniversalTime();
    }

    public static bool Allowed(NotificationPreferences preferences, DateTimeOffset now, string? zone)
    {
        var local = TimeZoneInfo.ConvertTime(now, Zone(zone));
        var date = DateOnly.FromDateTime(local.DateTime);
        if (preferences.PausedThrough >= date) return false;
        if (!preferences.QuietEnabled) return true;
        var time = TimeOnly.FromDateTime(local.DateTime);
        return preferences.QuietStart < preferences.QuietEnd
            ? time < preferences.QuietStart || time >= preferences.QuietEnd
            : time < preferences.QuietStart && time >= preferences.QuietEnd;
    }

    public static List<NotificationCandidate> Weekly(NotificationPreferences preferences, DateTimeOffset now, string? zone, IEnumerable<Habit> habits)
    {
        var local = TimeZoneInfo.ConvertTime(now, Zone(zone));
        var date = DateOnly.FromDateTime(local.DateTime);
        var age = now - DueAt(date, preferences.WeeklyTime, zone);
        if (!preferences.WeeklyEnabled || !Allowed(preferences, now, zone) || !Allowed(preferences, DueAt(date, preferences.WeeklyTime, zone), zone) || (int)date.DayOfWeek != preferences.WeeklyDay || age < TimeSpan.Zero || age >= TimeSpan.FromMinutes(15)) return [];
        var start = date.AddDays(-((7 + (int)date.DayOfWeek - 1) % 7) - 7);
        var scheduled = 0; var completed = 0;
        foreach (var habit in habits)
            for (var day = start; day < start.AddDays(7); day = day.AddDays(1))
                if (Scheduled(habit, day)) { scheduled++; if (habit.Completions.Any(c => c.Date == day)) completed++; }
        return scheduled == 0 ? [] : [new($"weekly:{start:yyyy-MM-dd}", "weekly", date, completed, now.Add(TimeSpan.FromMinutes(15) - age), Total: scheduled)];
    }
    public static List<NotificationCandidate> HabitReminders(DateTimeOffset now, string? zone, IEnumerable<Habit> habits, IEnumerable<HabitReminder> reminders)
    {
        var local = TimeZoneInfo.ConvertTime(now, UserDateService.TryGetZone(zone, out var found) ? found! : TimeZoneInfo.Utc);
        var date = DateOnly.FromDateTime(local.DateTime);
        var result = new List<NotificationCandidate>();
        foreach (var reminder in reminders.Where(r => r.Enabled))
        {
            var habit = habits.FirstOrDefault(h => h.Id == reminder.HabitId && h.UserId == reminder.UserId);
            if (habit == null || !Pending(habit, date)) continue;
            var snoozed = reminder.SnoozedDate == date && reminder.SnoozedUntil != null;
            var age = snoozed ? now - reminder.SnoozedUntil!.Value : now - DueAt(date, reminder.Time, zone);
            if (age < TimeSpan.Zero || age >= TimeSpan.FromMinutes(15)) continue;
            var kind = snoozed ? "snooze" : "habit";
            result.Add(new($"{kind}:{habit.Id}:{date:yyyy-MM-dd}", kind, date, 1, now.Add(TimeSpan.FromMinutes(15) - age), habit.Id));
        }
        return result;
    }
    public static bool Scheduled(Habit habit, DateOnly date) => !habit.IsArchived && habit.Schedules.Any(s =>
        s.DayOfWeek == date.DayOfWeek && s.ValidFrom <= date && (s.ValidTo == null || s.ValidTo >= date));

    public static bool Pending(Habit habit, DateOnly date) => Scheduled(habit, date) && !habit.Completions.Any(c => c.Date == date);

    public static List<NotificationCandidate> Daily(NotificationPreferences preferences, DateTimeOffset now, string? zone, IEnumerable<Habit> habits)
    {
        if (!Allowed(preferences, now, zone)) return [];
        var local = TimeZoneInfo.ConvertTime(now, UserDateService.TryGetZone(zone, out var found) ? found! : TimeZoneInfo.Utc);
        var date = DateOnly.FromDateTime(local.DateTime);
        var list = habits.ToList();
        var result = new List<NotificationCandidate>();
        Add("morning", preferences.MorningEnabled, preferences.MorningTime, list.Count(h => Scheduled(h, date)));
        Add("evening", preferences.EveningEnabled, preferences.EveningTime, list.Count(h => Pending(h, date)));
        return result;

        void Add(string kind, bool enabled, TimeOnly time, int count)
        {
            var age = now - DueAt(date, time, zone);
            if (enabled && count > 0 && age >= TimeSpan.Zero && age < TimeSpan.FromMinutes(15) && Allowed(preferences, DueAt(date, time, zone), zone))
                result.Add(new($"{kind}:{date:yyyy-MM-dd}", kind, date, count, now.Add(TimeSpan.FromMinutes(15) - age)));
        }
    }
}
