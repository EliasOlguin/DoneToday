using DoneToday.Api.Data;
using DoneToday.Api.Dtos.Habits;
using DoneToday.Api.Entities;
using DoneToday.Dtos.Habits;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DoneToday.Api.Services;

namespace DoneToday.Api.Controllers;

[ApiController]
[ValidateCsrf]
[Route("api/[controller]")]
public class HabitsController : AuthenticatedController
{
    private readonly AppDbContext _context;
    private readonly UserDateService _dates;

    public HabitsController(AppDbContext context, UserDateService dates)
    {
        _context = context;
        _dates = dates;
    }

    [HttpPost]
    public async Task<ActionResult<HabitResponse>> CreateHabit(
        CreateHabitRequest request)
    {
        var userId = CurrentUserId;
        var today = await _dates.GetTodayAsync(userId);
        await using var transaction = await _context.Database.BeginTransactionAsync(HttpContext.RequestAborted);
        await _context.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock(71355, {userId})", HttpContext.RequestAborted);
        if (await _context.Habits.CountAsync(h => h.UserId == userId, HttpContext.RequestAborted) >= ApiSecurity.MaximumHabits)
            return StatusCode(429, new { code = "habitQuota" });
        var habit = new Habit
        {
            UserId = userId,
            SortOrder = (await _context.Habits.Where(h => h.UserId == userId)
                .MaxAsync(h => (int?)h.SortOrder) ?? -1) + 1,
            Name = request.Name,
            Description = request.Description,
            Color = request.Color,
            Icon = request.Icon,
            CreatedAt = DateTimeOffset.UtcNow,
            IsArchived = false,
            Schedules = request.DaysOfWeek
                .Distinct()
                .Select(day => new HabitSchedule
                {
                    DayOfWeek = day,
                    ValidFrom = today,
                    ValidTo = null
                })
                .ToList()
        };

        if (request.GoalTarget.HasValue) HabitGoalService.Configure(habit, request.GoalTarget, request.GoalUnit, today);
        _context.Habits.Add(habit);

        await _context.SaveChangesAsync();
        await transaction.CommitAsync(HttpContext.RequestAborted);
        var response = new HabitResponse
        {
            Id = habit.Id,
            Name = habit.Name,
            Description = habit.Description,
            Color = habit.Color, Icon = habit.Icon, GoalTarget = habit.GoalTarget, GoalUnit = habit.GoalUnit, GoalEffectiveFrom = habit.GoalEffectiveFrom,
            IsArchived = habit.IsArchived,
            CreatedAt = habit.CreatedAt,
            DaysOfWeek = habit.Schedules
        .Select(s => s.DayOfWeek)
        .ToList()
        };

        return CreatedAtAction(
            nameof(GetHabit),
            new { id = response.Id },
            response
            );
    }
    [HttpPost("order")]
    public async Task<IActionResult> SaveOrder(OrderHabitsRequest request)
    {
        var habits = await _context.Habits.Where(h => h.UserId == CurrentUserId && !h.IsArchived).ToListAsync();
        if (!HabitOrderService.TryApply(habits, request.Ids)) return Conflict();
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<HabitResponse>> GetHabit(int id)
    {
        var userId = CurrentUserId;

        var habit = await _context.Habits
            .AsNoTracking()
            .Include(h => h.Schedules)
            .FirstOrDefaultAsync(h =>
                h.Id == id &&
                h.UserId == userId &&
                !h.IsArchived);

        if (habit is null)
        {
            return NotFound();
        }

        var response = new HabitResponse
        {
            Id = habit.Id,
            Name = habit.Name,
            Description = habit.Description,
            Color = habit.Color, Icon = habit.Icon, GoalTarget = habit.GoalTarget, GoalUnit = habit.GoalUnit, GoalEffectiveFrom = habit.GoalEffectiveFrom,
            IsArchived = habit.IsArchived,
            CreatedAt = habit.CreatedAt,
            DaysOfWeek = habit.Schedules
                .Where(s => s.ValidTo == null)
                .Select(s => s.DayOfWeek)
                .ToList()
        };

        return Ok(response);
    }
    [HttpGet]
    public async Task<ActionResult<List<HabitResponse>>> GetHabits()
    {
        var userId = CurrentUserId;

        var habits = await _context.Habits
            .AsNoTracking()
            .Where(h =>
                h.UserId == userId &&
                !h.IsArchived)
            .Include(h => h.Schedules)
            .OrderBy(h => h.SortOrder).ThenBy(h => h.CreatedAt).ThenBy(h => h.Id)
            .ToListAsync();

        var response = habits
            .Select(h => new HabitResponse
            {
                Id = h.Id,
                Name = h.Name,
                Description = h.Description,
                Color = h.Color, Icon = h.Icon, GoalTarget = h.GoalTarget, GoalUnit = h.GoalUnit, GoalEffectiveFrom = h.GoalEffectiveFrom,
                IsArchived = h.IsArchived,
                CreatedAt = h.CreatedAt,
                DaysOfWeek = h.Schedules
                    .Where(s => s.ValidTo == null)
                    .Select(s => s.DayOfWeek)
                    .ToList()
            })
            .ToList();

        return Ok(response);
    }
    [HttpPut("{id:int}")]
    public async Task<ActionResult<HabitResponse>> UpdateHabit(
    int id,
    UpdateHabitRequest request)
    {
        var userId = CurrentUserId;
        await using var transaction = await _context.Database.BeginTransactionAsync();
        if (!await _context.Habits.AnyAsync(h => h.Id == id && h.UserId == userId && !h.IsArchived, HttpContext.RequestAborted)) return NotFound();
        await _context.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock(71354, {id})", HttpContext.RequestAborted);

        var habit = await _context.Habits
            .Include(h => h.Schedules)
            .Include(h => h.Goals)
            .FirstOrDefaultAsync(h =>
                h.Id == id &&
                h.UserId == userId &&
                !h.IsArchived);

        if (habit is null)
        {
            return NotFound();
        }

        habit.Name = request.Name;
        habit.Description = request.Description;
        habit.Color = request.Color;
        habit.Icon = request.Icon;

        var today = await _dates.GetTodayAsync(userId);

        if (request.GoalSpecified && (habit.GoalTarget != request.GoalTarget || habit.GoalUnit != request.GoalUnit))
        {
            var removedGoals = HabitGoalService.Configure(habit, request.GoalTarget, request.GoalUnit, today.AddDays(1));
            _context.HabitGoals.RemoveRange(removedGoals);
        }

        var removedSchedules = HabitScheduleService.Update(habit, request.DaysOfWeek, today);
        _context.HabitSchedules.RemoveRange(removedSchedules);

        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        var response = new HabitResponse
        {
            Id = habit.Id,
            Name = habit.Name,
            Description = habit.Description,
            Color = habit.Color, Icon = habit.Icon, GoalTarget = habit.GoalTarget, GoalUnit = habit.GoalUnit, GoalEffectiveFrom = habit.GoalEffectiveFrom,
            IsArchived = habit.IsArchived,
            CreatedAt = habit.CreatedAt,
            DaysOfWeek = habit.Schedules
                .Where(s => s.ValidTo == null)
                .Select(s => s.DayOfWeek)
                .ToList()
        };

        return Ok(response);
    }
    [HttpGet("{id:int}/detail")]
    public async Task<ActionResult<HabitDetailResponse>> GetHabitDetail(int id,
        [FromServices] StreakService streakService)
    {
        var userId = CurrentUserId;
        var today = await _dates.GetTodayAsync(userId);
        var habit = await _context.Habits.AsNoTracking()
            .Include(h => h.Schedules).Include(h => h.Completions)
            .Include(h => h.Goals)
            .Include(h => h.Progress.Where(p => p.Date == today)).ThenInclude(p => p.Entries).AsSplitQuery()
            .FirstOrDefaultAsync(h => h.Id == id && h.UserId == userId && !h.IsArchived);
        if (habit is null) return NotFound();
        var active = habit.Schedules.Where(s => s.ValidTo == null).ToList();
        return Ok(new HabitDetailResponse
        {
            Id = habit.Id, Name = habit.Name, Description = habit.Description,
            Color = habit.Color, Icon = habit.Icon, GoalTarget = habit.GoalTarget, GoalUnit = habit.GoalUnit, GoalEffectiveFrom = habit.GoalEffectiveFrom, IsArchived = habit.IsArchived, CreatedAt = habit.CreatedAt,
            DaysOfWeek = active.Select(s => s.DayOfWeek).ToList(),
            ScheduleEffectiveFrom = active.Count == 0 ? null : active.Min(s => s.ValidFrom),
            CurrentStreak = streakService.CalculateCurrentStreak(habit, today),
            BestStreak = streakService.CalculateBestStreak(habit),
            Progress = HabitProgressResponse.ForDate(habit, today, true),
            CompletionDates = habit.Completions.Select(c => c.Date).OrderDescending().ToList()
        });
    }

    [HttpPatch("{id:int}/archive")]
    public async Task<IActionResult> ArchiveHabit(int id)
    {
        var userId = CurrentUserId;

        var habit = await _context.Habits
            .FirstOrDefaultAsync(h =>
                h.Id == id &&
                h.UserId == userId &&
                !h.IsArchived);

        if (habit is null)
        {
            return NotFound();
        }

        habit.IsArchived = true;
        habit.ArchivedAt = DateTimeOffset.UtcNow;

        await _context.SaveChangesAsync();

        return NoContent();
    }
    [HttpPatch("{id:int}/restore")]
    public async Task<IActionResult> RestoreHabit(int id)
    {
        var userId = CurrentUserId;

        var habit = await _context.Habits
            .FirstOrDefaultAsync(h =>
                h.Id == id &&
                h.UserId == userId &&
                h.IsArchived);

        if (habit is null)
        {
            return NotFound();
        }

        habit.IsArchived = false;
        habit.ArchivedAt = null;

        await _context.SaveChangesAsync();

        return NoContent();
    }
    [HttpGet("archived")]
    public async Task<ActionResult<List<HabitResponse>>> GetArchivedHabits()
    {
        var userId = CurrentUserId;

        var habits = await _context.Habits
            .AsNoTracking()
            .Where(h =>
                h.UserId == userId &&
                h.IsArchived)
            .Include(h => h.Schedules)
            .OrderByDescending(h => h.ArchivedAt)
            .ToListAsync();

        var response = habits
            .Select(h => new HabitResponse
            {
                Id = h.Id,
                Name = h.Name,
                Description = h.Description,
                Color = h.Color, Icon = h.Icon, GoalTarget = h.GoalTarget, GoalUnit = h.GoalUnit, GoalEffectiveFrom = h.GoalEffectiveFrom,
                IsArchived = h.IsArchived,
                CreatedAt = h.CreatedAt,
                DaysOfWeek = h.Schedules
                    .Where(s => s.ValidTo == null)
                    .Select(s => s.DayOfWeek)
                    .ToList()
            })
            .ToList();

        return Ok(response);
    }
    [HttpPost("{id:int}/complete")]
    public async Task<IActionResult> CompleteHabit(int id)
    {
        var userId = CurrentUserId;

        var habit = await _context.Habits
            .Include(h => h.Schedules)
            .Include(h => h.Goals)
            .FirstOrDefaultAsync(h =>
                h.Id == id &&
                h.UserId == userId &&
                !h.IsArchived);

        if (habit is null)
        {
            return NotFound();
        }

        var today = await _dates.GetTodayAsync(userId);

        if (HabitGoalService.ForDate(habit, today)?.Target is not null) return Conflict(new { code = "measuredHabit" });
        if (!HabitGoalService.Scheduled(habit, today)) return Conflict(new { code = "notScheduled" });

        var alreadyCompleted = await _context.HabitCompletions
            .AnyAsync(c =>
                c.HabitId == id &&
                c.Date == today);

        if (alreadyCompleted)
        {
            return Conflict("Habit already completed today.");
        }

        var completion = new HabitCompletion
        {
            HabitId = id,
            Date = today,
            CompletedAt = DateTimeOffset.UtcNow
        };

        _context.HabitCompletions.Add(completion);

        await _context.SaveChangesAsync();

        return NoContent();
    }
    [HttpDelete("{id:int}/complete")]
    public async Task<IActionResult> UndoCompletion(int id)
    {
        var userId = CurrentUserId;

        var habit = await _context.Habits
            .Include(h => h.Goals)
            .FirstOrDefaultAsync(h =>
                h.Id == id &&
                h.UserId == userId &&
                !h.IsArchived);

        if (habit is null)
        {
            return NotFound();
        }

        var today = await _dates.GetTodayAsync(userId);

        if (HabitGoalService.ForDate(habit, today)?.Target is not null) return Conflict(new { code = "measuredHabit" });

        var completion = await _context.HabitCompletions
            .FirstOrDefaultAsync(c =>
                c.HabitId == id &&
                c.Date == today);

        if (completion is null)
        {
            return NotFound();
        }

        _context.HabitCompletions.Remove(completion);

        await _context.SaveChangesAsync();

        return NoContent();
    }
}
