namespace DoneToday.Dtos.Habits;

public class HabitResponse
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string? Color { get; set; }

    public string Icon { get; set; } = "habit";
    public decimal? GoalTarget { get; set; }
    public string? GoalUnit { get; set; }
    public DateOnly? GoalEffectiveFrom { get; set; }

    public bool IsArchived { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public List<DayOfWeek> DaysOfWeek { get; set; } = [];
}
