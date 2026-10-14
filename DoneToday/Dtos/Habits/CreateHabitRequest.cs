using System.ComponentModel.DataAnnotations;

namespace DoneToday.Dtos.Habits;

public class CreateHabitRequest : DoneToday.Api.Dtos.Habits.HabitGoalRequest
{
    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;

    [StringLength(300)]
    public string? Description { get; set; }

    [RegularExpression("^#[0-9A-Fa-f]{6}$")]
    public string? Color { get; set; }

    [Required, RegularExpression("^(habit|book|water|walk|moon|leaf|code|heart|music|food|sun)$")]
    public string Icon { get; set; } = "habit";

    [Required]
    [MinLength(1)]
    public List<DayOfWeek> DaysOfWeek { get; set; } = [];
}
