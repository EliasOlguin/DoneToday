# Authentication preparation / Preparación de autenticación

## English

### Agreed design

- ASP.NET Core Identity with integer user IDs.
- HttpOnly authentication cookies for the web client; a native mobile client can use a separate authentication flow later.
- A new development database, with no migration of the current demo users or habits.
- Email/password plus Google and Microsoft sign-in. Microsoft should accept personal and work/school accounts.
- Explicit account linking from an authenticated session; matching email addresses alone must not merge accounts.
- Local passwords: at least 12 characters, including uppercase, lowercase, a digit, and a non-alphanumeric character.
- Email confirmation required for local sign-in.
- Optional authenticator-app two-factor authentication, including recovery codes.

### Current stage: registration and email confirmation

User extends IdentityUser<int> and AppDbContext extends IdentityDbContext<User, IdentityRole<int>, int>. The AddIdentityUsers migration is applied to the separate donetoday_auth database. Registration, confirmation and resend endpoints are implemented, with English, Spanish and German screens. Login, logout, protected routes and authenticated habit ownership are implemented; the old demo database is unchanged.

MailKit delivers confirmation and password-reset messages through `IEmailSender<User>`. Development settings point to Mailpit on `127.0.0.1:1025`. Mailpit captures the email locally; it does not deliver it to real inboxes. Plain SMTP is restricted to localhost in Development. Production SMTP must use STARTTLS and credentials supplied outside Git.

### Start the local inbox on Windows

From the repository root:

```powershell
powershell -NoProfile -File tools/start-mailpit.ps1
```

The script downloads Mailpit v1.31.5 from its official GitHub release, verifies its SHA-256 digest, and stores the executable and inbox under `.local/mailpit/` (ignored by Git). SMTP and the web UI bind only to loopback.

If the local PowerShell execution policy blocks the script, review it first. An exception limited to that process can be used without changing the machine-wide policy:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/start-mailpit.ps1
```

Open `http://127.0.0.1:8025`. Add `-Background` to start a hidden background process; the script prints its PID. To stop that specific process, use `Stop-Process -Id <printed PID>`.

### Send a local test email

With Mailpit running:

```powershell
dotnet run --project tools/EmailSmokeTest -p:UseAppHost=false -p:OutputPath=bin/Verification/
```

This sends a sample message to `mail-test@example.test`, without creating an account or changing the database. Its token is deliberately fictitious. To test a real account, open `/register`, submit the form, open the email in Mailpit and click the confirmation button on the app page.

Google is the only external provider enabled for now; Microsoft is deferred. Google/Microsoft will require app registration credentials before their flows can be tested. Emails currently use English; the web interface supports all three languages.

## Español

### Diseño acordado

- ASP.NET Core Identity con IDs enteros.
- Cookies de autenticación HttpOnly para la web; el futuro cliente móvil nativo podrá usar otro flujo.
- Una base de desarrollo nueva, sin migrar los usuarios ni hábitos de demostración actuales.
- Email/contraseña y acceso con Google y Microsoft. Microsoft aceptará cuentas personales y de trabajo/estudio.
- Vinculación explícita desde una sesión autenticada; coincidir en el email no debe unir cuentas automáticamente.
- Contraseñas locales de al menos 12 caracteres, con mayúscula, minúscula, número y carácter no alfanumérico.
- Confirmación de email obligatoria para entrar con contraseña.
- Segundo factor opcional con una app autenticadora y códigos de recuperación.

### Etapa actual: registro y confirmación de email

User hereda de IdentityUser<int> y AppDbContext de IdentityDbContext<User, IdentityRole<int>, int>. La migración AddIdentityUsers se aplicó a la base separada donetoday_auth. Ya están implementados registro, confirmación y reenvío, con pantallas en inglés, español y alemán. Ya funcionan login, logout, rutas protegidas y hábitos asociados al dueño autenticado; la base de demostración anterior no cambió.

MailKit envía los mensajes de confirmación y recuperación mediante `IEmailSender<User>`. La configuración de desarrollo apunta a Mailpit en `127.0.0.1:1025`. Mailpit captura los mensajes localmente; no los entrega a bandejas reales. El SMTP sin cifrar solo se permite en localhost y en Development. El SMTP de producción debe usar STARTTLS y credenciales fuera de Git.

### Iniciar el buzón local en Windows

Desde la raíz del repositorio:

```powershell
powershell -NoProfile -File tools/start-mailpit.ps1
```

