using DoneToday.Api.Entities;

namespace DoneToday.Api.Services;

public static class StatisticsHabitFilter
{
    public static IQueryable<Habit> ForUser(IQueryable<Habit> habits, int userId, int? habitId) =>
        habits.Where(h => h.UserId == userId && !h.IsArchived && (!habitId.HasValue || h.Id == habitId));
}
