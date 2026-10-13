using System.Security.Claims;
using DoneToday.Api.Services;
using Microsoft.Extensions.Configuration;

namespace DoneToday.Tests.Services;

public class GoogleAuthenticationTests
{
    [Theory]
    [InlineData("true", "person@example.test", true)]
    [InlineData("True", "person@example.test", true)]
    [InlineData("false", "person@example.test", false)]
    [InlineData("true", "", false)]
    [InlineData("1", "person@example.test", false)]
    public void ExternalIdentityRequiresExplicitVerifiedEmail(string verified, string email, bool expected)
    {
        var identity = new ClaimsIdentity(new[] { new Claim("google:email_verified", verified), new Claim(ClaimTypes.Email, email) });
        Assert.Equal(expected, GoogleAuthentication.HasVerifiedEmail(new ClaimsPrincipal(identity)));
    }

    [Fact]
    public void EmailWithoutVerificationIsRejected()
    {
        var identity = new ClaimsIdentity(new[] { new Claim(ClaimTypes.Email, "person@example.test") });
        Assert.False(GoogleAuthentication.HasVerifiedEmail(new ClaimsPrincipal(identity)));
    }

    [Theory]
    [InlineData("http://localhost:5173")]
    [InlineData("//untrusted.example")]
    public void FrontendRedirectRequiresConfiguredHttpsOrigin(string frontend)
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> {
            ["Authentication:FrontendUrl"] = frontend
        }).Build();
        Assert.Throws<InvalidOperationException>(() => GoogleAuthentication.Frontend(configuration));
    }
}
