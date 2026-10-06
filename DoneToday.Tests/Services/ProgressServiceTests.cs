using DoneToday.Api.Entities;
using DoneToday.Api.Services;

namespace DoneToday.Tests.Services;

public class ProgressServiceTests
{
    [Fact]
    public void Breakdown_RespectsHistoryAndExcludesFutureAndUnscheduledCompletions()
    {
        var today = new DateOnly(2026, 10, 6);
        var habit = new Habit
        {
            Id = 7, Name = "Read",
            Schedules = [
                new() { DayOfWeek = DayOfWeek.Monday, ValidFrom = new DateOnly(2026, 10, 1), ValidTo = today },
                new() { DayOfWeek = DayOfWeek.Wednesday, ValidFrom = today.AddDays(1) }
            ],
            Completions = [new() { Date = today.AddDays(-1) }, new() { Date = today }]
        };
        var result = new ProgressService().CalculateWeeklyProgress([habit], today);
        Assert.Equal(1, result.Scheduled);
        Assert.Equal(1, result.Completed);
        Assert.Equal(7, result.Days.Count);
        Assert.Equal(1, result.Days[0].Completed);
        Assert.Equal(0, result.Days[1].Completed);
        Assert.All(result.Days.Skip(2), day => Assert.Equal(0, day.Scheduled));
        var breakdown = Assert.Single(result.Habits);
        Assert.Equal(7, breakdown.Id);
        Assert.Equal(100, breakdown.CompletionRate);
        Assert.Equal(result.Completed, result.Days.Sum(d => d.Completed));
        Assert.Equal(result.Scheduled, result.Habits.Sum(h => h.Scheduled));
    }

    [Fact]
    public void Returns75Percent_WhenThreeOfFourOccurrencesAreCompleted()
    {
        var service = new ProgressService();

        var habit = new Habit
        {
            Schedules =
            [
                new()
                {
                    DayOfWeek = DayOfWeek.Monday,
                    ValidFrom = new DateOnly(2026, 1, 1)
                },
                new()
                {
                    DayOfWeek = DayOfWeek.Tuesday,
                    ValidFrom = new DateOnly(2026, 1, 1)
                },
                new()
                {
                    DayOfWeek = DayOfWeek.Wednesday,
                    ValidFrom = new DateOnly(2026, 1, 1)
                },
                new()
                {
                    DayOfWeek = DayOfWeek.Thursday,
                    ValidFrom = new DateOnly(2026, 1, 1)
                }
            ],

            Completions =
            [
                new() { Date = new DateOnly(2026, 9, 28) },
                new() { Date = new DateOnly(2026, 9, 29) },
                new() { Date = new DateOnly(2026, 9, 30) }
            ]
        };

        var today = new DateOnly(2026, 10, 1);

        var result = service.CalculateWeeklyProgress([habit], today);

        Assert.Equal(4, result.Scheduled);
        Assert.Equal(3, result.Completed);
        Assert.Equal(75, result.CompletionRate);
    }
    [Fact]
    public void Returns0_WhenThereAreNoScheduledHabits()
    {
        var service = new ProgressService();

        var result = service.CalculateWeeklyProgress(
            [],
            new DateOnly(2026, 10, 1)
        );

        Assert.Equal(0, result.Completed);
        Assert.Equal(0, result.CompletionRate);
        Assert.Equal(0, result.Scheduled);
    }
}
