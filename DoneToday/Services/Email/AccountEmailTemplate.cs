using System.Net;

namespace DoneToday.Api.Services.Email;

public static class AccountEmailTemplate
{
    public sealed record Content(string Subject, string Text, string Html);

    public static Content Confirmation(string link, string? language = null) => EmailLanguage.Normalize(language) switch
    {
        "es" => Link("es", "Confirma tu email de DoneToday", "Tu próximo capítulo empieza aquí.",
            "Te damos la bienvenida a DoneToday", "Pequeños pasos. Un progreso significativo.",
            "Confirma tu dirección de email para empezar a crear hábitos que se adapten a tu vida.",
            "Confirmar email", link, "Si no creaste una cuenta en DoneToday, puedes ignorar este correo."),
        "de" => Link("de", "Bestätige deine DoneToday-E-Mail", "Dein nächstes Kapitel beginnt hier.",
            "Willkommen bei DoneToday", "Kleine Schritte. Spürbarer Fortschritt.",
            "Bestätige deine E-Mail-Adresse, um Gewohnheiten aufzubauen, die zu deinem Leben passen.",
            "E-Mail bestätigen", link, "Wenn du kein DoneToday-Konto erstellt hast, kannst du diese E-Mail ignorieren."),
        _ => Link("en", "Confirm your DoneToday email", "Your next chapter starts here.",
            "Welcome to DoneToday", "Small steps. Meaningful progress.",
            "Confirm your email address to start building habits that fit your life.",
            "Confirm email", link, "If you did not create a DoneToday account, you can safely ignore this email.")
    };

    public static Content PasswordReset(string link, string? language = null) => EmailLanguage.Normalize(language) switch
    {
        "es" => Link("es", "Restablece tu contraseña de DoneToday", "Un nuevo comienzo, a un paso.",
            "Recupera el acceso a tu cuenta", "Tus hábitos estarán aquí cuando vuelvas.",
            "Recibimos una solicitud para restablecer tu contraseña. Usa el botón para elegir una nueva.",
            "Restablecer contraseña", link, "Si no solicitaste este cambio, ignora este correo. Tu contraseña no cambiará."),
        "de" => Link("de", "Setze dein DoneToday-Passwort zurück", "Ein neuer Anfang ist nur einen Schritt entfernt.",
            "Zurück zu deinem Konto", "Deine Gewohnheiten warten auf dich.",
            "Wir haben eine Anfrage zum Zurücksetzen deines Passworts erhalten. Wähle über den Button ein neues Passwort.",
            "Passwort zurücksetzen", link, "Wenn du dies nicht angefordert hast, ignoriere diese E-Mail. Dein Passwort bleibt unverändert."),
        _ => Link("en", "Reset your DoneToday password", "A fresh start, just one step away.",
            "Let's get you back in", "Your habits will be here when you return.",
            "We received a request to reset your password. Use the button below to choose a new one.",
            "Reset password", link, "If you did not request a password reset, ignore this email. Your password will stay the same.")
    };

    public static Content PasswordResetCode(string code, string? language = null)
    {
        var (subject, label) = EmailLanguage.Normalize(language) switch
        {
            "es" => ("Restablece tu contraseña de DoneToday", "Tu código para restablecer la contraseña es:"),
            "de" => ("Setze dein DoneToday-Passwort zurück", "Dein Code zum Zurücksetzen des Passworts lautet:"),
            _ => ("Reset your DoneToday password", "Your password reset code is:")
        };
        return new(subject, $"{label} {code}", $"<p>{label} <strong>{WebUtility.HtmlEncode(code)}</strong></p>");
    }

