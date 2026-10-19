# Informe de correcciones de seguridad — DoneToday

Fecha: 19 de octubre de 2026. Alcance: cambios locales de autenticación e invitados, sin despliegue ni operaciones sobre bases reales de usuarios.

## Resultado

Se corrigieron los cinco hallazgos de la auditoría y se incorporaron las protecciones adicionales de borrado, retención y creación de invitados. Las pruebas verifican los flujos contra Identity y PostgreSQL reales en bases descartables. El ID del usuario se conserva al convertir al invitado, por lo que sus hábitos y progreso mantienen su propietario.

No se requiere migración de esquema ni se agregaron dependencias. Las verificaciones operativas de infraestructura y la interacción con Google real se indican al final; no se presentan como ya realizadas.

## 1. Registro pendiente y confirmación segura

**Antes:** escribir un email y una contraseña convertía inmediatamente al invitado. La sesión seguía activa sin verificar el email y permitía preparar vinculaciones externas. Una persona podía confirmar, por error, credenciales elegidas por otra.

**Ahora:** solicitar el registro conserva al usuario como invitado. Su email interno, contraseña activa y datos permanecen iguales. La contraseña propuesta se transforma inmediatamente en un hash; nunca se guarda en texto legible. El hash y los datos de la solicitud se cifran y autentican con ASP.NET Data Protection para una operación temporal de una hora.

Hay dos pruebas diferentes: el navegador conserva una cookie HttpOnly/Secure con los datos pendientes y un secreto aleatorio; el buzón recibe otro código protegido. Los códigos usan propósitos criptográficos distintos: copiar la cookie pendiente y presentarla como enlace de email no sirve. Para completar la conversión deben coincidir el enlace, el invitado autenticado, su sello de seguridad y el secreto del navegador de origen. El enlace solo no puede apropiarse de los hábitos de otra sesión. Empezar otra solicitud sustituye el secreto y deja sin efecto la anterior en ese navegador.

Cuando se confirma, una transacción PostgreSQL bloquea la conversión del usuario y vuelve a cargarlo. Se comprueban otra vez las condiciones, se valida que el email no pertenezca a otra cuenta, se asigna el hash, se confirma el email y se rota el sello de seguridad. Recién al confirmar se guarda la identidad definitiva. Se elimina la información temporal y se emite una sesión nueva. Dos confirmaciones simultáneas producen un éxito y un rechazo; no duplican ni trasladan datos. Los índices únicos de Identity y su control de concurrencia aportan una segunda protección.

El registro normal también se reforzó: la pantalla de confirmación exige la contraseña elegida al registrarse. El token de email se valida antes de consumir intentos de contraseña. Esto impide que confirmar un correo aislado active credenciales que el destinatario no conoce y evita usar códigos falsos para bloquear contraseñas. Confirmación y revocación se guardan en una transacción.

**Google:** las cuentas locales sin email confirmado ya no pueden iniciar ni completar una vinculación. El challenge dura cinco minutos y queda ligado al sello de seguridad actual. El callback comprueba el mismo usuario y sello antes y después del bloqueo de base. Logout, otra conversión o cambios de credenciales invalidan el challenge anterior. Un invitado puede convertirse directamente con el email verificado de Google, conservando su ID. Esa conversión invalida una confirmación local que hubiese quedado pendiente. Las cuentas existentes no se combinan.

Archivos: `DoneToday/Services/GuestRegistration.cs`, `Controllers/AuthController.cs`, `Controllers/ExternalAuthController.cs`, `DoneToday.Web/src/components/GuestRegistration.tsx` y `pages/ConfirmEmailPage.tsx`.

## 2. Revocación y duración de las sesiones

**Antes:** logout borraba la cookie del navegador, pero una copia seguía funcionando. La renovación podía mantenerla vigente indefinidamente.

**Ahora:** logout cambia el security stamp del usuario antes de cerrar la cookie. Identity comprueba ese sello en cada solicitud; las copias anteriores dejan de autenticar. Se mantiene el mecanismo de Identity existente, sin introducir un almacén propio de sesiones.

**Efecto visible:** cerrar sesión cierra las sesiones de esa cuenta en todos los dispositivos. Es una decisión deliberada de esta implementación. Si más adelante se quiere cerrar un dispositivo conservando los demás, habrá que añadir sesiones revocables individuales.

Las cookies siguen persistiendo al cerrar el navegador y mantienen una ventana renovable de 30 días. Además guardan una fecha de inicio protegida que no cambia al renovar. A los 90 días desde la autenticación se exige un nuevo acceso, incluso si la app se utilizó todos los días. Una conversión verificada o un nuevo login sí inician una sesión nueva.

