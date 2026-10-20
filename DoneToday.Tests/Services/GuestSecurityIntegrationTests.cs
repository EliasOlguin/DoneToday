using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Json;
using DoneToday.Api.Controllers;
using DoneToday.Api.Data;
using DoneToday.Api.Entities;
using DoneToday.Api.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Npgsql;

namespace DoneToday.Tests.Services;

// Opt in only against an explicitly configured, disposable loopback PostgreSQL server.
public sealed class SecurityPostgresFactAttribute : FactAttribute
{
    public SecurityPostgresFactAttribute()
    {
        if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable("DONETODAY_SECURITY_TEST_CONNECTION")))
            Skip = "Set DONETODAY_SECURITY_TEST_CONNECTION to a disposable loopback PostgreSQL server.";
    }
}

public class GuestSecurityIntegrationTests
{
    private const string Password = "SecurityTestPassword123!";

    [SecurityPostgresFact]
    public async Task PendingConversionNeedsBothBrowserAndEmailAndKeepsOwnership()
    {
        await using var host = await TestHost.Start();
        var owner = host.Browser();
        await owner.Post("/api/auth/guest", new { }, 200);
        var before = await owner.Me();
        var originalCookie = owner.Cookie;
        await owner.Post("/api/Habits", new { name = "Owned habit", daysOfWeek = new[] { 0, 1, 2, 3, 4, 5, 6 } }, 201);
        var habit = (await owner.Get("/api/Habits", 200)).EnumerateArray().Single().GetProperty("id").GetInt32();
        await owner.Post("/api/auth/guest/register", new { email = "owner@example.test", password = Password }, 200);
        var pending = await owner.Me();
        Assert.True(pending.GetProperty("isGuest").GetBoolean());
        Assert.False(pending.GetProperty("hasPassword").GetBoolean());
        Assert.NotEqual("owner@example.test", pending.GetProperty("email").GetString());
        var proof = host.Mail.LastProof();
        // Knowing the email token alone, even with a different valid guest, cannot take over data.
        var other = host.Browser();
        await other.Post("/api/auth/confirm-email", proof, 400);
        await other.Post("/api/auth/guest", new { }, 200);
        await other.Post("/api/auth/confirm-email", proof, 400);
        await owner.Post("/api/auth/confirm-email", proof, 200);
        var after = await owner.Me();
        Assert.Equal(before.GetProperty("id").GetInt32(), after.GetProperty("id").GetInt32());
        Assert.False(after.GetProperty("isGuest").GetBoolean());
        Assert.True(after.GetProperty("hasPassword").GetBoolean());
        await owner.Get($"/api/Habits/{habit}", 200);
        await other.Get($"/api/Habits/{habit}", 404);
        await owner.Post("/api/auth/confirm-email", proof, 400); // Single use.
        await host.Browser(originalCookie).Get("/api/auth/me", 401); // Rotated on conversion.
        await host.Browser().Post("/api/auth/login", new { email = "owner@example.test", password = Password }, 200);
    }

    [SecurityPostgresFact]
    public async Task ConcurrentConfirmationIsSingleUse()
    {
        await using var host = await TestHost.Start();
        var browser = host.Browser();
        await browser.Post("/api/auth/guest", new { }, 200);
        var id = (await browser.Me()).GetProperty("id").GetInt32();
        await browser.Post("/api/auth/guest/register", new { email = "race@example.test", password = Password }, 200);
        var proof = host.Mail.LastProof();
        var first = host.Browser(browser.Cookie);
        var second = host.Browser(browser.Cookie);
        var replies = await Task.WhenAll(first.PostRaw("/api/auth/confirm-email", proof), second.PostRaw("/api/auth/confirm-email", proof));
        try { Assert.Equal(new[] { 200, 400 }, replies.Select(r => (int)r.StatusCode).OrderBy(status => status)); }
        finally { foreach (var reply in replies) reply.Dispose(); }
        using var scope = host.App.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
        Assert.Equal(id, (await users.FindByEmailAsync("race@example.test"))!.Id);
    }

    [SecurityPostgresFact]
    public async Task ExistingEmailHasSameResponseAndDeletionCannotResetRecipientBudget()
    {
        await using var host = await TestHost.Start();
        await host.Seed("existing@example.test");
        var guest = host.Browser();
        await guest.Post("/api/auth/guest", new { }, 200);
        var known = await guest.Post("/api/auth/guest/register", new { email = "existing@example.test", password = Password }, 200);
        var unknown = await guest.Post("/api/auth/guest/register", new { email = "new@example.test", password = Password }, 200);
        Assert.Equal(known, unknown);
        Assert.Equal(2, host.Mail.Links.Count);
        await guest.Post("/api/auth/guest/resend-confirmation", new { }, 429);
        await guest.Post("/api/profile/guest/delete", new { confirm = true }, 204);
        var recreated = host.Browser();
        await recreated.Post("/api/auth/guest", new { }, 200);
        await recreated.Post("/api/auth/guest/register", new { email = "new@example.test", password = Password }, 429);
        Assert.Equal(2, host.Mail.Links.Count);
    }

    [SecurityPostgresFact]
    public async Task LogoutRejectsCopiedCookieAndSlidingRenewalCannotPassNinetyDays()
    {
        await using var host = await TestHost.Start();
        await host.Seed("session@example.test");
        var browser = host.Browser();
        await browser.Post("/api/auth/login", new { email = "session@example.test", password = Password }, 200);
        var stolen = browser.Cookie;
        await browser.Post("/api/auth/logout", new { }, 204);
        await host.Browser(stolen).Get("/api/auth/me", 401);
        await browser.Post("/api/auth/login", new { email = "session@example.test", password = Password }, 200);
        for (var i = 0; i < 3; i++)
        {
            host.Clock.Now = host.Clock.Now.AddDays(29);
            await browser.Get("/api/auth/me", 200);
        }
        host.Clock.Now = host.Clock.Now.AddDays(4);
        await browser.Get("/api/auth/me", 401);
    }

