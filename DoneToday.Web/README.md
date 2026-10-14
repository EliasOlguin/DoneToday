# DoneToday.Web

[English](#english) · [Español](#español) · [Project README / README del proyecto](../README.md)

## English

React and TypeScript frontend for DoneToday. The [project README](../README.md#english) describes database configuration, backend startup, API routes, and current scope.

### Development

Use Node.js 24. From this directory:

```bash
npm ci
npm run dev
```

Open `https://localhost:5173` and keep the backend running at `https://localhost:7154`. The predev script exports the .NET development certificate into the ignored `.local/https` directory. On a new machine, trust it with `dotnet dev-certs https --trust`. Vite forwards `/api` requests through its development proxy. `npm run build` produces `dist/`; `npm run preview` previews that output but does not provide the development API proxy. Local login requires email confirmation; development emails appear in Mailpit. See [authentication](../docs/authentication.md).

### Source structure

| Directory         | Purpose                                                      |
| ----------------- | ------------------------------------------------------------ |
| `src/api/`        | HTTP requests and error keys                                 |
| `src/pages/`      | Today, habits, create/edit, detail, statistics, and settings |
| `src/components/` | Shared UI and weekly progress card                           |
| `src/layout/`     | Shared header and bottom navigation                          |
| `src/types/`      | API contracts                                                |
| `src/context/`    | Theme preference                                             |
| `src/lib/`        | Localized dates, weekdays, schedules, and percentages        |
| `src/i18n/`       | Language configuration, typed keys, and translation catalogs |
| `tests/`          | Language detection and translation consistency tests         |

TanStack Query manages server data. Form inputs use local React state. Mutations invalidate affected queries so lists, streaks, details, and charts refresh after changes.

### Internationalization

The frontend uses `i18next`, `react-i18next`, and `i18next-browser-languagedetector` with bundled JSON catalogs:

```text
src/i18n/
├── index.ts
├── options.ts
├── i18next.d.ts
└── locales/
    ├── en.json
    ├── es.json
    └── de.json
```

The app checks `localStorage` (`donetoday-language`), then browser preferences (`navigator.languages`), then falls back to English. Regional codes such as `es-AR` and `de-DE` resolve to Spanish and German. Change the language in Settings; the choice persists on that browser. To test first-visit detection again, remove only the `donetoday-language` storage entry in browser developer tools and reload.

To add an interface message:

1. Add the same semantic key to all three catalogs, with a translation in each language.
2. Use `useTranslation()` and `t()` in the component:

   ```tsx
   const { t } = useTranslation()
   return <h1>{t('nav.habits')}</h1>
   ```

3. Keep interpolation variables consistent across languages. For plural messages, use `_one` and `_other` keys and pass `count`.
4. Run `npm run build`, `npm run lint`, and `npm run test:i18n`.

Keys use dot-separated names in flat JSON objects (`keySeparator: false`). TypeScript checks keys against the English catalog. API failures use stable error keys and are translated when rendered, so an existing error can follow a language change. Dates and percentages use `Intl`; Today and scheduling use the account's saved time zone. User-created content is not automatically translated.

### Time zone

On first authenticated session, `Intl.DateTimeFormat().resolvedOptions().timeZone` is saved through the CSRF-protected `POST /api/profile/time-zone` endpoint before habit pages load. `initializeOnly` prevents another device from replacing an existing choice. Settings offers a time-zone selector and a device-zone shortcut. The backend uses the saved zone for Today, schedule changes, completions, streaks and weekly progress. Today displays the same zone, date and greeting. Open tabs refresh date-dependent queries within 30 seconds of local midnight and when returning to the window; changing the preference also refreshes other tabs. Historical dates stay unchanged. Apply the `AddUserTimeZone` migration before running this version.

### Habit icons

Creating or editing a habit includes an icon picker and a preview in the selected color. New habits suggest an icon from keywords in English, Spanish and German; this runs locally without an external AI service. A manual choice remains selected when the name changes. Use suggestion restores automatic selection. Icons are saved in the account's habits and shown in Today, Habits, details, weekly progress and archived habits. Apply the `AddHabitIcon` migration; existing habits retain the default exercise icon. The API validates icon names against a fixed catalog. Run `node --test tests/habitIcons.test.mjs` to check suggestions and safe fallback behavior.

### Logo and web app installation

The editable brand mark is `public/brand/logo.svg`: a sun and check mark in DoneToday's purple. The favicon and PNG app icons use the same design. `public/manifest.json` defines the app name, icons, scope and standalone launch; opening the installed app at `/` keeps the normal login/session routing.

After 15 seconds inside the authenticated app, a small installation suggestion appears. "Maybe later" postpones it for seven days on that browser. Settings includes the same installation controls. Supported browsers use their native `beforeinstallprompt` dialog after a user click; other browsers show instructions, including Safari's Add to Home Screen flow. Availability depends on the browser. No service worker or offline/private-data cache is added: DoneToday still needs an internet connection.

### Sessions across windows

Login, registration and password-recovery screens check the server session and redirect signed-in users to Today. Sessions are verified again on window focus, tab visibility changes and browser Back restoring a cached page. A `BroadcastChannel` notifies other same-origin tabs when an authoritative session check detects a sign-in, sign-out or account change. Messages contain only a change signal; each tab verifies its own cookie with `/api/auth/me`. Private query data is cleared when accounts change. Email confirmation and password-reset links remain accessible independently of these guest-only screens; confirming an email does not sign the user in.

### Editor and checks

VS Code settings recommend ESLint and Prettier, validate while typing, and format on save. Use `dtcomp` or `dtprops` in a TSX file for the included component snippets. Prettier uses two spaces, single quotes, and no semicolons.

```bash
npm run build
npm run lint
npm run test:i18n
npm run test:query
npm run test:install
npm run test:session
```

## Español

Frontend de DoneToday en React y TypeScript. El [README del proyecto](../README.md#español) explica la configuración de la base de datos, el inicio del backend, las rutas de la API y el alcance actual.

### Desarrollo

Usá Node.js 24. Desde esta carpeta:

```bash
npm ci
npm run dev
```

Abrí `https://localhost:5173` y mantené el backend iniciado en `https://localhost:7154`. El script predev exporta el certificado de .NET a `.local/https`, excluido de Git. En una máquina nueva, marcalo como confiable con `dotnet dev-certs https --trust`. Vite reenvía `/api` mediante su proxy. `npm run build` genera `dist/`; `npm run preview` permite ver esa compilación, pero no incluye el proxy hacia la API. El login exige confirmar el email; los correos de desarrollo aparecen en Mailpit. Consultá [autenticación](../docs/authentication.md).

### Estructura del código

| Carpeta           | Función                                                           |
| ----------------- | ----------------------------------------------------------------- |
| `src/api/`        | Peticiones HTTP y claves de error                                 |
| `src/pages/`      | Hoy, hábitos, crear/editar, detalle, estadísticas y configuración |
| `src/components/` | UI compartida y tarjeta de progreso semanal                       |
| `src/layout/`     | Encabezado y navegación inferior compartidos                      |
| `src/types/`      | Contratos de la API                                               |
| `src/context/`    | Preferencia de tema                                               |
| `src/lib/`        | Fechas, días, programación y porcentajes localizados              |
| `src/i18n/`       | Configuración de idioma, claves tipadas y catálogos de traducción |
| `tests/`          | Tests de detección de idioma y consistencia de traducciones       |

TanStack Query administra los datos del servidor. Los formularios usan estado local de React. Las mutaciones invalidan las consultas afectadas para actualizar listas, rachas, detalles y gráficos.

### Internacionalización

El frontend usa `i18next`, `react-i18next` e `i18next-browser-languagedetector`, con catálogos JSON incluidos en la aplicación:

```text
src/i18n/
├── index.ts
├── options.ts
├── i18next.d.ts
└── locales/
    ├── en.json
    ├── es.json
    └── de.json
```

La app consulta primero `localStorage` (`donetoday-language`), después las preferencias del navegador (`navigator.languages`) y usa inglés como respaldo. Variantes como `es-AR` y `de-DE` corresponden a español y alemán. El selector de Configuración guarda la elección en ese navegador. Para probar otra vez la detección inicial, eliminá solamente la entrada `donetoday-language` desde las herramientas de desarrollo del navegador y recargá.

Para agregar un mensaje de interfaz:

1. Agregá la misma clave semántica a los tres catálogos, con su traducción en cada idioma.
2. Usá `useTranslation()` y `t()` en el componente:

   ```tsx
   const { t } = useTranslation()
   return <h1>{t('nav.habits')}</h1>
   ```

3. Conservá las mismas variables de interpolación en los tres idiomas. Para plurales, usá claves `_one` y `_other` y pasá `count`.
4. Ejecutá `npm run build`, `npm run lint` y `npm run test:i18n`.

Las claves tienen nombres separados por puntos dentro de objetos JSON planos (`keySeparator: false`). TypeScript las comprueba contra el catálogo en inglés. Los errores de la API usan claves estables y se traducen al mostrarlos, por lo que un error visible puede cambiar de idioma. Las fechas y los porcentajes usan `Intl`; Today y la programación usan la zona guardada en la cuenta. El contenido creado por el usuario no se traduce automáticamente.

### Zona horaria

En la primera sesión autenticada guardamos `Intl.DateTimeFormat().resolvedOptions().timeZone` mediante `POST /api/profile/time-zone`, protegido por CSRF, antes de cargar los hábitos. `initializeOnly` evita que otro dispositivo reemplace una elección existente. Settings permite elegir la zona o seleccionar la del dispositivo. El backend la usa para Today, cambios de días, completaciones, rachas y progreso semanal. Today muestra esa misma zona, fecha y saludo. Las pestañas abiertas actualizan los datos dentro de los 30 segundos posteriores a la medianoche local y al volver a la ventana; cambiar la preferencia también actualiza las otras pestañas. El historial conserva sus fechas. Aplicá la migración `AddUserTimeZone` antes de ejecutar esta versión.

### Iconos de hábitos

Crear o editar un hábito incluye un selector de iconos y una vista previa con el color elegido. Los hábitos nuevos sugieren un icono a partir de palabras en inglés, español y alemán; esto funciona localmente sin un servicio externo de IA. Si elegís un icono manualmente, cambiar el nombre no reemplaza esa elección. Usar sugerencia restablece la selección automática. El icono se guarda con el hábito y aparece en Today, Habits, detalle, progreso semanal y hábitos archivados. Aplicá la migración `AddHabitIcon`; los hábitos existentes conservan el icono de ejercicio predeterminado. La API valida los nombres contra un catálogo fijo. Ejecutá `node --test tests/habitIcons.test.mjs` para comprobar las sugerencias y el icono de respaldo.

### Logo e instalación como web app

El logo editable está en `public/brand/logo.svg`: un sol y una marca de completado con el violeta de DoneToday. El favicon y los íconos PNG usan el mismo diseño. `public/manifest.json` define nombre, íconos, alcance y apertura en una ventana independiente; al abrir la app instalada en `/` se conserva la navegación según la sesión del usuario.

Después de 15 segundos dentro de la app autenticada, aparece una sugerencia discreta. "Más tarde" la pospone siete días en ese navegador. Settings también incluye los controles de instalación. Los navegadores compatibles muestran su diálogo nativo de `beforeinstallprompt` al pulsar el botón; los demás muestran instrucciones, incluida la opción Agregar a inicio en Safari. La disponibilidad depende del navegador. No se agrega un service worker ni una caché de datos privados: DoneToday sigue necesitando conexión a internet.

### Sesiones entre ventanas

Login, registro y recuperación de contraseña consultan la sesión del servidor y llevan a Today a quien ya inició sesión. La sesión vuelve a comprobarse al enfocar la ventana, volver a la pestaña o usar Atrás para restaurar una página en caché. Un `BroadcastChannel` avisa a las otras pestañas del mismo sitio cuando una comprobación detecta login, logout o cambio de cuenta. El mensaje contiene solamente un aviso; cada pestaña verifica su cookie con `/api/auth/me`. Los datos privados en caché se limpian al cambiar de cuenta. Los enlaces de confirmación de email y restablecimiento de contraseña siguen disponibles de forma independiente; confirmar un email no inicia sesión.

### Editor y verificaciones

La configuración de VS Code recomienda ESLint y Prettier, valida mientras escribís y formatea al guardar. Usá `dtcomp` o `dtprops` en un archivo TSX para los snippets de componentes incluidos. Prettier usa dos espacios, comillas simples y no agrega punto y coma.

```bash
npm run build
npm run lint
npm run test:i18n
npm run test:query
npm run test:install
npm run test:session
```
