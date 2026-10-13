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

The Blueprint supplies Production, port 8080, Brevo as email provider and automatic migrations on startup. `RENDER_EXTERNAL_URL`, supplied by Render, becomes the trusted frontend URL automatically. / El Blueprint configura Production, puerto 8080, Brevo y migraciones al iniciar. `RENDER_EXTERNAL_URL`, suministrada por Render, se usa automáticamente como URL confiable del frontend.

Npgsql expects a semicolon-delimited connection string, not a `postgresql://` URL. Use the Neon connection details with TLS certificate verification / Npgsql espera una cadena separada por punto y coma, no una URL `postgresql://`. Usá los datos de Neon con verificación del certificado TLS:

```text
Host=YOUR-NEON-HOST;Port=5432;Database=neondb;Username=YOUR-USER;Password=YOUR-PASSWORD;SSL Mode=VerifyFull;Channel Binding=Require
```

## Build and deploy / Compilar y desplegar

With Docker available / Con Docker instalado:

```powershell
docker build -t donetoday .
```

Connect the repository to Render as a Blueprint using `render.yaml`, or select a Docker Web Service with the Free instance, repository root context and `/health` health check. Set all secret environment variables before the first deploy. The application applies migrations at startup when `Database__MigrateOnStartup=true`; this configuration targets one free instance. Back up production data before future migration deployments.

Conectá el repositorio a Render como Blueprint usando `render.yaml`, o elegí un servicio web Docker con instancia Free, contexto en la raíz y health check `/health`. Configurá las variables secretas antes del primer deploy. La app aplica migraciones al iniciar si `Database__MigrateOnStartup=true`; esta configuración está pensada para una sola instancia gratuita. Respaldá los datos de producción antes de desplegar migraciones futuras.

Verify registration and real email confirmation, password recovery, local and Google login, 2FA, user isolation, deep links and login after a service restart. / Verificá registro y confirmación por correo real, recuperación, login local y Google, 2FA, aislamiento de usuarios, enlaces internos y sesión después de reiniciar el servicio.

## Local verification / Verificación local

`tools/DeploymentPreview` creates and migrates an isolated local database named `donetoday_deployment_test` using the existing local server credentials. It stores the connection only under `.local/deployment`; no credentials are printed. This database is only for local testing, not Neon production.

`tools/DeploymentPreview` crea y migra una base local aislada llamada `donetoday_deployment_test` con las credenciales existentes del servidor local. Guarda la conexión únicamente en `.local/deployment`; no imprime credenciales. Esa base sirve para probar localmente, no es la producción de Neon.

Current verification: frontend build, Release publish, backend unit tests and a native production preview serving React/API passed. Docker Desktop is installed and the donetoday:local image built and ran successfully with an isolated PostgreSQL 17 container. Startup migrations, SPA/API routing, encrypted key storage after container restart and non-root execution were verified. Temporary containers were removed after testing. No public deployment or live Brevo delivery has been performed.

Verificación actual: pasaron el build del frontend, publish Release, tests del backend y una vista previa nativa en Production que sirve React/API. Docker Desktop está instalado y la imagen donetoday:local compiló y ejecutó correctamente con un contenedor PostgreSQL 17 aislado. Se verificaron migraciones al iniciar, rutas SPA/API, claves cifradas tras reiniciar el contenedor y ejecución sin root. Los contenedores temporales se retiraron después de la prueba. No se realizó un despliegue público ni un envío real con Brevo.

Sources / Fuentes: [Render Free](https://render.com/docs/free), [Blueprints](https://render.com/docs/blueprint-spec), [Neon](https://neon.com/pricing), [Brevo senders](https://help.brevo.com/hc/en-us/articles/208836149-Create-a-new-sender-From-name-and-From-email), [Brevo email API](https://developers.brevo.com/docs/send-a-transactional-email).
