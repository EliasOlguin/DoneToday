# Free deployment / Despliegue gratuito

## Architecture / Arquitectura

One Render Free Docker web service serves the .NET API and the compiled React frontend at the same HTTPS origin. PostgreSQL runs on Neon Free. Brevo's HTTPS transactional API sends confirmation and reset emails; Render Free blocks standard SMTP ports. No paid resources are declared in `render.yaml`.

Un servicio web Docker de Render Free sirve la API .NET y React compilado desde el mismo origen HTTPS. PostgreSQL usa Neon Free. La API HTTPS de Brevo envía confirmación y recuperación; Render Free bloquea los puertos SMTP habituales. `render.yaml` no declara recursos de pago.

Render Free sleeps when idle and loses its local filesystem on restarts. Authentication keys therefore live in PostgreSQL and are encrypted with a deployment certificate supplied through a secret environment variable. Keep this certificate unchanged across redeploys and retain a private backup. It is separate from the public HTTPS certificate, which Render manages.

Render Free se suspende sin tráfico y pierde el sistema de archivos local al reiniciar. Por eso las claves de autenticación se guardan en PostgreSQL, cifradas con un certificado suministrado mediante una variable secreta. Conservá el mismo certificado al volver a desplegar y guardá una copia privada. Es distinto del certificado HTTPS público, administrado por Render.

## Prepare the accounts / Preparar las cuentas

1. Create free Render and Neon accounts. Create a Neon project in Frankfurt if available, with a separate production database. Do not upload or reuse local demo data.
2. Create a Brevo Free account. Add and verify a sender address under Settings → Senders, Domains, IPs. Enable transactional email as required by Brevo and create an API key (not an SMTP key). Free-domain senders cannot authenticate their domain; Brevo may substitute its own sending domain. Test delivery before opening registration to others.
3. Keep the existing Google Web OAuth client. Once the Render address is known, add `https://YOUR-SERVICE.onrender.com/signin-google` as another authorized redirect URI. Keep the localhost URI for development. With Google still in Testing, add the people who will test Google login to its test-user list.

1. Creá cuentas gratuitas en Render y Neon. En Neon creá un proyecto en Frankfurt si está disponible y una base separada de producción. No subas ni reutilices los datos locales de demostración.
2. Creá una cuenta Brevo Free. Agregá y verificá un remitente en Settings → Senders, Domains, IPs. Habilitá el correo transaccional según solicite Brevo y generá una API key (no una SMTP key). Un remitente de dominio gratuito no puede autenticar su dominio; Brevo puede sustituirlo por uno propio para enviar. Probá la entrega antes de abrir el registro a otras personas.
3. Conservá el cliente OAuth de Google. Cuando sepamos la dirección de Render, agregá `https://TU-SERVICIO.onrender.com/signin-google` como otro URI autorizado. Conservá localhost para desarrollo. Si Google sigue en Testing, agregá a quienes probarán el login como usuarios de prueba.

## Secrets / Secretos
### Verify Neon privately / Verificar Neon de forma privada

Save the .NET/Npgsql production connection in user secrets as `ConnectionStrings:ProductionConnection`. This separate name does not change the local app connection. / Guardá la conexión .NET/Npgsql de producción en user secrets con el nombre `ConnectionStrings:ProductionConnection`. Ese nombre separado no cambia la conexión de la app local.

```powershell
dotnet run --project tools/NeonCheck
```

This performs a read-only check over TLS with certificate/hostname verification. To apply the app migrations to a new production database / Comprueba la conexión mediante TLS y verificación del certificado/servidor, sin modificar datos. Para aplicar las migraciones a una base nueva de producción:

```powershell
dotnet run --project tools/NeonCheck -- --migrate
```

The tool does not print credentials and rejects existing tables without migration history, or migration history from another app. The initial Neon connection and all four DoneToday migrations were verified successfully. No local data was copied. / La herramienta no imprime credenciales y rechaza tablas existentes sin historial o migraciones de otra app. Se verificó la conexión inicial con Neon y se aplicaron correctamente las cuatro migraciones de DoneToday. No se copiaron datos locales.


Generate the deployment certificate once from the repository root / Generá el certificado una sola vez desde la raíz:

```powershell
dotnet run --project tools/DeploymentSecrets
```

Its base64 content is saved in `.local/deployment/data-protection-certificate.txt`, excluded from Git and Docker builds. Never paste it in chat or commit it. / Su contenido base64 se guarda en `.local/deployment/data-protection-certificate.txt`, excluido de Git y de Docker. No lo pegues en el chat ni lo subas a Git.

