using DoneToday.Api.Entities;
using DoneToday.Api.Services;

namespace DoneToday.Tests.Services;

public class StreakServiceTests
{
    [Fact]
    public void Returns3_WhenThreeScheduledDaysAreCompleted()
    {
        var service = new StreakService();

        var habit = new Habit
        {
            Schedules =
            [
                new() { DayOfWeek = DayOfWeek.Monday, ValidFrom = new DateOnly(2026, 1, 1) },
                new() { DayOfWeek = DayOfWeek.Wednesday, ValidFrom = new DateOnly(2026, 1, 1) },
                new() { DayOfWeek = DayOfWeek.Friday, ValidFrom = new DateOnly(2026, 1, 1) }
            ],
            Completions =
            [
                new() { Date = new DateOnly(2026, 9, 25) },
                new() { Date = new DateOnly(2026, 9, 28) },
                new() { Date = new DateOnly(2026, 9, 30) }
            ]
        };

        var today = new DateOnly(2026, 9, 30);

        var result = service.CalculateCurrentStreak(habit, today);

        Assert.Equal(3, result);
    }

    [Fact]
    public void Returns1_WhenPreviousScheduledDayWasMissed()
    {
        var service = new StreakService();

        var habit = new Habit
        {
            Schedules =
            [
                new() { DayOfWeek = DayOfWeek.Monday, ValidFrom = new DateOnly(2026, 1, 1) },
                new() { DayOfWeek = DayOfWeek.Wednesday, ValidFrom = new DateOnly(2026, 1, 1) },
                new() { DayOfWeek = DayOfWeek.Friday, ValidFrom = new DateOnly(2026, 1, 1) }
            ],
            Completions =
            [
                new() { Date = new DateOnly(2026, 9, 25) }, // Friday
                new() { Date = new DateOnly(2026, 10, 2) }  // Friday
            ]
        };

        var today = new DateOnly(2026, 10, 2);

        var result = service.CalculateCurrentStreak(habit, today);

        Assert.Equal(1, result);
    }

    [Fact]
    public void NonScheduledDays_DoNotBreakStreak()
    {
        var service = new StreakService();

        var habit = new Habit
        {
            Schedules =
            [
                new() { DayOfWeek = DayOfWeek.Monday, ValidFrom = new DateOnly(2026, 1, 1) },
                new() { DayOfWeek = DayOfWeek.Wednesday, ValidFrom = new DateOnly(2026, 1, 1) }
            ],
            Completions =
            [
                new() { Date = new DateOnly(2026, 9, 28) }, // Monday
                new() { Date = new DateOnly(2026, 9, 30) }  // Wednesday
            ]
        };

        var today = new DateOnly(2026, 10, 1); // Thursday

        var result = service.CalculateCurrentStreak(habit, today);

        Assert.Equal(2, result);
    }

    [Fact]
    public void Returns0_WhenThereAreNoCompletions()
    {
        var service = new StreakService();

        var habit = new Habit
        {
            Schedules =
            [
                new() { DayOfWeek = DayOfWeek.Monday, ValidFrom = new DateOnly(2026, 1, 1) }
            ],
            Completions = []
        };

        var today = new DateOnly(2026, 9, 28);

        var result = service.CalculateCurrentStreak(habit, today);

        Assert.Equal(0, result);
    }

    [Fact]
    public void UsesHistoricalSchedule_ByDate()
    {
        var service = new StreakService();

        var habit = new Habit
        {
            Schedules =
            [
                new()
                {
                    DayOfWeek = DayOfWeek.Monday,
                    ValidFrom = new DateOnly(2026, 9, 1),
                    ValidTo = new DateOnly(2026, 9, 30)
                },
                new()
                {
                    DayOfWeek = DayOfWeek.Wednesday,
                    ValidFrom = new DateOnly(2026, 9, 1),
                    ValidTo = new DateOnly(2026, 9, 30)
                },
                new()
                {
                    DayOfWeek = DayOfWeek.Friday,
                    ValidFrom = new DateOnly(2026, 9, 1),
                    ValidTo = new DateOnly(2026, 9, 30)
                },
                new()
                {
                    DayOfWeek = DayOfWeek.Tuesday,
                    ValidFrom = new DateOnly(2026, 10, 1)
                },
                new()
                {
                    DayOfWeek = DayOfWeek.Thursday,
                    ValidFrom = new DateOnly(2026, 10, 1)
                }
            ],
            Completions =
            [
                new() { Date = new DateOnly(2026, 9, 28) }, // Monday
                new() { Date = new DateOnly(2026, 9, 30) }, // Wednesday
                new() { Date = new DateOnly(2026, 10, 1) }  // Thursday
            ]
        };

        var today = new DateOnly(2026, 10, 1);

        var result = service.CalculateCurrentStreak(habit, today);

        Assert.Equal(3, result);
    }
    [Fact]
    public void KeepsPreviousStreak_WhenTodayIsScheduledButNotCompletedYet()
    {
        var service = new StreakService();

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
                DayOfWeek = DayOfWeek.Wednesday,
                ValidFrom = new DateOnly(2026, 1, 1)
            },
            new()
            {
                DayOfWeek = DayOfWeek.Friday,
                ValidFrom = new DateOnly(2026, 1, 1)
            }
            ],

            Completions =
            [
                new() { Date = new DateOnly(2026, 9, 25) }, // Friday
                new() { Date = new DateOnly(2026, 9, 28) }  // Monday
            ]
        };

        var today = new DateOnly(2026, 9, 30); // Wednesday

        var result = service.CalculateCurrentStreak(habit, today);

        Assert.Equal(2, result);
    }
    [Fact]
    public void BestStreak_ReturnsLongestCompletedSequence()
    {
        var service = new StreakService();

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
                DayOfWeek = DayOfWeek.Wednesday,
                ValidFrom = new DateOnly(2026, 1, 1)
            },
            new()
            {
                DayOfWeek = DayOfWeek.Friday,
                ValidFrom = new DateOnly(2026, 1, 1)
            }
            ],

            Completions =
            [
                new() { Date = new DateOnly(2026, 9, 21) }, // Mon
            new() { Date = new DateOnly(2026, 9, 23) }, // Wed
            new() { Date = new DateOnly(2026, 9, 25) }, // Fri

            // missed Mon 28

            new() { Date = new DateOnly(2026, 9, 30) }, // Wed
            new() { Date = new DateOnly(2026, 10, 2) }  // Fri
            ]
        };

        var result = service.CalculateBestStreak(habit);

        Assert.Equal(3, result);
    }
    [Fact]
    public void BestStreak_Returns0_WhenThereAreNoCompletions()
    {
        var service = new StreakService();

        var habit = new Habit
        {
            Schedules =
            [
                new()
            {
                DayOfWeek = DayOfWeek.Monday,
                ValidFrom = new DateOnly(2026, 1, 1)
            }
            ],

            Completions = []
        };

        var result = service.CalculateBestStreak(habit);

        Assert.Equal(0, result);
    }
}