El script descarga Mailpit v1.31.5 desde su versión oficial en GitHub, verifica el SHA-256 y guarda el ejecutable y el buzón en `.local/mailpit/`, excluido de Git. SMTP y la interfaz web escuchan únicamente en loopback.

Si PowerShell bloquea el script por su política de ejecución, revisalo primero. Podés usar una excepción limitada a ese proceso, sin cambiar la política general de Windows:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/start-mailpit.ps1
```

Abrí `http://127.0.0.1:8025`. Agregá `-Background` para iniciar un proceso oculto; el script muestra su PID. Para detener ese proceso específico, usá `Stop-Process -Id <PID mostrado>`.

### Enviar un correo local de prueba

Con Mailpit iniciado:

```powershell
dotnet run --project tools/EmailSmokeTest -p:UseAppHost=false -p:OutputPath=bin/Verification/
```

Envía un mensaje de ejemplo a `mail-test@example.test`, sin crear una cuenta ni cambiar la base. Su token es ficticio. Para probar una cuenta real, abrí `/register`, enviá el formulario, abrí el correo en Mailpit y pulsá el botón de confirmación en la página de la app.

Google es el único proveedor externo habilitado por ahora; Microsoft queda postergado. Para probar Google/Microsoft necesitaremos las credenciales de registro de sus aplicaciones. Los correos se envían en inglés por ahora; la interfaz web admite los tres idiomas.

## Registration checks / Pruebas de registro

With Mailpit and the HTTPS backend running, use PowerShell 7 from the repository root. The script creates a fictitious user in the development database and checks email delivery, valid confirmation, rejection of invalid tokens and CSRF protection. / Con Mailpit y el backend HTTPS ejecutándose, usá PowerShell 7 desde la raíz. El script crea un usuario ficticio en la base de desarrollo y comprueba el correo, la confirmación válida, el rechazo de tokens inválidos y la protección CSRF.

```powershell
./tools/test-registration.ps1 -ApiUrl https://localhost:7154
```

## Login and HTTPS / Login y HTTPS

Run the frontend with `npm run dev` and open `https://localhost:5173`. The `predev` script exports the .NET development certificate into `.local/https/`, which is excluded from Git. If the certificate is not trusted on a new machine, run `dotnet dev-certs https --trust` and accept the operating system prompt yourself. Restart Vite after switching from HTTP. / Ejecutá el frontend con `npm run dev` y abrí `https://localhost:5173`. El script `predev` exporta el certificado de desarrollo de .NET a `.local/https/`, excluido de Git. Si no es confiable en una máquina nueva, ejecutá `dotnet dev-certs https --trust` y aceptá el aviso del sistema operativo. Reiniciá Vite al cambiar de HTTP a HTTPS.

`POST /api/auth/login` uses Identity's password sign-in with mandatory email confirmation. It returns the same failure response for incorrect credentials, unconfirmed email and a locked account. Five failed passwords temporarily lock the account for 15 minutes. The HttpOnly, Secure, SameSite=Lax cookie is a browser-session cookie with an eight-hour authentication ticket and sliding renewal. `GET /api/auth/me` returns only ID/email; `POST /api/auth/logout` clears the session cookie. Passwords and authentication tokens are never saved in localStorage. / `POST /api/auth/login` usa Identity y exige confirmar el email. Devuelve el mismo fallo para credenciales incorrectas, email sin confirmar y cuenta bloqueada. Cinco contraseñas incorrectas bloquean la cuenta durante 15 minutos. La cookie HttpOnly, Secure y SameSite=Lax dura la sesión del navegador, con un ticket de ocho horas y renovación durante el uso. `GET /api/auth/me` devuelve solamente ID/email; `POST /api/auth/logout` elimina la cookie. No se guardan contraseñas ni tokens de autenticación en localStorage.

PowerShell 7 integration test (creates two fictitious accounts and one habit in the development database; one account ends temporarily locked) / Prueba de integración con PowerShell 7 (crea dos cuentas ficticias y un hábito en desarrollo; una cuenta queda bloqueada temporalmente):

```powershell
./tools/test-authentication.ps1 -ApiUrl https://localhost:7154
```

