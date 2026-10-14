# Measurable habits / Hábitos con metas

## English

Daily targets are optional. The existing icon/color controls, individual weekday buttons, Every day shortcut and simple checkmark flow remain available. New habits default to simple tracking. Enabling a target suggests liters for water, pages for reading, kilometers for walking and minutes otherwise; the user can choose any supported unit. This is manual duration entry, not a stopwatch.

Supported unit codes: `l`, `ml`, `pages`, `chapters`, `km`, `minutes`, `repetitions`, `sessions`. Targets and additions must be positive, up to 1,000,000, with at most three decimal places. Pages, chapters, repetitions and sessions require whole numbers. A corrected total may be zero. Liters and milliliters are separate choices; quick buttons labeled in milliliters convert to the selected liters before sending the request.

### Dates, edits and completion

- The account's saved time zone determines the recording date. Recording is allowed only today and only on a scheduled day.
- Creation applies the target from today. Target, unit and tracking-mode edits apply from tomorrow, matching the existing schedule-edit behavior. Repeated edits replace tomorrow's pending change. Today and earlier dates retain their effective goals.
- Each day starts with zero progress. Previous days remain in the database. Goal history and the daily progress snapshot preserve earlier targets and units.
- Reaching the target creates the ordinary `HabitCompletion` used by streaks, weekly totals, daily charts and the monthly calendar. Partial progress does not count as completion. Correcting below the target removes that day's completion; going above it never creates a second completion.
- Quantity tracking cannot be bypassed with the simple complete/undo endpoints. Simple habits keep those endpoints. Older clients that omit goal fields when editing do not disable a measured habit; disabling requires explicitly sending both goal fields as null.

### Recording and concurrent requests

`POST /api/Habits/{id}/progress` adds an amount. `PUT /api/Habits/{id}/progress` replaces today's total. Both require authentication, account ownership, active habit, CSRF protection, `date` and a nonempty UUID `operationId`. Corrections also require `expectedRevision` from the displayed progress. Conflicts refresh the UI and close the stale form so the user can review the latest total.

Every request uses a transaction and a per-habit PostgreSQL advisory transaction lock, also used by goal edits. A unique operation ID per habit prevents re-counting retries. A revision prevents a stale correction from overwriting another tab's addition. The append-only entry ledger records additions and correction deltas with UTC timestamps and resulting totals; the UI shows timestamps in the account time zone. The progress controls show local saving state and disable their own buttons while saving rather than blocking the whole application.

`GET /api/Today` adds `progress` for measured habits. Habit responses add `goalTarget`, `goalUnit`, `goalEffectiveFrom`. Habit detail also includes today's progress, scheduled status and entries. An edited future configuration and today's effective goal can legitimately differ; detail displays both with dates.

### Statistics

The existing completion summary, daily chart, habit breakdown and monthly calendar are unchanged. New quantity sections are supplementary, follow the same habit filter and load locally. The monthly quantity section follows the calendar's selected month; the calendar remains last.

`GET /api/Progress/quantities` returns the current week's quantities. Add `year` and `month` for a monthly range, and optionally `habitId`. Only the signed-in user's currently active habits are eligible, consistent with existing statistics. Unavailable or foreign habit IDs return 404. Only elapsed, scheduled, measured days contribute; days before a target was enabled do not create artificial quantity history.

Each habit/unit gets its own totals and daily breakdown. Changes of unit within the selected range produce separate entries, even for the same habit. No totals combine liters, pages or kilometers, or different habits. Coverage is `sum(min(day amount, day target)) / sum(day target)`: extra work on one day does not compensate for a different day. Actual totals still show all recorded amounts, including excess. Daily targets and completed-day counts remain visible alongside coverage.

### Migration and verification

Apply additive migration `20261014181123_AddHabitGoalsAndProgress`:

```powershell
dotnet ef database update --project DoneToday
dotnet run --project DoneToday --launch-profile https
```

Stop an existing backend first to release its executable. The migration adds nullable configuration columns and goal-history/day-progress/entry tables. Existing habits and completion history are retained; existing habits remain simple. New tables cascade when the owning account/habit is deleted. No external services or new packages are required.

Run `dotnet test DoneToday.Tests`, `npm run test:measurements`, `npm run test:i18n`, `npm run build` and `npm run lint` from the appropriate directories. Domain tests cover valid amounts, historical goals, pending edits, completion corrections and non-compensating coverage. Isolated PostgreSQL QA also covers upgrade from the previous schema, ownership, duplicate operation IDs, stale corrections, old-day requests, scheduled days, concurrent writes, completion uniqueness and deletion cascades.

## Español

Las metas diarias son opcionales. Se conserva el selector actual de días individuales, el botón Todos los días, los iconos/colores y el registro simple con una marca. Los hábitos nuevos siguen siendo simples por defecto. Al activar una meta se sugieren litros para agua, páginas para lectura, kilómetros para caminar y minutos para el resto; la unidad se puede elegir libremente entre las disponibles. Los minutos se ingresan manualmente, sin cronómetro.

Se admiten litros, mililitros, páginas, capítulos, kilómetros, minutos, repeticiones y sesiones. El máximo es 1.000.000 con hasta tres decimales; páginas, capítulos, repeticiones y sesiones requieren enteros. Una corrección puede dejar el total en cero. Los botones de +250/+500 ml convierten su cantidad a litros cuando el hábito usa esa unidad.

### Fechas e historial

La zona horaria guardada determina el día. Solo se registran cantidades hoy y en días programados. Una meta nueva empieza hoy; los cambios de meta, unidad o tipo de registro se aplican mañana, como los cambios de programación existentes. Hoy y los días anteriores conservan sus objetivos. Varias ediciones en el mismo día reemplazan la configuración pendiente de mañana.

Cada día comienza en cero, sin borrar registros anteriores. Al alcanzar la meta se crea la finalización normal que ya alimenta rachas, gráficos semanales y calendario mensual. Un avance parcial no cuenta como completado; corregir el total por debajo de la meta revierte esa finalización. Superar la meta no duplica el completado. Los hábitos simples conservan su funcionamiento anterior, y un cliente anterior que omita campos de meta al editar no desactiva metas existentes.

### Registros y estadísticas

Registrar suma una cantidad nueva; Corregir total reemplaza el acumulado de hoy y conserva los registros anteriores. Cada petición usa un identificador para evitar duplicados, bloqueo transaccional por hábito y una revisión para impedir que una corrección vieja sobrescriba avances de otra pestaña. Se comprueban cuenta, hábito activo, fecha, programación y CSRF. El guardado bloquea solo los controles del hábito y muestra su estado local.

Se mantienen todas las estadísticas anteriores. Las secciones nuevas de cantidades semanales y mensuales comparten el filtro de hábito y agregan el detalle por día. La sección mensual sigue el mes elegido en el calendario, que continúa al final. Cada hábito y unidad se muestra separado: no se suman litros con páginas ni cantidades de hábitos distintos. Si un hábito cambia de unidad dentro del período, cada unidad aparece por separado.

La cobertura usa la cantidad de cada día limitada por su propia meta. Un excedente de un día no compensa otro pendiente. Los totales reales sí muestran todo lo registrado, incluido el excedente. Se excluyen días futuros, no programados y anteriores a activar la meta.

### Puesta en marcha

Detené el backend y ejecutá los dos comandos anteriores desde la raíz. La migración agrega columnas y tablas sin borrar hábitos ni finalizaciones. Los hábitos existentes permanecen simples. No requiere servicios externos ni paquetes nuevos. Las rutas y pruebas de la sección inglesa documentan las mismas reglas.