Las cookies anteriores a esta versión adoptan una sola vez su fecha de emisión existente. Así reciben un plazo máximo sin expulsar de golpe a invitados que no podrían volver a entrar. Esa fecha ya no se vuelve a mover con renovaciones.

La interfaz avisa al invitado que debe vincular su cuenta antes de cerrar sesión, borrar cookies o dejar vencer el acceso. Pide una confirmación antes de cerrar una sesión de invitado.

Archivo principal: `DoneToday/Services/SessionSecurity.cs`. Se conecta desde `IdentitySetup.cs`.

## 3. Respuestas uniformes y protección del destinatario

**Antes:** la conversión respondía 409 si el email existía; permitía descubrir cuentas ajenas. Además omitía el límite de correo por destinatario.

**Ahora:** preparar la conversión no consulta si el email existe. Un email nuevo y uno existente recorren la misma validación, cifrado, envío y respuesta HTTP. La existencia solo se resuelve al presentar las pruebas necesarias para completar la conversión. Los fallos de entrega de confirmación también mantienen una respuesta genérica y se registran por tipo de error, sin email, contraseña ni token en el log añadido.

El registro de invitado y su reenvío usan el mismo presupuesto de confirmación que las demás rutas: una reserva por minuto y un máximo de diez por destinatario y propósito en una ventana de 24 horas. Las direcciones se normalizan y se usa su hash como clave. Borrar o recrear al usuario no elimina ese presupuesto, porque no está asociado a la fila del usuario. Se devuelve Retry-After y el cliente respeta hasta 24 horas de espera.

**Límite operativo:** los presupuestos y contadores de frecuencia siguen en memoria, adecuados a la única instancia documentada. Un reinicio los restablece; no son una garantía durable de diez mensajes diarios entre reinicios ni un límite compartido entre varias instancias. Antes de escalar deben moverse a un almacén compartido y persistente. La unicidad, propiedad, revocación y capacidad global de invitados sí se comprueban en PostgreSQL.

Archivos: `AuthController.cs`, `Services/Email/RecipientEmailThrottle.cs` y `DoneToday.Web/src/hooks/useEmailResend.ts`.

## 4. Límites antes de consultar Identity

**Antes:** las peticiones rechazadas por exceso ya habían pasado por la comprobación del sello de seguridad y podían haber consultado PostgreSQL.

**Ahora:** un limitador temprano se ejecuta antes de autenticación: hasta 32 solicitudes dinámicas simultáneas y 300 por minuto por IP. Al rechazar una solicitud no llama al siguiente middleware, por lo que Identity no llega a procesarla. También cubre rutas dinámicas fuera de `/api`.

Después de autenticar se conservan los límites por usuario y las políticas de autenticación. Los archivos estáticos siguen su recorrido de servicio habitual. `/health` se responde sin pasar por Identity, incluso si recibe una cookie, para que las comprobaciones de salud no se conviertan en una vía de consultas ilimitadas a la base.

Archivos: `Services/EarlyRequestLimiter.cs`, `Services/ApiSecurity.cs` y `Program.cs`.

## 5. Borrado, retención y capacidad de invitados

Se agregó `POST /api/profile/guest/delete`. Requiere sesión del invitado, CSRF y `confirm=true`. El servidor vuelve a comprobar que no tenga contraseña ni accesos externos. La interfaz pide una segunda acción explícita. La eliminación usa Identity y los borrados en cascada existentes; después se cierra la sesión y se limpia la caché privada del cliente. Una cuenta registrada no puede usar este endpoint para evitar su reautenticación habitual.

Un servicio en segundo plano elimina invitados sin vincular con más de 120 días desde su creación. Se ejecuta al iniciar y una vez al día mientras la app está activa; si el alojamiento duerme, la limpieza se retoma al despertar. La consulta excluye usuarios confirmados, usuarios con contraseña y usuarios con accesos externos. El DELETE conserva sus condiciones en la base para no borrar una cuenta que ya se convirtió. Se registra solo la cantidad eliminada.

La creación tiene un límite específico de cinco invitados por hora por IP y un máximo global de 5.000 invitados sin vincular. El recuento global y la creación están serializados mediante bloqueo de transacción PostgreSQL, para que solicitudes simultáneas no superen la capacidad. Se conserva la cuota de 200 hábitos por cuenta ya existente. Los límites reducen acumulación y abuso; no sustituyen una defensa de infraestructura contra ataques distribuidos.

