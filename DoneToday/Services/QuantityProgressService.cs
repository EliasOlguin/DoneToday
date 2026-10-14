using DoneToday.Api.Entities;

namespace DoneToday.Api.Services;

public record QuantityDayResult(DateOnly Date, decimal Amount, decimal Target);
public record QuantityProgressResult(int HabitId, string Name, string Icon, string? Color, string Unit,
    decimal Amount, decimal Target, int CompletedDays, int ScheduledDays, double Coverage, List<QuantityDayResult> Days);
public record QuantityPeriodResult(DateOnly StartDate, DateOnly EndDate, List<QuantityProgressResult> Habits);

public static class QuantityProgressService
{
    public static QuantityPeriodResult Calculate(IEnumerable<Habit> habits, DateOnly start, DateOnly end)
    {
        var results = new List<QuantityProgressResult>();
        foreach (var habit in habits)
        {
            var byUnit = new Dictionary<string, List<QuantityDayResult>>();
            for (var day = start; day <= end; day = day.AddDays(1))
            {
                if (!HabitGoalService.Scheduled(habit, day)) continue;
                var goal = HabitGoalService.ForDate(habit, day);
                if (goal?.Target is null || goal.Unit is null) continue;
                var progress = habit.Progress.FirstOrDefault(p => p.Date == day);
                var unit = progress?.Unit ?? goal.Unit;
                if (!byUnit.TryGetValue(unit, out var days)) byUnit[unit] = days = [];
                days.Add(new(day, progress?.Amount ?? 0, progress?.Target ?? goal.Target.Value));
            }
            foreach (var (unit, days) in byUnit)
            {
                var target = days.Sum(d => d.Target);
                // Excess on one day must not compensate for another day's missing work.
                var covered = days.Sum(d => Math.Min(d.Amount, d.Target));
                results.Add(new(habit.Id, habit.Name, habit.Icon, habit.Color, unit, days.Sum(d => d.Amount), target,
                    days.Count(d => d.Amount >= d.Target), days.Count, target == 0 ? 0 : (double)(covered / target * 100), days));
            }
        }
        return new(start, end, results);
    }
}
