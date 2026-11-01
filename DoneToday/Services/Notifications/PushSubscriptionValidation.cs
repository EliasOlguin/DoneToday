using Microsoft.AspNetCore.WebUtilities;

namespace DoneToday.Api.Services.Notifications;

public record BrowserPushSubscription(string Endpoint, string P256dh, string Auth);

public static class PushSubscriptionValidation
{
    public static bool ValidEndpoint(string? endpoint) => endpoint is { Length: <= 2048 } &&
        Uri.TryCreate(endpoint, UriKind.Absolute, out var uri) && uri.Scheme == "https" && uri.IsDefaultPort &&
        string.IsNullOrEmpty(uri.UserInfo) && string.IsNullOrEmpty(uri.Fragment) &&
        (uri.Host == "fcm.googleapis.com" || uri.Host == "updates.push.services.mozilla.com" ||
         uri.Host == "web.push.apple.com" || uri.Host.EndsWith(".push.apple.com", StringComparison.Ordinal));

    public static bool Valid(BrowserPushSubscription subscription)
    {
        if (!ValidEndpoint(subscription.Endpoint)) return false;
        try
        {
            var publicKey = WebEncoders.Base64UrlDecode(subscription.P256dh);
            if (publicKey.Length != 65 || publicKey[0] != 4 || WebEncoders.Base64UrlDecode(subscription.Auth).Length != 16) return false;
            using var point = System.Security.Cryptography.ECDsa.Create(new System.Security.Cryptography.ECParameters
            {
                Curve = System.Security.Cryptography.ECCurve.NamedCurves.nistP256,
                Q = new() { X = publicKey[1..33], Y = publicKey[33..65] }
            });
            return true;
        }
        catch (Exception e) when (e is FormatException or ArgumentException or System.Security.Cryptography.CryptographicException or PlatformNotSupportedException) { return false; }
    }
}
