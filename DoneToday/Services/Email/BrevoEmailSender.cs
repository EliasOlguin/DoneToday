using System.ComponentModel.DataAnnotations;
using DoneToday.Api.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;

namespace DoneToday.Api.Services.Email;

public class BrevoEmailOptions
{
    [Required] public string ApiKey { get; set; } = string.Empty;
    [Required, EmailAddress] public string FromAddress { get; set; } = string.Empty;
    public string FromName { get; set; } = "DoneToday";
}

public class BrevoEmailSender(HttpClient client, IOptions<BrevoEmailOptions> options, IHttpContextAccessor? request = null) : IEmailSender<User>
{
    public Task SendConfirmationLinkAsync(User user, string email, string confirmationLink) =>
        SendLink(email, confirmationLink, AccountEmailTemplate.Confirmation(confirmationLink, EmailLanguage.FromRequest(request)));
    public Task SendPasswordResetLinkAsync(User user, string email, string resetLink) =>
        SendLink(email, resetLink, AccountEmailTemplate.PasswordReset(resetLink, EmailLanguage.FromRequest(request)));
    public Task SendPasswordResetCodeAsync(User user, string email, string resetCode)
    {
        var content = AccountEmailTemplate.PasswordResetCode(resetCode, EmailLanguage.FromRequest(request));
        return Send(email, content.Subject, content.Text, content.Html);
    }

    private Task SendLink(string email, string link, AccountEmailTemplate.Content content)
    {
        if (!Uri.TryCreate(link, UriKind.Absolute, out var uri) || uri.Scheme != "https")
            throw new ArgumentException("Production email links must use HTTPS.", nameof(link));
        return Send(email, content.Subject, content.Text, content.Html);
    }
    private async Task Send(string email, string subject, string text, string html)
    {
        var settings = options.Value;
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.brevo.com/v3/smtp/email");
        request.Headers.Add("api-key", settings.ApiKey);
        request.Content = JsonContent.Create(new {
            sender = new { name = settings.FromName, email = settings.FromAddress },
            to = new[] { new { email } }, subject, textContent = text, htmlContent = html
        });
        using var response = await client.SendAsync(request);
        response.EnsureSuccessStatusCode();
    }
}
