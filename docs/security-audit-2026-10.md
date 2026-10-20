# Security audit — DoneToday, 2026-10-20

Read-only review of the code at `f96d9a8` (main, clean tree) and of the public responses from https://donetoday-15xl.onrender.com. No code, settings or data were changed. No accounts were created and nobody signed in on production. It follows the [2026-10-19 audit](security-audit-2026-10-19.md) and its [remediation](security-remediation-2026-10-19.md). The guest-conversion, logout and early-limiter fixes from that round were re-read and still hold.

**Summary:** no finding exposes another user's data or takes over an account. The real risks are **availability and abuse of the public demo**. A single attacker can make "Continue as guest" unusable, use up the email budget, or block a specific person (for example a recruiter) from ever signing up with their address. These matter because the portfolio sends reviewers to this demo.

| # | Severity | Finding |
|---|---|---|
| 1 | Medium | One IP can fill guest capacity and keep the guest demo closed |
| 2 | Medium | Sign-up sends unlimited emails to different recipients and can drain the email provider quota |
| 3 | Medium | Unconfirmed sign-ups permanently squat an email address, including blocking Google sign-up |
| 4 | Low | Sign-up reveals whether an email has an account (password-check order) |
| 5 | Low | TOTP secrets and recovery codes are stored in plain text |
| 6 | Low | Anyone who knows an email can lock that account out for 15 minutes, again and again |
| 7 | Info | Trust in the forwarded client IP has not been verified on Render |
| 8 | Info | The runtime database role also runs migrations |

---

## 1. [Medium] One IP can fill guest capacity and keep the guest demo closed

**Where:** `DoneToday/Controllers/AuthController.cs:39-40` (global cap check), `DoneToday/Services/ApiSecurity.cs:33` (5 guests/hour per IP), `DoneToday/Services/GuestLifecycle.cs:8,11` (cap 5,000; retention 120 days). The guest button is at `DoneToday.Web/src/pages/LoginPage.tsx:184-187`.

**Exploit:** a script fetches `/api/auth/csrf` and then calls `POST /api/auth/guest` 5 times an hour, with no cookies, so each call creates a new guest. A single IP reaches 5,000 unlinked guests in about 42 days (5 × 24 × 42). From then on, every visitor's "Continue as guest" gets `429 guestCapacity`. A guest is only deleted after 120 days, and the script creates about 14,400 in that window, so the cap never frees up. With 20 cheap cloud IPs this takes about 2 days. An empty guest costs the attacker nothing to keep. (The live host currently has no AAAA record, so IPv6 address rotation is not an extra shortcut today.)

**Impact:** the one-click demo path that recruiters are most likely to use stops working until someone notices. No user data is exposed.

**Fix (smallest first):**
- Remove empty guests early. A guest with no habits and no activity after about 24 hours should go in `GuestCleanup`, while guests with data keep the 120-day rule. That makes the cap cost the attacker real ongoing work.
- At capacity, delete the oldest *empty* guest instead of refusing the new one.
- Optionally add a global creation rate (for example 200 guests/day) and log a warning when it is hit, so you notice an attack.

## 2. [Medium] Sign-up sends unlimited emails to different recipients and can drain the email provider quota

**Where:** `DoneToday/Controllers/AuthController.cs:194-209` (`Register`), the email failure handling at `:284-295`, and `DoneToday/Services/ApiSecurity.cs:32` (20 auth requests/minute per IP). `RecipientEmailThrottle` is keyed per recipient (`Services/Email/RecipientEmailThrottle.cs:410-411`), so it does not limit a run over many different addresses.

**Exploit:** a script registers `random1@…`, `random2@…` and so on, or a list of real people's addresses, at 20 per minute from one IP. Each request creates an unconfirmed user and sends a confirmation email through Brevo, which is up to 1,200 emails an hour from one machine. On a small Brevo plan (the free tier allows 300/day), the daily quota is gone in about 15 minutes. After that, real confirmation and password-reset emails fail. They fail silently, because delivery errors return `200` on purpose (`:290-292`, `:101-107`). Mail sent to real people who never signed up can also get the Brevo sender flagged or suspended. `forgot-password` and `resend-confirmation` share the same pattern, but they only email existing accounts.

