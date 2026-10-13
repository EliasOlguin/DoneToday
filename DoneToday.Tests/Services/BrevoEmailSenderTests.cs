using System.Net;
using System.Text.Json;
using DoneToday.Api.Entities;
using DoneToday.Api.Services.Email;
using Microsoft.Extensions.Options;

namespace DoneToday.Tests.Services;

public class BrevoEmailSenderTests
{
    [Fact]
    public async Task SendsEncodedConfirmationThroughHttpsApi()
    {
        var handler = new CaptureHandler();
        var sender = Sender(handler);
        await sender.SendConfirmationLinkAsync(new User(), "person@example.test", "https://example.test/confirm?code=a&userId=1");
        Assert.Equal("https://api.brevo.com/v3/smtp/email", handler.Url);
        Assert.Equal("fake-test-key", handler.Key);
        using var json = JsonDocument.Parse(handler.Body!);
        Assert.Equal("person@example.test", json.RootElement.GetProperty("to")[0].GetProperty("email").GetString());
        Assert.Contains("&amp;", json.RootElement.GetProperty("htmlContent").GetString());
        Assert.DoesNotContain("fake-test-key", handler.Body);
    }

    [Fact]
    public async Task RejectsUnencryptedProductionLink()
    {
        var handler = new CaptureHandler();
        await Assert.ThrowsAsync<ArgumentException>(() => Sender(handler)
            .SendPasswordResetLinkAsync(new User(), "person@example.test", "http://example.test/reset"));
        Assert.Null(handler.Url);
    }

    [Fact]
    public async Task ProviderFailureIsReportedToCaller()
    {
        var handler = new CaptureHandler { Status = HttpStatusCode.Unauthorized };
        await Assert.ThrowsAsync<HttpRequestException>(() => Sender(handler)
            .SendPasswordResetLinkAsync(new User(), "person@example.test", "https://example.test/reset"));
    }

    private static BrevoEmailSender Sender(HttpMessageHandler handler) => new(new HttpClient(handler),
        Options.Create(new BrevoEmailOptions { ApiKey = "fake-test-key", FromAddress = "sender@example.test" }));
    private class CaptureHandler : HttpMessageHandler
    {
        public string? Url, Key, Body;
        public HttpStatusCode Status = HttpStatusCode.Created;
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Url = request.RequestUri!.AbsoluteUri;
            Key = request.Headers.GetValues("api-key").Single();
            Body = await request.Content!.ReadAsStringAsync(cancellationToken);
            return new HttpResponseMessage(Status);
        }
    }
}
