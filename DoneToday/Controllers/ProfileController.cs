using System.ComponentModel.DataAnnotations;
using DoneToday.Api.Data;
using DoneToday.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DoneToday.Api.Controllers;

[ApiController]
[Route("api/profile")]
[ValidateCsrf]
public class ProfileController(AppDbContext context) : AuthenticatedController
{
    [HttpPost("time-zone")]
    public async Task<IActionResult> SetTimeZone(TimeZoneRequest request)
    {
        if (!UserDateService.TryGetZone(request.TimeZoneId, out _))
            return BadRequest();
        // First-use detection must never overwrite a saved preference from another device.
        await context.Users.Where(u => u.Id == CurrentUserId &&
            (!request.InitializeOnly || u.TimeZoneId == null))
            .ExecuteUpdateAsync(update => update.SetProperty(u => u.TimeZoneId, request.TimeZoneId));
        var zone = await context.Users.Where(u => u.Id == CurrentUserId)
            .Select(u => u.TimeZoneId).SingleAsync();
        Response.Headers.CacheControl = "no-store";
        return Ok(new { timeZoneId = zone });
    }
}

public record TimeZoneRequest([Required, MaxLength(100)] string TimeZoneId, bool InitializeOnly = false);
