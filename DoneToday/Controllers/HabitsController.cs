using DoneToday.Api.Data;
using DoneToday.Api.Dtos.Habits;
using DoneToday.Api.Entities;
using DoneToday.Dtos.Habits;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DoneToday.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HabitsController : ControllerBase
{
    private readonly AppDbContext _context;

    public HabitsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpPost]
    public async Task<ActionResult<HabitResponse>> CreateHabit(
        CreateHabitRequest request)
    {
        const int userId = 1;
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var habit = new Habit
        {
            UserId = userId,
            Name = request.Name,
            Description = request.Description,
            Color = request.Color,
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

        _context.Habits.Add(habit);

        await _context.SaveChangesAsync();
        var response = new HabitResponse
        {
            Id = habit.Id,
            Name = habit.Name,
            Description = habit.Description,
            Color = habit.Color,
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
    [HttpGet("{id:int}")]
    public async Task<ActionResult<HabitResponse>> GetHabit(int id)
    {
        const int userId = 1;

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
            Color = habit.Color,
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
        const int userId = 1;

        var habits = await _context.Habits
            .AsNoTracking()
            .Where(h =>
                h.UserId == userId &&
                !h.IsArchived)
            .Include(h => h.Schedules)
            .OrderBy(h => h.CreatedAt)
            .ToListAsync();

        var response = habits
            .Select(h => new HabitResponse
            {
                Id = h.Id,
                Name = h.Name,
                Description = h.Description,
                Color = h.Color,
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
        const int userId = 1;

        var habit = await _context.Habits
            .Include(h => h.Schedules)
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

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var activeSchedules = habit.Schedules
            .Where(s => s.ValidTo == null)
            .ToList();

        foreach (var schedule in activeSchedules)
        {
            schedule.ValidTo = today;
        }
        var newSchedules = request.DaysOfWeek
            .Distinct()
            .Select(day => new HabitSchedule
            {
                HabitId = habit.Id,
                DayOfWeek = day,
                ValidFrom = today.AddDays(1),
                ValidTo = null
            })
            .ToList();

        _context.HabitSchedules.AddRange(newSchedules);

        habit.Schedules = request.DaysOfWeek
            .Distinct()
            .Select(day => new HabitSchedule
            {
                DayOfWeek = day
            })
            .ToList();

        await _context.SaveChangesAsync();

        var response = new HabitResponse
        {
            Id = habit.Id,
            Name = habit.Name,
            Description = habit.Description,
            Color = habit.Color,
            IsArchived = habit.IsArchived,
            CreatedAt = habit.CreatedAt,
            DaysOfWeek = habit.Schedules
                .Where(s => s.ValidTo == null)
                .Select(s => s.DayOfWeek)
                .ToList()
        };

        return Ok(response);
    }
    [HttpPatch("{id:int}/archive")]
    public async Task<IActionResult> ArchiveHabit(int id)
    {
        const int userId = 1;

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
        const int userId = 1;

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
        const int userId = 1;

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
                Color = h.Color,
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
        const int userId = 1;

        var habit = await _context.Habits
            .Include(h => h.Schedules)
            .FirstOrDefaultAsync(h =>
                h.Id == id &&
                h.UserId == userId &&
                !h.IsArchived);

        if (habit is null)
        {
            return NotFound();
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

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
        const int userId = 1;

        var habit = await _context.Habits
            .FirstOrDefaultAsync(h =>
                h.Id == id &&
                h.UserId == userId &&
                !h.IsArchived);

        if (habit is null)
        {
            return NotFound();
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

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