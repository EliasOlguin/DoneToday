namespace DoneToday.Api.Dtos.Progress;

public class WeeklyProgressResponse
{
    public int Scheduled { get; set; }

    public int Completed { get; set; }

    public double CompletionRate { get; set; }
}