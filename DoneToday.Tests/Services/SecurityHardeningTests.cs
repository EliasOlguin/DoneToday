using System.ComponentModel.DataAnnotations;
using System.Net;
using System.Security.Claims;
using DoneToday.Api.Controllers;
using DoneToday.Api.Data;
using DoneToday.Api.Entities;
using DoneToday.Api.Services;
using DoneToday.Dtos.Habits;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;

namespace DoneToday.Tests.Services;

public class SecurityHardeningTests
{
    [Theory]
    [InlineData(new[] { 0, 6 }, true)]
    [InlineData(new[] { 0, 1, 2, 3, 4, 5, 6 }, true)]
    [InlineData(new[] { -1 }, false)]
    [InlineData(new[] { 7 }, false)]
    [InlineData(new[] { 999 }, false)]
    [InlineData(new[] { 1, 1 }, false)]
    [InlineData(new[] { 0, 1, 2, 3, 4, 5, 6, 0 }, false)]
    public void CreateAndEditValidateEveryWeekday(int[] values, bool expected)
    {
        object[] requests = [new CreateHabitRequest { Name = "Read", DaysOfWeek = values.Select(v => (DayOfWeek)v).ToList() },
            new DoneToday.Api.Dtos.Habits.UpdateHabitRequest { Name = "Read", DaysOfWeek = values.Select(v => (DayOfWeek)v).ToList() }];
        foreach (var request in requests) Assert.Equal(expected, Validator.TryValidateObject(request, new ValidationContext(request), [], true));
    }

    [Fact]
    public void VerificationFailuresAreSharedPerAccountAndExpire()
    {
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var time = new Clock();
        var attempts = new ReverificationAttempts(cache, time);
        for (var i = 0; i < 5; i++) attempts.Fail(12);
        Assert.True(attempts.IsBlocked(12));
        Assert.False(attempts.IsBlocked(13));
        time.Now = time.Now.AddMinutes(16);
        Assert.False(attempts.IsBlocked(12));
        attempts.Fail(12);
        Assert.False(attempts.IsBlocked(12));
        attempts.Reset(12);
        Assert.False(attempts.IsBlocked(12));
    }

    [Fact]
    public async Task DeletionProofIsBoundToUserStampExpiryAndSingleUseUnderConcurrency()
    {
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var time = new Clock();
        var proof = new DeleteAccountVerification(cache, time);
        var user = new User { Id = 12, SecurityStamp = "first" };
        var token = proof.Issue(user);
        Assert.False(proof.Check(user, null));
        Assert.False(proof.Check(user, new string('x', 64)));
        Assert.False(proof.Check(new User { Id = 13, SecurityStamp = "first" }, token));
        user.SecurityStamp = "changed";
        Assert.False(proof.Check(user, token));
        user.SecurityStamp = "first";
        Assert.True(proof.Check(user, token));
        var uses = await Task.WhenAll(Enumerable.Range(0, 20).Select(_ => Task.Run(() => proof.Check(user, token, true))));
        Assert.Single(uses, valid => valid);
        Assert.False(proof.Check(user, token));
        var expired = proof.Issue(user);
        time.Now = time.Now.AddMinutes(6);
        Assert.False(proof.Check(user, expired));
        Assert.True(DeleteAccountVerification.Cookie.HttpOnly);
        Assert.True(DeleteAccountVerification.Cookie.Secure);
        Assert.Equal(SameSiteMode.Strict, DeleteAccountVerification.Cookie.SameSite);
    }

    [Fact]
    public async Task CorrectPasswordDoesNotResetRepeatedSecondFactorFailures()
    {
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var attempts = new ReverificationAttempts(cache, new Clock());
        using var users = new SyntheticUserManager(new SyntheticUsers());
        var verification = new SensitiveActionVerifier(users, attempts);
        var user = new User { Id = 12 };
        for (var i = 0; i < 5; i++)
        {
            Assert.True(await verification.Password(user, "correct-password"));
            Assert.False(await verification.Code(user, "wrong-code"));
        }
        Assert.True(attempts.IsBlocked(user.Id));
        Assert.False(await verification.Password(user, "correct-password"));
        Assert.False(await verification.Code(user, "123456"));
        var other = new User { Id = 13 };
        Assert.False(await verification.Password(other, "wrong-password"));
        Assert.True(await verification.Password(other, "correct-password"));
        Assert.True(await verification.Code(other, "123456"));
        await verification.Complete(other);
        for (var i = 0; i < 4; i++) attempts.Fail(other.Id);
        Assert.False(attempts.IsBlocked(other.Id));
    }

