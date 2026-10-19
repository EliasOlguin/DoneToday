using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using DoneToday.Api.Entities;
using Microsoft.AspNetCore.DataProtection;

namespace DoneToday.Api.Services;

// Separate purposes prevent the browser's pending receipt from being used as email proof.
public sealed class GuestRegistration(IDataProtectionProvider protection, TimeProvider clock)
{
    public const string PendingCookie = "__Secure-DoneToday.PendingRegistration";
    public const string BindingCookie = "__Secure-DoneToday.RegistrationBrowser";
    public const string CodePrefix = "guest.";
    public static readonly TimeSpan Lifetime = TimeSpan.FromHours(1);
    private readonly IDataProtector receiptProtector = protection.CreateProtector("DoneToday.GuestRegistration.Receipt.v1");
    private readonly IDataProtector emailProtector = protection.CreateProtector("DoneToday.GuestRegistration.Email.v1");

    public record Pending(int UserId, string Stamp, string Email, string PasswordHash, string BrowserHash, DateTimeOffset Expires);

    public Pending Begin(HttpContext context, User user, string email, string passwordHash)
    {
        var secret = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        var pending = new Pending(user.Id, user.SecurityStamp!, email, passwordHash, Hash(secret), clock.GetUtcNow() + Lifetime);
        context.Response.Cookies.Append(BindingCookie, secret, Cookie(pending.Expires));
        context.Response.Cookies.Append(PendingCookie, receiptProtector.Protect(JsonSerializer.Serialize(pending)), Cookie(pending.Expires));
        return pending;
    }

    public string EmailCode(Pending pending) => CodePrefix + emailProtector.Protect(JsonSerializer.Serialize(pending));

    public Pending? ReadReceipt(HttpContext context, User user) =>
        Read(receiptProtector, context.Request.Cookies[PendingCookie], context, user);

    public Pending? ReadEmail(string code, HttpContext context, User user) => code.StartsWith(CodePrefix, StringComparison.Ordinal)
        ? Read(emailProtector, code[CodePrefix.Length..], context, user) : null;

    private Pending? Read(IDataProtector protector, string? code, HttpContext context, User user)
    {
        if (!user.IsGuest || string.IsNullOrEmpty(code)) return null;
        try
        {
            var pending = JsonSerializer.Deserialize<Pending>(protector.Unprotect(code));
            var browser = context.Request.Cookies[BindingCookie];
            return pending is not null && pending.UserId == user.Id && pending.Stamp == user.SecurityStamp &&
                pending.Expires > clock.GetUtcNow() && !string.IsNullOrEmpty(browser) &&
                CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(pending.BrowserHash), Encoding.UTF8.GetBytes(Hash(browser)))
                ? pending : null;
        }
        catch (Exception error) when (error is CryptographicException or JsonException or FormatException) { return null; }
    }

    public static void Clear(HttpContext context)
    {
        context.Response.Cookies.Delete(PendingCookie, Cookie(null));
        context.Response.Cookies.Delete(BindingCookie, Cookie(null));
    }

    private static string Hash(string value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
    private static CookieOptions Cookie(DateTimeOffset? expires) => new()
    { HttpOnly = true, Secure = true, SameSite = SameSiteMode.Lax, Path = "/api/auth", Expires = expires, IsEssential = true };
}
