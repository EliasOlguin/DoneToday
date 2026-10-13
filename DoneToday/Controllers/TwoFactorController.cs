using System.ComponentModel.DataAnnotations;
using DoneToday.Api.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace DoneToday.Api.Controllers;

[ApiController]
[Route("api/auth/two-factor")]
[ValidateCsrf]
[EnableRateLimiting("authentication")]
public class TwoFactorController(UserManager<User> users, SignInManager<User> signIn) : AuthenticatedController
{
    [HttpGet]
    public async Task<IActionResult> Status()
    {
        Response.Headers.CacheControl = "no-store";
        var user = await users.GetUserAsync(User);
        return user is null ? Unauthorized() : Ok(new {
            enabled = await users.GetTwoFactorEnabledAsync(user),
            recoveryCodesLeft = await users.CountRecoveryCodesAsync(user)
        });
    }

    [HttpPost("setup")]
    public async Task<IActionResult> Setup(PasswordVerification request)
    {
        Response.Headers.CacheControl = "no-store";
        var user = await VerifyPassword(request.Password);
        if (user is null) return BadRequest();
        if (await users.GetTwoFactorEnabledAsync(user)) return Conflict();
        var key = await users.GetAuthenticatorKeyAsync(user);
        if (string.IsNullOrEmpty(key))
        {
            var reset = await users.ResetAuthenticatorKeyAsync(user);
            if (!reset.Succeeded) return BadRequest();
            key = await users.GetAuthenticatorKeyAsync(user);
            await signIn.RefreshSignInAsync(user);
        }
        var uri = $"otpauth://totp/{Uri.EscapeDataString("DoneToday:" + user.Email)}?secret={key}&issuer=DoneToday&digits=6";
        return Ok(new { sharedKey = key, authenticatorUri = uri });
    }

    [HttpPost("enable")]
    public async Task<IActionResult> Enable(TwoFactorVerification request)
    {
        Response.Headers.CacheControl = "no-store";
        var user = await VerifyPassword(request.Password);
        if (user is null || await users.GetTwoFactorEnabledAsync(user) ||
            !await VerifyCode(user, request.Code)) return BadRequest();
        if (!(await users.SetTwoFactorEnabledAsync(user, true)).Succeeded) return BadRequest();
        var codes = await users.GenerateNewTwoFactorRecoveryCodesAsync(user, 10);
        await users.UpdateSecurityStampAsync(user);
        await signIn.RefreshSignInAsync(user);
        return Ok(new { recoveryCodes = codes });
    }

    [HttpPost("recovery-codes")]
    public async Task<IActionResult> RecoveryCodes(TwoFactorVerification request)
    {
        Response.Headers.CacheControl = "no-store";
        var user = await VerifyPassword(request.Password);
        if (user is null || !await users.GetTwoFactorEnabledAsync(user) ||
            !await VerifyCode(user, request.Code)) return BadRequest();
        var codes = await users.GenerateNewTwoFactorRecoveryCodesAsync(user, 10);
        return Ok(new { recoveryCodes = codes });
    }

    [HttpPost("disable")]
    public async Task<IActionResult> Disable(TwoFactorVerification request)
    {
        var user = await VerifyPassword(request.Password);
        if (user is null || !await users.GetTwoFactorEnabledAsync(user)) return BadRequest();
        var verified = request.RecoveryCode
            ? (await users.RedeemTwoFactorRecoveryCodeAsync(user, request.Code.Trim())).Succeeded
            : await VerifyCode(user, request.Code);
        if (!verified) return BadRequest();
        if (!(await users.SetTwoFactorEnabledAsync(user, false)).Succeeded) return BadRequest();
        await users.GenerateNewTwoFactorRecoveryCodesAsync(user, 0);
        await users.ResetAuthenticatorKeyAsync(user);
        await users.UpdateSecurityStampAsync(user);
        await signIn.RefreshSignInAsync(user);
        return NoContent();
    }

    private async Task<User?> VerifyPassword(string password)
    {
        var user = await users.GetUserAsync(User);
        if (user is null) return null;
        var result = await signIn.CheckPasswordSignInAsync(user, password, lockoutOnFailure: true);
        return result.Succeeded ? user : null;
    }

    private Task<bool> VerifyCode(User user, string code) => users.VerifyTwoFactorTokenAsync(user,
        users.Options.Tokens.AuthenticatorTokenProvider, code.Replace(" ", "").Replace("-", ""));
}

public record PasswordVerification([Required, MaxLength(128)] string Password);
public record TwoFactorVerification([Required, MaxLength(128)] string Password,
    [Required, MaxLength(100)] string Code, bool RecoveryCode = false);
public record TwoFactorLoginRequest([Required, MaxLength(100)] string Code, bool RecoveryCode = false);
