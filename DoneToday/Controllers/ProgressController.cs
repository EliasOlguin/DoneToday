using DoneToday.Api.Data;
using DoneToday.Api.Dtos.Progress;
using DoneToday.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DoneToday.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProgressController : AuthenticatedController
{
    private readonly AppDbContext _context;
    private readonly UserDateService _dates;
    private readonly ProgressService _progressService;

    public ProgressController(
        AppDbContext context,
        ProgressService progressService, UserDateService dates)
    {
        _context = context;
        _dates = dates;
        _progressService = progressService;
    }

    [HttpGet("month")]
    public async Task<ActionResult<MonthlyProgressResult>> GetMonth(int? year, int? month, int? habitId = null)
    {
        var today = await _dates.GetTodayAsync(CurrentUserId);
        var requestedYear = year ?? today.Year;
        var requestedMonth = month ?? today.Month;
        if (requestedYear is < 1900 or > 9998 || requestedMonth is < 1 or > 12) return BadRequest();
        var start = new DateOnly(requestedYear, requestedMonth, 1);
        if (start > today) return BadRequest();
        var habits = await StatisticsHabitFilter.ForUser(_context.Habits.AsNoTracking(), CurrentUserId, habitId)
            .Include(h => h.Schedules).Include(h => h.Completions).ToListAsync();
        if (habitId.HasValue && habits.Count == 0) return NotFound();
        return Ok(MonthlyProgressService.Calculate(habits, start, today));
    }

    [HttpGet("week")]
    public async Task<ActionResult<WeeklyProgressResponse>>
        GetWeeklyProgress(int? habitId = null)
    {
        var userId = CurrentUserId;

        var today = await _dates.GetTodayAsync(userId);

        var habits = await StatisticsHabitFilter.ForUser(_context.Habits.AsNoTracking(), userId, habitId)
            .Include(h => h.Schedules)
            .Include(h => h.Completions)
            .ToListAsync();

        if (habitId.HasValue && habits.Count == 0) return NotFound();
        var result = _progressService.CalculateWeeklyProgress(
            habits,
            today
        );

        var response = new WeeklyProgressResponse
        {
            Scheduled = result.Scheduled,
            Completed = result.Completed,
            CompletionRate = result.CompletionRate,
            StartDate = result.StartDate,
            EndDate = result.EndDate,
            Days = result.Days,
            Habits = result.Habits
        };

        return Ok(response);
    }
}
