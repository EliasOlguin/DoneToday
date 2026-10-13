using System.ComponentModel.DataAnnotations;
using System.Text;
using DoneToday.Api.Entities;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.AspNetCore.Authorization;

namespace DoneToday.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(UserManager<User> users, SignInManager<User> signIn, IEmailSender<User> emailSender,
    IConfiguration configuration, IHostEnvironment environment) : ControllerBase
{
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        Response.Headers.CacheControl = "no-store";
        var user = await users.GetUserAsync(User);
        return user is null ? Unauthorized() : Ok(new { user.Id, user.Email });
    }

    [HttpPost("login")]
    [EnableRateLimiting("authentication")]
    [ValidateCsrf]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        var user = await users.FindByEmailAsync(request.Email.Trim());
        if (user is null) return Unauthorized();
        var result = await signIn.PasswordSignInAsync(user, request.Password,
            isPersistent: false, lockoutOnFailure: true);
        if (!result.Succeeded) return Unauthorized();
        return Ok();
    }

    [HttpPost("logout")]
    [Authorize]
    [ValidateCsrf]
    public async Task<IActionResult> Logout()
    {
        await signIn.SignOutAsync();
        return NoContent();
    }

    [HttpGet("csrf")]
    public IActionResult Csrf([FromServices] IAntiforgery antiforgery)
    {
        Response.Headers.CacheControl = "no-store";
        return Ok(new { token = antiforgery.GetAndStoreTokens(HttpContext).RequestToken });
    }

    [HttpPost("register")]
    [EnableRateLimiting("authentication")]
    [ValidateCsrf]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        var email = request.Email.Trim();
        if (await users.FindByEmailAsync(email) is not null) return Ok();
        var user = new User { UserName = email, Email = email };
        var result = await users.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            return BadRequest(new { codes = result.Errors.Select(error => error.Code) });
        return await SendConfirmation(user);
    }

    [HttpPost("resend-confirmation")]
    [EnableRateLimiting("authentication")]
    [ValidateCsrf]
    public async Task<IActionResult> Resend(EmailRequest request)
    {
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
        var result = await users.ConfirmEmailAsync(user, token);
        return result.Succeeded ? Ok() : BadRequest();
    }

    private async Task<IActionResult> SendConfirmation(User user)
    {
        var frontend = configuration["Authentication:FrontendUrl"];
        if (!Uri.TryCreate(frontend, UriKind.Absolute, out var uri) ||
            (uri.Scheme != "https" && !(environment.IsDevelopment() && uri.Scheme == "http" && uri.IsLoopback)))
            throw new InvalidOperationException("Configure Authentication:FrontendUrl with an HTTPS URL.");
        var token = await users.GenerateEmailConfirmationTokenAsync(user);
        var link = QueryHelpers.AddQueryString(new Uri(uri, "/confirm-email").AbsoluteUri,
            new Dictionary<string, string?> { ["userId"] = user.Id.ToString(),
                ["code"] = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token)) });
        try { await emailSender.SendConfirmationLinkAsync(user, user.Email!, link); }
        catch (Exception exception) when (exception is IOException or MailKit.Net.Smtp.SmtpCommandException
            or MailKit.Net.Smtp.SmtpProtocolException or System.Net.Sockets.SocketException)
        {
            return StatusCode(503);
        }
        return Ok();
    }
}

public record RegisterRequest([Required, EmailAddress, MaxLength(256)] string Email,
    [Required, StringLength(128, MinimumLength = 12)] string Password);
public record LoginRequest([Required, EmailAddress, MaxLength(256)] string Email,
    [Required, MaxLength(128)] string Password);
public record EmailRequest([Required, EmailAddress, MaxLength(256)] string Email);
public record ConfirmationRequest([Required, MaxLength(20)] string UserId,
    [Required, MaxLength(4096)] string Code);
