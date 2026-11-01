using System.Net;
using System.Text.Json;
using DoneToday.Api.Entities;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Options;
using WebPush;

namespace DoneToday.Api.Services.Notifications;

public class PushOptions
{
    public bool Enabled { get; set; }
    public string Subject { get; set; } = "";
    public string PublicKey { get; set; } = "";
    public string PrivateKey { get; set; } = "";
    public bool Ready => Enabled && !string.IsNullOrEmpty(Subject) && !string.IsNullOrEmpty(PublicKey) && !string.IsNullOrEmpty(PrivateKey);
}

public enum PushResult { Sent, Expired, Retry, Rejected }
public interface IPushTransport
{
    Task<PushResult> SendAsync(NotificationDevice device, PushMessage message, string tag, int ttlSeconds, CancellationToken cancellation);
}

public sealed class PushTransport(IOptions<PushOptions> options, IDataProtectionProvider protection, Func<HttpClientHandler>? handlerFactory = null) : IPushTransport
{
    public async Task<PushResult> SendAsync(NotificationDevice device, PushMessage message, string tag, int ttlSeconds, CancellationToken cancellation)
    {
        if (!options.Value.Ready) return PushResult.Rejected;
        BrowserPushSubscription? subscription;
        try { subscription = JsonSerializer.Deserialize<BrowserPushSubscription>(protection.CreateProtector("DoneToday.PushSubscription.v1").Unprotect(device.ProtectedSubscription)); }
        catch (Exception e) when (e is System.Security.Cryptography.CryptographicException or JsonException) { return PushResult.Expired; }
        if (subscription == null || !PushSubscriptionValidation.Valid(subscription)) return PushResult.Expired;
        using var handler = handlerFactory?.Invoke() ?? new HttpClientHandler();
        handler.AllowAutoRedirect = false;
        using var client = new WebPushClient(handler);
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellation);
        timeout.CancelAfter(TimeSpan.FromSeconds(10));
        try
        {
            await client.SendNotificationAsync(new PushSubscription(subscription.Endpoint, subscription.P256dh, subscription.Auth),
                JsonSerializer.Serialize(new { title = message.Title, body = message.Body, url = message.Url, tag }),
                new Dictionary<string, object> { ["vapidDetails"] = new VapidDetails(options.Value.Subject, options.Value.PublicKey, options.Value.PrivateKey), ["TTL"] = Math.Clamp(ttlSeconds, 1, 900) }, timeout.Token);
            return PushResult.Sent;
        }
        catch (WebPushException e) when (e.StatusCode is HttpStatusCode.Gone or HttpStatusCode.NotFound) { return PushResult.Expired; }
        catch (WebPushException e) { return (int)e.StatusCode == 429 || (int)e.StatusCode >= 500 ? PushResult.Retry : PushResult.Rejected; }
        catch (HttpRequestException) { return PushResult.Retry; }
        catch (Exception e) when (e is ArgumentException or System.Security.Cryptography.CryptographicException) { return PushResult.Rejected; }
        catch (OperationCanceledException) when (!cancellation.IsCancellationRequested) { return PushResult.Retry; }
    }
}