**Impact:** nobody can sign up or reset a password until the quota resets; the sender domain's reputation can also suffer. Each run also leaves unconfirmed accounts behind (see #3).

**Fix:**
- Add a global daily send budget in the same in-memory style as `RecipientEmailThrottle`, kept below the Brevo plan limit, with a log warning when it is reached.
- Give `register` its own stricter per-IP policy, like `guest` (for example 5/hour), instead of the shared 20/minute.
- If abuse actually happens, add a CAPTCHA such as Cloudflare Turnstile on sign-up. That needs a CSP change for its script and frame.

## 3. [Medium] Unconfirmed sign-ups permanently squat an email address, including blocking Google sign-up

**Where:**
- `AuthController.cs:200`: registering an existing email returns `200` silently and sends no email.
- `AuthController.cs:237`: confirming requires the password chosen at sign-up.
- `AuthController.cs:98`: password reset requires a confirmed email.
- `ExternalAuthController.cs:151` (the `existingAccount` check in the callback): Google sign-up is refused when any local account has that email.
- `GuestLifecycle.cs` only removes guests, so nothing ever deletes an unconfirmed account.

**Exploit:** an attacker registers `recruiter@company.com` with a password only the attacker knows, and never confirms. Later the real owner tries to use the demo:
- **Sign up:** sees "check your email", but no email arrives (`:200`).
- **Continue with Google:** gets `existingAccount`.
- **Forgot password:** nothing, because the email is not confirmed.
- **Resend confirmation:** the email arrives, but the confirm page asks for the attacker's password.

The owner can never use their own address. Combined with #2, an attacker can pre-squat a whole list of addresses.

**Impact:** a permanent denial of service against chosen people. The attacker gets no access to anything.

**Fix:** treat an unconfirmed account as replaceable once someone proves they own the mailbox.
- In the Google callback, if the local account with that email is unconfirmed and has no logins, delete it and create the Google account in the same transaction. Google has verified the email.
- In `GuestCleanup`, delete non-guest accounts that are still unconfirmed after about 48 hours. They cannot sign in, so they hold no data.

These two changes keep the 2026-10-19 protection, where a click alone never activates a password chosen by someone else.

## 4. [Low] Sign-up reveals whether an email has an account (password-check order)

**Where:** `AuthController.cs:200-204`. The existence check (`:200`) runs before password validation (`:202-204`).

**Exploit:** `POST /api/auth/register` with the target email and a password that is long enough but weak (`aaaaaaaaaaaa`). An existing account gets `200`. A new address gets `400 {"codes":["PasswordRequiresUpper",…]}`, and no account is created. So anyone can check, without a mailbox and without side effects, whether a given person has a DoneToday account. This breaks the uniform-response design the code is aiming for. Response timing also leaks the same fact more weakly: `login` returns at once for an unknown email (`:146`) but runs a password hash for a known one, and `register` sends an email only for new addresses.

**Fix:** run `users.PasswordValidators` first, before `FindByEmailAsync`, as `RegisterGuest` already does (`:57-63`). For login timing, verify a dummy hash when the user is null. That part is optional at this traffic level.

## 5. [Low] TOTP secrets and recovery codes are stored in plain text

**Where:** this is ASP.NET Identity's default store, used through `IdentitySetup.cs:26-31`. The authenticator key and the recovery codes (joined with `;`) are written to `AspNetUserTokens` without encryption.

**Exploit:** whoever can read the database can generate valid TOTP codes and use the recovery codes for every 2FA user. That could be a leaked Neon connection string, a backup or branch, or a support export. Combined with offline cracking of a weak password hash, this logs into the account and defeats 2FA, which exists for exactly that case.

