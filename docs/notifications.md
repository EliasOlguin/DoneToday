# Notificaciones de DoneToday

## Etapas implementadas

1. **Avisos diarios.** Configuración → Notificaciones permite activar cada dispositivo, enviar una prueba, eliminar dispositivos y elegir avisos de inicio del día o pendientes. Ambos están apagados por defecto. No se envía el primero en días sin hábitos; el segundo solo se envía si quedan hábitos pendientes.
2. **Recordatorios por hábito.** El detalle de un hábito permite elegir una hora para sus días programados, hasta tres recordatorios activos por cuenta. «Recordarme en 30 minutos» reemplaza la hora de ese día o crea un seguimiento si el recordatorio original ya se envió. Se permite una posposición por hábito/día y se rechaza si cruza la medianoche de la cuenta, el hábito no está programado o ya está completado. Los archivados no generan avisos.
3. **Seguimiento opcional.** Resumen push de la semana completa anterior (lunes a domingo), día/hora a elección; horarios de silencio; pausa hasta una fecha inclusiva, máximo 90 días; nombres de hábitos ocultos por defecto. Estos controles se guardan juntos en Configuración. El idioma de envío se guarda al guardar las preferencias o un recordatorio; no se cambia por abrir la app en otro dispositivo con otro idioma.

Los horarios usan la zona IANA de la cuenta. En el salto de primavera se usa el primer minuto válido; en la hora repetida de otoño se usa únicamente la primera ocurrencia. Si no hay zona guardada, se usa UTC. Un aviso fuera de su ventana de 15 minutos se descarta, también si el home server estuvo apagado. No se recuperan avisos de días anteriores. Silencio y pausa descartan avisos programados; una prueba solicitada explícitamente no queda bloqueada por esos ajustes.

## Activación en el home server

El código se puede desplegar con `Push__Enabled=false` (valor por defecto): no inicia el worker ni consulta tablas nuevas al abrir la sección deshabilitada. **Un push de Git no configura las claves privadas ni aplica por sí mismo las migraciones**, a menos que el despliegue del servidor tenga esos pasos explícitos.

1. Hacer una copia de seguridad de PostgreSQL y conservar el certificado y las claves de Data Protection existentes.
2. Aplicar las migraciones con la conexión de propietario y la configuración de producción habitual mediante `dotnet DoneToday.dll --migrate-only`, antes de habilitar Push. Son `AddDailyNotifications`, `AddHabitReminders` y `AddNotificationFollowUp`. También está preparado el [SQL idempotente revisable de 1.4.0](sql/notifications-1.4.0.sql), para una base que ya tenga las migraciones anteriores. La conexión del proceso web sigue siendo la de runtime. Revisar los permisos sobre tablas/secuencias nuevas con [runtime-role.sql](sql/runtime-role.sql); los permisos por defecto deben pertenecer al rol que aplica las migraciones.
3. Crear las claves **una vez**, en un directorio privado fuera del repositorio, de OneDrive y de `wwwroot`. Con la aplicación publicada:

   ```text
   dotnet DoneToday.dll --create-push-settings /ruta/privada/donetoday-push.env mailto:tu-contacto@tu-dominio
   ```

   Sustituir la ruta y el contacto por valores reales. En Windows se puede usar una ruta bajo el perfil privado local del usuario. El comando no necesita conexión a la base ni certificado de producción, no imprime las claves, no sobrescribe un archivo existente y crea modo 0600 en Unix. En Windows hereda la ACL del directorio privado. El archivo nace con el envío apagado.
4. Cargar ese archivo mediante el gestor del servicio o `--env-file` de Docker. No copiarlo al repositorio, a una imagen pública ni a logs. Las variables son:

   | Variable | Uso |
   | --- | --- |
   | `Push__Enabled` | Cambiar a `true` después de migrar y configurar las claves |
   | `Push__Subject` | Contacto VAPID `mailto:` o URL HTTPS |
   | `Push__PublicKey` | Clave pública generada, compartida con el navegador |
   | `Push__PrivateKey` | Clave privada generada, solo en el servidor |

