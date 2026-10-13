using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Xml.Linq;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.DataProtection.KeyManagement;
using Microsoft.AspNetCore.DataProtection.Repositories;
using Microsoft.Extensions.DependencyInjection;

namespace DoneToday.Tests.Services;

public class ProductionKeyTests
{
    [Fact]
    public void EncryptedKeyRingSurvivesRecreatedProvider()
    {
        using var rsa = RSA.Create(2048);
        var request = new CertificateRequest("CN=Test", rsa, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
        using var certificate = request.CreateSelfSigned(DateTimeOffset.UtcNow.AddMinutes(-1), DateTimeOffset.UtcNow.AddDays(1));
        var repository = new KeyRepository();
        using var first = Provider(repository, certificate);
        var protectedText = first.GetRequiredService<IDataProtectionProvider>().CreateProtector("session-test").Protect("test session");
        Assert.Contains(repository.GetAllElements(), element => element.Descendants().Any(child => child.Name.LocalName == "encryptedSecret"));
        using var restarted = Provider(repository, certificate);
        Assert.Equal("test session", restarted.GetRequiredService<IDataProtectionProvider>().CreateProtector("session-test").Unprotect(protectedText));
    }

    private static ServiceProvider Provider(IXmlRepository repository, X509Certificate2 certificate)
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddDataProtection().SetApplicationName("DoneToday").ProtectKeysWithCertificate(certificate);
        services.Configure<KeyManagementOptions>(options => options.XmlRepository = repository);
        return services.BuildServiceProvider();
    }

    private class KeyRepository : IXmlRepository
    {
        private readonly List<XElement> keys = new();
        public IReadOnlyCollection<XElement> GetAllElements() => keys.Select(key => new XElement(key)).ToArray();
        public void StoreElement(XElement element, string friendlyName) => keys.Add(new XElement(element));
    }
}
