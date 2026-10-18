using System.ComponentModel.DataAnnotations;

namespace DoneToday.Api.Dtos.Habits;

public sealed class ValidWeekdaysAttribute : ValidationAttribute
{
    public override bool IsValid(object? value) => value is IEnumerable<DayOfWeek> days &&
        days.All(day => Enum.IsDefined(day)) && days.Distinct().Count() == days.Count();
}
