namespace DoneToday.Api.Entities;

public class Habit
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string? Color { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public bool IsArchived { get; set; }

    public DateTimeOffset? ArchivedAt { get; set; }

    public User User { get; set; } = null!;

    public ICollection<HabitSchedule> Schedules { get; set; }
        = new List<HabitSchedule>();

    public ICollection<HabitCompletion> Completions { get; set; }
        = new List<HabitCompletion>();
}