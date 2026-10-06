namespace DoneToday.Api.Services;

public class WeeklyProgressResult
{
    public int Scheduled { get; set; }

    public int Completed { get; set; }

    public double CompletionRate { get; set; }

    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public List<DailyProgressResult> Days { get; set; } = [];
    public List<HabitProgressResult> Habits { get; set; } = [];

}

public class DailyProgressResult
{
    public DateOnly Date { get; set; }
    public int Scheduled { get; set; }
    public int Completed { get; set; }
}

public class HabitProgressResult
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Color { get; set; }
    public int Scheduled { get; set; }
    public int Completed { get; set; }
    public double CompletionRate { get; set; }
}
