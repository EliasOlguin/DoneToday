# Google Analytics 4 en las portadas

La integración mide únicamente las portadas públicas en inglés, español y alemán. No se carga en la aplicación privada, el inicio de sesión, la recuperación de contraseña ni la API. No usa Google Tag Manager como contenedor: carga directamente la etiqueta de GA4 mediante un script local, sin scripts inline ni nuevas dependencias npm.

La versión 1.5.0 está configurada con el ID público `G-79Y4QZQGGF`, proporcionado por el propietario. La etiqueta real generó un `page_view` con el ID esperado y la URL sin consulta ni fragmento en la prueba local; se interceptó la recopilación antes de enviarla para no registrar visitas de prueba. Pasaron 192 pruebas .NET sin omisiones con PostgreSQL descartable, 63 pruebas Node, 41 de interfaz, 8 de SEO, lint y compilación. La confirmación de recepción en Tiempo real y la configuración del flujo siguen requiriendo la cuenta del propietario.

## Activación

1. En [Google Analytics](https://analytics.google.com/), crear o elegir una propiedad GA4 y agregar un flujo **Web** para `https://donetoday.eliasolguin.dev`. Se puede crear con la misma cuenta de Google que Search Console; son servicios separados.
2. En **Administrar → Flujos de datos → Web → Detalles del flujo**, copiar el **ID de medición**, que empieza con `G-`. Es un identificador público, no una contraseña ni una clave privada. No se necesita un secreto de Measurement Protocol ni una cuenta de servicio.
3. En el flujo, desactivar **Medición mejorada** para conservar únicamente los eventos explícitos y evitar recopilación automática de formularios, URLs o eventos adicionales. Mantener desactivados Google Signals, recopilación de datos proporcionados por usuarios y personalización publicitaria; no vincular Google Ads para esta integración. En la propiedad, configurar la retención mínima que resulte útil para este análisis.
4. Escribir ese ID en `DoneToday.Web/public/analytics-config.json`, campo `measurementId`, y publicar normalmente por Git. No hace falta SSH, cambiar Docker ni agregar variables privadas al servidor. Vacío, inválido o inaccesible significa Analytics desactivado y sin banner.
5. Comprobar el dominio público una vez desplegado. Sin aceptar no debe existir ninguna petición a Google Analytics o a Google Tag Manager. Aceptar estadísticas y comprobar una sola carga de `gtag/js`, un evento `page_view` y el informe **Tiempo real** de Analytics. Al pulsar para entrar en la app se envía `open_app`; es intención de entrada, no una cuenta creada ni un hábito registrado.

## Consentimiento y datos

Se utiliza el enfoque básico de consentimiento: antes de aceptar y tras rechazar no se descarga código de Google ni se envían pings sin cookies. Aceptar y rechazar tienen botones de igual estilo, sin impedir el acceso al sitio. El aviso y el botón de preferencias se traducen según la portada; respetan el tema claro/oscuro. Desde el pie se puede reabrir la elección. Rechazar después de aceptar desactiva la etiqueta, borra las cookies `_ga` de este host y recarga el documento para detener sus tareas. Otra pestaña abierta también atiende la revocación.

La elección se guarda en almacenamiento local durante 180 días. Si está bloqueado, la elección vale solo en ese documento. Las cookies de análisis se limitan al host actual, con vencimiento de 180 días sin actualización automática. Los consentimientos publicitarios permanecen denegados.

Los eventos propios son `page_view` y `open_app`, con idioma y URL canónica de la portada. Se eliminan consultas y fragmentos de la URL, y del referente se conserva solo su origen. No se envían nombres de hábitos, correos, identificadores de cuenta, tokens ni texto introducido por usuarios. Google recibe los datos técnicos habituales de una petición de Analytics después de aceptar; este diseño no hace que las visitas aceptadas sean anónimas ni evita por sí solo todas las transferencias de datos. La configuración de la propiedad debe coincidir con el uso descrito en el aviso. No se promete cumplimiento legal automático.

No aceptar o usar bloqueadores hará que parte de las visitas no aparezcan en Analytics. Los clics rápidos al salir también pueden perderse. Analytics mide comportamiento de visitantes que consienten; no mejora posiciones de búsqueda ni reemplaza los datos de consultas e impresiones de Search Console. La verificación definitiva de recepción en la propiedad requiere el ID real y acceso del propietario a Tiempo real.

## Seguridad y comprobaciones

La CSP permite los dominios de carga y recopilación de Google únicamente en las rutas de portada. Las pantallas privadas conservan la CSP previa. No se habilitan `unsafe-eval` ni scripts inline. La configuración se solicita al mismo origen y se valida antes de cargar la etiqueta.

Las pruebas se escribieron y ejecutaron con fallo antes de implementar: ausencia de peticiones/etiqueta antes del consentimiento, aceptación única, datos de página saneados, persistencia/vencimiento, rechazo y revocación, fallos de almacenamiento/configuración, exclusión de rutas privadas, artefactos de los tres idiomas y CSP real por ruta. Ejecutar los controles indicados en `AGENTS.md` antes de publicar.

Fuentes: [ID de medición](https://support.google.com/analytics/answer/9539598), [consentimiento básico y avanzado](https://developers.google.com/tag-platform/security/concepts/consent-mode), [configuración GA4](https://developers.google.com/analytics/devguides/collection/ga4/reference/config), [pageviews y duplicados](https://developers.google.com/analytics/devguides/collection/ga4/views), [dominios CSP](https://developers.google.com/tag-platform/security/guides/csp).
