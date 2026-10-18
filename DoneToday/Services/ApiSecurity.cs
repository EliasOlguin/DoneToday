using System.Globalization;
using System.Security.Claims;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

namespace DoneToday.Api.Services;

public static class ApiSecurity
{
    public const int MaximumBodyBytes = 65_536;
    public const int MaximumHabits = 200;
    public const int MaximumDailyEntriesPerHabit = 200;

    public static IServiceCollection AddApiSecurity(this IServiceCollection services)
    {
        services.AddMemoryCache();
        services.AddSingleton<ReverificationAttempts>();
        services.AddScoped<SensitiveActionVerifier>();
        services.AddSingleton<DeleteAccountVerification>();
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.OnRejected = async (context, cancellation) =>
            {
                if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retry))
                    context.HttpContext.Response.Headers.RetryAfter = Math.Ceiling(retry.TotalSeconds).ToString(CultureInfo.InvariantCulture);
                await context.HttpContext.Response.WriteAsJsonAsync(new { code = "rateLimited" }, cancellation);
            };
            options.AddPolicy("authentication", context => Window("auth:" + Ip(context), 20));
            options.GlobalLimiter = PartitionedRateLimiter.CreateChained(
                PartitionedRateLimiter.Create<HttpContext, string>(context => !IsApi(context)
                    ? RateLimitPartition.GetNoLimiter("public")
                    : RateLimitPartition.GetConcurrencyLimiter("api", _ => new ConcurrencyLimiterOptions { PermitLimit = 32, QueueLimit = 0 })),
                PartitionedRateLimiter.Create<HttpContext, string>(context => !IsApi(context)
                    ? RateLimitPartition.GetNoLimiter("public") : Window("ip:" + Ip(context), 300)),
                PartitionedRateLimiter.Create<HttpContext, string>(context =>
                {
                    if (!IsApi(context) || context.User.Identity?.IsAuthenticated != true) return RateLimitPartition.GetNoLimiter("anonymous");
                    var read = HttpMethods.IsGet(context.Request.Method) || HttpMethods.IsHead(context.Request.Method);
                    return Window($"user:{context.User.FindFirstValue(ClaimTypes.NameIdentifier)}:{read}", read ? 180 : 60);
                }));
        });
        return services;
    }

    private static bool IsApi(HttpContext context) => context.Request.Path.StartsWithSegments("/api");
    private static string Ip(HttpContext context) => context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    private static RateLimitPartition<string> Window(string key, int limit) => RateLimitPartition.GetFixedWindowLimiter(key,
        _ => new FixedWindowRateLimiterOptions { PermitLimit = limit, Window = TimeSpan.FromMinutes(1), QueueLimit = 0, AutoReplenishment = true });

    public static IApplicationBuilder UseBrowserSecurity(this IApplicationBuilder app, bool development) => app.Use(async (context, next) =>
    {
        context.Response.Headers.XContentTypeOptions = "nosniff";
        context.Response.Headers.XFrameOptions = "DENY";
        context.Response.Headers["Referrer-Policy"] = "no-referrer";
        context.Response.Headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
        if (!development)
            context.Response.Headers.ContentSecurityPolicy = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self' https://accounts.google.com";
        if (IsApi(context)) context.Response.Headers.CacheControl = "no-store";
        if (context.Request.ContentLength > MaximumBodyBytes)
        {
            context.Response.StatusCode = StatusCodes.Status413PayloadTooLarge;
            return;
        }
        await next(context);
    });
}
