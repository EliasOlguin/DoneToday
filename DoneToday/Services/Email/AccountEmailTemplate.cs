using System.Net;

namespace DoneToday.Api.Services.Email;

public static class AccountEmailTemplate
{
    public sealed record Content(string Subject, string Text, string Html);

    public static Content Confirmation(string link) => Link(
        "Confirm your DoneToday email", "Your next chapter starts here.",
        "Welcome to DoneToday", "Small steps. Meaningful progress.",
        "Confirm your email address to start building habits that fit your life.",
        "Confirm email", link,
        "If you did not create a DoneToday account, you can safely ignore this email.");

    public static Content PasswordReset(string link) => Link(
        "Reset your DoneToday password", "A fresh start, just one step away.",
        "Let's get you back in", "Your habits will be here when you return.",
        "We received a request to reset your password. Use the button below to choose a new one.",
        "Reset password", link,
        "If you did not request a password reset, ignore this email. Your password will stay the same.");

    private static Content Link(string subject, string preview, string title, string subtitle,
        string introduction, string action, string link, string safety)
    {
        if (!Uri.TryCreate(link, UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttps && uri.Scheme != Uri.UriSchemeHttp))
            throw new ArgumentException("Email links must be absolute HTTP or HTTPS URLs.", nameof(link));
        var safeLink = WebUtility.HtmlEncode(link);
        var text = $"DoneToday\n\n{title}\n{subtitle}\n\n{introduction}\n\n{action}: {link}\n\nThis link is personal. Do not share it.\n\n{safety}\n\nOne day. One step. DoneToday.";
        // Tables and inline styles keep the essential layout usable without images,
        // scripts, external fonts or support for modern CSS in the email client.
        var html = $$"""
            <!doctype html>
            <html lang="en">
            <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{{subject}}</title></head>
            <body style="margin:0;padding:0;background-color:#f5f3fa;color:#20212b;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">
              <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">{{preview}}</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f3fa;">
                <tr><td align="center" style="padding:40px 16px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
                    <tr><td style="padding:0 8px 24px;font-size:23px;font-weight:bold;letter-spacing:-0.7px;color:#6650b8;">DoneToday<span style="color:#a493dc;">.</span></td></tr>
                    <tr><td style="background-color:#ffffff;border:1px solid #e6e1f0;border-radius:24px;padding:36px 24px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr><td style="padding-bottom:24px;"><span style="display:inline-block;background-color:#eeebfa;color:#6650b8;border-radius:20px;padding:8px 13px;font-size:12px;font-weight:bold;">ONE SMALL STEP</span></td></tr>
                        <tr><td><h1 style="margin:0 0 12px;font-size:28px;line-height:1.25;letter-spacing:-0.6px;color:#20212b;">{{title}}</h1></td></tr>
                        <tr><td style="font-size:15px;line-height:1.7;color:#706a80;padding-bottom:24px;">{{subtitle}}</td></tr>
                        <tr><td style="font-size:16px;line-height:1.7;color:#403b4e;">{{introduction}}</td></tr>
                        <tr><td style="padding:28px 0;">
                          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#7156c8" style="border-radius:12px;text-align:center;mso-padding-alt:16px 24px;">
                            <a href="{{safeLink}}" style="display:inline-block;padding:16px 24px;border:1px solid #7156c8;border-radius:12px;background-color:#7156c8;color:#ffffff;font-size:16px;font-weight:bold;line-height:1.3;text-decoration:none;">{{action}}</a>
                          </td></tr></table>
                        </td></tr>
                        <tr><td style="font-size:13px;line-height:1.6;color:#706a80;">This link is personal. Do not share it.</td></tr>
                        <tr><td style="padding-top:28px;"><div style="border-top:1px solid #ece8f2;padding-top:24px;font-size:13px;line-height:1.7;color:#706a80;">Button not working? Copy and paste this link into your browser:<br><a href="{{safeLink}}" style="color:#6650b8;word-break:break-all;overflow-wrap:anywhere;">{{safeLink}}</a></div></td></tr>
                        <tr><td style="padding-top:24px;font-size:13px;line-height:1.7;color:#706a80;">{{safety}}</td></tr>
                      </table>
                    </td></tr>
                    <tr><td align="center" style="padding:24px 12px;font-size:12px;line-height:1.7;color:#706a80;">One day. One step. DoneToday.<br>This is an automated account email.</td></tr>
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """;
        return new(subject, text, html);
    }
}