using System.Net;
using DoneToday.Api.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace DoneToday.Tests.Services;

public class ForwardingTests
{
    [Theory]
    [InlineData("127.0.0.1", "198.51.100.42")]
    [InlineData("192.0.2.1", "127.0.0.1")]
    public async Task ForwardingConsumesOnlyTheLastEntryFromATrustedProxy(string trusted, string expected)
    {
        var builder = WebApplication.CreateBuilder();
        builder.Logging.ClearProviders();
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?> { ["Forwarding:KnownProxies:0"] = trusted });
        builder.Services.Configure<ForwardedHeadersOptions>(options => ProductionHosting.ConfigureForwarding(options, builder.Configuration));
        await using var app = builder.Build();
        app.UseForwardedHeaders();
        app.MapGet("/", (HttpContext context) => context.Connection.RemoteIpAddress!.ToString());
        await app.StartAsync();
        using var client = new HttpClient { BaseAddress = new Uri(app.Urls.Single()) };
        using var request = new HttpRequestMessage(HttpMethod.Get, "/");
        request.Headers.Add("X-Forwarded-For", "203.0.113.99, 198.51.100.42");
        using var response = await client.SendAsync(request);
        Assert.Equal(IPAddress.Parse(expected), IPAddress.Parse(await response.Content.ReadAsStringAsync()));
    }
}