    [SecurityPostgresFact]
    public async Task GoogleConversionPreservesDataInvalidatesPendingProofAndChecksAccountState()
    {
        await using var host = await TestHost.Start();
        var unconfirmed = await host.Seed("pending@example.test", false);
        var local = host.Browser();
        await local.Get($"/test/sign-in/{unconfirmed.Id}", 200);
        var rejected = await local.PostForm("/api/auth/external/link-google", new Dictionary<string, string> { ["Password"] = Password }, 302);
        Assert.Contains("externalError=verification", rejected.Headers.Location!.Query);
        var stale = host.Browser();
        await stale.Post("/api/auth/guest", new { }, 200);
        var staleId = (await stale.Me()).GetProperty("id").GetInt32();
        await stale.Post("/test/external", new { email = "stale@example.test", providerKey = "stale-proof" }, 200);
        await stale.Post("/api/auth/logout", new { }, 204);
        await stale.Get($"/test/sign-in/{staleId}", 200);
        await stale.Get("/api/auth/external/callback", 302);
        using (var state = host.App.Services.CreateScope())
            Assert.Null(await state.ServiceProvider.GetRequiredService<UserManager<User>>().FindByLoginAsync("Google", "stale-proof"));
        var owner = host.Browser();
        await owner.Post("/api/auth/guest", new { }, 200);
        var guest = await owner.Me();
        var id = guest.GetProperty("id").GetInt32();
        await owner.Post("/api/auth/guest/register", new { email = "email-path@example.test", password = Password }, 200);
        var oldProof = host.Mail.LastProof();
        await owner.Post("/test/external", new { email = "google-owner@example.test", providerKey = "verified-owner" }, 200);
        await owner.Get("/api/auth/external/callback", 302);
        var converted = await owner.Me();
        Assert.Equal(id, converted.GetProperty("id").GetInt32());
        Assert.Equal("google-owner@example.test", converted.GetProperty("email").GetString());
        Assert.False(converted.GetProperty("isGuest").GetBoolean());
        await owner.Post("/api/auth/confirm-email", oldProof, 400);
        using var scope = host.App.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
        Assert.Equal(id, (await users.FindByLoginAsync("Google", "verified-owner"))!.Id);
    }

    [SecurityPostgresFact]
    public async Task NormalConfirmationRequiresChosenPasswordAndRevokesExistingSessions()
    {
        await using var host = await TestHost.Start();
        var browser = host.Browser();
        await browser.Post("/api/auth/register", new { email = "normal@example.test", password = Password }, 200);
        var proof = host.Mail.LastProof();
        await browser.Post("/api/auth/confirm-email", proof, 400);
        proof["password"] = "WrongPassword123!";
        await browser.Post("/api/auth/confirm-email", proof, 400);
        proof["password"] = Password;
        await browser.Get($"/test/sign-in/{proof["userId"]}", 200);
        var previous = browser.Cookie;
        await browser.Post("/api/auth/confirm-email", proof, 200);
        await host.Browser(previous).Get("/api/auth/me", 401);
        await browser.Post("/api/auth/login", new { email = "normal@example.test", password = Password }, 200);
    }

    [SecurityPostgresFact]
    public async Task GuestCreationHasAnHourlyLimitAndGlobalStorageCeiling()
    {
        await using (var hourly = await TestHost.Start())
        {
            for (var i = 0; i < 5; i++) await hourly.Browser().Post("/api/auth/guest", new { }, 200);
            await hourly.Browser().Post("/api/auth/guest", new { }, 429);
        }
        await using var capacity = await TestHost.Start();
        using var scope = capacity.App.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Users.AddRange(Enumerable.Range(0, GuestLifecycle.MaximumAccounts).Select(i => new User {
            UserName = "guest-cap" + i, Email = "cap" + i + "@guest.invalid", CreatedAt = capacity.Clock.Now
        }));
        await db.SaveChangesAsync();
        var oldest = await db.Users.OrderBy(u => u.Id).FirstAsync();
        await db.Users.Where(u => u.Id == oldest.Id).ExecuteUpdateAsync(s => s.SetProperty(u => u.CreatedAt, capacity.Clock.Now.AddDays(-2)));
        await capacity.Browser().Post("/api/auth/guest", new { }, 200);
        Assert.False(await db.Users.AnyAsync(u => u.Id == oldest.Id));
        Assert.Equal(GuestLifecycle.MaximumAccounts, await GuestLifecycle.Unlinked(db.Users).CountAsync());
        await Task.WhenAll(capacity.Browser().Post("/api/auth/guest", new { }, 200), capacity.Browser().Post("/api/auth/guest", new { }, 200));
        Assert.Equal(GuestLifecycle.MaximumAccounts, await GuestLifecycle.Unlinked(db.Users).CountAsync());
        // Accounts containing habits must never be evicted to make room.
        await db.Database.ExecuteSqlRawAsync("INSERT INTO \"Habits\" (\"UserId\", \"SortOrder\", \"Name\", \"Icon\", \"CreatedAt\", \"IsArchived\") SELECT \"Id\", 0, 'Keep data', 'habit', now(), false FROM \"Users\"");
        var rejected = await capacity.Browser().Post("/api/auth/guest", new { }, 429);
        Assert.Contains("guestCapacity", rejected);
        Assert.Equal(GuestLifecycle.MaximumAccounts, await db.Habits.CountAsync());
    }

