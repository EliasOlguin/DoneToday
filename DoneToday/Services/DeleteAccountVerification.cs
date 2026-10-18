using System.Security.Cryptography;
using DoneToday.Api.Entities;
using Microsoft.Extensions.Caching.Memory;

namespace DoneToday.Api.Services;

// Fresh Google proof is bound to this user/security stamp and consumed once.
// Only an opaque random nonce is stored in the HttpOnly cookie; no URL token.
public sealed class DeleteAccountVerification(IMemoryCache cache, TimeProvider clock)
{
    public const string CookieName = "__Secure-DoneToday.DeleteVerification";
    private readonly object gate = new();
    private sealed record Grant(int UserId, string? Stamp, DateTimeOffset Expires);
    private static string Key(string nonce) => "delete-proof:" + Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(nonce)));
    public static CookieOptions Cookie => new() { HttpOnly = true, Secure = true, SameSite = SameSiteMode.Strict, Path = "/api/profile", MaxAge = TimeSpan.FromMinutes(5), IsEssential = true };
    public string Issue(User user)
    {
        var nonce = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        cache.Set(Key(nonce), new Grant(user.Id, user.SecurityStamp, clock.GetUtcNow().AddMinutes(5)), TimeSpan.FromMinutes(5));
        return nonce;
    }
    public bool Check(User user, string? nonce, bool consume = false)
    {
        if (nonce is null || nonce.Length != 64) return false;
        lock (gate)
        {
            if (!cache.TryGetValue<Grant>(Key(nonce), out var grant) || grant is null || grant.Expires <= clock.GetUtcNow() || grant.UserId != user.Id || grant.Stamp != user.SecurityStamp) return false;
            if (consume) cache.Remove(Key(nonce));
            return true;
        }
    }
}
