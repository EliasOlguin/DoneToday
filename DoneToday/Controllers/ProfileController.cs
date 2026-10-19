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
public class ProfileController(AppDbContext context, UserManager<User> users, SignInManager<User> signIn,
    SensitiveActionVerifier verification, DeleteAccountVerification deleteVerification) : AuthenticatedController
{
    [HttpPost("name")]
    public async Task<IActionResult> SetName(ProfileNameRequest request)
    {
        var name = request.DisplayName?.Trim();
        await context.Users.Where(u => u.Id == CurrentUserId)
            .ExecuteUpdateAsync(update => update.SetProperty(u => u.DisplayName, string.IsNullOrEmpty(name) ? null : name));
        return Ok(new { displayName = string.IsNullOrEmpty(name) ? null : name });
    }

    [HttpPost("guest/delete")]
    [EnableRateLimiting("authentication")]
    public async Task<IActionResult> DeleteGuest(GuestDeleteRequest request)
    {
        var user = await users.GetUserAsync(User);
        if (!request.Confirm || user is null || !user.IsGuest || await users.HasPasswordAsync(user) ||
            (await users.GetLoginsAsync(user)).Count != 0) return BadRequest();
        if (!(await users.DeleteAsync(user)).Succeeded) return BadRequest();
        GuestRegistration.Clear(HttpContext);
        await signIn.SignOutAsync();
        return NoContent();
    }

    [HttpPost("delete")]
    [EnableRateLimiting("authentication")]
    public async Task<IActionResult> DeleteAccount(DeleteAccountRequest request)
    {
        var user = await users.GetUserAsync(User);
        if (user is null) return Unauthorized();
        if (!string.Equals(request.Email.Trim(), user.Email, StringComparison.OrdinalIgnoreCase)) return BadRequest();
        if (!await verification.CanAttempt(user)) return StatusCode(429);
        var hasPassword = await users.HasPasswordAsync(user);
        if (hasPassword && !await verification.Password(user, request.Password)) return BadRequest();
        if (!hasPassword && !deleteVerification.Check(user, Request.Cookies[DeleteAccountVerification.CookieName]))
            return StatusCode(403, new { code = "reauthenticationRequired" });
        if (user.TwoFactorEnabled && !await verification.Code(user, request.AuthenticatorCode)) return BadRequest();
        if (!hasPassword && !deleteVerification.Check(user, Request.Cookies[DeleteAccountVerification.CookieName], consume: true))
            return StatusCode(403, new { code = "reauthenticationRequired" });
        var result = await users.DeleteAsync(user);
        if (!result.Succeeded) return BadRequest();
        await verification.Complete(user);
        Response.Cookies.Delete(DeleteAccountVerification.CookieName, DeleteAccountVerification.Cookie);
        await signIn.SignOutAsync();
        return NoContent();
    }
    [HttpGet("delete-verification")]
    [EnableRateLimiting("authentication")]
    public async Task<IActionResult> DeleteVerification()
    {
        var user = await users.GetUserAsync(User);
        return user is null ? Unauthorized() : Ok(new { verified = deleteVerification.Check(user, Request.Cookies[DeleteAccountVerification.CookieName]) });
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
public record DeleteAccountRequest([Required, EmailAddress, MaxLength(256)] string Email,
    [MaxLength(128)] string? Password, [MaxLength(100)] string? AuthenticatorCode);

public record GuestDeleteRequest(bool Confirm);
