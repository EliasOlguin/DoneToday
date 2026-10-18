using DoneToday.Api.Services.Email;

namespace DoneToday.Tests.Services;

public class AccountEmailTemplateTests
{
    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void LinkEmailsContainActionFallbackAndPlainText(bool confirmation)
    {
        const string link = "https://example.test/account?code=a&userId=1";
        var result = confirmation ? AccountEmailTemplate.Confirmation(link) : AccountEmailTemplate.PasswordReset(link);
        Assert.Contains(confirmation ? "Confirm email" : "Reset password", result.Html);
        Assert.Contains("href=\"https://example.test/account?code=a&amp;userId=1\"", result.Html);
        Assert.Contains("Copy and paste", result.Html);
        Assert.Contains(link, result.Text);
        Assert.Contains("Do not share", result.Text);
        Assert.Contains("max-width:560px", result.Html);
        Assert.DoesNotContain("<script", result.Html);
        Assert.DoesNotContain("<img", result.Html);
        if (confirmation) Assert.Contains("did not create a DoneToday account", result.Text);
        if (!confirmation) Assert.Contains("Your password will stay the same", result.Text);
    }

    [Fact]
    public void EncodesAttributeAndVisibleLinkWithoutInjectingMarkup()
    {
        const string link = "https://example.test/reset?code=\"><img src=x onerror=alert(1)>&id=1";
        var result = AccountEmailTemplate.PasswordReset(link);
        Assert.DoesNotContain("<img", result.Html);
        Assert.Contains("&quot;&gt;&lt;img", result.Html);
        Assert.Contains(link, result.Text);
    }

    [Theory]
    [InlineData("javascript:alert(1)")]
    [InlineData("data:text/html,test")]
    [InlineData("/reset")]
    public void RejectsNonWebLinks(string link)
    {
        Assert.Throws<ArgumentException>(() => AccountEmailTemplate.Confirmation(link));
        Assert.Throws<ArgumentException>(() => AccountEmailTemplate.PasswordReset(link));
    }
}