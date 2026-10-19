using System.Globalization;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;

namespace DoneToday.Api.Services;

public static class SessionSecurity
{
    public const string StartedAt = "DoneToday.SessionStartedAt.v1";
    public static readonly TimeSpan MaximumLifetime = TimeSpan.FromDays(90);

    public static Task SigningIn(CookieSigningInContext context)
    {
        var now = (context.Options.TimeProvider ?? TimeProvider.System).GetUtcNow();
        if (!context.Properties.Items.ContainsKey(StartedAt))
            context.Properties.Items[StartedAt] = now.ToUnixTimeSeconds().ToString(CultureInfo.InvariantCulture);
        return Task.CompletedTask;
    }

    public static bool WithinLifetime(AuthenticationProperties properties, DateTimeOffset now) =>
        properties.Items.TryGetValue(StartedAt, out var value) && long.TryParse(value, out var seconds) &&
        seconds <= now.ToUnixTimeSeconds() && seconds > now.Subtract(MaximumLifetime).ToUnixTimeSeconds();

    public static void AdoptLegacyTicket(AuthenticationProperties properties)
    {
        // Existing protected cookies can be bounded without stranding unlinked guests at rollout.
        if (!properties.Items.ContainsKey(StartedAt) && properties.IssuedUtc is { } issued)
            properties.Items[StartedAt] = issued.ToUnixTimeSeconds().ToString(CultureInfo.InvariantCulture);
    }

    public static async Task Validate(CookieValidatePrincipalContext context)
    {
        AdoptLegacyTicket(context.Properties);
        if (!WithinLifetime(context.Properties, (context.Options.TimeProvider ?? TimeProvider.System).GetUtcNow()))
        {
            context.RejectPrincipal();
            await context.HttpContext.SignOutAsync(IdentityConstants.ApplicationScheme);
            return;
        }
        await SecurityStampValidator.ValidatePrincipalAsync(context);
    }
}
