namespace DoneToday.Api.Dtos.Today;

public class TodayHabitResponse
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Color { get; set; }

    public bool IsCompleted { get; set; }
    public int CurrentStreak { get; set; }
}