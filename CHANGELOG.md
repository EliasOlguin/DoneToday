# Changelog

## 1.2.3 — Unreleased / Sin publicar

- Update Vite to 8.3.3 to fix the Windows development-server launch-editor vulnerability. / Actualiza Vite a 8.3.3 para corregir la vulnerabilidad de apertura del editor en el servidor de desarrollo de Windows.

- Reclaim empty guest slots at capacity and clean up empty guests after 24 hours while retaining guests with habits for 120 days. / Recupera plazas de invitados vacíos al alcanzar capacidad y los limpia tras 24 horas, conservando 120 días a quienes tienen hábitos.
- Share a configurable daily email send budget across registration, confirmation resends and recovery, and limit registration to five requests per hour per IP. / Comparte un presupuesto diario configurable de correo entre registro, reenvíos y recuperación, y limita el registro a cinco peticiones por hora por IP.
- Allow verified Google sign-up to replace an unconfirmed local account without external logins atomically; expire unconfirmed local accounts without data after 48 hours. / Permite reemplazar atómicamente con Google verificado una cuenta local no confirmada sin vínculos externos; elimina cuentas locales pendientes sin datos tras 48 horas.
- Validate sign-up passwords before checking whether an email exists, keeping weak-password responses uniform. / Valida la contraseña antes de consultar si existe el email y mantiene respuestas uniformes para contraseñas débiles.

## 1.2.2 — 2026-10-18

- Unify confirmation and password-reset emails with a responsive DoneToday design, violet action buttons, copyable fallback links and plain-text alternatives. / Unifica correos de confirmación y recuperación con diseño adaptable, botones violeta, enlaces alternativos y versión de texto.

- Protect unsaved work and quantity retries; improve onboarding, form validation, email resend cooldowns, statistics hierarchy and local loading. / Protege cambios sin guardar y reintentos; mejora primer uso, validación, reenvío de correo, estadísticas y cargas locales.
- Add interaction/security regressions and document the recipient throttle and account isolation. / Agrega pruebas de interacción y seguridad y documenta límites de correo y aislamiento entre cuentas.

## 1.2.1 — 2026-10-18

- Patch .NET cryptography dependencies and Docker SDK/runtime, add browser security headers and no-store API caching. / Repara dependencias criptográficas e imagen Docker; agrega cabeceras de seguridad y caché no-store en la API.
- Limit API frequency/concurrency, request bodies and database commands; enforce transactional habit and daily-ledger quotas. / Limita frecuencia, concurrencia, cuerpos y comandos de DB; aplica cuotas transaccionales de hábitos y registros diarios.
- Require fresh same-account Google verification before account deletion, with a five-minute, single-use HttpOnly proof; count sensitive verification failures per account. / Exige verificar la misma cuenta Google antes del borrado con prueba HttpOnly de cinco minutos y un uso; cuenta fallos de reverificación por usuario.
- Validate all weekdays and sensitive-field lengths, ignore secret file patterns, and add security regression tests and bilingual documentation. / Valida días y longitudes, excluye archivos de secretos y agrega pruebas y documentación bilingüe de seguridad.

## 1.2.0 — 2026-10-14

- Celebrate all daily habits completed with a dismissible illustrated dialog, once per account/day in this browser, respecting reduced motion. / Festejo ilustrado al completar todos los hábitos diarios, una vez por cuenta y día en este navegador, respetando movimiento reducido.
- Automatically dismiss the completion/undo notice after ten seconds; clarify scheduled goal changes and test edited targets and units. / Cierra el aviso de completado a los diez segundos; aclara metas programadas y agrega pruebas de cambios de cantidad y unidad.

- Optional daily habit targets in liters, milliliters, pages, chapters, kilometers, minutes, repetitions or sessions. Existing weekday selection and simple checkmark habits remain available. / Metas diarias opcionales en litros, mililitros, páginas, capítulos, kilómetros, minutos, repeticiones o sesiones; conserva el selector de días y los hábitos simples.
- Add quantities or correct today's total with a dated ledger, automatic completion/streak updates and protection against duplicate requests and concurrent corrections. Goal edits start tomorrow in the account time zone and preserve historical targets. / Registros de cantidades y correcciones del total con historial, completado automático y protección ante duplicados y correcciones simultáneas. Los cambios de meta empiezan mañana y conservan objetivos históricos.
- Keep existing completion charts/calendar and add separate weekly/monthly amount summaries with daily detail and the same habit filter. Units are not combined, and excess on one day does not compensate for another day. / Conserva gráficos y calendario y agrega cantidades semanales/mensuales con detalle diario y el mismo filtro de hábito. Las unidades no se mezclan y los excedentes no compensan otros días.
- Apply additive migration `AddHabitGoalsAndProgress`. / Aplicar migración aditiva `AddHabitGoalsAndProgress`.

