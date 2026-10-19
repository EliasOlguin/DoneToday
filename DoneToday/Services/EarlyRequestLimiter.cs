using System.Threading.RateLimiting;

namespace DoneToday.Api.Services;

// Runs before Identity, including for rejected requests and non-API dynamic routes.
public sealed class EarlyRequestLimiter : IDisposable
{
    private readonly PartitionedRateLimiter<HttpContext> limiter = PartitionedRateLimiter.CreateChained(
        PartitionedRateLimiter.Create<HttpContext, string>(_ => RateLimitPartition.GetConcurrencyLimiter("requests",
            _ => new ConcurrencyLimiterOptions { PermitLimit = 32, QueueLimit = 0 })),
        PartitionedRateLimiter.Create<HttpContext, string>(context => RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions { PermitLimit = 300, Window = TimeSpan.FromMinutes(1), QueueLimit = 0, AutoReplenishment = true })));

    public async Task Invoke(HttpContext context, RequestDelegate next)
    {
        if (context.Request.Path == "/health" && (HttpMethods.IsGet(context.Request.Method) || HttpMethods.IsHead(context.Request.Method)))
        {
            if (HttpMethods.IsGet(context.Request.Method))
                await context.Response.WriteAsJsonAsync(new { status = "ok" }, context.RequestAborted);
            return; // Health must never reach Identity, even if an attacker supplies a cookie.
        }
        using var lease = await limiter.AcquireAsync(context, cancellationToken: context.RequestAborted);
        if (!lease.IsAcquired)
        {
            context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
            context.Response.Headers.RetryAfter = "60";
            await context.Response.WriteAsJsonAsync(new { code = "rateLimited" }, context.RequestAborted);
            return;
        }
        await next(context);
    }

    public void Dispose() => limiter.Dispose();
}
