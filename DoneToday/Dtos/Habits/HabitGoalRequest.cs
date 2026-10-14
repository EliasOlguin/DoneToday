using System.ComponentModel.DataAnnotations;
using DoneToday.Api.Services;
using System.Text.Json.Serialization;

namespace DoneToday.Api.Dtos.Habits;

public class HabitGoalRequest : IValidatableObject
{
    private decimal? _target;
    private string? _unit;
    [JsonIgnore]
    public bool GoalSpecified { get; private set; }
    public decimal? GoalTarget { get => _target; set { _target = value; GoalSpecified = true; } }
    public string? GoalUnit { get => _unit; set { _unit = value; GoalSpecified = true; } }
    public IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        if (!HabitGoalService.ValidGoal(GoalTarget, GoalUnit))
            yield return new ValidationResult("Choose a positive target and a supported unit, or leave both empty.", [nameof(GoalTarget), nameof(GoalUnit)]);
    }
}
