using DoneToday.Api.Entities;

public class HabitSchedule
{
    public int Id { get; set; }

    public int HabitId { get; set; }

    public DayOfWeek DayOfWeek { get; set; }

    public DateOnly ValidFrom { get; set; }

    public DateOnly? ValidTo { get; set; }

    public Habit Habit { get; set; } = null!;
}