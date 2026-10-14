namespace DoneToday.Api.Entities;

public class HabitGoal
{
    public int Id { get; set; }
    public int HabitId { get; set; }
    public decimal? Target { get; set; }
    public string? Unit { get; set; }
    public DateOnly ValidFrom { get; set; }
    public DateOnly? ValidTo { get; set; }
    public Habit Habit { get; set; } = null!;
}