5. Reiniciar el servicio conservando el resto de su entorno. Verificar que `/push-worker.js` devuelve JavaScript sobre HTTPS y no una portada HTML, y que el proxy no lo bloquea ni lo almacena indefinidamente.
6. Entrar con una cuenta confirmada → Configuración → Notificaciones → Activar en este dispositivo. Aceptar el permiso del navegador y usar «Enviar una notificación de prueba». El worker no se registra ni pide permiso al visitar la portada o abrir la app.
7. Probar en un teléfono real con la app en segundo plano, y revisar luego un horario programado. En iPhone/iPad se necesita abrir DoneToday desde su icono en la pantalla de inicio antes de activar el permiso. No se ha verificado recepción en un teléfono real en estas pruebas de desarrollo.

No rotar las claves VAPID de forma rutinaria: las suscripciones están vinculadas a la clave pública. Si hay que rotarlas, cada navegador debe reactivar las notificaciones; la activación detecta la clave nueva y reemplaza la suscripción anterior. Conservar también las claves de Data Protection, usadas para cifrar las suscripciones almacenadas.

## Entrega y seguridad

- Hasta cinco dispositivos por cuenta confirmada; los invitados no pueden suscribirse. El ID del dispositivo guardado en el navegador no concede permiso de envío ni de gestión sin sesión y CSRF válidos.
- Las suscripciones completas se cifran con Data Protection. Solo se devuelven IDs/fechas propios. Un cambio de cuenta en el mismo navegador exige los secretos de la suscripción para reasociarla. El cambio de marca de seguridad al cerrar sesión o revocar credenciales deja sin autorización a los dispositivos anteriores, que deben reactivarse.
- Solo se admiten endpoints HTTPS estándar de FCM, Mozilla y Apple. No se siguen redirecciones. Se comprueba el punto P-256 y el tamaño del secreto para evitar suscripciones inválidas y solicitudes del servidor a destinos arbitrarios. No se registran endpoints, claves ni texto de mensajes en los avisos del worker.
- La cola usa una clave única por dispositivo/tipo/fecha/hábito, reclamación atómica y una concesión de un minuto. Revalida ajustes, sesión, horario y completado antes del envío. Hay hasta tres intentos, tiempo de espera de 10 segundos y una caducidad corta. Se eliminan suscripciones vencidas (404/410) y entregas de más de 30 días. Los cambios de preferencias cancelan entregas pendientes conservando la marca de deduplicación.
- Web Push no puede garantizar entrega exacta ni «exactamente una vez»: un proveedor puede aceptar un envío y perderse su respuesta. Las notificaciones repetidas usan el mismo `tag` para reemplazarse en el navegador. La disponibilidad y el horario de entrega también dependen de la red, del sistema operativo y del navegador.
- El service worker no guarda páginas ni respuestas privadas en caché. Los enlaces de notificación se restringen al mismo origen y a Hoy, Estadísticas o detalles de hábitos.

## Verificación y desarrollo con tests primero

Cada etapa empezó con tests en rojo antes de implementar su política y componentes. Se comprobaron después contra una base PostgreSQL temporal, separada de los datos del proyecto. El transporte se probó con cifrado VAPID real y respuestas HTTP simuladas; no se enviaron mensajes a dispositivos reales.

```text
dotnet test --configuration Release
```

Para habilitar la integración, usar `DONETODAY_SECURITY_TEST_CONNECTION` apuntando a un PostgreSQL **descartable** en `127.0.0.1` o `localhost`, base administrativa `postgres`, con permiso de crear/eliminar bases. Los tests crean bases con prefijos propios. El CI incorpora PostgreSQL 17 y ejecuta estas pruebas en cada publicación.

Desde `DoneToday.Web`: `npm run lint`, `npm run build`, `npm test`, `npm run test:seo` y `npm run test:notifications`. Las pruebas cubren permiso explícito, negativa del permiso, recuperación de errores, rotación de clave, configuración opt-in, idiomas, enlaces del worker y los controles diarios, semanales y por hábito.

Referencias: [biblioteca WebPush](https://github.com/web-push-libs/web-push-csharp), [Web Push en iOS/iPadOS](https://webkit.org/blog/13878/), [Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API).
