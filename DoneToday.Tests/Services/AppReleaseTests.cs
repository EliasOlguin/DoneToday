using DoneToday.Api.Services;

namespace DoneToday.Tests.Services;

public class AppReleaseTests
{
    [Fact]
    public void CompiledReleaseMatchesVersionSource()
    {
        var source = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "VERSION"));
        Assert.Equal(File.ReadAllText(source).Trim(), AppRelease.Version);
    }
}
