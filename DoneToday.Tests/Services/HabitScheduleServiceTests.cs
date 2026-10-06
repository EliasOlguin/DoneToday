using DoneToday.Api.Entities;
using DoneToday.Api.Services;

namespace DoneToday.Tests.Services;

public class HabitScheduleServiceTests
{
    [Fact]
    public void ChangingDays_PreservesHistoryAndStartsTomorrow()
    {
        var today = new DateOnly(2026, 10, 6);
        var old = new HabitSchedule { DayOfWeek = DayOfWeek.Tuesday, ValidFrom = today.AddDays(-7) };
        var habit = new Habit { Schedules = [old] };
        var removed = HabitScheduleService.Update(habit, [DayOfWeek.Wednesday], today);
        Assert.Empty(removed);
        Assert.Contains(old, habit.Schedules);
        Assert.Equal(today, old.ValidTo);
        var next = Assert.Single(habit.Schedules, s => s.ValidTo == null);
        Assert.Equal(DayOfWeek.Wednesday, next.DayOfWeek);
        Assert.Equal(today.AddDays(1), next.ValidFrom);
    }

    [Fact]
    public void EditingTwiceOnSameDay_ReplacesPendingSchedule()
    {
        var today = new DateOnly(2026, 10, 6);
        var old = new HabitSchedule { DayOfWeek = DayOfWeek.Tuesday, ValidFrom = today };
        var habit = new Habit { Schedules = [old] };
        HabitScheduleService.Update(habit, [DayOfWeek.Wednesday], today);
        var removed = HabitScheduleService.Update(habit, [DayOfWeek.Friday], today);
        Assert.Single(removed);
        Assert.Equal(2, habit.Schedules.Count);
        Assert.Contains(old, habit.Schedules);
        var next = Assert.Single(habit.Schedules, s => s.ValidTo == null);
        Assert.Equal(DayOfWeek.Friday, next.DayOfWeek);
        Assert.Equal(today.AddDays(1), next.ValidFrom);
    }

    [Fact]
    public void KeepingSameDays_DoesNotChangeHistory()
    {
        var today = new DateOnly(2026, 10, 6);
        var schedule = new HabitSchedule { DayOfWeek = DayOfWeek.Tuesday, ValidFrom = today.AddDays(-7) };
        var habit = new Habit { Schedules = [schedule] };
        Assert.Empty(HabitScheduleService.Update(habit, [DayOfWeek.Tuesday], today));
        Assert.Same(schedule, Assert.Single(habit.Schedules));
        Assert.Null(schedule.ValidTo);
    }
}
