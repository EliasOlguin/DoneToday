using Microsoft.Extensions.Caching.Memory;

namespace DoneToday.Api.Services;

// Reserve before password/code verification so concurrent failures cannot bypass the limit.
public sealed class LoginAttempts(IMemoryCache cache, TimeProvider clock)
{
    private readonly object gate = new();
    private sealed record State(int Attempts, DateTimeOffset Expires);
    public bool TryBegin(int userId, string ip)
    {
        lock (gate)
        {
            var key = ("login", userId, ip);
            var now = clock.GetUtcNow();
            cache.TryGetValue<State>(key, out var previous);
            var active = previous is not null && previous.Expires > now;
            if (active && previous!.Attempts >= 5) return false;
            var state = new State(active ? previous!.Attempts + 1 : 1, active ? previous!.Expires : now.AddMinutes(15));
            cache.Set(key, state, state.Expires - now);
            return true;
        }
    }
    public void Reset(int userId, string ip) { lock (gate) cache.Remove(("login", userId, ip)); }
}
