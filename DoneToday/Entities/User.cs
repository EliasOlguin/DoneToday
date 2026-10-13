namespace DoneToday.Api.Entities;

public class User : Microsoft.AspNetCore.Identity.IdentityUser<int>
{
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<Habit> Habits { get; set; } = new List<Habit>();
}
