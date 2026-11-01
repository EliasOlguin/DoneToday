using DoneToday.Api.Entities;
using DoneToday.Api.Services.Notifications;

namespace DoneToday.Tests.Services;

public class NotificationPolicyTests
{
    [Fact]
    public void SubscriptionPublicKeysMustBeRealP256CurvePoints()
    {
        var invalid = new byte[65]; invalid[0] = 4;
        Assert.False(PushSubscriptionValidation.Valid(new("https://fcm.googleapis.com/fcm/send/test",
            Microsoft.AspNetCore.WebUtilities.WebEncoders.Base64UrlEncode(invalid),
            Microsoft.AspNetCore.WebUtilities.WebEncoders.Base64UrlEncode(new byte[16]))));
    }
    [Fact]
    public void DevicesStopReceivingNotificationsAfterLogoutOrAccountSecurityChanges()
    {
        var user = new User { Id = 1, UserName = "owner", Email = "owner@example.test", EmailConfirmed = true, SecurityStamp = "original" };
        var device = new NotificationDevice { UserId = 1, AuthorizationStampHash = DeviceAuthorization.Stamp(user) };
        Assert.True(DeviceAuthorization.IsCurrent(device, user));
        user.SecurityStamp = "revoked";
        Assert.False(DeviceAuthorization.IsCurrent(device, user));
        device.UserId = 2;
        Assert.False(DeviceAuthorization.IsCurrent(device, user));
    }
    private static readonly DateOnly Day = new(2026, 11, 2);
    private static Habit Scheduled(bool completed = false) => new()
    {
        Id = 7, UserId = 1, Name = "Read",
        Schedules = [new() { DayOfWeek = DayOfWeek.Monday, ValidFrom = Day.AddDays(-20) }],
        Completions = completed ? [new() { Date = Day }] : []
    };

    [Fact]
    public void DailyMessagesUseAccountTimeZoneAndOnlySendInTheirFreshWindow()
    {
        var preferences = new NotificationPreferences { MorningEnabled = true, MorningTime = new(9, 0) };
        var due = NotificationPolicy.Daily(preferences, DateTimeOffset.Parse("2026-11-02T08:04:00Z"), "Europe/Berlin", [Scheduled()]);
        var message = Assert.Single(due);
        Assert.Equal("morning:2026-11-02", message.Key);
        Assert.Equal(Day, message.Date);
        Assert.Empty(NotificationPolicy.Daily(preferences, DateTimeOffset.Parse("2026-11-02T09:00:00Z"), "Europe/Berlin", [Scheduled()]));
        Assert.Empty(NotificationPolicy.Daily(preferences, DateTimeOffset.Parse("2026-11-02T08:04:00Z"), "America/New_York", [Scheduled()]));
    }

    [Fact]
    public void PendingReminderIsSuppressedAfterCompletionAndOnUnscheduledOrArchivedDays()
    {
        var preferences = new NotificationPreferences { EveningEnabled = true, EveningTime = new(20, 0) };
        var now = DateTimeOffset.Parse("2026-11-02T19:02:00Z");
        Assert.Single(NotificationPolicy.Daily(preferences, now, "Europe/Berlin", [Scheduled()]));
        Assert.Empty(NotificationPolicy.Daily(preferences, now, "Europe/Berlin", [Scheduled(true)]));
        var archived = Scheduled(); archived.IsArchived = true;
        Assert.Empty(NotificationPolicy.Daily(preferences, now, "Europe/Berlin", [archived]));
        Assert.Empty(NotificationPolicy.Daily(preferences, now.AddDays(1), "Europe/Berlin", [Scheduled()]));
        Assert.Empty(NotificationPolicy.Daily(new(), now, "Europe/Berlin", [Scheduled()]));
    }

    [Theory]
    [InlineData("http://fcm.googleapis.com/send/test")]
    [InlineData("https://127.0.0.1/push")]
    [InlineData("https://fcm.googleapis.com.evil.test/push")]
    [InlineData("https://fcm.googleapis.com:8443/push")]
    [InlineData("https://user:password@fcm.googleapis.com/push")]
    public void PushEndpointsCannotTargetArbitraryServers(string endpoint) => Assert.False(PushSubscriptionValidation.ValidEndpoint(endpoint));

    [Theory]
    [InlineData("https://fcm.googleapis.com/fcm/send/example")]
    [InlineData("https://updates.push.services.mozilla.com/wpush/v2/example")]
    [InlineData("https://web.push.apple.com/example")]
    public void SupportsBrowserPushProviders(string endpoint) => Assert.True(PushSubscriptionValidation.ValidEndpoint(endpoint));

    [Fact]
    public void DeliveryTextIsLocalizedAndNeverUsesHabitNamesForDailyNotifications()
    {
        var es = NotificationText.Create("morning", "es", 3);
        var de = NotificationText.Create("evening", "de", 2);
        Assert.Contains("3", es.Body);
        Assert.Contains("2", de.Body);
        Assert.NotEqual(es.Body, NotificationText.Create("morning", "en", 3).Body);
        Assert.Equal("/today", es.Url);
    }
}