    [SecurityPostgresFact]
    public async Task GuestDeletionCascadesAndRetentionExcludesConvertedAccounts()
    {
        await using var host = await TestHost.Start();
        var guest = host.Browser();
        await guest.Post("/api/auth/guest", new { }, 200);
        await guest.Post("/api/Habits", new { name = "Delete with guest", daysOfWeek = new[] { 1 } }, 201);
        await guest.Post("/api/profile/guest/delete", new { confirm = false }, 400);
        var cookie = guest.Cookie;
        await guest.Post("/api/profile/guest/delete", new { confirm = true }, 204);
        await host.Browser(cookie).Get("/api/auth/me", 401);
        using var scope = host.App.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Empty(await db.Habits.ToListAsync());
        var expired = new User { UserName = "guest-old", Email = "old@guest.invalid", CreatedAt = host.Clock.Now.AddDays(-121) };
        var recent = new User { UserName = "guest-recent", Email = "recent@guest.invalid", CreatedAt = host.Clock.Now.AddDays(-119) };
        recent.Habits.Add(new Habit { Name = "Retain data", CreatedAt = host.Clock.Now.AddDays(-119) });
        db.Users.AddRange(expired, recent);
        await db.SaveChangesAsync();
        var converted = await host.Seed("converted@example.test");
        await db.Users.Where(u => u.Id == converted.Id).ExecuteUpdateAsync(s => s.SetProperty(u => u.CreatedAt, host.Clock.Now.AddDays(-121)));
        var removed = await GuestLifecycle.RemoveExpiredAsync(db, host.Clock.Now);
        Assert.Equal(1, removed);
        Assert.False(await db.Users.AnyAsync(u => u.Id == expired.Id));
        Assert.True(await db.Users.AnyAsync(u => u.Id == recent.Id));
        Assert.True(await db.Users.AnyAsync(u => u.Id == converted.Id));
        var registered = host.Browser();
        await registered.Post("/api/auth/login", new { email = "converted@example.test", password = Password }, 200);
        await registered.Post("/api/profile/guest/delete", new { confirm = true }, 400);
    }

    [SecurityPostgresFact]
    public async Task CleanupRemovesOnlyOldEmptyGuestsAndUnconfirmedLocalAccounts()
    {
        await using var host = await TestHost.Start();
        using var scope = host.App.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        User Guest(string key, double hours) => new() { UserName = "guest-" + key, Email = key + "@guest.invalid", CreatedAt = host.Clock.Now.AddHours(-hours) };
        var empty = Guest("empty", 25);
        var boundary = Guest("boundary", 24);
        var data = Guest("data", 119 * 24);
        data.Habits.Add(new Habit { Name = "Keep history", CreatedAt = host.Clock.Now.AddDays(-119) });
        var expiredData = Guest("expired-data", 121 * 24);
        expiredData.Habits.Add(new Habit { Name = "Expired history", CreatedAt = host.Clock.Now.AddDays(-121) });
        var linkedGuest = Guest("linked", 121 * 24);
        db.Users.AddRange(empty, boundary, data, expiredData, linkedGuest);
        await db.SaveChangesAsync();
        db.UserLogins.Add(new IdentityUserLogin<int> { UserId = linkedGuest.Id, LoginProvider = "Google", ProviderKey = "linked-guest" });
        var old = await host.Seed("expired-local@example.test", false);
        var recent = await host.Seed("recent-local@example.test", false);
        var confirmed = await host.Seed("confirmed-local@example.test");
        var external = await host.Seed("external-local@example.test", false);
        var unexpectedData = await host.Seed("local-data@example.test", false);
        db.UserLogins.Add(new IdentityUserLogin<int> { UserId = external.Id, LoginProvider = "Google", ProviderKey = "external-local" });
        db.Habits.Add(new Habit { UserId = unexpectedData.Id, Name = "Preserve unexpected data", CreatedAt = host.Clock.Now });
        await db.SaveChangesAsync();
        int[] oldIds = [old.Id, confirmed.Id, external.Id, unexpectedData.Id];
        await db.Users.Where(u => oldIds.Contains(u.Id)).ExecuteUpdateAsync(s => s.SetProperty(u => u.CreatedAt, host.Clock.Now.AddHours(-49)));
        await db.Users.Where(u => u.Id == recent.Id).ExecuteUpdateAsync(s => s.SetProperty(u => u.CreatedAt, host.Clock.Now.AddHours(-48)));
        Assert.Equal(2, await GuestLifecycle.RemoveExpiredAsync(db, host.Clock.Now));
        Assert.Equal(1, await GuestLifecycle.RemoveUnconfirmedAsync(db, host.Clock.Now));
        int[] removed = [empty.Id, expiredData.Id, old.Id];
        Assert.False(await db.Users.AnyAsync(u => removed.Contains(u.Id)));
        int[] retained = [boundary.Id, data.Id, linkedGuest.Id, recent.Id, confirmed.Id, external.Id, unexpectedData.Id];
        Assert.Equal(retained.Length, await db.Users.CountAsync(u => retained.Contains(u.Id)));
        Assert.True(await db.Habits.AnyAsync(h => h.UserId == data.Id));
        Assert.False(await db.Habits.AnyAsync(h => h.UserId == expiredData.Id));
    }

    [SecurityPostgresFact]
    public async Task AllEmailSendPathsShareTheDailyBudgetWithoutRevealingAccountExistence()
    {
        await using var host = await TestHost.Start(dailyBudget: 1);
        await host.Seed("confirmed@example.test");
        await host.Seed("pending@example.test", false);
        await host.Seed("collision@example.test");
        var browser = host.Browser();
        await browser.Post("/api/auth/register", new { email = "first@example.test", password = Password }, 200);
        Assert.Single(host.Mail.Links);
        var fresh = await browser.Post("/api/auth/register", new { email = "second@example.test", password = Password }, 200);
        var existing = await browser.Post("/api/auth/register", new { email = "collision@example.test", password = Password }, 200);
        Assert.Equal(fresh, existing);
        Assert.Equal(await browser.Post("/api/auth/resend-confirmation", new { email = "pending@example.test" }, 200),
            await browser.Post("/api/auth/resend-confirmation", new { email = "unknown-confirm@example.test" }, 200));
        Assert.Equal(await browser.Post("/api/auth/forgot-password", new { email = "confirmed@example.test" }, 200),
            await browser.Post("/api/auth/forgot-password", new { email = "unknown-reset@example.test" }, 200));
        var guest = host.Browser();
        await guest.Post("/api/auth/guest", new { }, 200);
        fresh = await guest.Post("/api/auth/guest/register", new { email = "guest-new@example.test", password = Password }, 200);
        host.Clock.Now = host.Clock.Now.AddMinutes(1);
        existing = await guest.Post("/api/auth/guest/register", new { email = "collision@example.test", password = Password }, 200);
        Assert.Equal(fresh, existing);
        host.Clock.Now = host.Clock.Now.AddMinutes(1);
        await guest.Post("/api/auth/guest/resend-confirmation", new { }, 200);
        Assert.True((await guest.Me()).GetProperty("isGuest").GetBoolean());
        Assert.Single(host.Mail.Links);
        // Real sends resume on the next UTC day; recipient cooldowns have also elapsed.
        host.Clock.Now = host.Clock.Now.AddDays(1);
        await browser.Post("/api/auth/forgot-password", new { email = "confirmed@example.test" }, 200);
        Assert.Equal(2, host.Mail.Links.Count);
    }

