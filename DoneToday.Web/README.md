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

Keep the backend running at `https://localhost:7154`. Vite forwards `/api` requests through its development proxy. `npm run build` produces `dist/`; `npm run preview` previews that output but does not provide the development API proxy.

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

Keys use dot-separated names in flat JSON objects (`keySeparator: false`). TypeScript checks keys against the English catalog. API failures use stable error keys and are translated when rendered, so an existing error can follow a language change. Dates and percentages use `Intl`; scheduling remains UTC. User-created content is not automatically translated.

### Editor and checks

VS Code settings recommend ESLint and Prettier, validate while typing, and format on save. Use `dtcomp` or `dtprops` in a TSX file for the included component snippets. Prettier uses two spaces, single quotes, and no semicolons.

```bash
npm run build
npm run lint
npm run test:i18n
```

## Español

Frontend de DoneToday en React y TypeScript. El [README del proyecto](../README.md#español) explica la configuración de la base de datos, el inicio del backend, las rutas de la API y el alcance actual.

### Desarrollo

Usá Node.js 24. Desde esta carpeta:

```bash
npm ci
npm run dev
```

Mantené el backend iniciado en `https://localhost:7154`. Vite reenvía las peticiones `/api` mediante el proxy de desarrollo. `npm run build` genera `dist/`; `npm run preview` permite ver esa compilación, pero no incluye el proxy de desarrollo hacia la API.

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

Las claves tienen nombres separados por puntos dentro de objetos JSON planos (`keySeparator: false`). TypeScript las comprueba contra el catálogo en inglés. Los errores de la API usan claves estables y se traducen al mostrarlos, por lo que un error visible puede cambiar de idioma. Las fechas y los porcentajes usan `Intl`; la programación sigue en UTC. El contenido creado por el usuario no se traduce automáticamente.

### Editor y verificaciones

La configuración de VS Code recomienda ESLint y Prettier, valida mientras escribís y formatea al guardar. Usá `dtcomp` o `dtprops` en un archivo TSX para los snippets de componentes incluidos. Prettier usa dos espacios, comillas simples y no agrega punto y coma.

```bash
npm run build
npm run lint
npm run test:i18n
```
