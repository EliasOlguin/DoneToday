using System.Text;
using WebPush;

namespace DoneToday.Api.Services.Notifications;

public static class PushSettingsGenerator
{
    public static void Write(string path, string subject)
    {
        if (subject.Contains('\n') || subject.Contains('\r') ||
            !(subject.StartsWith("mailto:", StringComparison.Ordinal) && System.Net.Mail.MailAddress.TryCreate(subject[7..], out _) ||
              Uri.TryCreate(subject, UriKind.Absolute, out var uri) && uri.Scheme == "https" && !string.IsNullOrEmpty(uri.Host) && string.IsNullOrEmpty(uri.UserInfo)))
            throw new ArgumentException("Provide a valid mailto: contact or HTTPS subject.");
        var fullPath = Path.GetFullPath(path);
        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);
        var options = new FileStreamOptions { Mode = FileMode.CreateNew, Access = FileAccess.Write, Share = FileShare.None };
        if (!OperatingSystem.IsWindows()) options.UnixCreateMode = UnixFileMode.UserRead | UnixFileMode.UserWrite;
        using var file = new FileStream(fullPath, options);
        using var writer = new StreamWriter(file, new UTF8Encoding(false));
        var keys = VapidHelper.GenerateVapidKeys();
        writer.WriteLine("Push__Enabled=false");
        writer.WriteLine("Push__Subject=" + subject);
        writer.WriteLine("Push__PublicKey=" + keys.PublicKey);
        writer.WriteLine("Push__PrivateKey=" + keys.PrivateKey);
    }
}
