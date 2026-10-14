namespace DoneToday.Api.Entities;

public class HabitProgressEntry
{
    public int Id { get; set; }
    public int HabitDayProgressId { get; set; }
    public int HabitId { get; set; }
    public Guid OperationId { get; set; }
    public decimal Amount { get; set; }
    public decimal ResultingAmount { get; set; }
    public bool IsCorrection { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public HabitDayProgress Progress { get; set; } = null!;
}
