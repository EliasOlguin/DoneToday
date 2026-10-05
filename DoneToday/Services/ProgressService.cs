using DoneToday.Api.Entities;

namespace DoneToday.Api.Services;

public class ProgressService
{
    public WeeklyProgressResult CalculateWeeklyProgress(
    IEnumerable<Habit> habits,
    DateOnly today)
    {
        var startOfWeek = GetStartOfWeek(today);

        var scheduledCount = 0;
        var completedCount = 0;

        foreach (var habit in habits)
        {
            var completions = habit.Completions
                .Select(c => c.Date)
                .ToHashSet();

            var currentDate = startOfWeek;

            while (currentDate <= today)
            {
                var isScheduled = habit.Schedules.Any(s =>
                    s.DayOfWeek == currentDate.DayOfWeek &&
                    s.ValidFrom <= currentDate &&
                    (s.ValidTo == null || s.ValidTo >= currentDate));

                if (isScheduled)
                {
                    scheduledCount++;

                    if (completions.Contains(currentDate))
                    {
                        completedCount++;
                    }
                }

                currentDate = currentDate.AddDays(1);
            }
        }

        var rate = scheduledCount == 0
            ? 0
            : (double)completedCount / scheduledCount * 100;

        return new WeeklyProgressResult
        {
            Scheduled = scheduledCount,
            Completed = completedCount,
            CompletionRate = rate
        };
    }

    private static DateOnly GetStartOfWeek(DateOnly date)
    {
        var diff = (7 + (date.DayOfWeek - DayOfWeek.Monday)) % 7;

        return date.AddDays(-diff);
    }
}