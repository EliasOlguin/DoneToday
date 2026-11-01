using DoneToday.Api.Entities;
using DoneToday.Api.Services.Notifications;

namespace DoneToday.Tests.Services;

public class HabitNotificationTests
{
    private static Habit Habit(bool completed = false) => new()
    {
        Id = 4, UserId = 1, Name = "Read",
        Schedules = [new() { DayOfWeek = DayOfWeek.Monday, ValidFrom = new(2026, 1, 1) }],
        Completions = completed ? [new() { Date = new(2026, 11, 2) }] : []
    };
    [Fact]
    public void AReminderOnlyFiresForItsOwnPendingScheduledHabit()
    {
        var now = DateTimeOffset.Parse("2026-11-02T17:03:00Z");
        var reminder = new HabitReminder { HabitId = 4, UserId = 1, Enabled = true, Time = new(18, 0) };
        var message = Assert.Single(NotificationPolicy.HabitReminders(now, "Europe/Berlin", [Habit()], [reminder]));
        Assert.Equal("habit:4:2026-11-02", message.Key);
        Assert.Equal(4, message.HabitId);
        Assert.Empty(NotificationPolicy.HabitReminders(now, "Europe/Berlin", [Habit(true)], [reminder]));
        Assert.Empty(NotificationPolicy.HabitReminders(now.AddDays(1), "Europe/Berlin", [Habit()], [reminder]));
        reminder.UserId = 2;
        Assert.Empty(NotificationPolicy.HabitReminders(now, "Europe/Berlin", [Habit()], [reminder]));
    }
    [Fact]
    public void SnoozingReplacesTheOriginalTimeAndDoesNotReviveCompletedHabits()
    {
        var now = DateTimeOffset.Parse("2026-11-02T17:03:00Z");
        var reminder = new HabitReminder { HabitId = 4, UserId = 1, Enabled = true, Time = new(18, 0), SnoozedDate = new(2026,11,2), SnoozedUntil = now.AddMinutes(30) };
        Assert.Empty(NotificationPolicy.HabitReminders(now, "Europe/Berlin", [Habit()], [reminder]));
        var message = Assert.Single(NotificationPolicy.HabitReminders(now.AddMinutes(31), "Europe/Berlin", [Habit()], [reminder]));
        Assert.Equal("snooze:4:2026-11-02", message.Key);
        Assert.Empty(NotificationPolicy.HabitReminders(now.AddMinutes(31), "Europe/Berlin", [Habit(true)], [reminder]));
    }
}
