namespace DoneToday.Api.Entities;

public class HabitDayProgress
{
    public int Id { get; set; }
    public int HabitId { get; set; }
    public DateOnly Date { get; set; }
    public decimal Target { get; set; }
    public string Unit { get; set; } = "";
    public decimal Amount { get; set; }
    public int Revision { get; set; }
    public Habit Habit { get; set; } = null!;
    public ICollection<HabitProgressEntry> Entries { get; set; } = new List<HabitProgressEntry>();
}
