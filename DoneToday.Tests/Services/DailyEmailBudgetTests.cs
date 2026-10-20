using DoneToday.Api.Services.Email;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace DoneToday.Tests.Services;

public class DailyEmailBudgetTests
{
    [Fact]
    public async Task ConfiguredBudgetIsAtomicWarnsOnceAndResetsAtUtcMidnight()
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["Email:DailyBudget"] = "17" }).Build();
        var clock = new Clock();
        var logger = new CaptureLog();
        var budget = new DailyEmailBudget(configuration, clock, logger);
        var reserved = await Task.WhenAll(Enumerable.Range(0, 100).Select(_ => Task.Run(() => budget.TryReserve())));
        Assert.Equal(17, reserved.Count(value => value));
        Assert.Equal(1, logger.Warnings);
        Assert.False(budget.TryReserve());
        Assert.Equal(1, logger.Warnings);
        clock.Now = clock.Now.AddSeconds(1);
        Assert.True(budget.TryReserve());
        for (var i = 0; i < 16; i++) Assert.True(budget.TryReserve());
        Assert.False(budget.TryReserve());
        Assert.Equal(2, logger.Warnings);
    }

    [Fact]
    public void DefaultAllows250AttemptsAndZeroDisablesSends()
    {
        var clock = new Clock();
        var logger = new CaptureLog();
        var budget = new DailyEmailBudget(new ConfigurationBuilder().Build(), clock, logger);
        for (var i = 0; i < 250; i++) Assert.True(budget.TryReserve());
        Assert.False(budget.TryReserve());
        var disabled = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["Email:DailyBudget"] = "0" }).Build();
        Assert.False(new DailyEmailBudget(disabled, clock, logger).TryReserve());
    }

    private sealed class Clock : TimeProvider
    {
        public DateTimeOffset Now = new(2026, 10, 20, 23, 59, 59, TimeSpan.Zero);
        public override DateTimeOffset GetUtcNow() => Now;
    }
    private sealed class CaptureLog : ILogger<DailyEmailBudget>
    {
        public int Warnings;
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel level) => true;
        public void Log<TState>(LogLevel level, EventId id, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            if (level == LogLevel.Warning) Interlocked.Increment(ref Warnings);
        }
    }
}
