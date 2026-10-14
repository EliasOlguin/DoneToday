using DoneToday.Api.Entities;
using DoneToday.Api.Services;

namespace DoneToday.Api.Dtos.Habits;

public record ProgressEntryResponse(int Id, decimal Amount, decimal ResultingAmount, bool IsCorrection, DateTimeOffset CreatedAt);
public record HabitProgressResponse(DateOnly Date, decimal Target, string Unit, decimal Amount, int Revision, bool IsScheduled,
    List<ProgressEntryResponse> Entries)
{
    public static HabitProgressResponse? ForDate(Habit habit, DateOnly today, bool includeEntries = false)
    {
        var goal = HabitGoalService.ForDate(habit, today);
        if (goal?.Target is null || goal.Unit is null) return null;
        var progress = habit.Progress.FirstOrDefault(p => p.Date == today);
        return new(today, progress?.Target ?? goal.Target.Value, progress?.Unit ?? goal.Unit, progress?.Amount ?? 0,
            progress?.Revision ?? 0, HabitGoalService.Scheduled(habit, today),
            includeEntries && progress is not null ? progress.Entries.OrderByDescending(e => e.CreatedAt).ThenByDescending(e => e.Id)
                .Select(e => new ProgressEntryResponse(e.Id, e.Amount, e.ResultingAmount, e.IsCorrection, e.CreatedAt)).ToList() : []);
    }
}

public record RecordHabitProgressRequest(decimal Amount, DateOnly Date, Guid OperationId, int? ExpectedRevision = null);
