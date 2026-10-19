using DoneToday.Api.Entities;

namespace DoneToday.Tests.Services;

public class GuestAccountTests
{
    [Fact]
    public void ConversionKeepsOwnershipAndProfile()
    {
        var user = new User { Id = 42, UserName = "guest-abc", Email = "abc@guest.invalid", DisplayName = "HappyOtter1234", TimeZoneId = "Europe/Berlin" };
        Assert.True(user.IsGuest);
        user.UserName = "guest-person@example.test";
        user.Email = user.UserName;
        Assert.False(user.IsGuest);
        Assert.Equal(42, user.Id);
        Assert.Equal("HappyOtter1234", user.DisplayName);
        Assert.Equal("Europe/Berlin", user.TimeZoneId);
    }

    [Theory]
    [InlineData("guest-person@example.test", "guest-person@example.test")]
    [InlineData("person", "abc@guest.invalid")]
    [InlineData(null, null)]
    public void RegularAccountsAreNotGuests(string? username, string? email)
    {
        Assert.False(new User { UserName = username, Email = email }.IsGuest);
    }
}
