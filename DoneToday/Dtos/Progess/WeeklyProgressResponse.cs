namespace DoneToday.Api.Dtos.Progress;

public class WeeklyProgressResponse
{
    public int Scheduled { get; set; }

    public int Completed { get; set; }

    public double CompletionRate { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public List<DoneToday.Api.Services.DailyProgressResult> Days { get; set; } = [];
    public List<DoneToday.Api.Services.HabitProgressResult> Habits { get; set; } = [];
}
