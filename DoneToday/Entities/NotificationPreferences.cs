namespace DoneToday.Api.Entities;

public class NotificationPreferences
{
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public bool MorningEnabled { get; set; }
    public TimeOnly MorningTime { get; set; } = new(9, 0);
    public bool EveningEnabled { get; set; }
    public TimeOnly EveningTime { get; set; } = new(20, 0);
    public string Language { get; set; } = "en";
    public bool WeeklyEnabled { get; set; }
    public int WeeklyDay { get; set; } = 1;
    public TimeOnly WeeklyTime { get; set; } = new(9, 0);
    public bool QuietEnabled { get; set; }
    public TimeOnly QuietStart { get; set; } = new(22, 0);
    public TimeOnly QuietEnd { get; set; } = new(8, 0);
    public DateOnly? PausedThrough { get; set; }
    public bool ShowHabitNames { get; set; }
}

public class NotificationDevice
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public string EndpointHash { get; set; } = "";
    public string AuthorizationStampHash { get; set; } = "";
    public string ProtectedSubscription { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? LastTestAt { get; set; }
}

public class NotificationDelivery
{
    public long Id { get; set; }
    public int DeviceId { get; set; }
    public NotificationDevice Device { get; set; } = null!;
    public string Key { get; set; } = "";
    public string Kind { get; set; } = "";
    public DateOnly Date { get; set; }
    public int Count { get; set; }
    public int? HabitId { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset NextAttemptAt { get; set; }
    public DateTimeOffset? LockedUntil { get; set; }
    public int Attempts { get; set; }
    public bool Finished { get; set; }
}