Authentication POST requests require the token from `GET /api/auth/csrf` in `X-CSRF-TOKEN`. Each IP is limited to 20 registration, confirmation or login requests per minute. Confirmation requires an explicit button click, so visiting a link alone does not confirm an account. Configure `Authentication:FrontendUrl` with the trusted frontend origin; production requires HTTPS. / Los POST de autenticación requieren el token de `GET /api/auth/csrf` en `X-CSRF-TOKEN`. Cada IP tiene un límite de 20 peticiones de registro, confirmación o login por minuto. Confirmar requiere pulsar un botón; visitar el enlace no confirma la cuenta. Configurá `Authentication:FrontendUrl` con el origen confiable del frontend; producción requiere HTTPS.

## Password recovery / Recuperación de contraseña

Use **Forgot password?** on the login page. A confirmed account with a local password receives an email linking to `/reset-password`. Requests return the same message for unknown, unconfirmed and external-only accounts. The reset token expires after one hour and becomes invalid after a successful password reset. New passwords follow the registration requirements. Existing sessions are rejected on their next API request; security-stamp validation runs on every authenticated request, which adds a database check. Reset does not sign the user in automatically. Confirmation-token lifetime is unchanged.

Usá **¿Olvidaste tu contraseña?** desde el login. Las cuentas confirmadas con contraseña local reciben un enlace a `/reset-password`. La solicitud devuelve el mismo mensaje para cuentas inexistentes, sin confirmar o que solo usan un proveedor externo. El token vence en una hora y deja de ser válido después de restablecer la contraseña. La nueva contraseña cumple los mismos requisitos del registro. Las sesiones anteriores se rechazan en su siguiente petición a la API; validar el security stamp en cada petición autenticada añade una consulta a la base. Restablecer no inicia sesión automáticamente. La duración del token de confirmación no cambia.

PowerShell 7 integration test, using a fictitious account / Prueba de integración con PowerShell 7 y una cuenta ficticia:

```powershell
./tools/test-password-reset.ps1 -ApiUrl https://localhost:7154
```

## Optional authenticator 2FA / Segundo factor opcional

Open Settings → Two-factor authentication. Enter your password, scan the QR with a TOTP authenticator app (or enter the manual key), then verify its six-digit code. The QR is generated locally with `qrcode.react`. Save the ten recovery codes; each works once and they are shown only immediately after generation. Regenerating codes invalidates the previous set. Codes and setup keys are kept only in screen memory, never localStorage.

Abrí Settings → Autenticación de dos factores. Ingresá tu contraseña, escaneá el QR con una app autenticadora TOTP (o ingresá la clave manual) y verificá su código de seis dígitos. El QR se genera localmente con `qrcode.react`. Guardá los diez códigos de recuperación; cada uno funciona una sola vez y se muestran únicamente al generarlos. Generar otros invalida los anteriores. Los códigos y la clave de configuración quedan solamente en memoria de la pantalla, nunca en localStorage.

2FA is off by default. Enabled accounts complete login with their password and an authenticator or recovery code. The intermediate HttpOnly/Secure cookie expires after five minutes and does not authorize access to habits. Authenticator failures use Identity's temporary lockout; recovery attempts are also rate-limited. Managing 2FA requires the current password; disabling additionally accepts an authenticator code or an unused recovery code. Password recovery keeps 2FA enabled. No database migration is needed: existing Identity tables store this configuration.

2FA viene desactivado. Las cuentas que lo activan completan el login con contraseña y un código de la app o de recuperación. La cookie intermedia HttpOnly/Secure vence en cinco minutos y no autoriza acceder a hábitos. Los errores del código de la app usan el bloqueo temporal de Identity; los intentos con recuperación también tienen límite de frecuencia. Administrar 2FA requiere la contraseña actual; desactivarlo acepta además un código de la app o de recuperación sin usar. Recuperar la contraseña conserva 2FA activo. No requiere migración: Identity ya tiene las tablas necesarias.

PowerShell 7 test with a fictitious account / Prueba con PowerShell 7 y cuenta ficticia:

```powershell
./tools/test-two-factor.ps1 -ApiUrl https://localhost:7154
```

## Google sign-in / Acceso con Google

Configure a Google OAuth Web application with `https://localhost:7154/signin-google` as its authorized redirect URI. Save `Authentication:Google:ClientId` and `Authentication:Google:ClientSecret` in user secrets, then restart the backend. The Google button appears only when both credentials are configured. The backend uses Microsoft's Google handler with PKCE and OAuth state/correlation validation. Login starts with a CSRF-protected POST. OAuth tokens are not stored in the browser or database.

