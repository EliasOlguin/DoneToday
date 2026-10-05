namespace DoneToday.Api.Services;

public class WeeklyProgressResult
{
    public int Scheduled { get; set; }

    public int Completed { get; set; }

    public double CompletionRate { get; set; }

}
