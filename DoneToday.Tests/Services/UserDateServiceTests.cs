using DoneToday.Api.Services;

namespace DoneToday.Tests.Services;

public class UserDateServiceTests
{
    [Theory]
    [InlineData("America/Argentina/Buenos_Aires", "2026-10-14T01:30:00Z", "2026-10-13")]
    [InlineData("America/Buenos_Aires", "2026-10-14T01:30:00Z", "2026-10-13")]
    [InlineData("Europe/Berlin", "2026-10-13T22:30:00Z", "2026-10-14")]
    [InlineData("Europe/Berlin", "2026-01-13T22:30:00Z", "2026-01-13")]
    [InlineData("Pacific/Kiritimati", "2026-10-13T12:00:00Z", "2026-10-14")]
    [InlineData("UTC", "2026-10-14T01:30:00Z", "2026-10-14")]
    [InlineData(null, "2026-10-14T01:30:00Z", "2026-10-14")]
    public void UsesLocalCalendarDateIncludingDaylightSaving(string? zone, string instant, string expected)
    {
        Assert.Equal(DateOnly.Parse(expected), UserDateService.GetDate(DateTimeOffset.Parse(instant), zone));
    }

    [Theory]
    [InlineData("Not/AZone")]
    [InlineData("Argentina Standard Time")]
    [InlineData("+03:00")]
    [InlineData("")]
    public void RejectsInvalidOrNonPortableIdentifiers(string zone)
    {
        Assert.False(UserDateService.TryGetZone(zone, out _));
    }
}
