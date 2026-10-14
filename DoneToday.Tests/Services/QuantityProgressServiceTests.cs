using DoneToday.Api.Entities;
using DoneToday.Api.Services;

namespace DoneToday.Tests.Services;

public class QuantityProgressServiceTests
{
    [Fact]
    public void CountsOnlyElapsedScheduledDaysAndDoesNotCompensateWithExcess()
    {
        var start = new DateOnly(2026, 10, 12);
        var habit = new Habit { Id = 1, Name = "Water", Schedules = [
            new() { DayOfWeek = DayOfWeek.Monday, ValidFrom = start },
            new() { DayOfWeek = DayOfWeek.Tuesday, ValidFrom = start },
            new() { DayOfWeek = DayOfWeek.Thursday, ValidFrom = start }
        ] };
        HabitGoalService.Configure(habit, 2, "l", start);
        habit.Progress.Add(new() { Date = start, Amount = 4, Target = 2, Unit = "l" });
        var result = QuantityProgressService.Calculate([habit], start, start.AddDays(2)).Habits.Single();
        Assert.Equal(2, result.ScheduledDays);
        Assert.Equal(1, result.CompletedDays);
        Assert.Equal(4, result.Amount);
        Assert.Equal(4, result.Target);
        Assert.Equal(50, result.Coverage);
        Assert.DoesNotContain(result.Days, d => d.Date.DayOfWeek == DayOfWeek.Wednesday);
    }

    [Fact]
    public void PreservesHistoricalTargetsAndSeparatesUnitsWithinTheSameHabit()
    {
        var start = new DateOnly(2026, 10, 12);
        var habit = new Habit { Id = 1, Schedules = Enum.GetValues<DayOfWeek>().Select(day => new HabitSchedule { DayOfWeek = day, ValidFrom = start }).ToList() };
        HabitGoalService.Configure(habit, 2, "l", start);
        HabitGoalService.Configure(habit, 3, "l", start.AddDays(1));
        HabitGoalService.Configure(habit, 2000, "ml", start.AddDays(2));
        habit.Progress.Add(new() { Date = start, Amount = 1, Target = 2, Unit = "l" });
        var result = QuantityProgressService.Calculate([habit], start, start.AddDays(2));
        Assert.Equal(2, result.Habits.Count);
        var liters = result.Habits.Single(h => h.Unit == "l");
        Assert.Equal(5, liters.Target);
        Assert.Equal(20, liters.Coverage);
        Assert.Equal(2000, result.Habits.Single(h => h.Unit == "ml").Target);
        Assert.Single(result.Habits.Single(h => h.Unit == "ml").Days);
    }

    [Fact]
    public void SimpleAndUnscheduledHabitsDoNotContributeAmounts()
    {
        var start = new DateOnly(2026, 10, 12);
        var habit = new Habit();
        HabitGoalService.Configure(habit, 2, "l", start);
        Assert.Empty(QuantityProgressService.Calculate([habit, new Habit()], start, start).Habits);
    }
}