## 1.1.1 — 2026-10-14

- Add ten clearly labeled Atomic Habits-inspired reflections; disable update polling in development and ignore older server releases in production. / Agrega diez reflexiones identificadas como inspiradas en Hábitos atómicos; desactiva el aviso de actualización en desarrollo e ignora versiones anteriores del servidor en producción.

- Add a daily Today message with 70 entries in English, Spanish and German, following the account time zone, with credited book excerpts. / Agrega una frase diaria en Today con 70 entradas en inglés, español y alemán, según la zona horaria de la cuenta, con citas de libros atribuidas.

- Add a short directional slide when navigating between application pages, respecting reduced motion. / Agrega una transición lateral breve entre páginas que respeta la preferencia de movimiento reducido.

- Add subtle animated habit illustrations behind the main application, with fewer characters on mobile. / Agrega ilustraciones de hábitos animadas y sutiles al fondo de la aplicación, con menos personajes en móvil.

- Add a responsive illustrated authentication layout with animated habit characters and reduced-motion support. / Agrega un diseño de acceso adaptable con personajes de hábitos animados y soporte de movimiento reducido.

- Show/hide password controls in login, registration and registration confirmation fields.
- Controles para mostrar/ocultar la contraseña en login, registro y repetición de contraseña.

## 1.1.0

- Filter weekly and monthly statistics by one active habit, with All habits as the default.
- Filtro semanal y mensual por un hábito activo, con Todos los hábitos como opción inicial.
- Theme-aware habit menu with icons and keyboard navigation; statistics load within their sections instead of blocking the app.
- Menú de hábitos con colores del tema, iconos y navegación por teclado; carga dentro de las estadísticas sin bloquear la app.

## 1.0.1

- Notify open tabs when another version is available, with Update and Later actions. Check every three minutes while visible and on returning to the page; no automatic reload. Unsaved forms/order changes require confirmation before updating. Polling failures do not interrupt the app.
- Aviso de nueva versión en pestañas abiertas, con Actualizar y Más tarde. Consulta cada tres minutos mientras la página está visible y al volver; no recarga automáticamente. Los formularios y cambios de orden sin guardar piden confirmación antes de actualizar. Los fallos de consulta no interrumpen la app.

## 1.0.0

First release of DoneToday / Primera versión de DoneToday.

### English

- Today, habit creation/editing, schedule history, completion/undo, streaks and weekly progress.
- Monthly calendar with previous-month navigation and totals through the user's local today.
- Saved manual habit order, with pointer dragging and accessible up/down buttons.
- Completion notice with an Undo action and explicit dismissal.
- Editable display name and permanent account deletion with email confirmation, password and authenticator verification where applicable.
- English, Spanish and German, saved themes, responsive mobile/desktop layouts, habit icon suggestions and web app installation guidance.
- Confirmed-email accounts, password recovery, optional authenticator 2FA and Google sign-in.
- Account time zones, synchronized sessions across tabs, Render/Neon deployment and API email delivery.

### Español

- Today, creación/edición de hábitos, historial de días, completar/deshacer, rachas y progreso semanal.
- Calendario mensual con navegación a meses anteriores y totales hasta el día local del usuario.
- Orden manual guardado, arrastre y botones accesibles para subir/bajar.
- Aviso de completado con acción Deshacer y cierre explícito.
- Nombre de perfil editable y eliminación permanente con confirmación de email, contraseña y autenticador cuando corresponda.
- Inglés, español y alemán, temas guardados, diseño móvil/escritorio, sugerencias de iconos e instrucciones para instalar la web app.
- Cuentas con email confirmado, recuperación de contraseña, 2FA opcional y acceso con Google.
- Zona horaria por cuenta, sesiones sincronizadas entre pestañas, despliegue Render/Neon y correo por API.

Version source: `VERSION`. Fixes use `1.0.x`; new compatible features use `1.x.0`.
Fuente de versión: `VERSION`. Las correcciones usan `1.0.x`; las nuevas funciones compatibles usan `1.x.0`.
