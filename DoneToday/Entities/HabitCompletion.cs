namespace DoneToday.Api.Entities;

public class HabitCompletion
{
    public int Id { get; set; }

    public int HabitId { get; set; }

    public DateOnly Date { get; set; }

    public DateTimeOffset CompletedAt { get; set; }

    public Habit Habit { get; set; } = null!;
}