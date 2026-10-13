using System.ComponentModel.DataAnnotations;

namespace DoneToday.Api.Services.Email;

public class EmailOptions
{
    public const string SectionName = "Email";
    [Required] public string Host { get; set; } = string.Empty;
    [Range(1, 65535)] public int Port { get; set; } = 587;
    [Required, EmailAddress] public string FromAddress { get; set; } = string.Empty;
    public string FromName { get; set; } = "DoneToday";
    public bool UseStartTls { get; set; } = true;
    public string? Username { get; set; }
    public string? Password { get; set; }
}
