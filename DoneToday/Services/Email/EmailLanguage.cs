namespace DoneToday.Api.Services.Email;

public static class EmailLanguage
{
    public const string Header = "X-App-Language";
    public static string Normalize(string? language) => language?.Trim().Split('-', '_')[0].ToLowerInvariant() switch
    {
        "es" => "es",
        "de" => "de",
        _ => "en"
    };
    public static string FromRequest(IHttpContextAccessor? accessor) =>
        Normalize(accessor?.HttpContext?.Request.Headers[Header].ToString());
}
