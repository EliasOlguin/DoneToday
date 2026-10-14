using DoneToday.Api.Entities;
using DoneToday.Api.Services;

namespace DoneToday.Tests.Services;

public class HabitGoalServiceTests
{
    private static readonly DateOnly Today = new(2026, 10, 14);

    [Theory]
    [InlineData(2, "l", true)]
    [InlineData(.001, "km", true)]
    [InlineData(0, "l", false)]
    [InlineData(-1, "pages", false)]
    [InlineData(1.5, "pages", false)]
    [InlineData(3, "chapters", true)]
    [InlineData(.0001, "l", false)]
    [InlineData(1000001, "ml", false)]
    [InlineData(2, "unknown", false)]
    public void ValidatesTargets(double target, string unit, bool expected) =>
        Assert.Equal(expected, HabitGoalService.ValidGoal((decimal)target, unit));

    [Fact]
    public void LegacyHabitsRemainSimpleAndMismatchedGoalFieldsAreInvalid()
    {
        Assert.Null(HabitGoalService.ForDate(new Habit(), Today));
        Assert.True(HabitGoalService.ValidGoal(null, null));
        Assert.False(HabitGoalService.ValidGoal(null, "l"));
        Assert.False(HabitGoalService.ValidGoal(2, null));
    }

    [Fact]
    public void OlderClientsOmittingGoalFieldsDoNotRequestGoalRemoval()
    {
        var oldClient = System.Text.Json.JsonSerializer.Deserialize<DoneToday.Api.Dtos.Habits.UpdateHabitRequest>("{\"Name\":\"Read\"}")!;
        Assert.False(oldClient.GoalSpecified);
        var explicitRemoval = System.Text.Json.JsonSerializer.Deserialize<DoneToday.Api.Dtos.Habits.UpdateHabitRequest>("{\"GoalTarget\":null,\"GoalUnit\":null}")!;
        Assert.True(explicitRemoval.GoalSpecified);
    }

    [Fact]
    public void EditingStartsTomorrowAndReplacingPendingChangePreservesHistory()
    {
        var habit = new Habit();
        HabitGoalService.Configure(habit, 2, "l", Today);
        HabitGoalService.Configure(habit, 3, "l", Today.AddDays(1));
        Assert.Equal(2, HabitGoalService.ForDate(habit, Today)!.Target);
        Assert.Equal(3, HabitGoalService.ForDate(habit, Today.AddDays(1))!.Target);
        var removed = HabitGoalService.Configure(habit, 20, "pages", Today.AddDays(1));
        Assert.Single(removed);
        Assert.Equal(2, habit.Goals.Count);
        Assert.Equal("l", HabitGoalService.ForDate(habit, Today)!.Unit);
        Assert.Equal("pages", HabitGoalService.ForDate(habit, Today.AddDays(1))!.Unit);
        Assert.Equal(2, HabitGoalService.ForDate(habit, Today)!.Target);
    }

    [Fact]
    public void SwitchingBackToSimpleDoesNotRewriteMeasuredDays()
    {
        var habit = new Habit();
        HabitGoalService.Configure(habit, 2, "l", Today);
        HabitGoalService.Configure(habit, null, null, Today.AddDays(1));
        Assert.Equal(2, HabitGoalService.ForDate(habit, Today)!.Target);
        Assert.Null(HabitGoalService.ForDate(habit, Today.AddDays(1))!.Target);
    }

    [Theory]
    [InlineData(3, "l")]
    [InlineData(2000, "ml")]
    [InlineData(20, "minutes")]
    public void EditedGoalIsUsedTomorrowWhileTodayKeepsRecordedTarget(int target, string unit)
    {
        var habit = new Habit();
        HabitGoalService.Configure(habit, 2, "l", Today);
        habit.Progress.Add(new HabitDayProgress { Date = Today, Target = 2, Unit = "l", Amount = .75m, Revision = 2 });

        HabitGoalService.Configure(habit, target, unit, Today.AddDays(1));

        Assert.Equal(target, habit.GoalTarget);
        Assert.Equal(unit, habit.GoalUnit);
        Assert.Equal(Today.AddDays(1), habit.GoalEffectiveFrom);
        var today = DoneToday.Api.Dtos.Habits.HabitProgressResponse.ForDate(habit, Today)!;
        Assert.Equal(2, today.Target);
        Assert.Equal("l", today.Unit);
        Assert.Equal(.75m, today.Amount);
        Assert.Equal(2, today.Revision);
        var tomorrow = DoneToday.Api.Dtos.Habits.HabitProgressResponse.ForDate(habit, Today.AddDays(1))!;
        Assert.Equal(target, tomorrow.Target);
        Assert.Equal(unit, tomorrow.Unit);
        Assert.Equal(0, tomorrow.Amount);
    }

    [Fact]
    public void EditingAgainOnFollowingDayPreservesEachHistoricalGoal()
    {
        var habit = new Habit();
        HabitGoalService.Configure(habit, 2, "l", Today);
        HabitGoalService.Configure(habit, 2000, "ml", Today.AddDays(1));
        HabitGoalService.Configure(habit, 20, "minutes", Today.AddDays(2));
        Assert.Equal("l", HabitGoalService.ForDate(habit, Today)!.Unit);
        Assert.Equal("ml", HabitGoalService.ForDate(habit, Today.AddDays(1))!.Unit);
        Assert.Equal("minutes", HabitGoalService.ForDate(habit, Today.AddDays(2))!.Unit);
        Assert.Equal(3, habit.Goals.Count);
    }

    [Fact]
    public void CompletionTracksTargetAndCorrectionsWithoutDuplicates()
    {
        var habit = new Habit();
        var progress = new HabitDayProgress { Date = Today, Target = 2, Amount = 1, Unit = "l" };
        HabitGoalService.SyncCompletion(habit, progress, DateTimeOffset.UtcNow);
        Assert.Empty(habit.Completions);
        progress.Amount = 2;
        HabitGoalService.SyncCompletion(habit, progress, DateTimeOffset.UtcNow);
        Assert.Single(habit.Completions);
        progress.Amount = 3;
        HabitGoalService.SyncCompletion(habit, progress, DateTimeOffset.UtcNow);
        Assert.Single(habit.Completions);
        progress.Amount = .5m;
        HabitGoalService.SyncCompletion(habit, progress, DateTimeOffset.UtcNow);
        Assert.Empty(habit.Completions);
    }
}
