using System.Security.Cryptography.X509Certificates;
using DoneToday.Api.Data;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;

namespace DoneToday.Api.Services;

public static class ProductionHosting
{
    public static void Configure(WebApplicationBuilder builder)
    {
        if (builder.Environment.IsDevelopment()) return;
        var renderUrl = builder.Configuration["RENDER_EXTERNAL_URL"];
        if (string.IsNullOrWhiteSpace(builder.Configuration["Authentication:FrontendUrl"]) &&
            !string.IsNullOrWhiteSpace(renderUrl)) builder.Configuration["Authentication:FrontendUrl"] = renderUrl;
        var frontend = GoogleAuthentication.Frontend(builder.Configuration);
        builder.Configuration["AllowedHosts"] = frontend.Host;
        builder.Services.Configure<ForwardedHeadersOptions>(options =>
        {
            options.ForwardedHeaders = ForwardedHeaders.XForwardedProto | ForwardedHeaders.XForwardedFor;
            options.ForwardLimit = 1;
            // Render is the only ingress to the container; it terminates public TLS.
            options.KnownIPNetworks.Clear();
            options.KnownProxies.Clear();
        });
        var encodedCertificate = builder.Configuration["DataProtection:CertificateBase64"];
        if (string.IsNullOrWhiteSpace(encodedCertificate))
            throw new InvalidOperationException("Configure DataProtection:CertificateBase64 for production.");
        var certificate = X509CertificateLoader.LoadPkcs12(Convert.FromBase64String(encodedCertificate),
            null, X509KeyStorageFlags.EphemeralKeySet);
        if (!certificate.HasPrivateKey) throw new InvalidOperationException("The Data Protection certificate requires its private key.");
        builder.Services.AddDataProtection().SetApplicationName("DoneToday")
            .PersistKeysToDbContext<AppDbContext>().ProtectKeysWithCertificate(certificate);
    }
}