**Fix:** keep these tokens encrypted at rest with the Data Protection key ring that is already configured. One way is a small `UserStore` subclass that protects and unprotects values in `SetTokenAsync`/`GetTokenAsync` for the `[AspNetUserStore]` provider, plus a one-off re-encryption of existing rows. Alternatively, hash the recovery codes. This only matters if the database is compromised, hence Low.

## 6. [Low] Anyone who knows an email can lock that account out for 15 minutes, again and again

**Where:** `AuthController.cs:147-148` (`lockoutOnFailure: true`) and `IdentitySetup.cs:19-20` (5 failures, 15 minutes).

**Exploit:** five wrong passwords for `victim@…` every 15 minutes keep the real user locked out for as long as the script runs. The per-IP limit does not help, because five requests is far below it.

**Fix:** this is the usual trade-off of Identity lockout, and it is acceptable for a demo. If it becomes a problem, add a per-IP+account failure counter in front of the account-wide lockout, or a short escalating delay instead of a hard block. Keep the per-account cap high (for example 20) as the last line of defence against distributed guessing.

## 7. [Info] Trust in the forwarded client IP has not been verified on Render

**Where:** `DoneToday/Services/ProductionHosting.cs:18-25` (`KnownProxies`/`KnownIPNetworks` cleared, `ForwardLimit = 1`).

**Risk:** every per-IP limit (early limiter, `authentication`, `guest`) uses the right-most `X-Forwarded-For` entry. The live responses show Cloudflare in front of Render. If that entry is not the real client, there are two possible failures, and both are untested:
- If Render passes a client-supplied value through, an attacker can choose their own bucket on every request, which bypasses #1, #2 and #6.
- If the entry is a shared proxy address, all users share one bucket, and one heavy user blocks everyone.

**Check:** briefly log `RemoteIpAddress` at Debug level for one request of your own, sent once with and once without a fake `X-Forwarded-For: 1.2.3.4`. The logged value should be your real IP both times. Remove the log afterwards.

## 8. [Info] The runtime database role also runs migrations

**Where:** `render.yaml:15-16` (`Database__MigrateOnStartup=true`) and `Program.cs:59-63`.

**Risk:** the role the app uses on every request has schema-owner (DDL) rights. No SQL injection was found (see below), so this only enlarges the damage of some future bug.

**Fix (optional):** run migrations with a separate owner role, as a pre-deploy step or via a one-off job, and give the app a role with only `SELECT/INSERT/UPDATE/DELETE`.

---

## Checked and fine

- **Password policy:** at least 12 characters with upper, lower, digit and symbol (`IdentitySetup.cs:12-16`), stored as Identity PBKDF2 hashes. Login, register, reset and 2FA login share 20/min per IP. TOTP failures at login count toward lockout.
- **Email confirmation:** required to sign in (`IdentitySetup.cs:17`). Confirming needs the token and the chosen password, and rotates the security stamp.
- **Password reset:** a dedicated Data Protection provider issues tokens valid for 1 hour. They are tied to the security stamp, so they work only once in practice. A reset revokes all sessions, and `forgot-password` gives the same response for every address.
- **Google sign-in:** uses correlation and state cookies, and requires `email_verified`. It never merges accounts by matching email. Linking requires a confirmed email plus password and 2FA, and the challenge is tied to the user and stamp and expires in 5 minutes. The callback builds redirects only from the configured HTTPS `FrontendUrl`, so there is no open redirect. Tokens are not saved (`SaveTokens = false`).
- **2FA:** setup, enable, disable and regenerating codes all need the password, and all except setup also need a code. Enabling rotates the stamp, and 10 recovery codes are issued. Re-verification failures are counted per account across IPs (`SensitiveActionVerifier.cs`).
- **Cookies:**
  - `DoneToday.Auth` is HttpOnly, Secure and SameSite=Lax.
  - Sessions slide for 30 days, with a hard limit of 90 days from login.
  - The stamp is checked on every request (`ValidationInterval = 0`), and logout rotates it, so copied cookies stop working.
  - The 2FA cookie lasts 5 minutes.
  - The pending-registration cookies use `__Secure-` and HttpOnly. The delete proof cookie is SameSite=Strict, limited to the `/api/profile` path, and single-use.