Render environment variables / Variables de Render:

| Variable | Value / Valor |
| --- | --- |
| `ConnectionStrings__AuthenticationConnection` | Production Npgsql connection string / Conexión Npgsql de producción |
| `DataProtection__CertificateBase64` | Private certificate file content / Contenido del archivo privado del certificado |
| `Authentication__Google__ClientId` | Existing Google client ID / Client ID de Google |
| `Authentication__Google__ClientSecret` | Google client secret / Secreto de Google |
| `Email__ApiKey` | Brevo API key / API key de Brevo |
| `Email__FromAddress` | Verified Brevo sender / Remitente verificado en Brevo |

The Blueprint supplies Production, port 8080 and Brevo as email provider. Schema migrations must run separately before deployment (see the role-separation procedure below). `RENDER_EXTERNAL_URL`, supplied by Render, becomes the trusted frontend URL automatically. / El Blueprint configura Production, puerto 8080 y Brevo. Las migraciones de esquema deben ejecutarse por separado antes del despliegue (ver el procedimiento de roles al final). `RENDER_EXTERNAL_URL`, suministrada por Render, se usa automáticamente como URL confiable del frontend.

Npgsql expects a semicolon-delimited connection string, not a `postgresql://` URL. Use the Neon connection details with TLS certificate verification / Npgsql espera una cadena separada por punto y coma, no una URL `postgresql://`. Usá los datos de Neon con verificación del certificado TLS:

```text
Host=YOUR-NEON-HOST;Port=5432;Database=neondb;Username=YOUR-USER;Password=YOUR-PASSWORD;SSL Mode=VerifyFull;Channel Binding=Require
```

## Build and deploy / Compilar y desplegar

With Docker available / Con Docker instalado:

```powershell
docker build -t donetoday .
```

Connect the repository to Render as a Blueprint using `render.yaml`, or select a Docker Web Service with the Free instance, repository root context and `/health` health check. Set all secret environment variables before the first deploy. The blueprint sets `Database__MigrateOnStartup=false`; run `--migrate-only` separately with the owner connection before starting the app with a restricted runtime role. This configuration targets one free instance. Back up production data before migration deployments.

Conectá el repositorio a Render como Blueprint usando `render.yaml`, o elegí un servicio web Docker con instancia Free, contexto en la raíz y health check `/health`. Configurá las variables secretas antes del primer deploy. El blueprint configura `Database__MigrateOnStartup=false`: ejecutá `--migrate-only` por separado con la conexión del propietario antes de iniciar la app con un rol restringido. Está pensado para una instancia gratuita. Respaldá los datos de producción antes de ejecutar migraciones.

Verify registration and real email confirmation, password recovery, local and Google login, 2FA, user isolation, deep links and login after a service restart. / Verificá registro y confirmación por correo real, recuperación, login local y Google, 2FA, aislamiento de usuarios, enlaces internos y sesión después de reiniciar el servicio.

## Local verification / Verificación local

For the 2026-10-20 security follow-up, complete the operational steps below before deploying the changed blueprint. / Para la segunda corrección del 2026-10-20, completá los pasos operativos siguientes antes de desplegar el blueprint modificado.

`tools/DeploymentPreview` creates and migrates an isolated local database named `donetoday_deployment_test` using the existing local server credentials. It stores the connection only under `.local/deployment`; no credentials are printed. This database is only for local testing, not Neon production.

`tools/DeploymentPreview` crea y migra una base local aislada llamada `donetoday_deployment_test` con las credenciales existentes del servidor local. Guarda la conexión únicamente en `.local/deployment`; no imprime credenciales. Esa base sirve para probar localmente, no es la producción de Neon.

Current verification: frontend build, Release publish, backend unit tests and a native production preview serving React/API passed. Docker Desktop is installed and the donetoday:local image built and ran successfully with an isolated PostgreSQL 17 container. Startup migrations, SPA/API routing, encrypted key storage after container restart and non-root execution were verified. Temporary containers were removed after testing. No public deployment or live Brevo delivery has been performed.

Verificación actual: pasaron el build del frontend, publish Release, tests del backend y una vista previa nativa en Production que sirve React/API. Docker Desktop está instalado y la imagen donetoday:local compiló y ejecutó correctamente con un contenedor PostgreSQL 17 aislado. Se verificaron migraciones al iniciar, rutas SPA/API, claves cifradas tras reiniciar el contenedor y ejecución sin root. Los contenedores temporales se retiraron después de la prueba. No se realizó un despliegue público ni un envío real con Brevo.

