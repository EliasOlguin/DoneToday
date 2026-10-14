using DoneToday.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace DoneToday.Api.Services;

public class UserDateService(AppDbContext context, TimeProvider clock)
{
    public async Task<DateOnly> GetTodayAsync(int userId)
    {
        var zone = await context.Users.Where(u => u.Id == userId)
            .Select(u => u.TimeZoneId).SingleAsync();
        return GetDate(clock.GetUtcNow(), zone);
    }

    public static DateOnly GetDate(DateTimeOffset instant, string? zoneId)
    {
        var zone = TryGetZone(zoneId, out var found) ? found! : TimeZoneInfo.Utc;
        return DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(instant, zone).DateTime);
    }

    public static bool TryGetZone(string? id, out TimeZoneInfo? zone)
    {
        zone = null;
        // Store portable IANA identifiers, rather than Windows-only identifiers or offsets.
        if (string.IsNullOrWhiteSpace(id) || id.Length > 100 ||
            (id != "UTC" && !id.Contains('/'))) return false;
        try { zone = TimeZoneInfo.FindSystemTimeZoneById(id); return true; }
        catch (TimeZoneNotFoundException) { return false; }
        catch (InvalidTimeZoneException) { return false; }
    }
}
