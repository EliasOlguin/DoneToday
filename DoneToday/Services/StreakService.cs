using DoneToday.Api.Entities;

namespace DoneToday.Api.Services;

public class StreakService
{
    public int CalculateCurrentStreak(Habit habit,DateOnly today)
    {
        var schedules = habit.Schedules
            .OrderByDescending(s => s.ValidFrom)
            .ToList();
        if (schedules.Count == 0)
        {
            return 0;
        }

        var firstScheduledDate = schedules.Min(s => s.ValidFrom);
        var completions = habit.Completions
            .Select(c => c.Date)
            .ToHashSet();

        var streak = 0;
        var currentDate = today;

        var todayIsScheduled = schedules.Any(s =>
            s.DayOfWeek == today.DayOfWeek &&
            s.ValidFrom <= today &&
            (s.ValidTo == null || s.ValidTo >= today));

        if (todayIsScheduled && !completions.Contains(today))
        {
            currentDate = today.AddDays(-1);
        }

        while (currentDate >= firstScheduledDate)
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
    public int CalculateBestStreak(Habit habit)
    {
        var schedules = habit.Schedules
            .OrderBy(s => s.ValidFrom)
            .ToList();

        var completions = habit.Completions
            .Select(c => c.Date)
            .ToHashSet();

        if (schedules.Count == 0 || completions.Count == 0)
        {
            return 0;
        }

        var firstDate = schedules.Min(s => s.ValidFrom);
        var lastDate = completions.Max();

        var bestStreak = 0;
        var currentStreak = 0;

        var currentDate = firstDate;

        while (currentDate <= lastDate)
        {
            var scheduleExists = schedules.Any(s =>
                s.DayOfWeek == currentDate.DayOfWeek &&
                s.ValidFrom <= currentDate &&
                (s.ValidTo == null || s.ValidTo >= currentDate));

            if (!scheduleExists)
            {
                currentDate = currentDate.AddDays(1);
                continue;
            }

            if (completions.Contains(currentDate))
            {
                currentStreak++;

                if (currentStreak > bestStreak)
                {
                    bestStreak = currentStreak;
                }
            }
            else
            {
                currentStreak = 0;
            }

            currentDate = currentDate.AddDays(1);
        }

        return bestStreak;
    }
}