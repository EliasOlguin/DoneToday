using Microsoft.AspNetCore.StaticFiles;

namespace DoneToday.Api.Services;

public static class SpaHosting
{
    public static StaticFileOptions StaticFiles() => new()
    {
        OnPrepareResponse = context =>
        {
            if (context.Context.Request.Path.StartsWithSegments("/assets"))
                context.Context.Response.Headers.CacheControl = "public, max-age=31536000, immutable";
            else if (context.File.Name.Equals("index.html", StringComparison.OrdinalIgnoreCase))
                context.Context.Response.Headers.CacheControl = "no-cache";
        }
    };

    public static void MapDoneTodayFallback(this WebApplication app)
    {
        // Reject hidden paths and infrastructure probes before the SPA fallback rewrites the path.
        app.MapFallback(async context =>
        {
            var path = context.Request.Path.Value ?? "/";
            if (!(HttpMethods.IsGet(context.Request.Method) || HttpMethods.IsHead(context.Request.Method)) ||
                path.Split('/').Any(segment => segment.StartsWith('.')) ||
                Path.HasExtension(path) ||
                path.StartsWith("/swagger", StringComparison.OrdinalIgnoreCase) ||
                path.StartsWith("/api", StringComparison.OrdinalIgnoreCase) ||
                path.StartsWith("/assets", StringComparison.OrdinalIgnoreCase))
            {
                context.Response.StatusCode = StatusCodes.Status404NotFound;
                return;
            }
            context.SetEndpoint(null);
            context.Request.Path = "/index.html";
            await new StaticFileMiddleware(_ =>
            {
                context.Response.StatusCode = StatusCodes.Status404NotFound;
                return Task.CompletedTask;
            }, app.Environment, Microsoft.Extensions.Options.Options.Create(StaticFiles()),
                app.Services.GetRequiredService<ILoggerFactory>()).Invoke(context);
        });
    }
}
