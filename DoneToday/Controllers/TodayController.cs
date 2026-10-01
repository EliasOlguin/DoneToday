using DoneToday.Api.Data;
using DoneToday.Api.Dtos.Today;
using DoneToday.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DoneToday.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TodayController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly StreakService _streakService;
    public TodayController(AppDbContext context,StreakService streakService)
    {
        _context = context;
        _streakService = streakService;
    }

    [HttpGet]
    public async Task<ActionResult<List<TodayHabitResponse>>> GetToday()
    {
        const int userId = 1;

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var dayOfWeek = DateTime.UtcNow.DayOfWeek;

        var habits = await _context.Habits
            .AsNoTracking()
            .Where(h =>
                h.UserId == userId &&
                !h.IsArchived)
            .Include(h => h.Schedules)
            .Include(h => h.Completions)
            .ToListAsync();

        var response = habits
            .Where(h => h.Schedules.Any(s =>
                s.DayOfWeek == dayOfWeek &&
                s.ValidFrom <= today &&
                (s.ValidTo == null || s.ValidTo >= today)))
            .Select(h => new TodayHabitResponse
            {
                Id = h.Id,
                Name = h.Name,
                Color = h.Color,
                IsCompleted = h.Completions.Any(c => c.Date == today),
                CurrentStreak = _streakService.CalculateCurrentStreak(h, today)
            })
            .ToList();

        return Ok(response);
    }
}