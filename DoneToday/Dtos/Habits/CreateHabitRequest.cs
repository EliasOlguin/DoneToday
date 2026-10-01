using System.ComponentModel.DataAnnotations;

namespace DoneToday.Dtos.Habits;

public class CreateHabitRequest
{
    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;

    [StringLength(300)]
    public string? Description { get; set; }

    [RegularExpression("^#[0-9A-Fa-f]{6}$")]
    public string? Color { get; set; }

    [Required]
    [MinLength(1)]
    public List<DayOfWeek> DaysOfWeek { get; set; } = [];
}