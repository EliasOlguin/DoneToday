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

### Current stage: local email infrastructure

User now extends IdentityUser<int> and AppDbContext extends IdentityDbContext<User, IdentityRole<int>, int>. The AddIdentityUsers migration is applied to the separate donetoday_auth database. Authentication endpoints and frontend login screens are not implemented yet; the old demo database is unchanged.

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

This sends a sample confirmation message to `mail-test@example.test`, without creating an account or changing the database. Its link is a test placeholder, not a working confirmation endpoint yet.

Next: implement registration and confirmation, then login and authenticated ownership checks in place of userId = 1. Google/Microsoft will require app registration credentials before their flows can be tested.

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

### Etapa actual: envío de correos local

User ahora hereda de IdentityUser<int> y AppDbContext de IdentityDbContext<User, IdentityRole<int>, int>. La migración AddIdentityUsers se aplicó a la base separada donetoday_auth. Todavía no están implementados los endpoints de autenticación ni las pantallas de login; la base de demostración anterior no cambió.

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

Envía un mensaje de ejemplo a `mail-test@example.test`, sin crear una cuenta ni cambiar la base. El enlace del mensaje es ficticio: todavía no hay un endpoint de confirmación funcionando.

Siguiente paso: implementar registro y confirmación, después login y comprobaciones del dueño autenticado en lugar de userId = 1. Para probar Google/Microsoft necesitaremos las credenciales de registro de sus aplicaciones.

## Identity database / Base de Identity

In Development, the app reuses the server credentials from `DefaultConnection` but changes the database name to `DevelopmentDatabase:Name` (`donetoday_auth`). It does not change the saved connection string. Alternatively, supply `ConnectionStrings:AuthenticationConnection` through user secrets. Outside Development that explicit connection is required. The app refuses an Identity connection that names the same database and server as the previous demo connection.

En Development, la app reutiliza las credenciales del servidor de `DefaultConnection`, pero cambia la base a `DevelopmentDatabase:Name` (`donetoday_auth`). No modifica la conexión guardada. También se puede configurar `ConnectionStrings:AuthenticationConnection` mediante user secrets. Fuera de Development esa conexión explícita es obligatoria. La app rechaza una conexión de Identity que apunte a la misma base y servidor de la conexión de demostración anterior.

Read-only check / Comprobación de solo lectura (from the repository root / desde la raíz):

```powershell
dotnet run --project tools/DatabaseCheck -p:UseAppHost=false -p:OutputPath=bin/Verification/
```

The check prints database names and record counts, never credentials. / La comprobación muestra nombres de bases y cantidades de registros, nunca credenciales.

The HTTP endpoints are still in transition and must not be published as a secure multi-user application until authenticated ownership checks are implemented. Secure cookies will also require HTTPS for the frontend origin, including development; that setup is part of the upcoming login step.

Los endpoints HTTP siguen en transición y no deben publicarse como una app segura multiusuario hasta implementar las comprobaciones del dueño autenticado. Las cookies seguras también requerirán HTTPS en el origen del frontend, incluido el desarrollo; esa configuración corresponde al próximo paso de login.
