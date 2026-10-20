using System.Globalization;
using DoneToday.Api.Entities;
using DoneToday.Api.Services;
using DoneToday.Api.Services.Email;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;

namespace DoneToday.Tests.Services;

public class AuthenticationSecurityTests
{
    [Fact]
    public void GuestProofNeedsEmailBrowserUserStampAndExpiry()
    {
        var clock = new TestClock();
        var registration = new GuestRegistration(new EphemeralDataProtectionProvider(), clock);
        var user = new User { Id = 12, UserName = "guest-abc", Email = "abc@guest.invalid", SecurityStamp = "first" };
        var context = new DefaultHttpContext();
        var pending = registration.Begin(context, user, "person@example.test", "hashed-password");
        var cookies = context.Response.Headers.SetCookie.Select(value => value!.Split(';')[0]);
        context.Request.Headers.Cookie = string.Join("; ", cookies);
        var code = registration.EmailCode(pending);
        Assert.Equal(pending, registration.ReadEmail(code, context, user));
        Assert.Equal(pending, registration.ReadReceipt(context, user));
        var receipt = context.Request.Cookies[GuestRegistration.PendingCookie]!;
        Assert.Null(registration.ReadEmail(GuestRegistration.CodePrefix + receipt, context, user));
        Assert.Null(registration.ReadEmail(code + "tampered", context, user));
        Assert.Null(registration.ReadEmail(code, new DefaultHttpContext(), user));
        user.Id = 13;
        Assert.Null(registration.ReadEmail(code, context, user));
        user.Id = 12;
        user.SecurityStamp = "changed";
        Assert.Null(registration.ReadEmail(code, context, user));
        user.SecurityStamp = "first";
        clock.Now += GuestRegistration.Lifetime;
        Assert.Null(registration.ReadEmail(code, context, user));
    }

    [Fact]
    public void StartingAgainCancelsPreviousBrowserProof()
    {
        var registration = new GuestRegistration(new EphemeralDataProtectionProvider(), new TestClock());
        var user = new User { Id = 12, UserName = "guest-abc", Email = "abc@guest.invalid", SecurityStamp = "stamp" };
        var context = new DefaultHttpContext();
        var first = registration.Begin(context, user, "first@example.test", "hash");
        context.Response.Headers.Clear();
        registration.Begin(context, user, "second@example.test", "hash");
        context.Request.Headers.Cookie = string.Join("; ", context.Response.Headers.SetCookie.Select(value => value!.Split(';')[0]));
        Assert.Null(registration.ReadEmail(registration.EmailCode(first), context, user));
    }

    [Fact]
    public void AbsoluteLifetimeDoesNotFollowSlidingIssueTime()
    {
        var now = DateTimeOffset.UtcNow;
        var properties = new AuthenticationProperties();
        Assert.False(SessionSecurity.WithinLifetime(properties, now));
        properties.Items[SessionSecurity.StartedAt] = now.ToUnixTimeSeconds().ToString(CultureInfo.InvariantCulture);
        properties.IssuedUtc = now.AddDays(89);
        Assert.True(SessionSecurity.WithinLifetime(properties, now.AddDays(89)));
        Assert.False(SessionSecurity.WithinLifetime(properties, now.AddDays(90)));
        Assert.False(SessionSecurity.WithinLifetime(properties, now.AddSeconds(-1)));
        properties.Items[SessionSecurity.StartedAt] = "not a timestamp";
        Assert.False(SessionSecurity.WithinLifetime(properties, now));
    }

    [Fact]
    public void LegacyCookiesGetOneBoundedWindowWithoutResettingItOnRenewal()
    {
        var now = DateTimeOffset.UtcNow;
        var properties = new AuthenticationProperties { IssuedUtc = now };
        SessionSecurity.AdoptLegacyTicket(properties);
        Assert.True(SessionSecurity.WithinLifetime(properties, now.AddDays(20)));
        properties.IssuedUtc = now.AddDays(89);
        SessionSecurity.AdoptLegacyTicket(properties);
        Assert.False(SessionSecurity.WithinLifetime(properties, now.AddDays(90)));
    }

    [Fact]
    public void RecipientBudgetSurvivesAccountRecreationAndStopsDailyFloods()
    {
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var clock = new TestClock();
        var budget = new RecipientEmailThrottle(cache, clock);
        for (var i = 0; i < RecipientEmailThrottle.DailyLimit; i++)
        {
            Assert.Equal(0, budget.Reserve("confirm", "Victim@example.test"));
            Assert.True(budget.Reserve("confirm", " victim@EXAMPLE.test ") > 0);
            clock.Now = clock.Now.AddMinutes(2);
        }
        Assert.True(budget.Reserve("confirm", "victim@example.test") > 60);
        Assert.Equal(0, budget.Reserve("confirm", "other@example.test"));
        clock.Now = clock.Now.AddDays(1);
        Assert.Equal(0, budget.Reserve("confirm", "victim@example.test"));
    }

    [Fact]
    public async Task EarlyLimiterRejectsBeforeAuthenticationAndLeavesHealthAvailable()
    {
        using var limiter = new EarlyRequestLimiter();
        var reachedAuthentication = 0;
        for (var i = 0; i < 300; i++)
        {
            var allowed = new DefaultHttpContext();
            allowed.Request.Path = "/api/auth/me";
            await limiter.Invoke(allowed, _ => { reachedAuthentication++; return Task.CompletedTask; });
        }
        var blocked = new DefaultHttpContext();
        blocked.Request.Path = "/not-an-api-route";
        await limiter.Invoke(blocked, _ => { reachedAuthentication++; return Task.CompletedTask; });
        Assert.Equal(429, blocked.Response.StatusCode);
        Assert.Equal(300, reachedAuthentication);
        var health = new DefaultHttpContext();
        health.Request.Path = "/health";
        health.Request.Method = "GET";
        await limiter.Invoke(health, _ => { reachedAuthentication++; return Task.CompletedTask; });
        Assert.Equal(300, reachedAuthentication);
        Assert.Equal(200, health.Response.StatusCode);
    }

    [Fact]
    public async Task LoginAttemptsAreAtomicScopedExpireAndResetOnlyExplicitly()
    {
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var clock = new TestClock();
        var attempts = new LoginAttempts(cache, clock);
        var results = await Task.WhenAll(Enumerable.Range(0, 30).Select(_ => Task.Run(() => attempts.TryBegin(12, "192.0.2.1"))));
        Assert.Equal(5, results.Count(result => result));
        Assert.True(attempts.TryBegin(12, "192.0.2.2"));
        Assert.True(attempts.TryBegin(13, "192.0.2.1"));
        clock.Now = clock.Now.AddMinutes(14);
        Assert.False(attempts.TryBegin(12, "192.0.2.1"));
        clock.Now = clock.Now.AddMinutes(1);
        Assert.True(attempts.TryBegin(12, "192.0.2.1"));
        attempts.Reset(12, "192.0.2.1");
        for (var i = 0; i < 5; i++) Assert.True(attempts.TryBegin(12, "192.0.2.1"));
        Assert.False(attempts.TryBegin(12, "192.0.2.1"));
    }

    private sealed class TestClock : TimeProvider
    {
        public DateTimeOffset Now = DateTimeOffset.UtcNow;
        public override DateTimeOffset GetUtcNow() => Now;
    }
}