- **CSRF:** every POST, PUT, PATCH and DELETE goes through `[ValidateCsrf]`. Habits, HabitProgress, Profile and TwoFactor apply it to the whole class. Every write action in Auth and ExternalAuth has it on the action, including login, register, guest, logout and 2FA login. `Today` and `Progress` only have GET endpoints. The only state change without a token is the OAuth callback, which is protected by the correlation cookie instead. The antiforgery cookie is Secure, and the token is sent as a header.
- **Authorization and IDOR:**
  - Every habit, completion, progress and statistics query filters on `UserId == CurrentUserId`, and that ID comes from the auth cookie, never from the request.
  - Completions and progress entries are reached only through a habit the user owns.
  - `order` requires exactly the user's own set of IDs.
  - `StatisticsHabitFilter` scopes by user.
  - The `ApplicationUser` policy requires a numeric user ID.
- **Account deletion:** requires the email, the password, and 2FA when enabled. Google-only accounts need a fresh single-use proof from the same Google account. Guest deletion has its own guarded endpoint. Habits are removed by cascade.
- **Input and errors:**
  - DTOs have length limits and regex checks (colour, icon, weekdays).
  - Requests are capped at 64 KiB, and database commands time out after 15 seconds.
  - SQL is parameterized: every raw SQL call is `ExecuteSqlInterpolatedAsync` with typed values.
  - Production shows no developer exception page. Swagger and OpenAPI exist only in Development, and the SPA fallback 404s dotfiles and `/swagger`.
  - Logs record only failure types and counts, never email addresses, passwords or tokens. EF sensitive-data logging is off.
- **Personal data stored:** email, optional display name (up to 60 characters), time zone, password hash, 2FA key and recovery codes (see #5), Google provider key, and habits and progress. The display name never appears in emails, and the email template HTML-encodes links and codes.
- **Data Protection keys:** stored in Postgres and encrypted with a certificate from `DataProtection__CertificateBase64`. Startup fails if it is missing, so keys survive Render redeploys and are not readable from the database alone.
- **Secrets:**
  - `appsettings*.json` contain no secrets, and every secret in `render.yaml` is `sync: false`.
  - A scan of the full git history (`git log --all -p`) for Brevo, Google, Neon and connection-string patterns and for private keys found only placeholders (`YOUR_PASSWORD`) and `fake-test-key` in tests.
  - `.gitignore` covers `.env*`, `*.key` and `*.pem`, and `tools/DeploymentSecrets` writes to the ignored `.local/` folder.
- **Live headers** (checked on 2026-10-20): CSP (`script-src 'self'`; `style-src` still allows `'unsafe-inline'`), HSTS for 1 year with includeSubDomains, `X-Frame-Options: DENY`, nosniff, `Referrer-Policy: no-referrer`, Permissions-Policy, and `Cache-Control: no-store` on the API.
- **CORS:** the app has no CORS middleware. A live GET with `Origin: https://evil.example` returned no `Access-Control-Allow-Origin`, and the preflight for `/api/habits` returned 404 without CORS headers. Other sites cannot read API responses.
- **Frontend:** no `dangerouslySetInnerHTML`, `innerHTML` or `eval`. `localStorage` holds only theme, language and install preferences, never tokens.
- **Dependencies:** `dotnet list package --vulnerable --include-transitive` found no vulnerable packages in either `DoneToday` or `DoneToday.Tests`, and `npm audit` in `DoneToday.Web` found 0 vulnerabilities.
- **Tests:** `dotnet test -c Release` gave 128 passed, 0 failed, 8 skipped. The skipped tests are the PostgreSQL integration cases, which need `DONETODAY_SECURITY_TEST_CONNECTION`. The Debug build could not run because a local DoneToday process held `bin/Debug`.

## Not covered

- The real Google Cloud console: redirect URIs and consent screen.
- The Brevo plan and limits.
- Neon role permissions and backups.
- Render's proxy behaviour (see #7).
- Load testing.
- Anything that requires signing in on production.
