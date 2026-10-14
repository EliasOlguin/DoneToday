using DoneToday.Api.Entities;

namespace DoneToday.Api.Services;

public static class HabitGoalService
{
    public const decimal Maximum = 1_000_000m;
    public static readonly string[] Units = ["l", "ml", "pages", "chapters", "km", "minutes", "repetitions", "sessions"];
    public static bool IsWholeUnit(string unit) => unit is "pages" or "chapters" or "repetitions" or "sessions";
    public static bool ValidAmount(decimal amount, string unit, bool allowZero = false) =>
        amount >= (allowZero ? 0 : .001m) && amount <= Maximum && decimal.Round(amount, 3) == amount &&
        (!IsWholeUnit(unit) || amount == decimal.Truncate(amount));
    public static bool ValidGoal(decimal? target, string? unit) =>
        target is null ? unit is null : unit is not null && Units.Contains(unit) && ValidAmount(target.Value, unit);

    public static HabitGoal? ForDate(Habit habit, DateOnly date) => habit.Goals
        .Where(g => g.ValidFrom <= date && (g.ValidTo == null || g.ValidTo >= date))
        .OrderByDescending(g => g.ValidFrom).FirstOrDefault();

    public static bool Scheduled(Habit habit, DateOnly day) => habit.Schedules.Any(s =>
        s.DayOfWeek == day.DayOfWeek && s.ValidFrom <= day && (s.ValidTo == null || s.ValidTo >= day));

    // Goal edits start tomorrow: neither today's work nor historical targets are reinterpreted.
    public static List<HabitGoal> Configure(Habit habit, decimal? target, string? unit, DateOnly from)
    {
        var removed = habit.Goals.Where(g => g.ValidFrom >= from).ToList();
        foreach (var goal in removed) habit.Goals.Remove(goal);
        foreach (var goal in habit.Goals.Where(g => g.ValidTo == null || g.ValidTo >= from)) goal.ValidTo = from.AddDays(-1);
        habit.Goals.Add(new HabitGoal { Target = target, Unit = unit, ValidFrom = from });
        habit.GoalTarget = target;
        habit.GoalUnit = unit;
        habit.GoalEffectiveFrom = from;
        return removed;
    }

    public static void SyncCompletion(Habit habit, HabitDayProgress progress, DateTimeOffset now)
    {
        var completion = habit.Completions.FirstOrDefault(c => c.Date == progress.Date);
        if (progress.Amount >= progress.Target && completion is null)
            habit.Completions.Add(new HabitCompletion { Date = progress.Date, CompletedAt = now });
        else if (progress.Amount < progress.Target && completion is not null) habit.Completions.Remove(completion);
    }
}
