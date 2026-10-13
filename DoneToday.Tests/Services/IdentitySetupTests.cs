using DoneToday.Api.Entities;
using DoneToday.Api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace DoneToday.Tests.Services;

public class IdentitySetupTests
{
    [Theory]
    [InlineData("Abcdefgh1!", false)]
    [InlineData("abcdefghijk1!", false)]
    [InlineData("ABCDEFGHIJK1!", false)]
    [InlineData("Abcdefghijklm!", false)]
    [InlineData("Abcdefghijk12", false)]
    [InlineData("Abcdefghijk1!", true)]
    public async Task PasswordValidatorEnforcesTheSelectedPolicy(string password, bool expected)
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddIdentityCore<User>(IdentitySetup.Configure);
        using var provider = services.BuildServiceProvider();
        var options = provider.GetRequiredService<IOptions<IdentityOptions>>();
        var manager = new UserManager<User>(new MinimalUserStore(), options,
            new PasswordHasher<User>(), [], [new PasswordValidator<User>()],
            new UpperInvariantLookupNormalizer(), new IdentityErrorDescriber(), provider,
            provider.GetRequiredService<Microsoft.Extensions.Logging.ILogger<UserManager<User>>>());
        var result = await new PasswordValidator<User>().ValidateAsync(manager, new User(), password);
        Assert.Equal(expected, result.Succeeded);
    }

    [Fact]
    public void ConfigurationRequiresConfirmedEmailAndUniqueAccountsButNotTwoFactor()
    {
        var options = new IdentityOptions();
        IdentitySetup.Configure(options);
        Assert.True(options.SignIn.RequireConfirmedEmail);
        Assert.True(options.User.RequireUniqueEmail);
        Assert.False(new User().TwoFactorEnabled);
    }

    private class MinimalUserStore : IUserStore<User>
    {
        public void Dispose() { }
        public Task<string> GetUserIdAsync(User user, CancellationToken cancellationToken) => Task.FromResult(user.Id.ToString());
        public Task<string?> GetUserNameAsync(User user, CancellationToken cancellationToken) => Task.FromResult(user.UserName);
        public Task SetUserNameAsync(User user, string? userName, CancellationToken cancellationToken) { user.UserName = userName; return Task.CompletedTask; }
        public Task<string?> GetNormalizedUserNameAsync(User user, CancellationToken cancellationToken) => Task.FromResult(user.NormalizedUserName);
        public Task SetNormalizedUserNameAsync(User user, string? normalizedName, CancellationToken cancellationToken) { user.NormalizedUserName = normalizedName; return Task.CompletedTask; }
        public Task<IdentityResult> CreateAsync(User user, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task<IdentityResult> UpdateAsync(User user, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task<IdentityResult> DeleteAsync(User user, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task<User?> FindByIdAsync(string userId, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task<User?> FindByNameAsync(string normalizedUserName, CancellationToken cancellationToken) => throw new NotSupportedException();
    }
}
