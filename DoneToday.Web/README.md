# DoneToday.Web

[English](#english) · [Español](#español) · [Project README / README del proyecto](../README.md)

## English

### Current release: 1.1.1

Stats defaults to All habits. Its habit selector applies to both weekly totals/charts and the monthly calendar, including previous months. Only active habits belonging to the signed-in account can be selected; another account's or unavailable habit ID returns 404. Today keeps its overall weekly summary. No database migration is required for filtering.

The selector uses themed menu items, habit icons and keyboard navigation rather than the operating system's select popup. Statistics queries opt into local loading; changing habit or month keeps the rest of the app interactive and does not reload the document or activate the global loading overlay.

Version 1.0.1 adds an update notice. `/api/version` returns the deployed .NET release with `Cache-Control: no-store`. A separate lightweight check compares it with the loaded `VERSION` every three minutes while visible and on returning to the tab (at most one request per minute). It does not activate the global loading overlay or reload automatically. Update confirms before discarding edited forms or habit order; Later hides that release notice for this visit. Network/old-endpoint errors stay silent. Increase VERSION and package/lockfile versions for each release; an already-open 1.0.0 tab must be reloaded once to get this feature.

The version shown in Settings comes from the root `VERSION` file; keep package.json/package-lock.json in sync when releasing. See the bilingual [CHANGELOG](../CHANGELOG.md). Version 1 adds saved manual ordering from Habits (mouse/touch handle and keyboard-accessible arrows), a completion notice with Undo, display-name editing, explicit account deletion and a monthly calendar in Stats. Ordering is applied after Save, including in Today; Cancel leaves the saved order unchanged. Undo remains available until dismissed, another action replaces it, navigation occurs or the local day changes. Monthly counts include currently active habits, valid schedule history and elapsed local dates; future dates do not count. Profile deletion is irreversible and removes account/habit/history records, with email, password and authenticator confirmation as applicable. Apply the `AddProfileAndHabitOrder` migration locally. Docker/Render includes the same release version.

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

Update checks run only in production builds. Development uses Vite hot updates and never polls for releases. Production notices require a newer semantic version; an older backend does not trigger a notice.

### Optional habit targets

Habit creation/editing now offers optional quantity or duration targets while keeping the existing individual weekday selector. Today and habit detail support quick additions, manual records and corrections with automatic completion when the target is reached. Existing statistics remain in place; separate weekly/monthly quantity summaries add historical daily targets and coverage without combining units. Goal edits begin tomorrow in the account time zone. Apply `AddHabitGoalsAndProgress` and restart the backend. See [measurable habits](../docs/measurable-habits.md) for rules, endpoints and tests (`npm run test:measurements`).

### Daily motivation

Today shows one of 70 messages below the greeting, selected by the calendar date in the account's saved time zone. Revisiting, reloading or switching language keeps the same message; it advances at local midnight (within the existing 30-second clock refresh, or on window focus) and repeats after 70 days. All three catalogs contain matching `motivation.01`–`motivation.70` keys. No external API, extra package or database migration is needed. The catalog contains 58 original DoneToday messages, two short book excerpts and ten reformulated reflections inspired by Atomic Habits. Book-related entries have linked credits; the ten reflections are explicitly labeled Inspired by rather than presented as literal quotations. Spanish and German excerpts are DoneToday translations, not quotations from published translated editions. Source details and editing guidance: [daily motivation](../docs/daily-motivation.md). Run `npm run test:motivation`.

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

### Versión actual: 1.1.1

Stats muestra Todos los hábitos por defecto. El selector se aplica a los totales/gráficos semanales y al calendario mensual, incluso en meses anteriores. Solo permite seleccionar hábitos activos de la cuenta autenticada; un ID ajeno o no disponible devuelve 404. Today mantiene su resumen semanal general. El filtro no requiere migración de base.

El selector usa un menú con los colores de la app, iconos y navegación por teclado, en lugar del desplegable del sistema operativo. Las consultas de estadísticas muestran la carga dentro de sus secciones; cambiar de hábito o mes mantiene el resto de la app disponible, sin recargar el documento ni activar el loading global.

La versión 1.0.1 agrega un aviso de actualización. `/api/version` devuelve la versión de .NET desplegada con `Cache-Control: no-store`. Una consulta liviana la compara con el `VERSION` cargado cada tres minutos mientras la página esté visible y al volver a la pestaña (como máximo una consulta por minuto). No activa el loading global ni recarga automáticamente. Actualizar pide confirmación antes de descartar formularios u orden editados; Más tarde oculta ese aviso durante esta visita. Los errores de red o endpoints antiguos son silenciosos. Incrementá VERSION y las versiones del paquete/lockfile en cada entrega; una pestaña ya abierta con 1.0.0 debe recargarse una vez para recibir esta función.

La versión que muestra Settings proviene del archivo raíz `VERSION`; mantené package.json/package-lock.json sincronizados al publicar. Consultá el [CHANGELOG](../CHANGELOG.md) bilingüe. La versión 1 agrega orden manual desde Habits (control de mouse/táctil y flechas accesibles por teclado), aviso de completado con Deshacer, edición del nombre de perfil, eliminación explícita de cuenta y calendario mensual en Stats. Guardar aplica el orden también en Today; Cancelar conserva el orden anterior. Deshacer queda disponible hasta cerrar el aviso, realizar otra acción que lo reemplace, salir de la pantalla o cambiar el día local. Los totales mensuales incluyen hábitos actualmente activos, historial de programación y días locales transcurridos; no cuentan fechas futuras. Eliminar la cuenta es irreversible y borra cuenta/hábitos/historial, con confirmación de email, contraseña y autenticador cuando corresponde. Aplicá localmente `AddProfileAndHabitOrder`. Docker/Render incluye la misma versión de entrega.

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

El aviso de actualización solo se comprueba en compilaciones de producción. En desarrollo se usan las actualizaciones de Vite y no se consultan versiones. En producción se avisa solo por una versión semántica más reciente; un backend anterior no genera el cartel.

### Metas opcionales por hábito

Crear/editar permite agregar metas de cantidad o duración y conserva el selector de días individuales. Today y el detalle permiten sumas rápidas, registros manuales y correcciones; alcanzar la meta completa el hábito automáticamente. Las estadísticas anteriores se mantienen y se agregan cantidades semanales/mensuales con objetivos históricos y cobertura, sin mezclar unidades. Los cambios de meta empiezan mañana según la zona de la cuenta. Aplicá `AddHabitGoalsAndProgress` y reiniciá el backend. Consultá [hábitos con metas](../docs/measurable-habits.md) para reglas, rutas y pruebas (`npm run test:measurements`).

### Frase diaria

Today muestra una de 70 frases debajo del saludo, elegida según la fecha en la zona horaria guardada en la cuenta. Volver a entrar, recargar o cambiar de idioma conserva la misma frase; cambia al llegar la medianoche local (dentro del refresco de reloj existente de 30 segundos o al enfocar la ventana) y se repite después de 70 días. Los tres catálogos tienen las mismas claves `motivation.01`–`motivation.70`. No requiere API externa, paquetes nuevos ni migración de base de datos. Hay 58 mensajes originales de DoneToday, dos citas breves de libros y diez reflexiones reformuladas a partir de Hábitos atómicos. Las entradas de libros tienen enlaces a sus fuentes y las diez reflexiones se identifican como Inspirado en, sin presentarse como citas textuales. Las citas en español y alemán son traducciones de DoneToday, no fragmentos de ediciones traducidas publicadas. Fuentes y guía de edición: [frase diaria](../docs/daily-motivation.md). Ejecutá `npm run test:motivation`.

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
