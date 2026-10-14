using DoneToday.Api.Entities;
using DoneToday.Api.Services;

namespace DoneToday.Tests.Services;

public class StatisticsHabitFilterTests
{
    private static IQueryable<Habit> Habits => new[] {
        new Habit { Id = 1, UserId = 7 }, new Habit { Id = 2, UserId = 7 },
        new Habit { Id = 3, UserId = 8 }, new Habit { Id = 4, UserId = 7, IsArchived = true }
    }.AsQueryable();

    [Fact]
    public void DefaultIncludesOnlyCurrentUsersActiveHabits() =>
        Assert.Equal(new[] { 1, 2 }, StatisticsHabitFilter.ForUser(Habits, 7, null).Select(h => h.Id));

    [Fact]
    public void SelectionIncludesOnlyRequestedHabit() =>
        Assert.Equal(2, StatisticsHabitFilter.ForUser(Habits, 7, 2).Single().Id);

    [Theory]
    [InlineData(3)]
    [InlineData(4)]
    [InlineData(999)]
    public void ForeignArchivedAndUnknownSelectionsNeverFallBackToAll(int id) =>
        Assert.Empty(StatisticsHabitFilter.ForUser(Habits, 7, id));
}