Sources / Fuentes: [Render Free](https://render.com/docs/free), [Blueprints](https://render.com/docs/blueprint-spec), [Neon](https://neon.com/pricing), [Brevo senders](https://help.brevo.com/hc/en-us/articles/208836149-Create-a-new-sender-From-name-and-From-email), [Brevo email API](https://developers.brevo.com/docs/send-a-transactional-email).


## 2026-10-20: separate migration and runtime roles

Prepared locally, not applied to Neon or Render. These steps require a dedicated DoneToday database and an explicit production maintenance/deployment decision. The existing production role remains unchanged until they are performed.

1. Back up the database, the Data Protection key ring and its private certificate. Stop all old application instances before encrypting legacy 2FA rows. Old binaries cannot read the protected values; rolling back just the executable can break 2FA. No schema change is needed for this conversion.
2. Privately create a separate LOGIN role, for example `donetoday_runtime`, with a strong unique password. It must have no superuser, create-role, create-database, replication or bypass-RLS privileges; no owner-role memberships; and no ownership or CREATE privileges on the database/public schema. Do not use a dashboard-created role that inherits elevated Neon permissions. Check inherited and PUBLIC grants as well. The SQL script rejects unsafe roles instead of silently revoking privileges that could affect other apps.
3. With the **owner** connection supplied securely to the migration process as `ConnectionStrings__AuthenticationConnection`, run the published executable:

   ```text
   dotnet DoneToday.dll --migrate-only
   ```

   Supply the same production frontend/Google settings, application name, certificate and key ring as the web service. The command applies migrations, encrypts legacy authenticator/recovery values and exits without serving HTTP. Never put owner credentials in a tracked file or pass a password in the command line. Render Free may require running this as a deliberate one-off operation outside the web service rather than a paid pre-deploy hook.
4. As the owner, in the DoneToday database only, apply `docs/sql/runtime-role.sql` using `psql` with `-v runtime_role=donetoday_runtime`. Supply connection credentials privately (for example via the client's password prompt), not in Git or logs. The script grants DML on tables, sequence usage and read-only migration history; it also configures default privileges for tables/sequences subsequently created **by that owner**. Run the same grants after future migrations, and always use that owner. Review public-schema CREATE privileges first if the script rejects the role; do not revoke shared grants blindly.
5. Configure Render's `ConnectionStrings__AuthenticationConnection` with the **runtime** connection and explicitly set `Database__MigrateOnStartup=false` (also set in the updated blueprint). Never store the owner connection in the web service. A new database must be migrated before the web process starts. Startup still performs the conditional token-data conversion using DML only; it does not need schema-owner rights.
6. Verify normal account/habit/2FA operations, key-ring writes across restarts, and denial of CREATE/ALTER/DROP and migration-history writes using the runtime role. Verify the role has no privilege path through membership or PUBLIC grants. Local integration tests exercise these checks against a disposable database; they are not evidence about the real Neon role.

Preparado en local; **no aplicado a producción**. Antes de desplegar, respaldá base y certificado, detené instancias anteriores, ejecutá la migración por separado con el propietario y cambiá la conexión de Render a un rol restringido. El blueprint ya no ejecuta migraciones de esquema al arrancar. Las claves de 2FA antiguas se cifran antes de atender tráfico: no vuelvas al binario anterior sin un plan de recuperación de datos.

## 2026-10-20: verify the real forwarded client IP

Still pending on Render. Local tests verify ASP.NET forwarding behavior, not the hosting proxy. The existing default trusts the single Render ingress and consumes one final `X-Forwarded-For` entry. If stable ingress IPs are available and verified, configure `Forwarding__KnownProxies__0` (and subsequent indexes); do not guess ranges or use client IPs as proxy addresses.

For an authorized maintenance check, temporarily record the transport peer before `UseForwardedHeaders` and the resulting `RemoteIpAddress` afterwards, only for your own diagnostic requests in a short window. Do not log cookies, auth headers or request bodies. From your own machine, send a normal request and another with a forged `X-Forwarded-For: 203.0.113.99`; the resulting client IP must equal your real public IP both times. Repeat from a second network to ensure clients do not share one proxy bucket. Remove the temporary logging after checking. If either comparison fails, keep this finding open and correct the trusted ingress/normalization before relying on IP limits. Do not expose a public diagnostic endpoint.

Pendiente en Render: comparar dos solicitudes propias, con y sin IP falsa, y repetir desde otra red. Los tests locales no prueban qué cabeceras agrega Render. No se activaron logs ni se enviaron solicitudes de diagnóstico a producción durante esta corrección.
