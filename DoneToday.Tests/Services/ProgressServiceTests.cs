using DoneToday.Api.Entities;
using DoneToday.Api.Services;

namespace DoneToday.Tests.Services;

public class ProgressServiceTests
{
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