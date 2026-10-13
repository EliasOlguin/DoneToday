using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authentication;

namespace DoneToday.Api.Services;

public static class GoogleAuthentication
{
    public static Uri Frontend(IConfiguration configuration)
    {
        if (!Uri.TryCreate(configuration["Authentication:FrontendUrl"], UriKind.Absolute, out var uri) ||
            uri.Scheme != "https") throw new InvalidOperationException("Authentication:FrontendUrl must use HTTPS.");
        return uri;
    }

    public static bool HasVerifiedEmail(ClaimsPrincipal principal) =>
        principal.HasClaim(claim => claim.Type == "google:email_verified" &&
            string.Equals(claim.Value, "true", StringComparison.OrdinalIgnoreCase)) &&
        !string.IsNullOrWhiteSpace(principal.FindFirstValue(ClaimTypes.Email));

    public static IServiceCollection AddDoneTodayGoogle(this IServiceCollection services, IConfiguration configuration)
    {
        var clientId = configuration["Authentication:Google:ClientId"];
        var secret = configuration["Authentication:Google:ClientSecret"];
        if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(secret)) return services;
        var frontend = Frontend(configuration);
        services.AddAuthentication().AddGoogle(options =>
        {
            options.ClientId = clientId;
            options.ClientSecret = secret;
            options.ClaimActions.MapJsonKey("google:email_verified", "verified_email");
            options.ClaimActions.MapJsonKey("google:email_verified", "email_verified");
            options.SaveTokens = false;
            options.Events.OnRemoteFailure = context =>
            {
                context.HandleResponse();
                context.Response.Redirect(new Uri(frontend, "/login?externalError=failed").AbsoluteUri);
                return Task.CompletedTask;
            };
        });
        return services;
    }
}
