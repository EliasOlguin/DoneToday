# Home server deployment / Despliegue en home server

Production URL: **https://donetoday.eliasolguin.dev**. Hosting: the owner's notebook/home server. The API serves the compiled React frontend at the same origin. The repository does not establish the current reverse proxy, PostgreSQL location/version, OS or email provider; verify these on the server. The [Render guide](deployment-render-legacy.md) and `render.yaml` are historical alternatives, not the current deployment.

URL de producción: **https://donetoday.eliasolguin.dev**. Alojamiento: notebook del autor como home server. La API sirve React compilado desde el mismo origen. Confirmar en el servidor el proxy, SO, proveedor de correo y ubicación/versión de PostgreSQL.

## Configuration / Configuración

Supply settings privately through the service manager or an untracked environment file. Never commit credentials.

| Variable | Value / Valor |
| --- | --- |
| `ASPNETCORE_ENVIRONMENT` | `Production` |
| `ASPNETCORE_HTTP_PORTS` | `8080` for Docker |
| `Authentication__FrontendUrl` | `https://donetoday.eliasolguin.dev` |
| `Database__MigrateOnStartup` | `false` |
| `ConnectionStrings__AuthenticationConnection` | Restricted runtime PostgreSQL connection; use `SSL Mode=VerifyFull` for remote connections |
| `DataProtection__CertificateBase64` | Existing private deployment certificate; keep it stable across restarts |
| `Forwarding__KnownProxies__0` | Actual transport peer IP of the trusted reverse proxy; add indexes for other peers |
| `Authentication__Google__ClientId`, `Authentication__Google__ClientSecret` | Optional Google OAuth credentials |
| `Email__Provider` | Configured email provider, e.g. `Brevo`; see authentication guide for SMTP settings |
| `Email__ApiKey`, `Email__FromAddress` | Brevo secret and verified sender when using Brevo |

Register `https://donetoday.eliasolguin.dev/signin-google` in the Google OAuth client's authorized redirect URIs. Retain localhost for development. Do not rely on `RENDER_EXTERNAL_URL` on the home server.

## Build and operate / Compilar y operar

1. Back up PostgreSQL, the Data Protection key ring and its private certificate. Keep a restore-tested copy outside the notebook.
2. Build from the repository root: `docker build --pull -t donetoday .`. Docker uses an unprivileged application user and port 8080. For native hosting, publish with `dotnet publish DoneToday/DoneToday.csproj -c Release` and copy `DoneToday.Web/dist` to the published `wwwroot` after `npm ci && npm run build` in the frontend directory.
3. Before starting the new application, run `dotnet DoneToday.dll --migrate-only` separately with the owner connection and the same production certificate/frontend settings. Use [runtime-role.sql](sql/runtime-role.sql) for a restricted runtime role. Supply credentials through the process environment, not command arguments. Stop older binaries before converting legacy 2FA values; see the historical guide for conversion details.
4. Run the application with the restricted connection and `Database__MigrateOnStartup=false`. For a proxy on the same host, publish the container port to loopback only (`-p 127.0.0.1:8080:8080`). For a containerized proxy, use a private container network and configure its actual peer IP. Keep PostgreSQL and the application port inaccessible from the public internet.
5. Terminate HTTPS at the reverse proxy with a valid certificate for the production domain; preserve Host and normalize `X-Forwarded-For` / `X-Forwarded-Proto`. Forwarding currently consumes one final entry. Configure the actual trusted proxy IPs explicitly: an empty list trusts any peer. A tunnel or extra proxy hop needs topology-specific validation.
6. Configure automatic service restart, notebook power/network availability, certificate renewal and monitoring of `/health`. `/health` only reports process health; monitor PostgreSQL separately.
7. Verify SPA deep links, registration/email confirmation, password reset, Google login, 2FA and session persistence after restart. Compare your own requests with and without a forged forwarded IP, from two networks, using temporary private logs; the effective IP must remain the real client IP. Remove diagnostic logs afterwards.

Estos pasos describen el despliegue; esta actualización del repositorio no modifica infraestructura, DNS, secretos, OAuth ni bases de producción. No confirma que esas verificaciones operativas se hayan realizado. Usar copias de respaldo externas a la notebook, TLS válido, proxy explícito y un rol PostgreSQL sin privilegios de esquema.
