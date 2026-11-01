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
        await File.WriteAllTextAsync(Path.Combine(root, "index.html"), "<!doctype html><title>landing</title>");
        await File.WriteAllTextAsync(Path.Combine(root, "app.html"), "<!doctype html><title>shell</title>");
        Directory.CreateDirectory(Path.Combine(root, "es"));
        await File.WriteAllTextAsync(Path.Combine(root, "es", "index.html"), "<!doctype html><title>landing</title>");
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
                foreach (var path in new[] { "/", "/index.html", "/es/", "/app.html", "/today", "/login", "/register", "/reset-password?token=private", "/habits/123/edit", "/settings/security" })
                {
                    using var response = await client.GetAsync(path);
                    Assert.True(response.StatusCode == HttpStatusCode.OK, $"{path}: {response.StatusCode}");
                    Assert.Equal("no-cache", response.Headers.CacheControl?.ToString());
                    var landing = path is "/" or "/index.html" or "/es/";
                    Assert.Contains(landing ? "<title>landing</title>" : "<title>shell</title>", await response.Content.ReadAsStringAsync());
                    if (landing) Assert.False(response.Headers.Contains("X-Robots-Tag"));
                    else Assert.Equal("noindex, follow", response.Headers.GetValues("X-Robots-Tag").Single());
                    Assert.Equal("max-age=31536000; includeSubDomains", response.Headers.GetValues("Strict-Transport-Security").Single());
                    Assert.False(response.Headers.Contains("Server"));
                }
                using var asset = await client.GetAsync("/assets/app-123456.js");
                Assert.Equal(HttpStatusCode.OK, asset.StatusCode);
                Assert.Equal("public, max-age=31536000, immutable", asset.Headers.CacheControl?.ToString());
                foreach (var path in new[] { "/unknown-route", "/es/missing", "/habits/not-an-id", "/.git/config", "/.env", "/swagger", "/swagger/index.html", "/missing.js", "/assets/missing", "/api/missing" })
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