La interfaz explica en español, inglés y alemán la diferencia entre perder acceso al invitado y borrar sus datos: la sesión tiene un máximo de 90 días; la retención del invitado es de 120 días desde su creación. Vincularlo lo excluye de esa limpieza.

Archivos: `Services/GuestLifecycle.cs`, `Controllers/ProfileController.cs`, `DoneToday.Web/src/components/GuestDeletion.tsx` y `pages/SettingsPage.tsx`.

## Pruebas y resultados

| Verificación | Resultado |
| --- | --- |
| Backend, incluyendo PostgreSQL | 127 aprobadas; ninguna omitida |
| Interfaz | 17 aprobadas |
| Traducciones | 9 aprobadas |
| Eventos y caché de sesión | 8 aprobadas |
| Compilación frontend y lint | Aprobados |
| npm audit, incluidas dependencias de desarrollo | Cero vulnerabilidades conocidas |
| NuGet, app y pruebas, incluyendo transitivas | No informó paquetes vulnerables; restore del índice completado sin el fallo previo |

Los ocho casos de integración nuevos usan servidores HTTP locales, Identity real y nueve bases PostgreSQL creadas con nombres aleatorios `donetoday_security_*`. No usan ni borran cuentas de desarrollo o producción. Los correos quedan capturados en memoria y Google se simula mediante cookies externas firmadas por el host de prueba. Se verificaron:

- Conversión pendiente sin cambiar la identidad ni activar contraseña; rechazo del código desde otro navegador y otro invitado.
- Conversión correcta con el mismo ID y hábitos; rechazo de acceso desde otro usuario, del token repetido y de la cookie anterior.
- Confirmaciones simultáneas: una sola acepta y conserva un único propietario.
- Mismo resultado para email existente y nuevo; borrado/recreación no reinicia el presupuesto del destinatario.
- Logout rechaza la cookie copiada. Renovaciones a los días 29, 58 y 87 funcionan; al día 91 se rechaza el acceso.
- Rechazo de vinculación Google para cuentas locales no confirmadas y de challenges anteriores al logout; conversión Google invalida el enlace local pendiente.
- Confirmación normal exige la contraseña elegida y revoca sesiones anteriores.
- Borrado del invitado elimina sus hábitos; retención excluye invitados recientes y cuentas convertidas. El sexto invitado por IP/hora y las creaciones por encima de la capacidad global se rechazan.

Las pruebas unitarias cubren además alteración del código, separación de propósitos de cifrado, vencimiento, cambio de sello, sustitución del secreto, límite diario y rechazo temprano sin ejecutar autenticación. Las pruebas de interfaz comprueban la acción explícita de confirmación, la permanencia como invitado mientras está pendiente y la confirmación de borrado con limpieza de caché.

Para repetir las pruebas de base hay que proporcionar deliberadamente un PostgreSQL descartable en loopback:

```powershell
$env:DONETODAY_SECURITY_TEST_CONNECTION = 'Host=127.0.0.1;Port=55439;Database=postgres;Username=audit'
dotnet test DoneToday.Tests/DoneToday.Tests.csproj
```

Sin esa variable, solo los casos de PostgreSQL se omiten de forma explícita. El host rechaza conexiones de integración que no apunten a loopback y a la base administrativa `postgres`; únicamente crea y elimina sus bases con prefijo de prueba.

## Publicación y verificaciones pendientes

Los cambios están preparados y probados localmente. No se hicieron commit, push ni despliegue. No se modificó la base real ni se ejecutó la limpieza sobre datos de usuarios. No hay migración nueva de esquema.

Antes de publicar debe comprobarse el flujo Google con las credenciales y el dominio reales, así como la entrega real de correo. La simulación prueba las decisiones del callback, pero no la configuración de consentimiento, redirect URI o cuenta del proveedor.

La revisión anterior dejó condiciones de infraestructura: Render debe ser el único ingreso confiable y normalizar los encabezados de proxy; deben revisarse permisos del rol de PostgreSQL, secretos y copias de respaldo. No se cambió ni se verificó esa infraestructura en esta tarea. Los contadores en memoria conservan la restricción de una instancia descrita arriba.

Referencias de diseño: [API oficial de Data Protection](https://learn.microsoft.com/en-us/aspnet/core/security/data-protection/consumer-apis/overview?view=aspnetcore-10.0), [Identity y su validación de sesiones](https://github.com/dotnet/aspnetcore/blob/v10.0.0/src/Identity/Core/src/SecurityStampValidator.cs), [OWASP: revocación y vencimiento de sesiones](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html#session-expiration).
