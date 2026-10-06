using DoneToday.Api.Data;
using DoneToday.Api.Dtos.Progress;
using DoneToday.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DoneToday.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProgressController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ProgressService _progressService;

    public ProgressController(
        AppDbContext context,
        ProgressService progressService)
    {
        _context = context;
        _progressService = progressService;
    }

    [HttpGet("week")]
    public async Task<ActionResult<WeeklyProgressResponse>>
        GetWeeklyProgress()
    {
        const int userId = 1;

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var habits = await _context.Habits
            .AsNoTracking()
            .Where(h =>
                h.UserId == userId &&
                !h.IsArchived)
            .Include(h => h.Schedules)
            .Include(h => h.Completions)
            .ToListAsync();

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
