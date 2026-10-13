using DoneToday.Api.Entities;
using DoneToday.Api.Services.Email;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

var sender = new SmtpEmailSender(
    Options.Create(new EmailOptions {
        Host = "127.0.0.1", Port = 1025,
        FromAddress = "no-reply@donetoday.test", UseStartTls = false
    }), new LocalEnvironment());
await sender.SendConfirmationLinkAsync(new User(), "mail-test@example.test",
    "http://localhost:5173/confirm-email?userId=test&code=local-test-only");
Console.WriteLine("Test email sent to the local Mailpit inbox. No database or user account was changed.");

sealed class LocalEnvironment : IHostEnvironment
{
    public string EnvironmentName { get; set; } = "Development";
    public string ApplicationName { get; set; } = "DoneToday.EmailSmokeTest";
    public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
    public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
}
