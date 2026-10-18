using DoneToday.Api.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Caching.Memory;

namespace DoneToday.Api.Services;

// Aggregates failures across IPs and sensitive actions. Cache entries expire and are
// never reset merely because the password (but not the second factor) was correct.
public sealed class ReverificationAttempts(IMemoryCache cache, TimeProvider clock)
{
    private readonly object gate = new();
    private sealed record State(int Failures, DateTimeOffset Expires);
    public bool IsBlocked(int userId)
    {
        lock (gate) return cache.TryGetValue<State>(("reverify", userId), out var state) && state is not null && state.Expires > clock.GetUtcNow() && state.Failures >= 5;
    }
    public void Fail(int userId)
    {
        lock (gate)
        {
            var key = ("reverify", userId);
            var now = clock.GetUtcNow();
            cache.TryGetValue<State>(key, out var previous);
            var count = previous is not null && previous.Expires > now ? previous.Failures + 1 : 1;
            cache.Set(key, new State(count, now.AddMinutes(15)), TimeSpan.FromMinutes(15));
        }
    }
    public void Reset(int userId) { lock (gate) cache.Remove(("reverify", userId)); }
}

public sealed class SensitiveActionVerifier(UserManager<User> users, ReverificationAttempts attempts)
{
    public async Task<bool> CanAttempt(User user) => !attempts.IsBlocked(user.Id) && !await users.IsLockedOutAsync(user);
    public async Task<bool> Password(User user, string? password)
    {
        if (!await CanAttempt(user)) return false;
        if (!string.IsNullOrEmpty(password) && await users.CheckPasswordAsync(user, password)) return true;
        await Fail(user);
        return false;
    }
    public async Task<bool> Code(User user, string? code, bool recovery = false)
    {
        if (!await CanAttempt(user)) return false;
        var normalized = (code ?? "").Replace(" ", "").Replace("-", "");
        var valid = recovery
            ? (await users.RedeemTwoFactorRecoveryCodeAsync(user, (code ?? "").Trim())).Succeeded
            : await users.VerifyTwoFactorTokenAsync(user, users.Options.Tokens.AuthenticatorTokenProvider, normalized);
        if (!valid) await Fail(user);
        return valid;
    }
    private async Task Fail(User user)
    {
        attempts.Fail(user.Id);
        if (user.LockoutEnabled) await users.AccessFailedAsync(user);
    }
    public async Task Complete(User user)
    {
        attempts.Reset(user.Id);
        if (user.AccessFailedCount > 0) await users.ResetAccessFailedCountAsync(user);
    }
}