    [SecurityPostgresFact]
    public async Task RegistrationValidatesPasswordsBeforeLookingUpExistingEmails()
    {
        await using var host = await TestHost.Start();
        await host.Seed("known@example.test");
        var browser = host.Browser();
        var known = await browser.Post("/api/auth/register", new { email = "known@example.test", password = "aaaaaaaaaaaa" }, 400);
        var unknown = await browser.Post("/api/auth/register", new { email = "unknown@example.test", password = "aaaaaaaaaaaa" }, 400);
        Assert.Equal(known, unknown);
        Assert.Contains("PasswordRequiresUpper", known);
        Assert.Empty(host.Mail.Links);
        using var scope = host.App.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
        Assert.Null(await users.FindByEmailAsync("unknown@example.test"));
        known = await browser.Post("/api/auth/register", new { email = "known@example.test", password = Password }, 200);
        unknown = await browser.Post("/api/auth/register", new { email = "unknown@example.test", password = Password }, 200);
        Assert.Equal(known, unknown);
        Assert.Single(host.Mail.Links);
    }

    [SecurityPostgresFact]
    public async Task GoogleSignUpReplacesUnconfirmedLocalAccountAndRejectsItsOldSession()
    {
        await using var host = await TestHost.Start();
        var squatted = await host.Seed("owner@example.test", false);
        var oldBrowser = host.Browser();
        await oldBrowser.Get($"/test/sign-in/{squatted.Id}", 200);
        var oldCookie = oldBrowser.Cookie;
        var google = host.Browser();
        await google.Post("/test/external", new { email = "owner@example.test", providerKey = "verified-owner", signUp = true }, 200);
        await google.Get("/api/auth/external/callback", 302);
        var owner = await google.Me();
        Assert.NotEqual(squatted.Id, owner.GetProperty("id").GetInt32());
        Assert.False(owner.GetProperty("hasPassword").GetBoolean());
        await host.Browser(oldCookie).Get("/api/auth/me", 401);
        await host.Browser().Post("/api/auth/login", new { email = "owner@example.test", password = Password }, 401);
        using var scope = host.App.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
        Assert.Null(await users.FindByIdAsync(squatted.Id.ToString()));
        var replacement = await users.FindByLoginAsync("Google", "verified-owner");
        Assert.NotNull(replacement);
        Assert.True(replacement.EmailConfirmed);
        Assert.Equal(owner.GetProperty("id").GetInt32(), replacement.Id);
    }

    [SecurityPostgresFact]
    public async Task GoogleSignUpDoesNotReplaceConfirmedLinkedGuestOrUnverifiedAccounts()
    {
        await using var host = await TestHost.Start();
        var confirmed = await host.Seed("confirmed@example.test");
        var linked = await host.Seed("linked@example.test", false);
        var pending = await host.Seed("pending@example.test", false);
        using var scope = host.App.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
        Assert.True((await users.AddLoginAsync((await users.FindByIdAsync(linked.Id.ToString()))!, new UserLoginInfo("Other", "other-key", "Other"))).Succeeded);
        var guest = host.Browser();
        await guest.Post("/api/auth/guest", new { }, 200);
        var guestState = await guest.Me();
        foreach (var email in new[] { confirmed.Email!, linked.Email!, guestState.GetProperty("email").GetString()! })
        {
            var browser = host.Browser();
            await browser.Post("/test/external", new { email, providerKey = Guid.NewGuid().ToString(), signUp = true }, 200);
            var location = await browser.GetLocation("/api/auth/external/callback");
            Assert.Contains("externalError=existingAccount", location.Query);
            Assert.True((await users.FindByEmailAsync(email)) is not null);
            await browser.Get("/api/auth/me", 401);
        }
        var unverified = host.Browser();
        await unverified.Post("/test/external", new { email = pending.Email, providerKey = "unverified", signUp = true, verified = false }, 200);
        await unverified.Get("/api/auth/external/callback", 302);
        Assert.NotNull(await users.FindByIdAsync(pending.Id.ToString()));
        Assert.Null(await users.FindByLoginAsync("Google", "unverified"));
    }

    [SecurityPostgresFact]
    public async Task FailedGoogleAccountCreationRollsBackTheUnconfirmedAccountDeletion()
    {
        await using var host = await TestHost.Start();
        var pending = await host.Seed("owner@example.test", false);
        using (var scope = host.App.Services.CreateScope())
        {
            var users = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
            Assert.True((await users.SetUserNameAsync((await users.FindByIdAsync(pending.Id.ToString()))!, "pending-owner")).Succeeded);
            var blocker = await host.Seed("other@example.test");
            Assert.True((await users.SetUserNameAsync((await users.FindByIdAsync(blocker.Id.ToString()))!, "owner@example.test")).Succeeded);
        }
        var browser = host.Browser();
        await browser.Post("/test/external", new { email = pending.Email, providerKey = "rollback-key", signUp = true }, 200);
        var location = await browser.GetLocation("/api/auth/external/callback");
        Assert.Contains("externalError=failed", location.Query);
        using var state = host.App.Services.CreateScope();
        var db = state.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.True(await db.Users.AnyAsync(u => u.Id == pending.Id && !u.EmailConfirmed));
        Assert.False(await db.UserLogins.AnyAsync(login => login.LoginProvider == "Google" && login.ProviderKey == "rollback-key"));
        await browser.Get("/api/auth/me", 401);
    }

