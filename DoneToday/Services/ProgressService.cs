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
        var days = Enumerable.Range(0, 7).Select(offset => new DailyProgressResult
        {
            Date = startOfWeek.AddDays(offset)
        }).ToList();
        var breakdown = new List<HabitProgressResult>();

        foreach (var habit in habits)
        {
            var habitResult = new HabitProgressResult { Id = habit.Id, Name = habit.Name, Color = habit.Color };
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
                    habitResult.Scheduled++;
                    var day = days[currentDate.DayNumber - startOfWeek.DayNumber];
                    day.Scheduled++;

                    if (completions.Contains(currentDate))
                    {
                        completedCount++;
                        habitResult.Completed++;
                        day.Completed++;
                    }
                }

                currentDate = currentDate.AddDays(1);
            }
            habitResult.CompletionRate = habitResult.Scheduled == 0 ? 0 : (double)habitResult.Completed / habitResult.Scheduled * 100;
            breakdown.Add(habitResult);
        }

        var rate = scheduledCount == 0
            ? 0
            : (double)completedCount / scheduledCount * 100;

        return new WeeklyProgressResult
        {
            Scheduled = scheduledCount,
            Completed = completedCount,
            CompletionRate = rate,
            StartDate = startOfWeek,
            EndDate = today,
            Days = days,
            Habits = breakdown
        };
    }

    private static DateOnly GetStartOfWeek(DateOnly date)
    {
        var diff = (7 + (date.DayOfWeek - DayOfWeek.Monday)) % 7;

        return date.AddDays(-diff);
    }
}
