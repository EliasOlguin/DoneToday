using System.ComponentModel.DataAnnotations;
using DoneToday.Api.Data;
using DoneToday.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using DoneToday.Api.Entities;

namespace DoneToday.Api.Controllers;

[ApiController]
[Route("api/profile")]
[ValidateCsrf]
public class ProfileController(AppDbContext context, UserManager<User> users, SignInManager<User> signIn) : AuthenticatedController
{
    [HttpPost("name")]
    public async Task<IActionResult> SetName(ProfileNameRequest request)
    {
        var name = request.DisplayName?.Trim();
        await context.Users.Where(u => u.Id == CurrentUserId)
            .ExecuteUpdateAsync(update => update.SetProperty(u => u.DisplayName, string.IsNullOrEmpty(name) ? null : name));
        return Ok(new { displayName = string.IsNullOrEmpty(name) ? null : name });
    }

    [HttpPost("delete")]
    [EnableRateLimiting("authentication")]
    public async Task<IActionResult> DeleteAccount(DeleteAccountRequest request)
    {
        var user = await users.GetUserAsync(User);
        if (user is null) return Unauthorized();
        if (!string.Equals(request.Email.Trim(), user.Email, StringComparison.OrdinalIgnoreCase)) return BadRequest();
        if (await users.HasPasswordAsync(user) &&
            (string.IsNullOrEmpty(request.Password) || !await users.CheckPasswordAsync(user, request.Password))) return BadRequest();
        if (user.TwoFactorEnabled && !await users.VerifyTwoFactorTokenAsync(user,
            TokenOptions.DefaultAuthenticatorProvider, request.AuthenticatorCode?.Replace(" ", "").Replace("-", "") ?? "")) return BadRequest();
        var result = await users.DeleteAsync(user);
        if (!result.Succeeded) return BadRequest();
        await signIn.SignOutAsync();
        return NoContent();
    }
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
public record ProfileNameRequest
{
    [MaxLength(60)] public string? DisplayName { get; init; }
}
public record DeleteAccountRequest([Required, EmailAddress] string Email, string? Password, string? AuthenticatorCode);