    [SecurityPostgresFact]
    public async Task IdentityTokensAreProtectedBoundToTheirOwnerAndRecoveryCodesRemainSingleUse()
    {
        await using var host = await TestHost.Start();
        var account = await host.Seed("two-factor@example.test");
        var other = await host.Seed("other-two-factor@example.test");
        using var scope = host.App.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = (await users.FindByIdAsync(account.Id.ToString()))!;
        Assert.True((await users.ResetAuthenticatorKeyAsync(user)).Succeeded);
        var key = await users.GetAuthenticatorKeyAsync(user);
        var codes = (await users.GenerateNewTwoFactorRecoveryCodesAsync(user, 3))!.ToArray();
        var stored = await db.UserTokens.AsNoTracking().Where(token => token.UserId == user.Id).ToListAsync();
        Assert.All(stored, token => Assert.StartsWith("protected:v1:", token.Value));
        Assert.DoesNotContain(stored, token => token.Value!.Contains(key!) || codes.Any(code => token.Value.Contains(code)));
        Assert.Equal(3, await users.CountRecoveryCodesAsync(user));
        Assert.True((await users.RedeemTwoFactorRecoveryCodeAsync(user, codes[0])).Succeeded);
        Assert.False((await users.RedeemTwoFactorRecoveryCodeAsync(user, codes[0])).Succeeded);
        Assert.Equal(2, await users.CountRecoveryCodesAsync(user));
        var rawKey = stored.Single(token => token.Name == "AuthenticatorKey").Value!;
        db.UserTokens.Add(new IdentityUserToken<int> { UserId = other.Id, LoginProvider = "[AspNetUserStore]", Name = "AuthenticatorKey", Value = rawKey });
        await db.SaveChangesAsync();
        var otherUser = (await users.FindByIdAsync(other.Id.ToString()))!;
        await Assert.ThrowsAsync<System.Security.Cryptography.CryptographicException>(() => users.GetAuthenticatorKeyAsync(otherUser));
    }

    [SecurityPostgresFact]
    public async Task LegacyTokensAreEncryptedIdempotentlyWithoutChangingTheirValues()
    {
        await using var host = await TestHost.Start();
        var account = await host.Seed("legacy-two-factor@example.test");
        using var scope = host.App.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.UserTokens.AddRange(new IdentityUserToken<int> { UserId = account.Id, LoginProvider = "[AspNetUserStore]", Name = "AuthenticatorKey", Value = "LEGACYKEY" },
            new IdentityUserToken<int> { UserId = account.Id, LoginProvider = "[AspNetUserStore]", Name = "RecoveryCodes", Value = "first;second" });
        await db.SaveChangesAsync();
        var store = (ProtectedUserStore)scope.ServiceProvider.GetRequiredService<IUserStore<User>>();
        await store.ProtectExistingAsync();
        var first = await db.UserTokens.AsNoTracking().Select(token => token.Value).ToArrayAsync();
        await store.ProtectExistingAsync();
        Assert.Equal(first, await db.UserTokens.AsNoTracking().Select(token => token.Value).ToArrayAsync());
        db.ChangeTracker.Clear();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
        var user = (await users.FindByIdAsync(account.Id.ToString()))!;
        Assert.Equal("LEGACYKEY", await users.GetAuthenticatorKeyAsync(user));
        Assert.True((await users.RedeemTwoFactorRecoveryCodeAsync(user, "first")).Succeeded);
        Assert.False((await users.RedeemTwoFactorRecoveryCodeAsync(user, "first")).Succeeded);
    }

    [SecurityPostgresFact]
    public async Task OneIpCannotLockTheAccountButDistributedFailuresStillDo()
    {
        await using var host = await TestHost.Start();
        var account = await host.Seed("login-victim@example.test");
        var attacker = host.Browser(ip: "192.0.2.1");
        for (var i = 0; i < 5; i++) await attacker.Post("/api/auth/login", new { email = account.Email, password = "wrong-password" }, 401);
        await attacker.Post("/api/auth/login", new { email = account.Email, password = Password }, 401);
        var owner = host.Browser(ip: "192.0.2.2");
        await owner.Post("/api/auth/login", new { email = account.Email, password = Password }, 200);
        await owner.Me();
        for (var ip = 3; ip <= 6; ip++)
        {
            var browser = host.Browser(ip: $"192.0.2.{ip}");
            for (var i = 0; i < 5; i++) await browser.Post("/api/auth/login", new { email = account.Email, password = "wrong-password" }, 401);
        }
        using var scope = host.App.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
        Assert.True(await users.IsLockedOutAsync((await users.FindByIdAsync(account.Id.ToString()))!));
        await host.Browser(ip: "192.0.2.7").Post("/api/auth/login", new { email = account.Email, password = Password }, 401);
    }

    [SecurityPostgresFact]
    public async Task TwoFactorLoginUsesEncryptedTokensAndDoesNotResetTheIpBudgetAfterOnlyAPassword()
    {
        await using var host = await TestHost.Start();
        var account = await host.Seed("mfa-login@example.test");
        string[] codes;
        using (var scope = host.App.Services.CreateScope())
        {
            var users = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
            var user = (await users.FindByIdAsync(account.Id.ToString()))!;
            Assert.True((await users.SetAuthenticationTokenAsync(user, "[AspNetUserStore]", "AuthenticatorKey", "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ")).Succeeded);
            Assert.True((await users.SetTwoFactorEnabledAsync(user, true)).Succeeded);
            codes = (await users.GenerateNewTwoFactorRecoveryCodesAsync(user, 3))!.ToArray();
        }
        var attacker = host.Browser(ip: "192.0.2.1");
        Assert.Contains("requiresTwoFactor", await attacker.Post("/api/auth/login", new { email = account.Email, password = Password }, 200));
        for (var i = 0; i < 4; i++) await attacker.Post("/api/auth/two-factor/login", new { code = "invalid" }, 401);
        await attacker.Post("/api/auth/login", new { email = account.Email, password = Password }, 401);
        var owner = host.Browser(ip: "192.0.2.2");
        await owner.Post("/api/auth/login", new { email = account.Email, password = Password }, 200);
        var counter = new byte[8];
        System.Buffers.Binary.BinaryPrimitives.WriteInt64BigEndian(counter, DateTimeOffset.UtcNow.ToUnixTimeSeconds() / 30);
        var hash = System.Security.Cryptography.HMACSHA1.HashData(System.Text.Encoding.ASCII.GetBytes("12345678901234567890"), counter);
        var offset = hash[^1] & 15;
        var code = ((System.Buffers.Binary.BinaryPrimitives.ReadInt32BigEndian(hash.AsSpan(offset, 4)) & int.MaxValue) % 1_000_000).ToString("D6");
        await owner.Post("/api/auth/two-factor/login", new { code }, 200);
        await owner.Me();
        var recovery = host.Browser(ip: "192.0.2.3");
        await recovery.Post("/api/auth/login", new { email = account.Email, password = Password }, 200);
        await recovery.Post("/api/auth/two-factor/login", new { code = codes[0], recoveryCode = true }, 200);
        await recovery.Me();
        var replay = host.Browser(ip: "192.0.2.4");
        await replay.Post("/api/auth/login", new { email = account.Email, password = Password }, 200);
        await replay.Post("/api/auth/two-factor/login", new { code = codes[0], recoveryCode = true }, 401);
    }

