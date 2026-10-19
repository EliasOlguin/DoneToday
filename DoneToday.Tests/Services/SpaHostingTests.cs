using System.Net;
using DoneToday.Api.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace DoneToday.Tests.Services;

public class SpaHostingTests
{
    [Fact]
    public async Task StaticCachingFallbackHstsAndServerHeaderUseRealHttpPipeline()
    {
        var root = Path.Combine(Path.GetTempPath(), "donetoday-spa-" + Guid.NewGuid());
        Directory.CreateDirectory(Path.Combine(root, "assets"));
        await File.WriteAllTextAsync(Path.Combine(root, "index.html"), "<!doctype html><title>shell</title>");
        await File.WriteAllTextAsync(Path.Combine(root, "assets", "app-123456.js"), "console.log('shell')");
        try
        {
            var builder = WebApplication.CreateBuilder(new WebApplicationOptions { WebRootPath = root });
            builder.Logging.ClearProviders();
            builder.WebHost.UseUrls("http://127.0.0.1:0").ConfigureKestrel(options => options.AddServerHeader = false);
            builder.Services.AddHsts(options => { options.MaxAge = TimeSpan.FromDays(365); options.IncludeSubDomains = true; });
            await using var app = builder.Build();
            // Emulate TLS termination by the trusted ingress for HSTS verification.
            app.Use((context, next) => { context.Request.Scheme = "https"; context.Request.Host = new("app.example.test"); return next(context); });
            app.UseHsts();
            app.UseDefaultFiles();
            app.UseStaticFiles(SpaHosting.StaticFiles());
            app.MapDoneTodayFallback();
            await app.StartAsync();
            try
            {
                using var client = new HttpClient { BaseAddress = new Uri(app.Urls.Single()) };
                foreach (var path in new[] { "/", "/index.html", "/today", "/habits/123/edit", "/settings/security", "/unknown-route" })
                {
                    using var response = await client.GetAsync(path);
                    Assert.Equal(HttpStatusCode.OK, response.StatusCode);
                    Assert.Equal("no-cache", response.Headers.CacheControl?.ToString());
                    Assert.Contains("<title>shell</title>", await response.Content.ReadAsStringAsync());
                    Assert.Equal("max-age=31536000; includeSubDomains", response.Headers.GetValues("Strict-Transport-Security").Single());
                    Assert.False(response.Headers.Contains("Server"));
                }
                using var asset = await client.GetAsync("/assets/app-123456.js");
                Assert.Equal(HttpStatusCode.OK, asset.StatusCode);
                Assert.Equal("public, max-age=31536000, immutable", asset.Headers.CacheControl?.ToString());
                foreach (var path in new[] { "/.git/config", "/.env", "/swagger", "/swagger/index.html", "/missing.js", "/assets/missing", "/api/missing" })
                {
                    using var response = await client.GetAsync(path);
                    Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
                }
            }
            finally { await app.StopAsync(); }
        }
        finally { Directory.Delete(root, true); }
    }
}
