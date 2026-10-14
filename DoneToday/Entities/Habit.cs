namespace DoneToday.Api.Entities;

public class Habit
{
    public int Id { get; set; }

    public int UserId { get; set; }
    public int SortOrder { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string? Color { get; set; }

    public string Icon { get; set; } = "habit";

    public decimal? GoalTarget { get; set; }
    public string? GoalUnit { get; set; }
    public DateOnly? GoalEffectiveFrom { get; set; }
    public ICollection<HabitGoal> Goals { get; set; } = new List<HabitGoal>();
    public ICollection<HabitDayProgress> Progress { get; set; } = new List<HabitDayProgress>();

    public DateTimeOffset CreatedAt { get; set; }

    public bool IsArchived { get; set; }

    public DateTimeOffset? ArchivedAt { get; set; }

    public User User { get; set; } = null!;

    public ICollection<HabitSchedule> Schedules { get; set; }
        = new List<HabitSchedule>();

    public ICollection<HabitCompletion> Completions { get; set; }
        = new List<HabitCompletion>();
}
