using DoneToday.Api.Data;
using DoneToday.Api.Entities;
using Microsoft.AspNetCore.Identity;

namespace DoneToday.Api.Services;

public static class IdentitySetup
{
    public static void Configure(IdentityOptions options)
    {
        options.User.RequireUniqueEmail = true;
        options.Password.RequiredLength = 12;
        options.Password.RequireUppercase = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireDigit = true;
        options.Password.RequireNonAlphanumeric = true;
        options.SignIn.RequireConfirmedEmail = true;
        options.Tokens.PasswordResetTokenProvider = "DoneToday.PasswordReset";
        options.Lockout.MaxFailedAccessAttempts = 5;
        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    }

    public static IServiceCollection AddDoneTodayIdentity(this IServiceCollection services)
    {
        services.AddIdentityCore<User>(Configure)
            .AddRoles<IdentityRole<int>>()
            .AddEntityFrameworkStores<AppDbContext>()
            .AddSignInManager()
            .AddDefaultTokenProviders()
            .AddTokenProvider<PasswordResetTokenProvider>("DoneToday.PasswordReset");
        services.Configure<SecurityStampValidatorOptions>(options =>
            options.ValidationInterval = TimeSpan.Zero);
        services.AddAuthentication(options =>
        {
            options.DefaultScheme = IdentityConstants.ApplicationScheme;
            options.DefaultSignInScheme = IdentityConstants.ExternalScheme;
        }).AddIdentityCookies();
        services.ConfigureApplicationCookie(options =>
        {
            options.Cookie.Name = "DoneToday.Auth";
            options.Cookie.HttpOnly = true;
            options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
            options.Cookie.SameSite = SameSiteMode.Lax;
            options.ExpireTimeSpan = TimeSpan.FromHours(8);
            options.SlidingExpiration = true;
            options.Events.OnRedirectToLogin = context =>
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return Task.CompletedTask;
            };
            options.Events.OnRedirectToAccessDenied = context =>
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                return Task.CompletedTask;
            };
        });
        services.Configure<Microsoft.AspNetCore.Authentication.Cookies.CookieAuthenticationOptions>(
            IdentityConstants.TwoFactorUserIdScheme, options =>
            {
                options.Cookie.HttpOnly = true;
                options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
                options.Cookie.SameSite = SameSiteMode.Lax;
                options.ExpireTimeSpan = TimeSpan.FromMinutes(5);
            });
        services.AddAuthorization(options => options.AddPolicy("ApplicationUser", policy =>
            policy.RequireAuthenticatedUser().RequireAssertion(context =>
                int.TryParse(context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value,
                    out var id) && id > 0)));
        services.AddAntiforgery(options => options.HeaderName = "X-CSRF-TOKEN");
        return services;
    }
}
