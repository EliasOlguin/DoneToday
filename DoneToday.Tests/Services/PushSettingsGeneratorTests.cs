using DoneToday.Api.Services.Notifications;

namespace DoneToday.Tests.Services;

public class PushSettingsGeneratorTests
{
    [Fact]
    public void KeySetupCreatesAPrivateDisabledFileWithoutOverwritingExistingKeys()
    {
        var path = Path.Combine(Path.GetTempPath(), "donetoday-push-test-" + Guid.NewGuid() + ".env");
        try
        {
            PushSettingsGenerator.Write(path, "mailto:test@example.test");
            var contents = File.ReadAllText(path);
            Assert.Contains("Push__Enabled=false", contents);
            Assert.Contains("Push__PublicKey=", contents);
            Assert.Contains("Push__PrivateKey=", contents);
            Assert.Throws<IOException>(() => PushSettingsGenerator.Write(path, "mailto:test@example.test"));
            Assert.Equal(contents, File.ReadAllText(path));
            if (!OperatingSystem.IsWindows()) Assert.Equal(UnixFileMode.UserRead | UnixFileMode.UserWrite, File.GetUnixFileMode(path));
        }
        finally { if (File.Exists(path)) File.Delete(path); }
    }
}
