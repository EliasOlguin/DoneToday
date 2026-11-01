using System.Net;
using System.Security.Cryptography;
using System.Text.Json;
using DoneToday.Api.Entities;
using DoneToday.Api.Services.Notifications;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Options;
using WebPush;

namespace DoneToday.Tests.Services;

public class PushTransportTests
{
    [Theory]
    [InlineData(201, PushResult.Sent)]
    [InlineData(410, PushResult.Expired)]
    [InlineData(429, PushResult.Retry)]
    [InlineData(503, PushResult.Retry)]
    [InlineData(403, PushResult.Rejected)]
    public async Task SendsEncryptedAuthenticatedPayloadAndHandlesProviderResponses(int status, PushResult expected)
    {
        var protection = new EphemeralDataProtectionProvider();
        var vapid = VapidHelper.GenerateVapidKeys();
        using var browser = ECDsa.Create(ECCurve.NamedCurves.nistP256);
        var point = browser.ExportParameters(false).Q;
        var subscription = new BrowserPushSubscription("https://fcm.googleapis.com/fcm/send/test-only",
            WebEncoders.Base64UrlEncode(new byte[] { 4 }.Concat(point.X!).Concat(point.Y!).ToArray()),
            WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(16)));
        var device = new NotificationDevice { ProtectedSubscription = protection.CreateProtector("DoneToday.PushSubscription.v1").Protect(JsonSerializer.Serialize(subscription)) };
        var handler = new CaptureHandler(status);
        var transport = new PushTransport(Options.Create(new PushOptions { Enabled = true, Subject = "mailto:test@example.test", PublicKey = vapid.PublicKey, PrivateKey = vapid.PrivateKey }), protection, () => handler);
        Assert.Equal(expected, await transport.SendAsync(device, new("DoneToday", "PRIVATE HABIT TEXT", "/today"), "test", 60, default));
        Assert.Equal("https://fcm.googleapis.com/fcm/send/test-only", handler.Target);
        Assert.True(handler.Authenticated);
        Assert.False(handler.PlainText);
        Assert.Equal("60", handler.Ttl);
    }

    private sealed class CaptureHandler(int status) : HttpClientHandler
    {
        public string? Target; public bool Authenticated; public bool PlainText; public string? Ttl;
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellation)
        {
            Target = request.RequestUri!.AbsoluteUri;
            Authenticated = request.Headers.Contains("Authorization");
            PlainText = (await request.Content!.ReadAsStringAsync(cancellation)).Contains("PRIVATE HABIT TEXT");
            Ttl = request.Headers.GetValues("TTL").Single();
            return new HttpResponseMessage((HttpStatusCode)status) { Content = new StringContent("") };
        }
    }
}
