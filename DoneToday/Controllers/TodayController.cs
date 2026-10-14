using DoneToday.Api.Data;
using DoneToday.Api.Dtos.Today;
using DoneToday.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DoneToday.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TodayController : AuthenticatedController
{
    private readonly AppDbContext _context;
    private readonly UserDateService _dates;
    private readonly StreakService _streakService;
    public TodayController(AppDbContext context,StreakService streakService, UserDateService dates)
    {
        _context = context;
        _dates = dates;
        _streakService = streakService;
    }

    [HttpGet]
    public async Task<ActionResult<List<TodayHabitResponse>>> GetToday()
    {
        var userId = CurrentUserId;

        var today = await _dates.GetTodayAsync(userId);
        var dayOfWeek = today.DayOfWeek;

        var habits = await _context.Habits
            .AsNoTracking()
            .Where(h =>
                h.UserId == userId &&
                !h.IsArchived)
            .Include(h => h.Schedules)
            .Include(h => h.Completions)
            .Include(h => h.Goals)
            .Include(h => h.Progress.Where(p => p.Date == today))
            .AsSplitQuery()
            .OrderBy(h => h.SortOrder).ThenBy(h => h.CreatedAt).ThenBy(h => h.Id)
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
                Color = h.Color, Icon = h.Icon,
                IsCompleted = h.Completions.Any(c => c.Date == today),
                Progress = Dtos.Habits.HabitProgressResponse.ForDate(h, today),
                CurrentStreak = _streakService.CalculateCurrentStreak(h, today),
                BestStreak = _streakService.CalculateBestStreak(h)
            })
            .ToList();

        return Ok(response);
    }
}
