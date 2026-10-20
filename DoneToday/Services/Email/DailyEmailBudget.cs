namespace DoneToday.Api.Services.Email;

// Single-instance send-attempt budget. A restart resets it, like recipient throttles.
public sealed class DailyEmailBudget(IConfiguration configuration, TimeProvider clock, ILogger<DailyEmailBudget> logger)
{
    private readonly object gate = new();
    private readonly int limit = Math.Max(0, configuration.GetValue<int?>("Email:DailyBudget") ?? 250);
    private DateOnly day;
    private int used;
    private bool warned;

    public bool TryReserve()
    {
        lock (gate)
        {
            var today = DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime);
            if (day != today) { day = today; used = 0; warned = false; }
            if (used >= limit)
            {
                if (!warned) { warned = true; logger.LogWarning("Daily email send budget exhausted; further sends are skipped until the next UTC day."); }
                return false;
            }
            used++;
            return true;
        }
    }
}