    [SecurityPostgresFact]
    public async Task RuntimeRoleSupportsIdentityAndHabitsButCannotChangeTheSchema()
    {
        var host = await TestHost.Start();
        var role = "donetoday_runtime_" + Guid.NewGuid().ToString("N");
        var created = false;
        try
        {
            using var scope = host.App.Services.CreateScope();
            var owner = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            // The identifier is generated locally from a fixed prefix and a GUID, never request input.
            await using (var connection = new NpgsqlConnection(owner.Database.GetConnectionString()))
            {
                await connection.OpenAsync();
                await using var command = new NpgsqlCommand($"CREATE ROLE \"{role}\" LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT", connection);
                await command.ExecuteNonQueryAsync();
            }
            created = true;
            var script = await File.ReadAllTextAsync(Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "docs", "sql", "runtime-role.sql")));
            script = string.Join('\n', script.Split('\n').Where(line => !line.StartsWith('\\')))
                .Replace(":\"runtime_role\"", $"\"{role}\"").Replace(":'runtime_role'", $"'{role}'").Replace(":\"DBNAME\"", $"\"{owner.Database.GetDbConnection().Database}\"");
            await owner.Database.ExecuteSqlRawAsync(script);
            var settings = new NpgsqlConnectionStringBuilder(owner.Database.GetConnectionString()) { Username = role, Password = "", Pooling = false };
            var services = new ServiceCollection();
            services.AddLogging();
            services.AddDataProtection().UseEphemeralDataProtectionProvider();
            services.AddDbContext<AppDbContext>(options => options.UseNpgsql(settings.ConnectionString));
            services.AddDoneTodayIdentity();
            await using var provider = services.BuildServiceProvider();
            await using var runtimeScope = provider.CreateAsyncScope();
            var users = runtimeScope.ServiceProvider.GetRequiredService<UserManager<User>>();
            var user = new User { UserName = "runtime@example.test", Email = "runtime@example.test", EmailConfirmed = true };
            Assert.True((await users.CreateAsync(user, Password)).Succeeded);
            Assert.True((await users.ResetAuthenticatorKeyAsync(user)).Succeeded);
            Assert.NotNull(await users.GetAuthenticatorKeyAsync(user));
            var runtime = runtimeScope.ServiceProvider.GetRequiredService<AppDbContext>();
            var habit = new Habit { UserId = user.Id, Name = "Runtime habit" };
            runtime.Habits.Add(habit);
            await runtime.SaveChangesAsync();
            habit.Name = "Updated";
            await runtime.SaveChangesAsync();
            Assert.Equal("Updated", (await runtime.Habits.SingleAsync()).Name);
            runtime.Habits.Remove(habit);
            await runtime.SaveChangesAsync();
            runtime.DataProtectionKeys.Add(new() { FriendlyName = "test", Xml = "<test />" });
            await runtime.SaveChangesAsync();
            Assert.NotEmpty(await runtime.Database.GetAppliedMigrationsAsync());
            foreach (var sql in new[] { "CREATE TABLE public.forbidden (id int)", "ALTER TABLE public.\"Users\" ADD COLUMN forbidden int", "DROP TABLE public.\"Users\"", "DELETE FROM public.\"__EFMigrationsHistory\"" })
            {
                var error = await Assert.ThrowsAsync<PostgresException>(() => runtime.Database.ExecuteSqlRawAsync(sql));
                Assert.Equal(PostgresErrorCodes.InsufficientPrivilege, error.SqlState);
            }
            await owner.Database.ExecuteSqlRawAsync("CREATE TABLE public.runtime_future_test (id serial PRIMARY KEY)");
            await runtime.Database.ExecuteSqlRawAsync("INSERT INTO public.runtime_future_test DEFAULT VALUES");
            await runtime.Database.ExecuteSqlRawAsync("DELETE FROM public.runtime_future_test");
        }
        finally
        {
            await host.DisposeAsync();
            if (created)
            {
                await using var admin = new NpgsqlConnection(Environment.GetEnvironmentVariable("DONETODAY_SECURITY_TEST_CONNECTION"));
                await admin.OpenAsync();
                await using var drop = new NpgsqlCommand($"DROP ROLE \"{role}\"", admin);
                await drop.ExecuteNonQueryAsync();
            }
        }
    }

    [SecurityPostgresFact]
    public async Task MigrationCommandExitsWithoutServingHttpAndProtectedTokensSurviveRestart()
    {
        await using var host = await TestHost.Start();
        var account = await host.Seed("migration-two-factor@example.test");
        using var scope = host.App.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.UserTokens.Add(new IdentityUserToken<int> { UserId = account.Id, LoginProvider = "[AspNetUserStore]", Name = "AuthenticatorKey", Value = "LEGACYKEY" });
        await db.SaveChangesAsync();
        using var rsa = System.Security.Cryptography.RSA.Create(2048);
        var request = new System.Security.Cryptography.X509Certificates.CertificateRequest("CN=LocalSecurityTest", rsa,
            System.Security.Cryptography.HashAlgorithmName.SHA256, System.Security.Cryptography.RSASignaturePadding.Pkcs1);
        using var certificate = request.CreateSelfSigned(DateTimeOffset.UtcNow.AddMinutes(-1), DateTimeOffset.UtcNow.AddDays(1));
        var repository = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", ".."));
        for (var run = 0; run < 2; run++)
        {
            var start = new System.Diagnostics.ProcessStartInfo("dotnet") { UseShellExecute = false, RedirectStandardOutput = true, RedirectStandardError = true, CreateNoWindow = true, WorkingDirectory = Path.Combine(repository, "DoneToday") };
            start.ArgumentList.Add(Path.Combine(repository, "DoneToday", "bin", new DirectoryInfo(AppContext.BaseDirectory).Parent!.Name, "net10.0", "DoneToday.dll"));
            start.ArgumentList.Add("--migrate-only");
            start.Environment["ASPNETCORE_ENVIRONMENT"] = "Production";
            start.Environment["DOTNET_ENVIRONMENT"] = "Production";
            start.Environment["ConnectionStrings__AuthenticationConnection"] = db.Database.GetConnectionString();
            start.Environment["Authentication__FrontendUrl"] = "https://localhost:5173";
            start.Environment["DataProtection__CertificateBase64"] = Convert.ToBase64String(certificate.Export(System.Security.Cryptography.X509Certificates.X509ContentType.Pfx));
            start.Environment["Logging__LogLevel__Default"] = "None";
            start.Environment["Email__Provider"] = "Smtp";
            using var process = System.Diagnostics.Process.Start(start)!;
            var output = process.StandardOutput.ReadToEndAsync();
            var errors = process.StandardError.ReadToEndAsync();
            try { await process.WaitForExitAsync().WaitAsync(TimeSpan.FromSeconds(45)); }
            catch { process.Kill(true); throw; }
            Assert.Equal(0, process.ExitCode);
            Assert.DoesNotContain("Now listening", await output);
            Assert.Empty(await errors);
        }
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddDbContext<AppDbContext>(options => options.UseNpgsql(db.Database.GetConnectionString()));
        services.AddDataProtection().SetApplicationName("DoneToday").PersistKeysToDbContext<AppDbContext>().ProtectKeysWithCertificate(certificate);
        services.AddDoneTodayIdentity();
        await using var provider = services.BuildServiceProvider();
        await using var restarted = provider.CreateAsyncScope();
        var users = restarted.ServiceProvider.GetRequiredService<UserManager<User>>();
        Assert.Equal("LEGACYKEY", await users.GetAuthenticatorKeyAsync((await users.FindByIdAsync(account.Id.ToString()))!));
    }

    private sealed class TestClock : TimeProvider
    {
        public DateTimeOffset Now = DateTimeOffset.UtcNow;
        public override DateTimeOffset GetUtcNow() => Now;
    }
    private sealed class CaptureMail : IEmailSender<User>
    {
        public List<string> Links { get; } = [];
        public Task SendConfirmationLinkAsync(User user, string email, string link) { Links.Add(link); return Task.CompletedTask; }
        public Task SendPasswordResetLinkAsync(User user, string email, string link) { Links.Add(link); return Task.CompletedTask; }
        public Task SendPasswordResetCodeAsync(User user, string email, string code) => throw new NotSupportedException();
        public Dictionary<string, string> LastProof()
        {
            var query = QueryHelpers.ParseQuery(new Uri(Links.Last()).Query);
            return new() { ["userId"] = query["userId"].ToString(), ["code"] = query["code"].ToString() };
        }
    }
    private sealed class Browser(TestHost host, string? initialCookie = null, string? ip = null)
    {
        private readonly CookieContainer cookies = new();
        private readonly Uri cookieOrigin = new("https://localhost/api/auth/");
        private readonly HttpClient client = new(new HttpClientHandler { UseCookies = false, AllowAutoRedirect = false }) { BaseAddress = new Uri(host.App.Urls.Single()) };
        public string Cookie => string.IsNullOrEmpty(initialCookie) ? cookies.GetCookieHeader(cookieOrigin) : initialCookie;
        private async Task<HttpResponseMessage> Send(HttpRequestMessage request, int expected)
        {
            if (ip is not null) request.Headers.Add("X-Test-IP", ip);
            if (!string.IsNullOrEmpty(Cookie)) request.Headers.Add("Cookie", Cookie);
            var response = await client.SendAsync(request);
            if (response.Headers.TryGetValues("Set-Cookie", out var headers))
                foreach (var header in headers) cookies.SetCookies(cookieOrigin, header);
            Assert.True(expected == 0 || (int)response.StatusCode == expected, $"{request.Method} {request.RequestUri} expected {expected}, got {(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
            return response;
        }
        public async Task<JsonElement> Get(string path, int expected)
        {
            using var response = await Send(new HttpRequestMessage(HttpMethod.Get, path), expected);
            var body = await response.Content.ReadAsStringAsync();
            return string.IsNullOrEmpty(body) || expected != 200 ? default : JsonSerializer.Deserialize<JsonElement>(body);
        }
        public Task<JsonElement> Me() => Get("/api/auth/me", 200);
        public async Task<Uri> GetLocation(string path)
        {
            using var response = await Send(new HttpRequestMessage(HttpMethod.Get, path), 302);
            return response.Headers.Location!;
        }
        public async Task<string> Post(string path, object body, int expected)
        {
            var csrf = await Get("/api/auth/csrf", 200);
            using var request = new HttpRequestMessage(HttpMethod.Post, path) { Content = JsonContent.Create(body) };
            request.Headers.Add("X-CSRF-TOKEN", csrf.GetProperty("token").GetString());
            using var response = await Send(request, expected);
            return await response.Content.ReadAsStringAsync();
        }
        public async Task<HttpResponseMessage> PostRaw(string path, object body)
        {
            var csrf = await Get("/api/auth/csrf", 200);
            using var request = new HttpRequestMessage(HttpMethod.Post, path) { Content = JsonContent.Create(body) };
            request.Headers.Add("X-CSRF-TOKEN", csrf.GetProperty("token").GetString());
            return await Send(request, 0);
        }
        public async Task<HttpResponseMessage> PostForm(string path, Dictionary<string, string> body, int expected)
        {
            var csrf = await Get("/api/auth/csrf", 200);
            using var request = new HttpRequestMessage(HttpMethod.Post, path) { Content = new FormUrlEncodedContent(body) };
            request.Headers.Add("X-CSRF-TOKEN", csrf.GetProperty("token").GetString());
            return await Send(request, expected);
        }
    }
    private sealed class TestHost : IAsyncDisposable
    {
        public WebApplication App { get; private set; } = null!;
        public TestClock Clock { get; } = new();
        public CaptureMail Mail { get; } = new();
        private string adminConnection = "";
        private string databaseName = "";
        private string connection = "";
        public Browser Browser(string? cookie = null, string? ip = null) => new(this, cookie, ip);
        public async Task<User> Seed(string email, bool confirmed = true)
        {
            using var scope = App.Services.CreateScope();
            var users = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
            var user = new User { UserName = email, Email = email, EmailConfirmed = confirmed };
            Assert.True((await users.CreateAsync(user, Password)).Succeeded);
            return user;
        }
        public static async Task<TestHost> Start(int? dailyBudget = null)
        {
            var host = new TestHost();
            var settings = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("DONETODAY_SECURITY_TEST_CONNECTION"));
            if (settings.Host is not ("127.0.0.1" or "localhost") || settings.Database != "postgres")
                throw new InvalidOperationException("Security integration tests require an explicit loopback postgres admin connection.");
            host.adminConnection = settings.ConnectionString;
            host.databaseName = "donetoday_security_" + Guid.NewGuid().ToString("N");
            await using (var admin = new NpgsqlConnection(host.adminConnection))
            {
                await admin.OpenAsync();
                await using var create = new NpgsqlCommand($"CREATE DATABASE \"{host.databaseName}\"", admin);
                await create.ExecuteNonQueryAsync();
            }
            settings.Database = host.databaseName;
            host.connection = settings.ConnectionString;
            var builder = WebApplication.CreateBuilder(new WebApplicationOptions { EnvironmentName = Environments.Development });
            builder.Logging.ClearProviders();
            builder.WebHost.UseUrls("http://127.0.0.1:0");
            builder.Services.AddSingleton<TimeProvider>(host.Clock);
            builder.Services.AddControllers().AddApplicationPart(typeof(AuthController).Assembly);
            builder.Services.AddDbContext<AppDbContext>(o => o.UseNpgsql(host.connection));
            builder.Services.AddDoneTodayIdentity();
            builder.Services.Configure<CookieAuthenticationOptions>(IdentityConstants.ApplicationScheme, o => o.TimeProvider = host.Clock);
            builder.Services.Configure<SecurityStampValidatorOptions>(o => o.TimeProvider = host.Clock);
            builder.Services.AddApiSecurity();
            builder.Services.AddDataProtection().UseEphemeralDataProtectionProvider();
            builder.Services.AddSingleton<IEmailSender<User>>(host.Mail);
            builder.Services.AddScoped<UserDateService>();
            builder.Services.AddScoped<StreakService>();
            builder.Services.AddScoped<ProgressService>();
            builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?> {
                ["Authentication:FrontendUrl"] = "https://localhost:5173", ["Email:DailyBudget"] = (dailyBudget ?? 250).ToString(),
                ["Authentication:Google:ClientId"] = "test-only", ["Authentication:Google:ClientSecret"] = "test-only"
            });
            builder.Services.AddDoneTodayGoogle(builder.Configuration);
            host.App = builder.Build();
            host.App.Use((ctx, next) => {
                if (ctx.Request.Headers.TryGetValue("X-Test-IP", out var ip)) ctx.Connection.RemoteIpAddress = IPAddress.Parse(ip.ToString());
                return next(ctx);
            });
            host.App.Use((ctx, next) => host.App.Services.GetRequiredService<EarlyRequestLimiter>().Invoke(ctx, next));
            host.App.UseAuthentication();
            host.App.UseRateLimiter();
            host.App.UseAuthorization();
            host.App.MapControllers();
            host.App.MapGet("/test/sign-in/{id:int}", async (int id, UserManager<User> users, SignInManager<User> signIn) => {
                await signIn.SignInAsync((await users.FindByIdAsync(id.ToString()))!, true);
                return Results.Ok(new { });
            });
            host.App.MapPost("/test/external", async (ExternalProof request, HttpContext context, UserManager<User> users) => {
                var properties = new AuthenticationProperties();
                properties.Items["LoginProvider"] = "Google";
                if (!request.SignUp)
                {
                    var user = (await users.GetUserAsync(context.User))!;
                    properties.Items["XsrfId"] = user.Id.ToString();
                    properties.Items["linkUserId"] = user.Id.ToString();
                    properties.Items["linkStamp"] = user.SecurityStamp;
                }
                await context.SignInAsync(IdentityConstants.ExternalScheme,
                    new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, request.ProviderKey),
                        new Claim(ClaimTypes.Email, request.Email), new Claim("google:email_verified", request.Verified ? "true" : "false")], "Google")), properties);
                return Results.Ok(new { });
            });
            using (var scope = host.App.Services.CreateScope())
                await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.MigrateAsync();
            await host.App.StartAsync();
            return host;
        }
        public async ValueTask DisposeAsync()
        {
            if (App is not null) { await App.StopAsync(); await App.DisposeAsync(); }
            if (!databaseName.StartsWith("donetoday_security_", StringComparison.Ordinal)) throw new InvalidOperationException("Unsafe test database name.");
            await using var pool = new NpgsqlConnection(connection);
            NpgsqlConnection.ClearPool(pool);
            await using var admin = new NpgsqlConnection(adminConnection);
            await admin.OpenAsync();
            await using var drop = new NpgsqlCommand($"DROP DATABASE \"{databaseName}\" WITH (FORCE)", admin);
            await drop.ExecuteNonQueryAsync();
        }
    }
    private sealed record ExternalProof(string Email, string ProviderKey, bool SignUp = false, bool Verified = true);
}
