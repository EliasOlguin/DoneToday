using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Caching.Memory;

namespace DoneToday.Api.Services.Email;

// Apply before account lookup: unknown and existing addresses get the same cooldown.
public sealed class RecipientEmailThrottle(IMemoryCache cache, TimeProvider clock)
{
    private readonly object gate = new();
    public int Reserve(string purpose, string email)
    {
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(email.Trim().ToUpperInvariant())));
        var key = ("email-cooldown", purpose, hash);
        lock (gate)
        {
            var now = clock.GetUtcNow();
            if (cache.TryGetValue<DateTimeOffset>(key, out var until) && until > now)
                return Math.Max(1, (int)Math.Ceiling((until - now).TotalSeconds));
            cache.Set(key, now.AddMinutes(1), TimeSpan.FromMinutes(1));
            return 0;
        }
    }
}