    [Fact]
    public void GoogleDeletionRequiresTheLinkedProviderKeyAndCurrentUser()
    {
        UserLoginInfo[] logins = [new("Google", "linked-account", "Google")];
        Assert.True(GoogleAuthentication.MatchesDeletionAccount(12, "12", "linked-account", logins));
        Assert.False(GoogleAuthentication.MatchesDeletionAccount(13, "12", "linked-account", logins));
        Assert.False(GoogleAuthentication.MatchesDeletionAccount(12, "12", "different-account", logins));
        Assert.False(GoogleAuthentication.MatchesDeletionAccount(12, "12", "linked-account", [new("Other", "linked-account", "Other")]));
    }

    [Fact]
    public void QueriesKeepSqlShapedInputInParametersAndPreserveOwnership()
    {
        using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseNpgsql("Host=127.0.0.1;Port=1;Database=unused;Username=unused").Options);
        string payload = "x' OR 1=1; DROP TABLE Users;--";
        int userId = 12;
        using var command = db.Habits.Where(h => h.UserId == userId && h.Name == payload).CreateDbCommand();
        Assert.DoesNotContain(payload, command.CommandText);
        Assert.Contains("\"UserId\"", command.CommandText);
        Assert.Contains(command.Parameters.Cast<System.Data.Common.DbParameter>(), parameter => Equals(parameter.Value, payload));
    }

    [Fact]
    public async Task RealHttpPipelineLimitsWritesPerAccountAndAddsBrowserHeaders()
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions { EnvironmentName = Environments.Production });
        builder.Logging.ClearProviders();
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        builder.Services.AddSingleton(TimeProvider.System);
        builder.Services.AddApiSecurity();
        builder.Services.AddControllers().AddApplicationPart(typeof(HabitsController).Assembly);
        builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql("Host=127.0.0.1;Port=1;Database=unused;Username=unused"));
        builder.Services.AddDoneTodayIdentity();
        builder.Services.AddSingleton<SyntheticUsers>();
        builder.Services.AddScoped<UserManager<User>, SyntheticUserManager>();
        builder.Services.AddDataProtection().UseEphemeralDataProtectionProvider();
        builder.Services.AddScoped<UserDateService>();
        builder.Services.AddScoped<StreakService>();
        builder.Services.AddScoped<ProgressService>();
        builder.Services.AddSingleton<IEmailSender<User>, NoEmail>();
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?> { ["Authentication:FrontendUrl"] = "https://localhost:5173", ["Authentication:Google:ClientId"] = "test-only", ["Authentication:Google:ClientSecret"] = "test-only" });
        builder.Services.AddDoneTodayGoogle(builder.Configuration);
        await using var app = builder.Build();
        app.UseBrowserSecurity(false);
        app.UseAuthentication();
        // Synthetic principals exist only in this isolated test host, never the product.
        app.Use(async (context, next) => {
            if (context.Request.Headers.TryGetValue("X-Test-Account", out var id))
                context.User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, id.ToString())], "test"));
            await next(context);
        });
        app.UseRateLimiter();
        app.UseAuthorization();
        app.MapControllers();
        app.MapPost("/api/probe", () => Results.Ok());
        app.MapPost("/api/auth/probe", () => Results.Ok()).RequireRateLimiting("authentication");
        app.MapGet("/health", () => Results.Ok());
        app.MapGet("/google-challenge", () => {
            var properties = new AuthenticationProperties { RedirectUri = "/settings" };
            properties.SetParameter("prompt", "select_account consent");
            return Results.Challenge(properties, ["Google"]);
        });
        app.MapGet("/test-external/{providerKey}", async (HttpContext context, string providerKey) => {
            var properties = new AuthenticationProperties();
            properties.Items["LoginProvider"] = "Google";
            properties.Items["XsrfId"] = "12";
            properties.Items["deleteUserId"] = "12";
            var external = new ClaimsPrincipal(new ClaimsIdentity([
                new Claim(ClaimTypes.NameIdentifier, providerKey), new Claim(ClaimTypes.Email, "audit@example.test"),
                new Claim("google:email_verified", "true")], "Google"));
            await context.SignInAsync(IdentityConstants.ExternalScheme, external, properties);
            return Results.Ok();
        });
        await app.StartAsync();
        try
        {
            using var client = new HttpClient(new HttpClientHandler { AllowAutoRedirect = false }) { BaseAddress = new Uri(app.Urls.Single()) };
            using var anonymous = await client.GetAsync("/api/Habits");
            Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);
            client.DefaultRequestHeaders.Add("X-Test-Account", "12");
            using var csrf = await client.PostAsync("/api/Habits", new StringContent("{}", System.Text.Encoding.UTF8, "application/json"));
            Assert.Equal(HttpStatusCode.BadRequest, csrf.StatusCode);
            using var google = await client.GetAsync("/google-challenge");
            Assert.Equal(HttpStatusCode.Redirect, google.StatusCode);
            Assert.Equal("accounts.google.com", google.Headers.Location?.Host);
            Assert.Contains("prompt=select_account%20consent", google.Headers.Location?.Query);
            Assert.Contains("state=", google.Headers.Location?.Query);
            using var tokenResponse = await client.GetAsync("/api/auth/csrf");
            var csrfCookie = tokenResponse.Headers.GetValues("Set-Cookie").Single(value => value.Contains("Antiforgery")).Split(';')[0];
            using var tokenJson = System.Text.Json.JsonDocument.Parse(await tokenResponse.Content.ReadAsStringAsync());
            client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", tokenJson.RootElement.GetProperty("token").GetString());
            client.DefaultRequestHeaders.Add("Cookie", csrfCookie);
            static StringContent DeleteBody() => new("{\"email\":\"audit@example.test\"}", System.Text.Encoding.UTF8, "application/json");
            using var unverifiedDelete = await client.PostAsync("/api/profile/delete", DeleteBody());
            Assert.Equal(HttpStatusCode.Forbidden, unverifiedDelete.StatusCode);
            using var wrongProvider = await client.GetAsync("/test-external/different-account");
            using var wrongCallback = await client.GetAsync("/api/auth/external/callback");
            Assert.Contains("externalError=verification", wrongCallback.Headers.Location?.Query);
            using var linkedProvider = await client.GetAsync("/test-external/linked-account");
            using var verifiedCallback = await client.GetAsync("/api/auth/external/callback");
            Assert.Contains("deleteVerified=1", verifiedCallback.Headers.Location?.Query);
            var proofCookie = verifiedCallback.Headers.GetValues("Set-Cookie").Single(value => value.StartsWith(DeleteAccountVerification.CookieName + "=")).Split(';')[0];
            client.DefaultRequestHeaders.Remove("Cookie");
            client.DefaultRequestHeaders.Add("Cookie", csrfCookie + "; " + proofCookie);
            using var verifiedDelete = await client.PostAsync("/api/profile/delete", DeleteBody());
            Assert.Equal(HttpStatusCode.NoContent, verifiedDelete.StatusCode);
            using var repeatedDelete = await client.PostAsync("/api/profile/delete", DeleteBody());
            Assert.Equal(HttpStatusCode.Forbidden, repeatedDelete.StatusCode);
            Assert.Equal(1, app.Services.GetRequiredService<SyntheticUsers>().Deleted);
            // The rejected POST above consumed one of this account's write permits.
            for (var i = 0; i < 56; i++) { using var ok = await client.PostAsync("/api/probe", null); Assert.Equal(HttpStatusCode.OK, ok.StatusCode); }
            using var limited = await client.PostAsync("/api/probe", null);
            Assert.Equal(HttpStatusCode.TooManyRequests, limited.StatusCode);
            client.DefaultRequestHeaders.Remove("X-Test-Account");
            client.DefaultRequestHeaders.Add("X-Test-Account", "13");
            using var other = await client.PostAsync("/api/probe", null);
            Assert.Equal(HttpStatusCode.OK, other.StatusCode);
            Assert.Equal("no-store", other.Headers.CacheControl?.ToString());
            Assert.Equal("DENY", other.Headers.GetValues("X-Frame-Options").Single());
            Assert.Equal("no-referrer", other.Headers.GetValues("Referrer-Policy").Single());
            var csp = other.Headers.GetValues("Content-Security-Policy").Single();
            Assert.Contains("frame-ancestors 'none'", csp);
            Assert.Contains("script-src 'self'", csp);
            Assert.Contains("form-action 'self' https://accounts.google.com", csp);
            using var large = await client.PostAsync("/api/probe", new StringContent(new string('x', ApiSecurity.MaximumBodyBytes + 1)));
            Assert.Equal(HttpStatusCode.RequestEntityTooLarge, large.StatusCode);
            using var health = await client.GetAsync("/health");
            Assert.Equal(HttpStatusCode.OK, health.StatusCode);
            client.DefaultRequestHeaders.Remove("X-Test-Account");
            // The three deletion attempts share the same authentication policy.
            for (var i = 0; i < 17; i++) { using var auth = await client.PostAsync("/api/auth/probe", null); Assert.Equal(HttpStatusCode.OK, auth.StatusCode); }
            using var authLimited = await client.PostAsync("/api/auth/probe", null);
            Assert.Equal(HttpStatusCode.TooManyRequests, authLimited.StatusCode);
        }
        finally { await app.StopAsync(); }
    }

    private sealed class Clock : TimeProvider
    {
        public DateTimeOffset Now = new(2026, 10, 18, 12, 0, 0, TimeSpan.Zero);
        public override DateTimeOffset GetUtcNow() => Now;
    }
    private sealed class NoEmail : IEmailSender<User>
    {
        public Task SendConfirmationLinkAsync(User user, string email, string confirmationLink) => throw new InvalidOperationException("Email must not be sent by these tests.");
        public Task SendPasswordResetLinkAsync(User user, string email, string resetLink) => throw new InvalidOperationException("Email must not be sent by these tests.");
        public Task SendPasswordResetCodeAsync(User user, string email, string resetCode) => throw new InvalidOperationException("Email must not be sent by these tests.");
    }
    private sealed class SyntheticUsers { public int Deleted; }
    private sealed class SyntheticUserManager : UserManager<User>
    {
        private readonly SyntheticUsers state;
        public SyntheticUserManager(SyntheticUsers state) : base(new NoUserStore(),
            Microsoft.Extensions.Options.Options.Create(new IdentityOptions()), new PasswordHasher<User>(), [], [],
            new UpperInvariantLookupNormalizer(), new IdentityErrorDescriber(), new ServiceCollection().BuildServiceProvider(),
            Microsoft.Extensions.Logging.Abstractions.NullLogger<UserManager<User>>.Instance) { this.state = state; }
        public override Task<User?> GetUserAsync(ClaimsPrincipal principal) => Task.FromResult<User?>(
            int.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? new User { Id = id, Email = "audit@example.test", SecurityStamp = "synthetic" } : null);
        public override Task<IList<UserLoginInfo>> GetLoginsAsync(User user) => Task.FromResult<IList<UserLoginInfo>>([new("Google", "linked-account", "Google")]);
        public override Task<bool> IsLockedOutAsync(User user) => Task.FromResult(false);
        public override Task<bool> HasPasswordAsync(User user) => Task.FromResult(false);
        public override Task<bool> CheckPasswordAsync(User user, string password) => Task.FromResult(password == "correct-password");
        public override Task<bool> VerifyTwoFactorTokenAsync(User user, string tokenProvider, string token) => Task.FromResult(token == "123456");
        public override Task<IdentityResult> DeleteAsync(User user) { state.Deleted++; return Task.FromResult(IdentityResult.Success); }
    }
    private sealed class NoUserStore : IUserStore<User>
    {
        public void Dispose() { }
        public Task<string> GetUserIdAsync(User user, CancellationToken cancellationToken) => Task.FromResult(user.Id.ToString());
        public Task<string?> GetUserNameAsync(User user, CancellationToken cancellationToken) => Task.FromResult(user.UserName);
        public Task SetUserNameAsync(User user, string? userName, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<string?> GetNormalizedUserNameAsync(User user, CancellationToken cancellationToken) => Task.FromResult(user.NormalizedUserName);
        public Task SetNormalizedUserNameAsync(User user, string? normalizedName, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<IdentityResult> CreateAsync(User user, CancellationToken cancellationToken) => throw new InvalidOperationException();
        public Task<IdentityResult> UpdateAsync(User user, CancellationToken cancellationToken) => throw new InvalidOperationException();
        public Task<IdentityResult> DeleteAsync(User user, CancellationToken cancellationToken) => throw new InvalidOperationException();
        public Task<User?> FindByIdAsync(string userId, CancellationToken cancellationToken) => throw new InvalidOperationException();
        public Task<User?> FindByNameAsync(string normalizedUserName, CancellationToken cancellationToken) => throw new InvalidOperationException();
    }
}
