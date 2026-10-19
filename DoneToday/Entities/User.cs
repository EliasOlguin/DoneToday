namespace DoneToday.Api.Entities;

public class User : Microsoft.AspNetCore.Identity.IdentityUser<int>
{
    [System.ComponentModel.DataAnnotations.Schema.NotMapped]
    public bool IsGuest => UserName?.StartsWith("guest-", StringComparison.Ordinal) == true &&
        Email == UserName[6..] + "@guest.invalid";

    public string? TimeZoneId { get; set; }
    public string? DisplayName { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<Habit> Habits { get; set; } = new List<Habit>();
}
