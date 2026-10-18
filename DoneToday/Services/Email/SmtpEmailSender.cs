using System.Net;
using DoneToday.Api.Entities;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using MimeKit;

namespace DoneToday.Api.Services.Email;

public class SmtpEmailSender(IOptions<EmailOptions> options, IHostEnvironment environment) : IEmailSender<User>
{
    public Task SendConfirmationLinkAsync(User user, string email, string confirmationLink) =>
        SendLinkAsync(email, AccountEmailTemplate.Confirmation(confirmationLink));

    public Task SendPasswordResetLinkAsync(User user, string email, string resetLink) =>
        SendLinkAsync(email, AccountEmailTemplate.PasswordReset(resetLink));

    public Task SendPasswordResetCodeAsync(User user, string email, string resetCode) =>
        SendAsync(email, "Reset your DoneToday password",
            $"Your password reset code is: {resetCode}",
            $"<p>Your password reset code is: <strong>{WebUtility.HtmlEncode(resetCode)}</strong></p>");

    private Task SendLinkAsync(string email, AccountEmailTemplate.Content content) =>
        SendAsync(email, content.Subject, content.Text, content.Html);
    private async Task SendAsync(string email, string subject, string text, string html)
    {
        var settings = options.Value;
        var localHost = settings.Host is "localhost" or "127.0.0.1" or "::1";
        if (!settings.UseStartTls && (!environment.IsDevelopment() || !localHost))
            throw new InvalidOperationException("Unencrypted SMTP is allowed only for the local development inbox.");
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(settings.FromName, settings.FromAddress));
        message.To.Add(MailboxAddress.Parse(email));
        message.Subject = subject;
        message.Body = new BodyBuilder { TextBody = text, HtmlBody = html }.ToMessageBody();
        using var smtp = new SmtpClient();
        await smtp.ConnectAsync(settings.Host, settings.Port,
            settings.UseStartTls ? SecureSocketOptions.StartTls : SecureSocketOptions.None);
        if (!string.IsNullOrWhiteSpace(settings.Username))
            await smtp.AuthenticateAsync(settings.Username,
                settings.Password ?? throw new InvalidOperationException("An SMTP password is required when a username is configured."));
        await smtp.SendAsync(message);
        await smtp.DisconnectAsync(true);
    }
}
