namespace DoneToday.Dtos.Habits;

public class HabitResponse
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string? Color { get; set; }

    public bool IsArchived { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public List<DayOfWeek> DaysOfWeek { get; set; } = [];
}