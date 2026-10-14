# DoneToday

Deployment preparation / Preparación de despliegue: [Render Free + Neon + Brevo](docs/deployment.md).

[English](#english) · [Español](#español)

## English

### Version 1.0.0

The first release adds saved manual habit ordering, a completion notice with Undo, a monthly progress calendar, editable display names and permanent account deletion from Settings. Reordering uses a pointer handle (mouse/touch) or keyboard-accessible up/down buttons; Save applies the order to Habits and Today. Monthly totals include currently active habits and scheduled dates through the user's local today. Existing schedule history is respected.

`VERSION` is the release source, read by the frontend and .NET build; `DoneToday.Web/package.json` and its lockfile use the same version. Settings displays it. [CHANGELOG](CHANGELOG.md) records releases. Corrections become `1.0.x`, new compatible features `1.x.0`. Apply `AddProfileAndHabitOrder` before running this version. Render applies pending migrations on startup. A Git release tag can identify the validated published build; updating version metadata alone does not publish anything.

Account deletion requires an authenticated session, CSRF protection, the account email, the current password for password accounts and an authenticator code when 2FA is enabled. It removes Identity records, habits, schedules and completions and signs out the browser. Google-only accounts confirm their email without creating a local password. The action is irreversible and must be initiated and confirmed by the user.

DoneToday is a mobile-first habit tracker built with ASP.NET Core and React. Create routines, choose their scheduled days, complete today's habits, and track streaks and weekly progress.

### Features

- Today: scheduled habits, complete/undo actions, current and best streaks.
- Habits: create, edit, view completion history, archive, and restore.
- Statistics: weekly totals, daily completion chart, and breakdown by habit.
- Settings: persistent dark/light theme and English, Spanish, or German interface.
- Language detection: saved choice first, browser preferences second, English fallback.

Habit names and descriptions keep the text entered by the user. The interface language does not change scheduling: dates use the user's saved IANA time zone and the week starts on Monday. The browser time zone is saved on first sign-in and can be changed in Settings; another device does not overwrite it. Changes to scheduled days take effect tomorrow in that time zone; previous schedules and completion dates remain in the history. Event timestamps remain UTC. Existing accounts are initialized on their next sign-in; old UTC-based completion dates are not rewritten.

### Stack and repository

| Directory          | Responsibility                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------- |
| `DoneToday/`       | ASP.NET Core 10 API, EF Core, PostgreSQL, migrations, and domain services                 |
| `DoneToday.Tests/` | xUnit tests for streaks, scheduling, and progress                                         |
| `DoneToday.Web/`   | React 19, TypeScript 6, Vite 8, Tailwind CSS 4, React Router, TanStack Query, and i18next |

### Local setup

Requirements: .NET SDK 10, Node.js 24 with npm, PostgreSQL, and the EF Core 10 CLI. Commands below start from the repository root unless otherwise noted.

1. Create a PostgreSQL database and configure its connection locally:

   ```bash
   dotnet restore
   dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=donetoday;Username=YOUR_USER;Password=YOUR_PASSWORD" --project DoneToday
   ```

   Replace the example values with your local database credentials. Keep credentials out of source control.

2. If the EF CLI is not installed, install a version matching the backend, then apply the migrations:

   ```bash
   dotnet tool install --global dotnet-ef --version "10.*"
   dotnet ef database update --project DoneToday
   ```

   Identity infrastructure is being integrated. Development now uses the separate `donetoday_auth` database while keeping the previous database intact. Registration, email confirmation, login and logout are implemented. Habit endpoints use the authenticated user ID. Identity manages account creation in the new database. See [authentication preparation](docs/authentication.md).

3. Trust the local development certificate and start the API:

   ```bash
   dotnet dev-certs https --trust
   dotnet run --project DoneToday --launch-profile https
   ```

   API: `https://localhost:7154/api`. Swagger: `https://localhost:7154/swagger`.

4. In a second terminal, start the frontend:

   ```bash
   cd DoneToday.Web
   npm ci
   npm run dev
   ```

   Open the local URL printed by Vite, normally `http://localhost:5173`.

The Vite development proxy forwards `/api` requests to `https://localhost:7154`. Start the API with its HTTPS profile. The proxy accepts the local development certificate using `secure: false`; this setting is for local development. A production deployment or `npm run preview` needs its own API routing configuration.

### Checks

From the repository root:

```bash
dotnet test
```

From `DoneToday.Web`:

```bash
npm run build
npm run lint
npm run test:i18n
```

Stop the running API before `dotnet test` if Windows reports locked build files. The language tests cover regional codes, preference order, persistence, fallback, catalog completeness, and interpolation variables.

### API overview

| Method        | Route                       | Purpose                                              |
| ------------- | --------------------------- | ---------------------------------------------------- |
| GET           | `/api/Today`                | Today's scheduled habits and streaks                 |
| GET / POST    | `/api/Habits`               | List active habits / create a habit                  |
| GET / PUT     | `/api/Habits/{id}`          | Read / update a habit                                |
| GET           | `/api/Habits/{id}/detail`   | Streaks, schedule, and completion dates              |
| POST / DELETE | `/api/Habits/{id}/complete` | Complete / undo today's completion                   |
| PATCH         | `/api/Habits/{id}/archive`  | Archive a habit                                      |
| PATCH         | `/api/Habits/{id}/restore`  | Restore a habit                                      |
| GET           | `/api/Habits/archived`      | List archived habits                                 |
| GET           | `/api/Progress/week`        | Weekly totals, daily chart data, and habit breakdown |
| GET           | `/api/Progress/month`       | Monthly calendar and totals (`year`, `month`)        |
| POST          | `/api/Habits/order`         | Save the active habit order                          |
| POST          | `/api/profile/name`         | Update the display name                              |
| POST          | `/api/profile/time-zone`    | Save the account time zone                           |
| POST          | `/api/profile/delete`       | Confirm and permanently delete the current account   |

### Current scope

Version 1 supports email/password authentication with confirmation and recovery, optional authenticator 2FA, Google sign-in and explicit linking, per-account time zone/display name/manual habit order, selectable habit icons, weekly and monthly statistics, and account deletion. Theme and language remain browser preferences. Microsoft sign-in, yearly statistics and configurable habit start/end dates are outside this release.

For frontend structure, editor settings, and adding translations, see [the frontend README](DoneToday.Web/README.md).

## Español

### Versión 1.0.0

La primera entrega agrega orden manual guardado, aviso de completado con Deshacer, calendario mensual, nombre de perfil editable y eliminación permanente desde Settings. El orden se cambia con un control de arrastre (mouse/táctil) o botones accesibles para subir/bajar; Guardar lo aplica en Habits y Today. Los totales mensuales incluyen los hábitos actualmente activos y los días programados hasta el día local del usuario, respetando el historial de días.

`VERSION` es la fuente de versión que leen el frontend y la compilación de .NET; `DoneToday.Web/package.json` y su lockfile tienen la misma versión. Se muestra en Settings. [CHANGELOG](CHANGELOG.md) registra las entregas. Las correcciones pasan a `1.0.x` y las nuevas funciones compatibles a `1.x.0`. Aplicá `AddProfileAndHabitOrder` antes de ejecutar esta versión. Render aplica migraciones pendientes al arrancar. Una etiqueta Git puede identificar la compilación publicada y validada; actualizar el número de versión no publica por sí solo.

Eliminar la cuenta exige sesión autenticada, protección CSRF, el email de la cuenta, contraseña actual para cuentas con contraseña y código del autenticador cuando hay 2FA. Elimina los registros de Identity, hábitos, días programados y completaciones, y cierra la sesión del navegador. Las cuentas solo de Google confirman su email sin crear contraseña local. La acción es irreversible y debe iniciarla y confirmarla el usuario.

DoneToday es una aplicación de hábitos pensada primero para móviles, construida con ASP.NET Core y React. Permite crear rutinas, elegir sus días, completar los hábitos de hoy y seguir las rachas y el progreso semanal.

### Funciones

- Hoy: hábitos programados, completar/deshacer y rachas actual y máxima.
- Hábitos: crear, editar, consultar finalizaciones, archivar y restaurar.
- Estadísticas: totales semanales, gráfico diario y desglose por hábito.
- Configuración: tema oscuro/claro e interfaz en inglés, español o alemán.
- Detección de idioma: primero la elección guardada, después las preferencias del navegador y, como respaldo, inglés.

Los nombres y las descripciones conservan el texto ingresado por el usuario. El idioma de la interfaz no cambia la programación: las fechas usan la zona horaria IANA guardada por el usuario y la semana empieza el lunes. Detectamos la zona del navegador al iniciar sesión por primera vez; se puede cambiar en Settings y otro dispositivo no la sobrescribe. Los cambios de días se aplican desde mañana en esa zona y conservan el historial anterior. Las marcas de tiempo siguen en UTC. Las cuentas existentes se inicializan al volver a entrar; las fechas de las completaciones anteriores basadas en UTC no se reescriben.

### Tecnologías y repositorio

| Carpeta            | Responsabilidad                                                                        |
| ------------------ | -------------------------------------------------------------------------------------- |
| `DoneToday/`       | API ASP.NET Core 10, EF Core, PostgreSQL, migraciones y servicios de dominio           |
| `DoneToday.Tests/` | Tests xUnit de rachas, programación y progreso                                         |
| `DoneToday.Web/`   | React 19, TypeScript 6, Vite 8, Tailwind CSS 4, React Router, TanStack Query e i18next |

### Inicio local

Requisitos: .NET SDK 10, Node.js 24 con npm, PostgreSQL y la CLI de EF Core 10. Los comandos parten de la raíz del repositorio, salvo donde se indica otra carpeta.

1. Creá una base de datos PostgreSQL y configurá la conexión local:

   ```bash
   dotnet restore
   dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=donetoday;Username=YOUR_USER;Password=YOUR_PASSWORD" --project DoneToday
   ```

   Reemplazá los valores del ejemplo por tus credenciales locales. No guardes credenciales en Git.

2. Si no tenés instalada la CLI de EF, instalá una versión compatible con el backend y aplicá las migraciones:

   ```bash
   dotnet tool install --global dotnet-ef --version "10.*"
   dotnet ef database update --project DoneToday
   ```

   La infraestructura de Identity está en integración. Desarrollo usa la base separada `donetoday_auth` y conserva la anterior. Ya hay registro, confirmación de email, login y logout. Los endpoints de hábitos usan el ID del usuario autenticado. Identity gestiona la creación de cuentas en la base nueva. Consultá [la preparación de autenticación](docs/authentication.md).

3. Confiá en el certificado local de desarrollo e iniciá la API:

   ```bash
   dotnet dev-certs https --trust
   dotnet run --project DoneToday --launch-profile https
   ```

   API: `https://localhost:7154/api`. Swagger: `https://localhost:7154/swagger`.

4. En otra terminal, iniciá el frontend:

   ```bash
   cd DoneToday.Web
   npm ci
   npm run dev
   ```

   Abrí la URL local que muestra Vite, normalmente `http://localhost:5173`.

El proxy de desarrollo de Vite envía las peticiones `/api` a `https://localhost:7154`. Iniciá la API con el perfil HTTPS. El proxy acepta el certificado local mediante `secure: false`; esa configuración es para desarrollo. Un despliegue en producción o `npm run preview` necesita configurar su propio acceso a la API.

### Verificaciones

Desde la raíz del repositorio:

```bash
dotnet test
```

Desde `DoneToday.Web`:

```bash
npm run build
npm run lint
npm run test:i18n
```

Si Windows informa que los archivos de compilación están bloqueados, detené la API antes de ejecutar `dotnet test`. Los tests de idioma cubren variantes regionales, orden de preferencias, persistencia, respaldo, integridad de los catálogos y variables de interpolación.

### Resumen de la API

| Método        | Ruta                        | Función                                                           |
| ------------- | --------------------------- | ----------------------------------------------------------------- |
| GET           | `/api/Today`                | Hábitos programados para hoy y rachas                             |
| GET / POST    | `/api/Habits`               | Listar hábitos activos / crear un hábito                          |
| GET / PUT     | `/api/Habits/{id}`          | Consultar / editar un hábito                                      |
| GET           | `/api/Habits/{id}/detail`   | Rachas, programación y fechas de finalización                     |
| POST / DELETE | `/api/Habits/{id}/complete` | Completar / deshacer la finalización de hoy                       |
| PATCH         | `/api/Habits/{id}/archive`  | Archivar un hábito                                                |
| PATCH         | `/api/Habits/{id}/restore`  | Restaurar un hábito                                               |
| GET           | `/api/Habits/archived`      | Listar hábitos archivados                                         |
| GET           | `/api/Progress/week`        | Totales semanales, datos del gráfico diario y desglose por hábito |
| GET           | `/api/Progress/month`       | Calendario y totales mensuales (`year`, `month`)                  |
| POST          | `/api/Habits/order`         | Guardar el orden de los hábitos activos                           |
| POST          | `/api/profile/name`         | Actualizar el nombre para mostrar                                 |
| POST          | `/api/profile/time-zone`    | Guardar la zona horaria de la cuenta                              |
| POST          | `/api/profile/delete`       | Confirmar y eliminar permanentemente la cuenta actual             |

### Alcance actual

La versión 1 admite email/contraseña con confirmación y recuperación, 2FA opcional con autenticador, acceso con Google y vinculación explícita, zona horaria/nombre/orden manual por cuenta, iconos seleccionables, estadísticas semanales y mensuales y eliminación de cuenta. El idioma y el tema siguen siendo preferencias del navegador. Microsoft, estadísticas anuales y fechas de inicio/fin configurables de los hábitos quedan fuera de esta entrega.

Para la estructura del frontend, configuración del editor y nuevas traducciones, consultá [el README del frontend](DoneToday.Web/README.md).
