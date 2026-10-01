using DoneToday.Api.Entities;

namespace DoneToday.Api.Services;

public class StreakService
{
    public int CalculateCurrentStreak(
        Habit habit,
        DateOnly today)
    {
        var schedules = habit.Schedules
            .OrderByDescending(s => s.ValidFrom)
            .ToList();

        var completions = habit.Completions
            .Select(c => c.Date)
            .ToHashSet();

        var streak = 0;
        var currentDate = today;

        while (true)
        {
            var scheduleExists = schedules.Any(s =>
                s.DayOfWeek == currentDate.DayOfWeek &&
                s.ValidFrom <= currentDate &&
                (s.ValidTo == null || s.ValidTo >= currentDate));

            if (!scheduleExists)
            {
                currentDate = currentDate.AddDays(-1);
                continue;
            }

            if (!completions.Contains(currentDate))
            {
                break;
            }

            streak++;
            currentDate = currentDate.AddDays(-1);
        }

        return streak;
    }
}