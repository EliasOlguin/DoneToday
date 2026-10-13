using System.Security.Claims;
using System.ComponentModel.DataAnnotations;
using DoneToday.Api.Data;
using DoneToday.Api.Entities;
using DoneToday.Api.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace DoneToday.Api.Controllers;

[ApiController]
[Route("api/auth/external")]
public class ExternalAuthController(UserManager<User> users, SignInManager<User> signIn,
    IConfiguration configuration, AppDbContext database) : ControllerBase
{
    [HttpGet("providers")]
    public async Task<IActionResult> Providers() => Ok(new {
        google = (await signIn.GetExternalAuthenticationSchemesAsync()).Any(s => s.Name == "Google")
    });

    [HttpGet("connections")]
    [Authorize(Policy = "ApplicationUser")]
    public async Task<IActionResult> Connections()
    {
        Response.Headers.CacheControl = "no-store";
        var user = await users.GetUserAsync(User);
        if (user is null) return Unauthorized();
        return Ok(new { google = (await users.GetLoginsAsync(user)).Any(login => login.LoginProvider == "Google"),
            hasPassword = await users.HasPasswordAsync(user), twoFactor = user.TwoFactorEnabled });
    }

    [HttpPost("google")]
    [ValidateCsrf]
    [EnableRateLimiting("authentication")]
    public async Task<IActionResult> Google()
    {
        if (!await GoogleEnabled()) return NotFound();
        await HttpContext.SignOutAsync(IdentityConstants.ExternalScheme);
        return Challenge(signIn.ConfigureExternalAuthenticationProperties("Google", "/api/auth/external/callback"), "Google");
    }

    [HttpPost("link-google")]
    [Authorize(Policy = "ApplicationUser")]
    [ValidateCsrf]
    [EnableRateLimiting("authentication")]
    public async Task<IActionResult> LinkGoogle([FromForm] ExternalLinkRequest request)
    {
        if (!await GoogleEnabled()) return NotFound();
        var user = await users.GetUserAsync(User);
        if (user is null) return Unauthorized();
        var password = await signIn.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);
        if (!password.Succeeded || (user.TwoFactorEnabled &&
            !await users.VerifyTwoFactorTokenAsync(user, users.Options.Tokens.AuthenticatorTokenProvider,
                (request.Code ?? "").Replace(" ", "").Replace("-", ""))))
            return Back("/settings/connections", "verification");
        await HttpContext.SignOutAsync(IdentityConstants.ExternalScheme);
        var properties = signIn.ConfigureExternalAuthenticationProperties("Google", "/api/auth/external/callback", user.Id.ToString());
        properties.Items["linkUserId"] = user.Id.ToString();
        return Challenge(properties, "Google");
    }

    [HttpGet("callback")]
    public async Task<IActionResult> Callback()
    {
        Response.Headers.CacheControl = "no-store";
        try
        {
            var ticket = await HttpContext.AuthenticateAsync(IdentityConstants.ExternalScheme);
            string? linkUserId = null;
            ticket.Properties?.Items.TryGetValue("linkUserId", out linkUserId);
            var info = await signIn.GetExternalLoginInfoAsync(linkUserId);
            if (info is null || info.LoginProvider != "Google" || !GoogleAuthentication.HasVerifiedEmail(info.Principal))
                return Back("/login", "failed");
            if (linkUserId is not null)
            {
                var user = await users.GetUserAsync(User);
                if (user is null || user.Id.ToString() != linkUserId) return Back("/login", "failed");
                var result = await users.AddLoginAsync(user, info);
                if (!result.Succeeded) return Back("/settings/connections", "linkFailed");
                await users.UpdateSecurityStampAsync(user);
                await signIn.RefreshSignInAsync(user);
                return Back("/settings/connections");
            }
            var existing = await users.FindByLoginAsync(info.LoginProvider, info.ProviderKey);
            if (existing is not null)
            {
                var result = await signIn.ExternalLoginSignInAsync(info.LoginProvider, info.ProviderKey,
                    isPersistent: false, bypassTwoFactor: false);
                if (result.RequiresTwoFactor)
                {
                    await HttpContext.SignOutAsync(IdentityConstants.ApplicationScheme);
                    return Redirect(new Uri(GoogleAuthentication.Frontend(configuration), "/login?twoFactor=1").AbsoluteUri);
                }
                return result.Succeeded ? Back("/today") : Back("/login", "failed");
            }
            var email = info.Principal.FindFirstValue(ClaimTypes.Email)!;
            if (await users.FindByEmailAsync(email) is not null) return Back("/login", "existingAccount");
            await using var transaction = await database.Database.BeginTransactionAsync();
            var newUser = new User { UserName = email, Email = email, EmailConfirmed = true };
            if (!(await users.CreateAsync(newUser)).Succeeded) return Back("/login", "failed");
            if (!(await users.AddLoginAsync(newUser, info)).Succeeded) return Back("/login", "failed");
            await transaction.CommitAsync();
            await signIn.SignInAsync(newUser, isPersistent: false, authenticationMethod: info.LoginProvider);
            return Back("/today");
        }
        catch (DbUpdateException) { return Back("/login", "failed"); }
        finally { await HttpContext.SignOutAsync(IdentityConstants.ExternalScheme); }
    }

    private async Task<bool> GoogleEnabled() =>
        (await signIn.GetExternalAuthenticationSchemesAsync()).Any(s => s.Name == "Google");
    private IActionResult Back(string path, string? error = null) =>
        Redirect(new Uri(GoogleAuthentication.Frontend(configuration),
            path + (error is null ? "" : "?externalError=" + Uri.EscapeDataString(error))).AbsoluteUri);
}
public record ExternalLinkRequest([Required, MaxLength(128)] string Password, [MaxLength(100)] string? Code);
