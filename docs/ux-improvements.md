# UX improvements / Mejoras de experiencia

## English

This unreleased change covers eight review points:

1. Quantity errors preserve input. Retry reuses the original operation ID, date, revision and account; conflicts require reviewing the current total. Confirmed server responses update the matching cache.
2. Unsaved habit forms and uncertain quantity operations ask before navigation or reload. Explicit update discard bypasses the unload warning once. Drafts are not persisted in browser storage.
3. Empty states distinguish a new account from a day without scheduled habits. Optional reading, water and walking templates only prefill names; nothing is created automatically.
4. Creation puts name and the existing weekday selector first, then optional goals and collapsed personalization. Save stays at the bottom.
5. Name, weekday and target errors appear beside their fields and move focus to the invalid field.
6. Email resend has a countdown, supports correcting the address, and clears passwords after registration. The server enforces a recipient cooldown for confirmation and password reset.
7. Completion statistics remain first. Monthly quantity totals and the final calendar share a preceding month selector; quantity calculation details are collapsible.
8. Completion, quantities, habit saving and email resending use local pending states rather than blocking the entire application.

Security review: recipient keys are hashed in memory, reservations are atomic, rejected requests do not extend the cooldown, and known/unknown addresses receive the same cooldown status. Existing CSRF, authorization, parameterized EF queries and request limits remain in force. Retry snapshots and cache writes are bound to the account. Template values use a fixed whitelist. No new database migration is required. The in-memory cooldown resets on restart and is not distributed; existing endpoint/IP limits remain necessary. This does not eliminate all email timing/account-enumeration risks.

Validation: backend regression suite; existing Node frontend tests; new Vitest/jsdom interaction tests; production build; ESLint; dependency vulnerability checks. Component tests simulate requests and are not a real-browser visual audit. Real Google sign-in, email delivery and production accounts are not exercised or modified.

## Español

Esta mejora pendiente de publicar cubre los ocho puntos revisados:

1. Las cantidades escritas se conservan si falla el guardado. Reintentar conserva identificador, fecha, revisión y cuenta; los conflictos obligan a revisar el total actual.
2. Se pide confirmación al salir de formularios modificados o registros inciertos. Descartar una actualización permite una sola recarga sin repetir la confirmación. No se guardan borradores en el navegador.
3. El primer uso se distingue de un día sin hábitos programados. Los ejemplos opcionales solo rellenan el nombre y no crean hábitos automáticamente.
4. El formulario prioriza nombre y el selector de días existente, seguido de meta opcional y personalización desplegable. Guardar queda al final.
5. Los errores se muestran junto al campo correspondiente y reciben el foco.
6. El reenvío de correo tiene cuenta regresiva y permite corregir la dirección. Se limpian las contraseñas después del registro. El servidor aplica también la espera por destinatario.
7. Se conserva el progreso de finalizaciones primero. El selector mensual controla cantidades y calendario; el calendario permanece al final.
8. Completar, registrar cantidades, guardar hábitos y reenviar correos muestran cargas locales.

La revisión de seguridad cubre reintentos, aislamiento entre cuentas, borradores, plantillas y límites de correo. Los destinatarios se identifican mediante hashes en memoria, las reservas son atómicas y los rechazos no prolongan la espera. El límite responde igual para correos existentes y desconocidos. Se mantienen los controles previos de CSRF, autorización y consultas parametrizadas. El límite en memoria se reinicia con el servidor y no es distribuido; no elimina todos los riesgos de diferencias de tiempo al consultar cuentas. No requiere migración.

Se validan pruebas del backend, pruebas existentes del frontend, interacciones con Vitest/jsdom, compilación, ESLint y dependencias. No sustituye una prueba visual en un navegador real. No se envían correos reales ni se modifican cuentas de producción durante estas pruebas.
