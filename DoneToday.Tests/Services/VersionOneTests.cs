using DoneToday.Api.Entities;
using DoneToday.Api.Services;
using DoneToday.Api.Controllers;
using System.ComponentModel.DataAnnotations;

namespace DoneToday.Tests.Services;

public class VersionOneTests
{
    [Fact]
    public void OrderValidatesFullListBeforeChangingAnything()
    {
        Habit[] habits = [new() { Id = 1, SortOrder = 4 }, new() { Id = 2, SortOrder = 5 }];
        Assert.False(HabitOrderService.TryApply(habits, [1, 99]));
        Assert.Equal(4, habits[0].SortOrder);
        Assert.False(HabitOrderService.TryApply(habits, [1, 1]));
        Assert.False(HabitOrderService.TryApply(habits, [1]));
        Assert.True(HabitOrderService.TryApply(habits, [2, 1]));
        Assert.Equal(0, habits[1].SortOrder);
        Assert.Equal(1, habits[0].SortOrder);
    }

    [Fact]
    public void MonthRespectsScheduleHistoryAndDoesNotCountFutureDays()
    {
        var habit = new Habit {
            Schedules = [new() { DayOfWeek = DayOfWeek.Monday, ValidFrom = new(2026,10,1), ValidTo = new(2026,10,12) },
                new() { DayOfWeek = DayOfWeek.Tuesday, ValidFrom = new(2026,10,13) }],
            Completions = [new() { Date = new(2026,10,5) }, new() { Date = new(2026,10,13) }, new() { Date = new(2026,10,20) }]
        };
        var month = MonthlyProgressService.Calculate([habit], new(2026,10,1), new(2026,10,14));
        Assert.Equal(31, month.Days.Count);
        Assert.Equal(3, month.Scheduled);
        Assert.Equal(2, month.Completed);
        Assert.Equal(0, month.Days.Single(d => d.Date == new DateOnly(2026,10,20)).Scheduled);
    }

    [Fact]
    public void MonthSupportsLeapYearAndNoHabits()
    {
        var month = MonthlyProgressService.Calculate([], new(2024,2,1), new(2024,3,1));
        Assert.Equal(29, month.Days.Count);
        Assert.Equal(0, month.CompletionRate);
    }

    [Fact]
    public void ProfileLimitsNameLength()
    {
        var request = new ProfileNameRequest { DisplayName = new string('a',61) };
        Assert.False(Validator.TryValidateObject(request, new ValidationContext(request), [], true));
    }
}