Configurá un cliente OAuth de Google de tipo Web application con `https://localhost:7154/signin-google` como URI de retorno autorizado. Guardá `Authentication:Google:ClientId` y `Authentication:Google:ClientSecret` en user secrets y reiniciá el backend. El botón aparece únicamente cuando ambas credenciales están configuradas. El backend usa el proveedor oficial de Microsoft con PKCE y validación de state/correlación. El acceso comienza con un POST protegido por CSRF. No se guardan tokens OAuth en el navegador ni en la base.

Google must return a verified email. New emails create an Identity account without a local password. Matching an existing email does not link accounts: sign in first, then explicitly link under Settings → Connected accounts using the current password and, when enabled, an authenticator code. A Google identity cannot be linked to two DoneToday accounts. Linked users with app 2FA must still complete the second factor. Google-only accounts currently do not have the local-password management needed for app 2FA setup; adding a local password is a future step. Microsoft is not configured yet.

Google debe devolver un email verificado. Los emails nuevos crean una cuenta de Identity sin contraseña local. Coincidir en el email no vincula cuentas: primero ingresá y después vinculá desde Configuración → Cuentas vinculadas, con contraseña actual y código de la app si hay 2FA. Una identidad de Google no puede vincularse a dos cuentas de DoneToday. Si la cuenta vinculada tiene 2FA, seguirá pidiendo el segundo factor. Las cuentas que solo usan Google todavía no tienen la gestión de contraseña local necesaria para configurar 2FA de la app; agregar contraseña local será una etapa posterior. Microsoft todavía no está configurado.

## Identity database / Base de Identity

In Development, the app reuses the server credentials from `DefaultConnection` but changes the database name to `DevelopmentDatabase:Name` (`donetoday_auth`). It does not change the saved connection string. Alternatively, supply `ConnectionStrings:AuthenticationConnection` through user secrets. Outside Development that explicit connection is required. The app refuses an Identity connection that names the same database and server as the previous demo connection.

En Development, la app reutiliza las credenciales del servidor de `DefaultConnection`, pero cambia la base a `DevelopmentDatabase:Name` (`donetoday_auth`). No modifica la conexión guardada. También se puede configurar `ConnectionStrings:AuthenticationConnection` mediante user secrets. Fuera de Development esa conexión explícita es obligatoria. La app rechaza una conexión de Identity que apunte a la misma base y servidor de la conexión de demostración anterior.

Read-only check / Comprobación de solo lectura (from the repository root / desde la raíz):

```powershell
dotnet run --project tools/DatabaseCheck -p:UseAppHost=false -p:OutputPath=bin/Verification/
```

The check prints database names and record counts, never credentials. / La comprobación muestra nombres de bases y cantidades de registros, nunca credenciales.

Habit, Today and Progress endpoints require authentication and filter by the user ID in the Identity cookie. All habit mutations and authentication POSTs require CSRF validation. The frontend redirects anonymous users to login and clears private query caches on logout, login or detected account changes.

Los endpoints de hábitos, Today y Progress requieren autenticación y filtran por el ID de usuario de la cookie de Identity. Las modificaciones de hábitos y los POST de autenticación validan CSRF. El frontend redirige al login si falta sesión y limpia la caché privada al entrar, salir o detectar un cambio de cuenta.

## Profile and account deletion / Perfil y eliminación de cuenta

Profile POST endpoints also require authentication and CSRF. Display-name editing does not change email or login credentials. Permanent deletion at `/api/profile/delete` verifies the current account email, password when the account has one, and an authenticator code when 2FA is enabled. Google-only accounts do not need to create a local password. Identity deletion cascades the user's habits, schedules and completions and signs out the current browser. Subsequent authenticated requests from other windows/devices are rejected because the user no longer exists. The UI requires an explicit confirmation and clears cached private data after deletion. Only disposable accounts in an isolated PostgreSQL database were deleted during automated verification.

Los POST de perfil también exigen autenticación y CSRF. Editar el nombre no cambia el email ni las credenciales. La eliminación permanente en `/api/profile/delete` verifica el email de la cuenta actual, contraseña cuando existe y código del autenticador cuando hay 2FA. Las cuentas solo de Google no necesitan crear una contraseña local. El borrado de Identity elimina en cascada los hábitos, días programados y completaciones del usuario y cierra la sesión actual. Las solicitudes posteriores de otras ventanas/dispositivos se rechazan porque el usuario ya no existe. La interfaz pide confirmación explícita y limpia los datos privados en caché. Las pruebas automatizadas solo eliminaron cuentas descartables en una base PostgreSQL aislada.
