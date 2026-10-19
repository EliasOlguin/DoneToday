# Auditoría de seguridad — 19 de octubre de 2026

Estado original: **corregir antes de publicar el acceso como invitado**. Los cinco hallazgos se corrigieron después de esta revisión; ver el [informe de correcciones y pruebas](security-remediation-2026-10-19.md). Este documento conserva la evidencia del estado anterior. Un hallazgo de prioridad alta y cuatro de prioridad media. Ninguno demuestra lectura de datos de otros usuarios sin credenciales. Se distingue evidencia ejecutada de análisis estático.

## Alcance y método

Revisión del árbol de trabajo actual, incluidos los cambios sin commit del acceso como invitado. Se revisaron Identity, cookies, CSRF, Google, confirmación y recuperación, 2FA, perfil y borrado, límites de abuso, filtros de propiedad de hábitos y progreso y caché del cliente. No se modificó código de la aplicación durante esta auditoría.

Las reproducciones usan un servidor HTTP en loopback, cookies transmitidas manualmente, Identity real, usuarios en memoria, claves de protección efímeras y credenciales OAuth ficticias. No contactan a Google ni envían correos; la base de datos configurada apunta a un puerto inutilizable y no se consulta. Los endpoints `/audit/*` existen únicamente en este programa de prueba, fuera del proyecto de la aplicación. El estado equivalente a una conversión pendiente se prepara directamente: no se ejecutó la transacción PostgreSQL de `guest/register`.

Programa reproducible local (ignorado por Git): `.local/security-audit/Program.cs`. Ejecutar desde la raíz:

```powershell
dotnet run --project .local/security-audit/Audit.csproj --no-restore -p:UseSharedCompilation=false
```

## 1. [P1 — Alta] La conversión asigna identidad y permite vincular accesos antes de verificar el email

Referencias: `DoneToday/Controllers/AuthController.cs:49`, `:55`, `:196`; `DoneToday/Controllers/ExternalAuthController.cs:55`, `:119`.

`RegisterGuest` reemplaza Email/UserName y agrega la contraseña inmediatamente, deja EmailConfirmed=false y mantiene autenticada la sesión. `LinkGoogle` verifica contraseña y 2FA, pero no exige email confirmado. Su callback puede agregar una identidad Google a ese usuario aunque el email local y el de Google sean diferentes. `Confirm` confirma el email sin revocar las sesiones existentes ni revisar los accesos preparados antes de la confirmación.

Escenario: un atacante crea un invitado, propone el email de una víctima y elige una contraseña que conoce. Puede iniciar la vinculación de su propio Google con esa contraseña. Si completa esa vinculación, solicita un nuevo correo de confirmación porque el callback cambia el security stamp. Si posteriormente la víctima confirma ese registro, activa la identidad preparada por el atacante; el atacante conserva su contraseña y, si completó Google, un acceso externo. Restablecer la contraseña revoca cookies, pero no elimina el acceso Google ya vinculado.

**Condición necesaria:** la víctima debe confirmar explícitamente el registro ajeno. No se ha encontrado un salto de la validación del token ni apropiación de una cuenta existente por mera coincidencia de email.

**Evidencia ejecutada:** el endpoint real `link-google` devuelve el challenge de Google para una cuenta no confirmada; el endpoint real `confirm-email` conserva el security stamp y acepta después la cookie previa. El recorrido OAuth completo y la persistencia del acceso Google se derivan del código; no se probaron con Google real.

**Corrección:** conservar una conversión pendiente separada de la identidad definitiva. Completar la vinculación de email con prueba de posesión y de la intención de registro; bloquear accesos externos en cuentas locales pendientes y evitar activar contraseñas/accesos elegidos por terceros con un clic de confirmación aislado. Al completar, rotar sesiones y emitir una sesión nueva al propietario verificado. La vinculación directa invitado→Google puede seguir usando el email verificado del proveedor.

## 2. [P2 — Media] Logout no revoca la cookie en el servidor y falta una duración absoluta

