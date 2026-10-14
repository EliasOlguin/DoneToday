using DoneToday.Api.Entities;

namespace DoneToday.Api.Services;

public static class MonthlyProgressService
{
    public static MonthlyProgressResult Calculate(IEnumerable<Habit> habits, DateOnly start, DateOnly today)
    {
        var days = Enumerable.Range(0, DateTime.DaysInMonth(start.Year, start.Month))
            .Select(offset => new DailyProgressResult { Date = start.AddDays(offset) }).ToList();
        foreach (var habit in habits)
        {
            var completed = habit.Completions.Select(c => c.Date).ToHashSet();
            foreach (var day in days.Where(d => d.Date <= today))
            {
                if (!habit.Schedules.Any(s => s.DayOfWeek == day.Date.DayOfWeek && s.ValidFrom <= day.Date &&
                    (s.ValidTo == null || s.ValidTo >= day.Date))) continue;
                day.Scheduled++;
                if (completed.Contains(day.Date)) day.Completed++;
            }
        }
        var scheduled = days.Sum(d => d.Scheduled);
        var count = days.Sum(d => d.Completed);
        return new(start, today, scheduled, count, scheduled == 0 ? 0 : (double)count / scheduled * 100, days);
    }
}

public record MonthlyProgressResult(DateOnly StartDate, DateOnly Today, int Scheduled, int Completed,
    double CompletionRate, List<DailyProgressResult> Days);
