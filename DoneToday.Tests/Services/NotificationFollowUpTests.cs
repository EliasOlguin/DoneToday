using DoneToday.Api.Entities;
using DoneToday.Api.Services.Notifications;

namespace DoneToday.Tests.Services;

public class NotificationFollowUpTests
{
    [Fact]
    public void AReminderScheduledInsideQuietHoursIsNotReplayedAfterTheyEnd()
    {
        var settings = new NotificationPreferences { MorningEnabled = true, MorningTime = new(7,55), QuietEnabled = true, QuietStart = new(22,0), QuietEnd = new(8,0) };
        var habit = new Habit { Id = 1, Schedules = [new() { DayOfWeek = DayOfWeek.Monday, ValidFrom = new(2026,1,1) }] };
        Assert.Empty(NotificationPolicy.Daily(settings, DateTimeOffset.Parse("2026-11-02T07:01:00Z"), "Europe/Berlin", [habit]));
    }
    [Fact]
    public void QuietHoursSpanMidnightAndPausesUseTheAccountCalendar()
    {
        var settings = new NotificationPreferences { QuietEnabled = true, QuietStart = new(22, 0), QuietEnd = new(8, 0) };
        Assert.False(NotificationPolicy.Allowed(settings, DateTimeOffset.Parse("2026-11-02T22:00:00Z"), "Europe/Berlin"));
        Assert.False(NotificationPolicy.Allowed(settings, DateTimeOffset.Parse("2026-11-03T05:00:00Z"), "Europe/Berlin"));
        Assert.True(NotificationPolicy.Allowed(settings, DateTimeOffset.Parse("2026-11-03T08:00:00Z"), "Europe/Berlin"));
        settings.PausedThrough = new(2026,11,3);
        Assert.False(NotificationPolicy.Allowed(settings, DateTimeOffset.Parse("2026-11-03T12:00:00Z"), "Europe/Berlin"));
        Assert.True(NotificationPolicy.Allowed(settings, DateTimeOffset.Parse("2026-11-04T12:00:00Z"), "Europe/Berlin"));
    }

    [Fact]
    public void WeeklySummaryCountsThePreviousCompleteMondayToSundayWeek()
    {
        var habit = new Habit { Id = 1, Schedules = [new() { DayOfWeek = DayOfWeek.Monday, ValidFrom = new(2026,10,1) }, new() { DayOfWeek = DayOfWeek.Tuesday, ValidFrom = new(2026,10,1) }],
            Completions = [new() { Date = new(2026,10,26) }, new() { Date = new(2026,11,2) }] };
        var settings = new NotificationPreferences { WeeklyEnabled = true, WeeklyDay = 1, WeeklyTime = new(9,0) };
        var message = Assert.Single(NotificationPolicy.Weekly(settings, DateTimeOffset.Parse("2026-11-02T08:01:00Z"), "Europe/Berlin", [habit]));
        Assert.Equal("weekly:2026-10-26", message.Key);
        Assert.Equal(1, message.Count); Assert.Equal(2, message.Total);
        Assert.Empty(NotificationPolicy.Weekly(settings, DateTimeOffset.Parse("2026-11-03T08:01:00Z"), "Europe/Berlin", [habit]));
        Assert.Equal("/progress", NotificationText.Weekly("es", 1, 2).Url);
    }

    [Fact]
    public void DaylightSavingGapMovesToTheFirstValidMinuteAndRepeatedHoursDoNotReschedule()
    {
        var habit = new Habit { Id = 1, Schedules = [new() { DayOfWeek = DayOfWeek.Sunday, ValidFrom = new(2026,1,1) }] };
        var settings = new NotificationPreferences { MorningEnabled = true, MorningTime = new(2,30) };
        Assert.Single(NotificationPolicy.Daily(settings, DateTimeOffset.Parse("2026-03-29T01:02:00Z"), "Europe/Berlin", [habit]));
        Assert.Single(NotificationPolicy.Daily(settings, DateTimeOffset.Parse("2026-10-25T00:31:00Z"), "Europe/Berlin", [habit]));
        Assert.Empty(NotificationPolicy.Daily(settings, DateTimeOffset.Parse("2026-10-25T01:31:00Z"), "Europe/Berlin", [habit]));
    }
}
