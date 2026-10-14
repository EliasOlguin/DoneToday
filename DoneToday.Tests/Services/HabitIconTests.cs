using System.ComponentModel.DataAnnotations;
using DoneToday.Dtos.Habits;
using DoneToday.Api.Dtos.Habits;

namespace DoneToday.Tests.Services;

public class HabitIconTests
{
    [Theory]
    [InlineData("book", true)]
    [InlineData("water", true)]
    [InlineData("habit", true)]
    [InlineData("unknown", false)]
    [InlineData("<script>", false)]
    [InlineData("", false)]
    public void CreateAndEditValidateIconCatalog(string icon, bool valid)
    {
        object[] requests = [
            new CreateHabitRequest { Name = "Test", DaysOfWeek = [DayOfWeek.Monday], Icon = icon },
            new UpdateHabitRequest { Name = "Test", DaysOfWeek = [DayOfWeek.Monday], Icon = icon }
        ];
        foreach (var request in requests)
            Assert.Equal(valid, Validator.TryValidateObject(request, new ValidationContext(request), [], true));
    }
}
