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
            else if (context.File.Name.EndsWith(".html", StringComparison.OrdinalIgnoreCase))
                context.Context.Response.Headers.CacheControl = "no-cache";
            if (context.File.Name.Equals("app.html", StringComparison.OrdinalIgnoreCase))
                context.Context.Response.Headers["X-Robots-Tag"] = "noindex, follow";
        }
    };

    public static void MapDoneTodayFallback(this WebApplication app)
    {
        // Reject hidden paths and infrastructure probes before the SPA fallback rewrites the path.
        app.MapFallback(async context =>
        {
            var path = context.Request.Path.Value ?? "/";
            if (path is "/es" or "/de" && (HttpMethods.IsGet(context.Request.Method) || HttpMethods.IsHead(context.Request.Method)))
            {
                context.Response.Redirect(path + "/" + context.Request.QueryString, permanent: true);
                return;
            }
            var landing = path is "/" or "/es/" or "/de/";
            if (!(HttpMethods.IsGet(context.Request.Method) || HttpMethods.IsHead(context.Request.Method)) ||
                path.Split('/').Any(segment => segment.StartsWith('.')) ||
                Path.HasExtension(path) ||
                path.StartsWith("/swagger", StringComparison.OrdinalIgnoreCase) ||
                path.StartsWith("/api", StringComparison.OrdinalIgnoreCase) ||
                path.StartsWith("/assets", StringComparison.OrdinalIgnoreCase) ||
                !(landing || IsApplicationPath(path)))
            {
                context.Response.StatusCode = StatusCodes.Status404NotFound;
                return;
            }
            context.SetEndpoint(null);
            context.Request.Path = landing ? path + "index.html" : "/app.html";
            await new StaticFileMiddleware(_ =>
            {
                context.Response.StatusCode = StatusCodes.Status404NotFound;
                return Task.CompletedTask;
            }, app.Environment, Microsoft.Extensions.Options.Options.Create(StaticFiles()),
                app.Services.GetRequiredService<ILoggerFactory>()).Invoke(context);
        });
    }

    private static bool IsApplicationPath(string path)
    {
        var normalized = path.TrimEnd('/');
        return normalized is "/today" or "/habits" or "/habits/new" or "/progress" or
            "/settings" or "/settings/security" or "/settings/connections" or "/login" or
            "/register" or "/forgot-password" or "/reset-password" or "/confirm-email" ||
            System.Text.RegularExpressions.Regex.IsMatch(normalized, @"^/habits/[0-9]+(/edit)?$");
    }
}
