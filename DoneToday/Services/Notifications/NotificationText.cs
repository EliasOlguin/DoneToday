namespace DoneToday.Api.Services.Notifications;

public record PushMessage(string Title, string Body, string Url);

public static class NotificationText
{
    public static PushMessage Weekly(string language, int completed, int total) => new("DoneToday", language switch
    {
        "es" => $"La semana pasada completaste {completed} de {total} hábitos programados.",
        "de" => $"Letzte Woche hast du {completed} von {total} geplanten Gewohnheiten erledigt.",
        _ => $"Last week you completed {completed} of {total} scheduled habits."
    }, "/progress");
    public static PushMessage Habit(string language, int habitId, string? name = null) => new("DoneToday", language switch
    {
        "es" => name == null ? "Tenés un hábito programado pendiente. Un pequeño paso cuenta." : $"Un momento para: {name}",
        "de" => name == null ? "Eine geplante Gewohnheit ist noch offen. Jeder kleine Schritt zählt." : $"Zeit für: {name}",
        _ => name == null ? "A scheduled habit is still pending. Every small step counts." : $"A moment for: {name}"
    }, $"/habits/{habitId}");
    public static PushMessage Create(string kind, string language, int count) => new("DoneToday", (language, kind) switch
    {
        ("es", "morning") => $"Hoy tenés {count} hábitos. Vamos paso a paso.",
        ("de", "morning") => $"Heute stehen {count} Gewohnheiten an. Ein Schritt nach dem anderen.",
        (_, "morning") => $"You have {count} habits today. One step at a time.",
        ("es", "evening") => $"Te quedan {count} hábitos para hoy. Todavía podés avanzar.",
        ("de", "evening") => $"Heute sind noch {count} Gewohnheiten offen. Ein kleiner Schritt ist noch möglich.",
        (_, "evening") => $"You have {count} habits left today. There is still time for a small step.",
        ("es", _) => "Las notificaciones de DoneToday están listas.",
        ("de", _) => "Deine DoneToday-Benachrichtigungen sind bereit.",
        _ => "Your DoneToday notifications are ready."
    }, "/today");
}