Referencias: `DoneToday/Controllers/AuthController.cs:131`; `DoneToday/Services/IdentitySetup.cs:32`, `:44`.

Logout solamente invoca SignOutAsync: elimina la cookie del navegador, pero una copia conserva un security stamp válido. La prueba reprodujo `logout → 204` seguido de reutilización de la cookie original en `/me → 200`. Como control, rotar el security stamp produce `/me → 401`.

Además, los 30 días son una ventana renovable, no una duración máxima desde el login. No hay un límite absoluto ni registro de sesiones revocables. Quien ya tenga una copia puede mantener su acceso mediante actividad y obtener cookies renovadas. HttpOnly y Secure reducen vías de robo, pero no revocan una copia obtenida previamente.

**Corrección:** registrar y revocar cada sesión en el servidor; alternativamente, rotar el security stamp al salir, aceptando que eso cerrará las demás sesiones. Guardar una fecha de autenticación original no renovable y exigir autenticación al llegar al máximo establecido. Para invitados, ofrecer vinculación antes de que expire y definir una política de recuperación.

El comportamiento de SignOutAsync y la renovación se contrastó con el [código oficial de Identity](https://github.com/dotnet/aspnetcore/blob/v10.0.0/src/Identity/Core/src/SignInManager.cs). OWASP recomienda [invalidación en servidor y expiración absoluta](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html#manual-session-expiration).

## 3. [P2 — Media] El registro de invitados revela qué emails tienen cuenta

Referencia: `DoneToday/Controllers/AuthController.cs:47`.

`guest/register` devuelve 409 si encuentra el email y una respuesta distinta si no existe. Cualquiera puede crear un invitado y consultar direcciones; no necesita poseer su buzón. Esto elimina la respuesta uniforme que intenta conservar el registro normal. Los límites por IP reducen velocidad, pero no evitan la enumeración distribuida.

**Evidencia:** análisis estático de la rama y de la creación pública de invitados. No se consultaron emails reales.

**Corrección:** responder de forma uniforme para direcciones nuevas y existentes y resolver el siguiente paso a través del buzón. Cuidar también errores de unicidad, contenido y tiempos de respuesta.

## 4. [P2 — Media] La conversión omite el límite de correo por destinatario

Referencias: `DoneToday/Controllers/AuthController.cs:56`, `:172`; `DoneToday/Controllers/ProfileController.cs:35`.

El registro normal reserva el presupuesto `confirm` de RecipientEmailThrottle antes de enviar. La conversión de invitado llama directamente a SendConfirmation. Un actor puede convertir un invitado con un email ajeno, borrar la cuenta usando la contraseña que acaba de elegir y repetir. El borrado no exige email confirmado para cuentas con contraseña. Al recrear el usuario, tampoco hay reserva del presupuesto por destinatario en la conversión.

Los límites por IP y por cuenta siguen aplicándose, pero no reemplazan el presupuesto del buzón: varias IP pueden repetir el ciclo contra el mismo destinatario y consumir correo del proveedor.

**Evidencia:** análisis estático del ciclo; no se ejecutó spam ni borrado de cuentas reales.

**Corrección:** aplicar el presupuesto por destinatario a todas las rutas de envío, incluida la conversión, y conservarlo independientemente del ciclo de vida del usuario. Añadir presupuesto diario y una cola de entrega si el volumen crece.

## 5. [P2 — Media] El límite de solicitudes se aplica después de la consulta de autenticación

Referencias: `DoneToday/Program.cs:70`; `DoneToday/Services/IdentitySetup.cs:32`; `DoneToday/Services/ApiSecurity.cs:32`.

UseAuthentication precede UseRateLimiter y la validación del security stamp se ejecuta en cada solicitud autenticada. Por tanto, las solicitudes con una cookie descifrable llegan a consultar Identity antes de ser rechazadas por IP, cuota de usuario o concurrencia. Un atacante puede conseguir su propia cookie creando un invitado. Repetir solicitudes por encima del límite sigue imponiendo trabajo de autenticación a PostgreSQL; también afecta rutas fuera de `/api`.

**Evidencia:** orden del middleware y comportamiento del validador oficial; no se realizó una prueba de carga ni se cuantificó capacidad de caída. El [validador de Identity](https://github.com/dotnet/aspnetcore/blob/v10.0.0/src/Identity/Core/src/SecurityStampValidator.cs) consulta al usuario antes de validar su sello.

**Corrección:** colocar una protección temprana por IP/concurrencia antes de autenticación, conservando los límites por usuario después. También puede hacerse en el ingress, con una configuración verificable. No reducir la revocación inmediata sin evaluar su efecto.

## Observaciones adicionales

- Los invitados no tienen un flujo de eliminación propio: no poseen contraseña ni Google, pero el borrado de cuentas sin contraseña exige la prueba de Google. Ocultar el botón no resuelve el ciclo de vida de sus datos. Definir eliminación autenticada del invitado y retención/limpieza de cuentas abandonadas. No se encontró una tarea de limpieza.
- Crear invitados requiere CSRF y está limitado a 20 operaciones de autenticación/minuto/IP, pero crea filas persistentes sin verificación. Las cuotas de hábitos son por usuario; rotar invitados permite acumular datos. Conviene una cuota específica y mecanismos de abuso proporcionales al tráfico.
- ProductionHosting vacía KnownProxies/KnownIPNetworks. La confianza en X-Forwarded-For/Proto depende de que Render sea el único ingreso y normalice esos encabezados. No se inspeccionó infraestructura; es una condición operativa pendiente, no un bypass confirmado.
- Los contadores y pruebas de borrado viven en memoria. El diseño documentado presupone una instancia; escalar exige almacenamiento compartido y atómico.
- Las pruebas GuestAccountTests solo cambian propiedades del objeto. No comprueban endpoints, transacciones, confirmación, concurrencia ni propiedad real de los hábitos durante conversión. Añadir pruebas de integración específicas.

## Controles observados y verificaciones

- Cookies HttpOnly/Secure/SameSite=Lax; CSRF en las escrituras revisadas.
- El usuario propietario se toma de la cookie, no de un userId elegido por el cliente. Las consultas revisadas de hábitos/progreso filtran por propietario; no se identificó un IDOR en ese recorrido.
- EF y el bloqueo SQL usan parámetros; no se encontró concatenación SQL explotable en los recorridos revisados.
- La vinculación Google usa state/correlación de Identity y compara el usuario del callback. No combina cuentas por coincidencia de email. Exige email verificado del proveedor.
- Reautenticación en operaciones sensibles, limitación de fallos, 2FA y revocación por cambio de security stamp.
- CSP de producción y `Cache-Control: no-store` para API; no se observó almacenamiento de tokens de autenticación en localStorage.
- Interfaz: **14 pruebas aprobadas** durante esta auditoría.
- Backend: **113 pruebas aprobadas** durante esta auditoría. Su aprobación no cubre los riesgos nuevos descritos.
- Programa aislado: **7 comprobaciones confirmadas**, incluida la reproducción de cookie posterior al logout y el control negativo al rotar stamp.
- `npm audit --json`: **0 vulnerabilidades conocidas**, incluidas dependencias de desarrollo.
- NuGet: el listado no informó paquetes vulnerables, pero una ejecución posterior de restore/build emitió **NU1900** por fallo al consultar api.nuget.org. No se considera cerrada la verificación actualizada de advisories del backend; repetir con acceso estable al índice antes de publicar.

## Límites y orden de corrección

No se auditó producción, permisos de PostgreSQL, secretos desplegados, TLS real, backups ni configuración real de Google/Render. No se hicieron ataques de carga, consultas de cuentas reales ni pruebas de apropiación contra terceros. La revisión no garantiza ausencia de vulnerabilidades.

Prioridad: (1) conversión pendiente y confirmación segura; (2) revocación y duración absoluta de sesión; (3) respuestas uniformes y presupuesto de correo; (4) protección antes de Identity; (5) ciclo de vida de invitados y pruebas de integración. Los hallazgos siguen abiertos: esta auditoría no aplica correcciones al producto.
