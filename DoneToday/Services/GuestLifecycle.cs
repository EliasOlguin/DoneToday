using DoneToday.Api.Entities;
using DoneToday.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace DoneToday.Api.Services;

public static class GuestLifecycle
{
    public const int MaximumAccounts = 5_000;
    // Every guest session has expired before retention ends, even with daily activity.
    public static readonly TimeSpan Retention = TimeSpan.FromDays(120);
    public static IQueryable<User> Unlinked(IQueryable<User> users) => users.Where(user =>
        user.UserName != null && user.UserName.StartsWith("guest-") &&
        user.Email == user.UserName.Substring(6) + "@guest.invalid" &&
        user.PasswordHash == null && !user.EmailConfirmed);

    public static Task<int> RemoveExpiredAsync(AppDbContext database, DateTimeOffset now, CancellationToken cancellation = default)
    {
        var cutoff = now - Retention;
        return Unlinked(database.Users).Where(user => user.CreatedAt < cutoff &&
            !database.UserLogins.Any(login => login.UserId == user.Id)).ExecuteDeleteAsync(cancellation);
    }
}

public sealed class GuestCleanup(IServiceScopeFactory scopes, TimeProvider clock, ILogger<GuestCleanup> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromDays(1), clock);
        do
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                // Single conditional DELETE: converted accounts are excluded, including concurrent conversions.
                var deleted = await GuestLifecycle.RemoveExpiredAsync(database, clock.GetUtcNow(), stoppingToken);
                if (deleted > 0) logger.LogInformation("Removed {Count} expired unlinked guest accounts.", deleted);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { return; }
            catch (Exception error) { logger.LogError(error, "Guest retention cleanup failed; will retry tomorrow."); }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
