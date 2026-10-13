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
        SendLinkAsync(email, "Confirm your DoneToday email", "Confirm email", confirmationLink);

    public Task SendPasswordResetLinkAsync(User user, string email, string resetLink) =>
        SendLinkAsync(email, "Reset your DoneToday password", "Reset password", resetLink);

    public Task SendPasswordResetCodeAsync(User user, string email, string resetCode) =>
        SendAsync(email, "Reset your DoneToday password",
            $"Your password reset code is: {resetCode}",
            $"<p>Your password reset code is: <strong>{WebUtility.HtmlEncode(resetCode)}</strong></p>");

    private Task SendLinkAsync(string email, string subject, string action, string link)
    {
        if (!Uri.TryCreate(link, UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttps && uri.Scheme != Uri.UriSchemeHttp))
            throw new ArgumentException("Email links must be absolute HTTP or HTTPS URLs.", nameof(link));
        return SendAsync(email, subject,
            $"{action}: {link}\n\nIf you did not request this, you can ignore this email.",
            $"<h1>DoneToday</h1><p><a href=\"{WebUtility.HtmlEncode(link)}\">{action}</a></p><p>If you did not request this, you can ignore this email.</p>");
    }

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
