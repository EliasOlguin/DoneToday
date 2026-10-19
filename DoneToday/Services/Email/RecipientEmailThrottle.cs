using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Caching.Memory;

namespace DoneToday.Api.Services.Email;

// Apply before account lookup: unknown and existing addresses get the same cooldown.
public sealed class RecipientEmailThrottle(IMemoryCache cache, TimeProvider clock)
{
    private readonly object gate = new();
    private sealed record Budget(int Used, DateTimeOffset Until);
    public const int DailyLimit = 10;
    public int Reserve(string purpose, string email)
    {
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(email.Trim().ToUpperInvariant())));
        var key = ("email-cooldown", purpose, hash);
        lock (gate)
        {
            var now = clock.GetUtcNow();
            if (cache.TryGetValue<DateTimeOffset>(key, out var until) && until > now)
                return Math.Max(1, (int)Math.Ceiling((until - now).TotalSeconds));
            var budgetKey = ("email-daily", purpose, hash);
            cache.TryGetValue<Budget>(budgetKey, out var budget);
            if (budget is null || budget.Until <= now) budget = new Budget(0, now.AddDays(1));
            if (budget.Used >= DailyLimit)
                return Math.Max(1, (int)Math.Ceiling((budget.Until - now).TotalSeconds));
            cache.Set(budgetKey, budget with { Used = budget.Used + 1 }, budget.Until);
            cache.Set(key, now.AddMinutes(1), TimeSpan.FromMinutes(1));
            return 0;
        }
    }
}
