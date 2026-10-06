namespace DoneToday.Dtos.Habits;

public class HabitDetailResponse : HabitResponse
{
    public int CurrentStreak { get; set; }
    public int BestStreak { get; set; }
    public List<DateOnly> CompletionDates { get; set; } = [];
    public DateOnly? ScheduleEffectiveFrom { get; set; }
}
