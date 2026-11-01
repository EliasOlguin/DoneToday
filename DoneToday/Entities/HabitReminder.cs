namespace DoneToday.Api.Entities;

public class HabitReminder
{
    public int HabitId { get; set; }
    public Habit Habit { get; set; } = null!;
    public int UserId { get; set; }
    public bool Enabled { get; set; }
    public TimeOnly Time { get; set; } = new(18, 0);
    public DateOnly? SnoozedDate { get; set; }
    public DateTimeOffset? SnoozedUntil { get; set; }
}