    private static Content Link(string language, string subject, string preview, string title, string subtitle,
        string introduction, string action, string link, string safety)
    {
        var (privacy, fallback, tagline, automated, badge) = language switch
        {
            "es" => ("Este enlace es personal. No lo compartas.", "¿El botón no funciona? Copia y pega este enlace en tu navegador:",
                "Un día. Un paso. DoneToday.", "Este es un correo automático de tu cuenta.", "UN PEQUEÑO PASO"),
            "de" => ("Dieser Link ist persönlich. Teile ihn nicht.", "Funktioniert der Button nicht? Kopiere diesen Link in deinen Browser:",
                "Ein Tag. Ein Schritt. DoneToday.", "Dies ist eine automatische Konto-E-Mail.", "EIN KLEINER SCHRITT"),
            _ => ("This link is personal. Do not share it.", "Button not working? Copy and paste this link into your browser:",
                "One day. One step. DoneToday.", "This is an automated account email.", "ONE SMALL STEP")
        };
        if (!Uri.TryCreate(link, UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttps && uri.Scheme != Uri.UriSchemeHttp))
            throw new ArgumentException("Email links must be absolute HTTP or HTTPS URLs.", nameof(link));
        var safeLink = WebUtility.HtmlEncode(link);
        var text = $"DoneToday\n\n{title}\n{subtitle}\n\n{introduction}\n\n{action}: {link}\n\n{privacy}\n\n{safety}\n\n{tagline}";
        // Tables and inline styles keep the essential layout usable without images,
        // scripts, external fonts or support for modern CSS in the email client.
        var html = $$"""
            <!doctype html>
            <html lang="{{language}}">
            <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{{subject}}</title></head>
            <body style="margin:0;padding:0;background-color:#f5f3fa;color:#20212b;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">
              <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">{{preview}}</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f3fa;">
                <tr><td align="center" style="padding:40px 16px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
                    <tr><td style="padding:0 8px 24px;font-size:23px;font-weight:bold;letter-spacing:-0.7px;color:#6650b8;">DoneToday<span style="color:#a493dc;">.</span></td></tr>
                    <tr><td style="background-color:#ffffff;border:1px solid #e6e1f0;border-radius:24px;padding:36px 24px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr><td style="padding-bottom:24px;"><span style="display:inline-block;background-color:#eeebfa;color:#6650b8;border-radius:20px;padding:8px 13px;font-size:12px;font-weight:bold;">{{badge}}</span></td></tr>
                        <tr><td><h1 style="margin:0 0 12px;font-size:28px;line-height:1.25;letter-spacing:-0.6px;color:#20212b;">{{title}}</h1></td></tr>
                        <tr><td style="font-size:15px;line-height:1.7;color:#706a80;padding-bottom:24px;">{{subtitle}}</td></tr>
                        <tr><td style="font-size:16px;line-height:1.7;color:#403b4e;">{{introduction}}</td></tr>
                        <tr><td style="padding:28px 0;">
                          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#7156c8" style="border-radius:12px;text-align:center;mso-padding-alt:16px 24px;">
                            <a href="{{safeLink}}" style="display:inline-block;padding:16px 24px;border:1px solid #7156c8;border-radius:12px;background-color:#7156c8;color:#ffffff;font-size:16px;font-weight:bold;line-height:1.3;text-decoration:none;">{{action}}</a>
                          </td></tr></table>
                        </td></tr>
                        <tr><td style="font-size:13px;line-height:1.6;color:#706a80;">{{privacy}}</td></tr>
                        <tr><td style="padding-top:28px;"><div style="border-top:1px solid #ece8f2;padding-top:24px;font-size:13px;line-height:1.7;color:#706a80;">{{fallback}}<br><a href="{{safeLink}}" style="color:#6650b8;word-break:break-all;overflow-wrap:anywhere;">{{safeLink}}</a></div></td></tr>
                        <tr><td style="padding-top:24px;font-size:13px;line-height:1.7;color:#706a80;">{{safety}}</td></tr>
                      </table>
                    </td></tr>
                    <tr><td align="center" style="padding:24px 12px;font-size:12px;line-height:1.7;color:#706a80;">{{tagline}}<br>{{automated}}</td></tr>
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """;
        return new(subject, text, html);
    }
}