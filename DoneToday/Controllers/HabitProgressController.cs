using DoneToday.Api.Data;
using DoneToday.Api.Dtos.Habits;
using DoneToday.Api.Entities;
using DoneToday.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DoneToday.Api.Controllers;

[ApiController]
[ValidateCsrf]
[Route("api/Habits/{id:int}/progress")]
public class HabitProgressController(AppDbContext db, UserDateService dates) : AuthenticatedController
{
    [HttpPost]
    public Task<ActionResult<HabitProgressResponse>> Add(int id, RecordHabitProgressRequest request) => Write(id, request, false);
    [HttpPut]
    public Task<ActionResult<HabitProgressResponse>> Correct(int id, RecordHabitProgressRequest request) => Write(id, request, true);

    private async Task<ActionResult<HabitProgressResponse>> Write(int id, RecordHabitProgressRequest request, bool correction)
    {
        if (!await db.Habits.AnyAsync(h => h.Id == id && h.UserId == CurrentUserId && !h.IsArchived)) return NotFound();
        var today = await dates.GetTodayAsync(CurrentUserId);
        await using var transaction = await db.Database.BeginTransactionAsync();
        // Serialize edits and quantity writes for a habit, including the first record of a day.
        await db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock(71354, {id})");
        var habit = await db.Habits.Include(h => h.Goals).Include(h => h.Schedules).Include(h => h.Completions)
            .Include(h => h.Progress.Where(p => p.Date == today)).ThenInclude(p => p.Entries).AsSplitQuery()
            .SingleOrDefaultAsync(h => h.Id == id && h.UserId == CurrentUserId && !h.IsArchived);
        if (habit is null) return NotFound();
        if (request.OperationId == Guid.Empty) return BadRequest();
        if (request.Date != today) return Conflict(new { code = "dayChanged" });
        // A retried request must never count twice, even if midnight has passed.
        if (await db.HabitProgressEntries.AnyAsync(e => e.HabitId == id && e.OperationId == request.OperationId))
            return Ok(HabitProgressResponse.ForDate(habit, today, true));
        var goal = HabitGoalService.ForDate(habit, today);
        if (goal?.Target is null || goal.Unit is null) return Conflict(new { code = "notMeasured" });
        if (!HabitGoalService.Scheduled(habit, today)) return Conflict(new { code = "notScheduled" });
        if (!HabitGoalService.ValidAmount(request.Amount, goal.Unit, correction)) return BadRequest();
        var progress = habit.Progress.SingleOrDefault(p => p.Date == today);
        if (correction && request.ExpectedRevision != (progress?.Revision ?? 0)) return Conflict(new { code = "progressChanged" });
        var amount = correction ? request.Amount : (progress?.Amount ?? 0) + request.Amount;
        if (amount > HabitGoalService.Maximum) return BadRequest();
        if (progress is null)
        {
            progress = new HabitDayProgress { Date = today, Target = goal.Target.Value, Unit = goal.Unit };
            habit.Progress.Add(progress);
        }
        var previous = progress.Amount;
        progress.Amount = amount;
        progress.Revision++;
        progress.Entries.Add(new HabitProgressEntry { HabitId = id, OperationId = request.OperationId,
            Amount = amount - previous, ResultingAmount = amount, IsCorrection = correction, CreatedAt = DateTimeOffset.UtcNow });
        HabitGoalService.SyncCompletion(habit, progress, DateTimeOffset.UtcNow);
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        return Ok(HabitProgressResponse.ForDate(habit, today, true));
    }
}
