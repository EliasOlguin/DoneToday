using System.ComponentModel.DataAnnotations;
using System.Text;
using DoneToday.Api.Entities;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication;
using DoneToday.Api.Services.Email;
using DoneToday.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace DoneToday.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(UserManager<User> users, SignInManager<User> signIn, IEmailSender<User> emailSender,
    IConfiguration configuration, IHostEnvironment environment, RecipientEmailThrottle emailThrottle, DoneToday.Api.Data.AppDbContext database,
    GuestRegistration guestRegistration, SensitiveActionVerifier verification, ILogger<AuthController> logger, DailyEmailBudget sendBudget) : ControllerBase
{
    [HttpPost("guest")]
    [EnableRateLimiting("guest")]
    [ValidateCsrf]
    public async Task<IActionResult> Guest()
    {
        if (User.Identity?.IsAuthenticated == true) return Ok();
        var key = Guid.NewGuid().ToString("N");
        string[] adjectives = ["Happy", "Brave", "Calm", "Bright", "Kind", "Curious"];
        string[] animals = ["Otter", "Fox", "Panda", "Owl", "Koala", "Dolphin"];
        var user = new User { UserName = "guest-" + key, Email = key + "@guest.invalid",
            DisplayName = adjectives[System.Security.Cryptography.RandomNumberGenerator.GetInt32(adjectives.Length)] +
                animals[System.Security.Cryptography.RandomNumberGenerator.GetInt32(animals.Length)] +
                System.Security.Cryptography.RandomNumberGenerator.GetInt32(1000, 10000) };
        await using (var transaction = await database.Database.BeginTransactionAsync(HttpContext.RequestAborted))
        {
            await database.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock(71357, {0})", HttpContext.RequestAborted);
            while (await GuestLifecycle.Unlinked(database.Users).CountAsync(HttpContext.RequestAborted) >= GuestLifecycle.MaximumAccounts)
            {
                var oldest = await GuestLifecycle.EmptyUnlinked(database).OrderBy(user => user.CreatedAt).ThenBy(user => user.Id)
                    .Select(user => user.Id).FirstOrDefaultAsync(HttpContext.RequestAborted);
                if (oldest == 0) return StatusCode(429, new { code = "guestCapacity" });
                // Lock before rechecking emptiness: concurrent habit inserts must not be deleted by cascade.
                await database.Database.ExecuteSqlInterpolatedAsync($"SELECT 1 FROM \"Users\" WHERE \"Id\" = {oldest} FOR UPDATE", HttpContext.RequestAborted);
                await GuestLifecycle.EmptyUnlinked(database).Where(user => user.Id == oldest).ExecuteDeleteAsync(HttpContext.RequestAborted);
            }
            if (!(await users.CreateAsync(user)).Succeeded) return BadRequest();
            await transaction.CommitAsync(HttpContext.RequestAborted);
        }
        await signIn.SignInAsync(user, isPersistent: true);
        return Ok();
    }

    [HttpPost("guest/register")]
    [Authorize(Policy = "ApplicationUser")]
    [EnableRateLimiting("authentication")]
    [ValidateCsrf]
    public async Task<IActionResult> RegisterGuest(RegisterRequest request)
    {
        var user = await users.GetUserAsync(User);
        if (user is null || !user.IsGuest) return BadRequest();
        // Validate without querying the recipient: existing and new addresses follow the same path.
        var errors = new List<string>();
        foreach (var validator in users.PasswordValidators)
        {
            var validation = await validator.ValidateAsync(users, user, request.Password);
            errors.AddRange(validation.Errors.Select(error => error.Code));
        }
        if (errors.Count > 0) return BadRequest(new { codes = errors });
        if (EmailCooldown("confirm", request.Email) is { } limited) return limited;
        var pending = guestRegistration.Begin(HttpContext, user, request.Email.Trim(),
            users.PasswordHasher.HashPassword(user, request.Password));
        return await SendGuestConfirmation(user, pending);
    }

    [HttpPost("guest/resend-confirmation")]
    [Authorize(Policy = "ApplicationUser")]
    [EnableRateLimiting("authentication")]
    [ValidateCsrf]
    public async Task<IActionResult> ResendGuest()
    {
        var user = await users.GetUserAsync(User);
        if (user is null) return Unauthorized();
        var pending = guestRegistration.ReadReceipt(HttpContext, user);
        if (pending is null) return BadRequest();
        if (EmailCooldown("confirm", pending.Email) is { } limited) return limited;
        return await SendGuestConfirmation(user, pending);
    }

    private async Task<IActionResult> SendGuestConfirmation(User user, GuestRegistration.Pending pending)
    {
        var link = BuildEmailLink("/confirm-email", user, guestRegistration.EmailCode(pending));
        link = QueryHelpers.AddQueryString(link, "guest", "1");
        return await DeliverConfirmation(user, pending.Email, link);
    }

    [HttpPost("forgot-password")]
    [EnableRateLimiting("authentication")]
    [ValidateCsrf]
    public async Task<IActionResult> ForgotPassword(EmailRequest request)
    {
        if (EmailCooldown("reset", request.Email) is { } limited) return limited;
        var user = await users.FindByEmailAsync(request.Email.Trim());
        if (user is null || !user.EmailConfirmed || !await users.HasPasswordAsync(user)) return Ok();
        if (!sendBudget.TryReserve()) return Ok();
        var token = await users.GeneratePasswordResetTokenAsync(user);
        var link = BuildEmailLink("/reset-password", user, token);
        try { await emailSender.SendPasswordResetLinkAsync(user, user.Email!, link); }
        catch (Exception exception) when (exception is IOException or MailKit.Net.Smtp.SmtpCommandException
            or MailKit.Net.Smtp.SmtpProtocolException or System.Net.Sockets.SocketException or HttpRequestException or TaskCanceledException)
        {
            // Keep the response identical for existing and unknown accounts.
            return Ok();
        }
        return Ok();
    }

    [HttpPost("reset-password")]
    [EnableRateLimiting("authentication")]
    [ValidateCsrf]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest request)
    {
        var user = await users.FindByIdAsync(request.UserId);
        if (user is null || !user.EmailConfirmed || !await users.HasPasswordAsync(user)) return BadRequest();
        string token;
        try { token = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(request.Code)); }
        catch (FormatException) { return BadRequest(); }
        var result = await users.ResetPasswordAsync(user, token, request.Password);
        if (!result.Succeeded) return BadRequest();
        // A password reset also releases the account's temporary lockout.
        await users.SetLockoutEndDateAsync(user, null);
        await users.ResetAccessFailedCountAsync(user);
        await signIn.SignOutAsync();
        return Ok();
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        Response.Headers.CacheControl = "no-store";
        var user = await users.GetUserAsync(User);
        return user is null ? Unauthorized() : Ok(new { user.Id, user.Email, user.TimeZoneId,
            user.DisplayName, user.IsGuest, hasPassword = await users.HasPasswordAsync(user), user.TwoFactorEnabled });
    }

    [HttpPost("login")]
    [EnableRateLimiting("authentication")]
    [ValidateCsrf]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        var user = await users.FindByEmailAsync(request.Email.Trim());
        if (user is null) return Unauthorized();
        var result = await signIn.PasswordSignInAsync(user, request.Password,
            isPersistent: true, lockoutOnFailure: true);
        if (result.RequiresTwoFactor)
        {
            await HttpContext.SignOutAsync(IdentityConstants.ApplicationScheme);
            return Ok(new { requiresTwoFactor = true });
        }
        if (!result.Succeeded) return Unauthorized();
        return Ok();
    }

    [HttpPost("logout")]
    [Authorize]
    [ValidateCsrf]
    public async Task<IActionResult> Logout()
    {
        var user = await users.GetUserAsync(User);
        if (user is not null && !(await users.UpdateSecurityStampAsync(user)).Succeeded) return StatusCode(503);
        GuestRegistration.Clear(HttpContext);
        await signIn.SignOutAsync();
        return NoContent();
    }

    [HttpPost("two-factor/login")]
    [EnableRateLimiting("authentication")]
    [ValidateCsrf]
    public async Task<IActionResult> TwoFactorLogin(TwoFactorLoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Code)) return BadRequest();
        var recoveryUser = request.RecoveryCode ? await signIn.GetTwoFactorAuthenticationUserAsync() : null;
        var result = request.RecoveryCode
            ? await signIn.TwoFactorRecoveryCodeSignInAsync(request.Code.Trim())
            : await signIn.TwoFactorAuthenticatorSignInAsync(request.Code.Replace(" ", "").Replace("-", ""),
                isPersistent: true, rememberClient: false);
        if (result.Succeeded && recoveryUser is not null)
            await signIn.SignInWithClaimsAsync(recoveryUser, isPersistent: true,
                [new System.Security.Claims.Claim("amr", "mfa")]);
        return result.Succeeded ? Ok() : Unauthorized();
    }

    [HttpGet("csrf")]
    public IActionResult Csrf([FromServices] IAntiforgery antiforgery)
    {
        Response.Headers.CacheControl = "no-store";
        return Ok(new { token = antiforgery.GetAndStoreTokens(HttpContext).RequestToken });
    }

    [HttpPost("register")]
    [EnableRateLimiting("registration")]
    [ValidateCsrf]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        var email = request.Email.Trim();
        var user = new User { UserName = email, Email = email };
        var errors = new List<string>();
        foreach (var validator in users.PasswordValidators)
        {
            var validation = await validator.ValidateAsync(users, user, request.Password);
            errors.AddRange(validation.Errors.Select(error => error.Code));
        }
        if (errors.Count > 0) return BadRequest(new { codes = errors });
        if (await users.FindByEmailAsync(email) is not null) { emailThrottle.Reserve("confirm", email); return Ok(); }
        var result = await users.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            return BadRequest(new { codes = result.Errors.Select(error => error.Code) });
        // Reserve only after successful validation/creation; invalid passwords do not
        // prevent the person correcting their signup immediately.
        if (emailThrottle.Reserve("confirm", email) > 0) return Ok();
        return await SendConfirmation(user);
    }

    [HttpPost("resend-confirmation")]
    [EnableRateLimiting("authentication")]
    [ValidateCsrf]
    public async Task<IActionResult> Resend(EmailRequest request)
    {
        if (EmailCooldown("confirm", request.Email) is { } limited) return limited;
        var user = await users.FindByEmailAsync(request.Email.Trim());
        return user is null || user.EmailConfirmed ? Ok() : await SendConfirmation(user);
    }

    [HttpPost("confirm-email")]
    [EnableRateLimiting("authentication")]
    [ValidateCsrf]
    public async Task<IActionResult> Confirm(ConfirmationRequest request)
    {
        var user = await users.FindByIdAsync(request.UserId);
        if (user is null) return BadRequest();
        string token;
        try { token = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(request.Code)); }
        catch (FormatException) { return BadRequest(); }
        if (token.StartsWith(GuestRegistration.CodePrefix, StringComparison.Ordinal))
            return await ConfirmGuest(user, token);
        // Validate email possession before consuming password/lockout attempts.
        if (user.IsGuest || user.EmailConfirmed || !await users.VerifyUserTokenAsync(user,
            users.Options.Tokens.EmailConfirmationTokenProvider, UserManager<User>.ConfirmEmailTokenPurpose, token)) return BadRequest();
        // Email possession must not activate credentials selected by somebody else.
        if (string.IsNullOrEmpty(request.Password) || !await verification.Password(user, request.Password)) return BadRequest();
        try
        {
            await using var transaction = await database.Database.BeginTransactionAsync(HttpContext.RequestAborted);
            await database.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock(71356, {user.Id})", HttpContext.RequestAborted);
            await database.Entry(user).ReloadAsync(HttpContext.RequestAborted);
            if (user.EmailConfirmed || !(await users.ConfirmEmailAsync(user, token)).Succeeded ||
                !(await users.UpdateSecurityStampAsync(user)).Succeeded) return BadRequest();
            await transaction.CommitAsync(HttpContext.RequestAborted);
        }
        catch (DbUpdateException) { return BadRequest(); }
        await verification.Complete(user);
        return Ok();
    }

    private async Task<IActionResult> ConfirmGuest(User user, string token)
    {
        if (users.GetUserId(User) != user.Id.ToString()) return BadRequest();
        var pending = guestRegistration.ReadEmail(token, HttpContext, user);
        if (pending is null) return BadRequest();
        try
        {
            await using var transaction = await database.Database.BeginTransactionAsync(HttpContext.RequestAborted);
            await database.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock(71356, {user.Id})", HttpContext.RequestAborted);
            await database.Entry(user).ReloadAsync(HttpContext.RequestAborted);
            // Revalidate after locking: logout, deletion, another confirmation or Google linking wins safely.
            if (guestRegistration.ReadEmail(token, HttpContext, user) is null ||
                await users.FindByEmailAsync(pending.Email) is not null) return BadRequest();
            user.UserName = pending.Email;
            user.Email = pending.Email;
            user.EmailConfirmed = true;
            user.PasswordHash = pending.PasswordHash;
            if (!(await users.UpdateSecurityStampAsync(user)).Succeeded) return BadRequest();
            await transaction.CommitAsync(HttpContext.RequestAborted);
        }
        catch (DbUpdateException) { return BadRequest(); }
        GuestRegistration.Clear(HttpContext);
        await signIn.SignInAsync(user, isPersistent: true);
        return Ok();
    }

    private async Task<IActionResult> SendConfirmation(User user)
    {
        var token = await users.GenerateEmailConfirmationTokenAsync(user);
        return await DeliverConfirmation(user, user.Email!, BuildEmailLink("/confirm-email", user, token));
    }

    private async Task<IActionResult> DeliverConfirmation(User user, string email, string link)
    {
        if (!sendBudget.TryReserve()) return Ok();
        try { await emailSender.SendConfirmationLinkAsync(user, email, link); }
        catch (Exception exception) when (exception is IOException or MailKit.Net.Smtp.SmtpCommandException
            or MailKit.Net.Smtp.SmtpProtocolException or System.Net.Sockets.SocketException or HttpRequestException or TaskCanceledException)
        {
            logger.LogWarning("Confirmation delivery failed ({FailureType}).", exception.GetType().Name);
            // Delivery failure cannot be used to determine whether the address has an account.
            return Ok();
        }
        return Ok();
    }

    private IActionResult? EmailCooldown(string purpose, string email)
    {
        var seconds = emailThrottle.Reserve(purpose, email);
        if (seconds == 0) return null;
        Response.Headers.RetryAfter = seconds.ToString(System.Globalization.CultureInfo.InvariantCulture);
        return StatusCode(429);
    }

    private string BuildEmailLink(string path, User user, string token)
    {
        var frontend = configuration["Authentication:FrontendUrl"];
        if (!Uri.TryCreate(frontend, UriKind.Absolute, out var uri) ||
            (uri.Scheme != "https" && !(environment.IsDevelopment() && uri.Scheme == "http" && uri.IsLoopback)))
            throw new InvalidOperationException("Configure Authentication:FrontendUrl with an HTTPS URL.");
        return QueryHelpers.AddQueryString(new Uri(uri, path).AbsoluteUri,
            new Dictionary<string, string?> { ["userId"] = user.Id.ToString(),
                ["code"] = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token)) });
    }
}

public record RegisterRequest([Required, EmailAddress, MaxLength(256)] string Email,
    [Required, StringLength(128, MinimumLength = 12)] string Password);
public record LoginRequest([Required, EmailAddress, MaxLength(256)] string Email,
    [Required, MaxLength(128)] string Password);
public record EmailRequest([Required, EmailAddress, MaxLength(256)] string Email);
public record ConfirmationRequest([Required, MaxLength(20)] string UserId,
    [Required, MaxLength(4096)] string Code, [MaxLength(128)] string? Password = null);
public record ResetPasswordRequest([Required, MaxLength(20)] string UserId,
    [Required, MaxLength(4096)] string Code,
    [Required, StringLength(128, MinimumLength = 12)] string Password);
