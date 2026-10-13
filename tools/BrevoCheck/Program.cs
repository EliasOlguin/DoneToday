using System.Text.Json;
using System.Net.Http.Json;
using DoneToday.Api.Entities;
using Microsoft.Extensions.Configuration;

var configuration = new ConfigurationBuilder().AddUserSecrets<User>().Build();
var key = configuration["Email:ApiKey"];
var email = configuration["Email:FromAddress"];
if (string.IsNullOrWhiteSpace(key) || string.IsNullOrWhiteSpace(email))
{
    Console.Error.WriteLine("Email:ApiKey and Email:FromAddress are required in user secrets.");
    return 1;
}
try
{
    using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(20) };
    client.DefaultRequestHeaders.Add("api-key", key);
    using var account = await client.GetAsync("https://api.brevo.com/v3/account");
    if (!account.IsSuccessStatusCode)
    {
        Console.Error.WriteLine($"Brevo account verification failed (HTTP {(int)account.StatusCode}). Credentials were not printed.");
        return 1;
    }
    Console.WriteLine("PASS: Brevo accepted the API key.");
    using var senders = await client.GetAsync("https://api.brevo.com/v3/senders");
    if (!senders.IsSuccessStatusCode)
    {
        Console.Error.WriteLine($"Sender verification failed (HTTP {(int)senders.StatusCode}).");
        return 1;
    }
    using var json = JsonDocument.Parse(await senders.Content.ReadAsStringAsync());
    var matched = json.RootElement.GetProperty("senders").EnumerateArray().Any(sender =>
        string.Equals(sender.GetProperty("email").GetString(), email.Trim(), StringComparison.OrdinalIgnoreCase) &&
        sender.TryGetProperty("active", out var active) && active.ValueKind == JsonValueKind.True);
    if (!matched)
    {
        Console.Error.WriteLine("The configured sender was not found as active. Check the verified sender and saved FromAddress.");
        return 1;
    }
    Console.WriteLine("PASS: the configured sender is active in Brevo.");
    if (args.Contains("--send-test"))
    {
        using var response = await client.PostAsJsonAsync("https://api.brevo.com/v3/smtp/email", new
        {
            sender = new { name = "DoneToday", email = email.Trim() },
            to = new[] { new { email = email.Trim() } },
            subject = "DoneToday - email delivery test",
            textContent = "This is a single email delivery test from DoneToday. No account was created and no password was changed. If you received this message, email delivery is working."
        });
        if (!response.IsSuccessStatusCode)
        {
            Console.Error.WriteLine($"Test email failed (HTTP {(int)response.StatusCode}). No automatic retry was attempted.");
            return 1;
        }
        Console.WriteLine($"PASS: Brevo accepted one test email (HTTP {(int)response.StatusCode}). Check your inbox and spam folder to confirm delivery.");
    }
    else
    {
        Console.WriteLine("Read-only checks completed. No emails sent and no credentials printed.");
    }
    return 0;
}
catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException or JsonException)
{
    Console.Error.WriteLine($"Brevo verification failed ({exception.GetType().Name}). Credentials were not printed.");
    return 1;
}
