using DoneToday.Api.Entities;
using DoneToday.Api.Services.Email;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace DoneToday.Tests.Services;

public class SmtpEmailSenderTests
{
    [Theory]
    [InlineData("Production", "127.0.0.1")]
    [InlineData("Development", "smtp.example.test")]
    public async Task RefusesUnencryptedSmtpOutsideLocalDevelopment(string environment, string host)
    {
        var sender = CreateSender(environment, host);
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sender.SendConfirmationLinkAsync(new User(), "test@example.test", "https://localhost/confirm"));
    }

    [Theory]
    [InlineData("javascript:alert(1)")]
    [InlineData("/confirm")]
    public async Task RefusesNonWebOrRelativeConfirmationLinks(string link)
    {
        var sender = CreateSender("Development", "127.0.0.1");
        await Assert.ThrowsAsync<ArgumentException>(() =>
            sender.SendConfirmationLinkAsync(new User(), "test@example.test", link));
    }

    private static SmtpEmailSender CreateSender(string environment, string host) => new(
        Options.Create(new EmailOptions { Host = host, Port = 1025, FromAddress = "no-reply@donetoday.test", UseStartTls = false }),
        new TestEnvironment { EnvironmentName = environment });

    private class TestEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = "Development";
        public string ApplicationName { get; set; } = "DoneToday.Tests";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
