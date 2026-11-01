# Publicación, indexación y primeros visitantes

Dominio preparado: **https://donetoday.eliasolguin.dev**. Estos cambios requieren desplegar una nueva compilación; modificar el repositorio no actualiza el servidor ni envía URLs a Google.

## Qué se publica

Las portadas `/`, `/es/` y `/de/` explican la app en inglés, español y alemán. Contienen HTML completo sin depender de React, imágenes locales, un solo H1, funciones reales, preguntas frecuentes y enlaces para entrar. No redirigen por idioma del navegador: cada traducción tiene su URL, canonical y alternates hreflang, incluido x-default. Los botones conservan el idioma mediante `?lng=`.

`scripts/generate-seo.mjs` es la fuente de contenido y metadatos: regenera los tres `index.html`, `public/robots.txt` y `public/sitemap.xml` antes de compilar o iniciar desarrollo. Para cambiar de dominio, modificar su constante `origin` y ejecutar `npm run build`; actualizar también la configuración de hosting, OAuth y documentación. Cada portada usa una captura real de la aplicación en su propio idioma, incluidos los nombres de los hábitos. Se generaron con datos de demostración y fecha fija; no muestran información de usuarios reales. El diseño conserva los colores, paneles, iconos y personajes de DoneToday. Las imágenes WebP de producto están en `public/screenshots/`; las capturas PNG de las portadas completas y sus vistas móviles están en `docs/previews/`.

Vite compila cuatro entradas HTML. `app.html` conserva la aplicación React; el backend lo sirve para rutas conocidas como `/login`, `/today` y `/habits/123`. Se envía `noindex, follow` tanto en el HTML de la app como en la cabecera HTTP. Las rutas desconocidas devuelven 404 para evitar soft 404. `robots.txt` permite el rastreo para que Google pueda leer el noindex; no es un control de acceso. Los datos privados siguen protegidos por autenticación. El manifiesto abre `/today` al iniciar la app instalada.

La portada usa microdatos `SoftwareApplication`, compatibles con la CSP existente, sin valoraciones inventadas ni promesas de resultados enriquecidos. Las vistas previas sociales usan el icono PNG existente. Las portadas no descargan el JavaScript de React ni incorporan rastreadores. Un pequeño script local aplica el tema antes del primer render, comparte la preferencia `donetoday-theme` con la aplicación y permite alternar claro/oscuro en los tres idiomas. Si no hay preferencia guardada, sigue el sistema. Sin JavaScript el contenido sigue disponible y CSS y `<picture>` adaptan colores y captura al tema del sistema.

## Antes de solicitar la indexación

1. Ejecutar `npm run lint`, `npm run build`, `npm run test:seo` y `npm test` desde `DoneToday.Web`. Ejecutar `dotnet test --filter FullyQualifiedName~SpaHostingTests` desde la raíz. CI verifica los artefactos SEO después de compilar.
2. Desplegar siguiendo [deployment.md](deployment.md), incluyendo **todo** `dist`, con el backend actualizado. El fallback ahora requiere `app.html`; no desplegar solamente uno de los dos componentes. No hace falta una migración de base de datos por estos cambios.
3. Comprobar desde una conexión externa que `/`, `/es/`, `/de/`, `/robots.txt`, `/sitemap.xml` y sus imágenes devuelvan 200 sobre HTTPS. Revisar escritorio y móvil, los idiomas y el acceso por cuenta e invitado. `/today` y `/login` deben servir la app con `X-Robots-Tag: noindex, follow`; una URL inventada debe devolver 404. `/es` y `/de` deben redirigir a sus variantes con barra final.
4. Confirmar que el proxy no añada `noindex`, autenticación adicional o desafíos para bots a las portadas. Mantener el home server accesible con HTTPS válido y la red/proxy estables. Comprobar las redirecciones de HTTP a HTTPS.

## Google Search Console: paso pendiente del propietario

1. Abrir [Search Console](https://search.google.com/search-console). Agregar una propiedad de prefijo de URL `https://donetoday.eliasolguin.dev/`, o usar una propiedad de dominio que ya incluya el subdominio.
2. Verificar la propiedad con el método que indique Google. La verificación DNS requiere acceso al proveedor DNS; no se incluye ningún token ficticio en el repositorio. Si Google proporciona un archivo HTML, colocarlo en `DoneToday.Web/public/` y volver a desplegar antes de verificar.
3. En Sitemaps, enviar `https://donetoday.eliasolguin.dev/sitemap.xml`.
4. Inspeccionar las tres portadas con la prueba de URL publicada. Revisar el HTML que recibe Google y solicitar indexación. No enviar las pantallas de cuenta ni URLs con tokens.
5. Revisar semanalmente Indexación y Rendimiento: páginas indexadas, errores, consultas, impresiones, clics y CTR. Medir cada idioma por separado. Validar rendimiento móvil con [PageSpeed Insights](https://pagespeed.web.dev/) sobre las URLs públicas después del despliegue; no se ha medido aquí el rendimiento del servidor de producción.

Google decide si indexa una página y en qué posición mostrarla. Un sitemap ayuda a descubrirla, pero no garantiza indexación ni mejora de posiciones por sí solo. Ver [sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview), [SEO y JavaScript](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics) y [sitios multilingües](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites).

## Primer mes de difusión

- **Semana 1:** publicar y completar Search Console; enlazar la portada desde el portfolio y los perfiles públicos propios. Usar `/es/` al compartir con público hispanohablante. Compartir capturas y una explicación concreta de para quién sirve.
- **Semana 2:** mostrar un ejemplo útil, como una semana de lectura o estudio, y pedir comentarios a personas que quieran probar una app de hábitos. Compartir en comunidades relevantes siguiendo sus reglas y explicando que sos el autor.
- **Semana 3:** preparar una guía original sobre una necesidad concreta, por ejemplo cómo organizar una rutina de estudio o registrar minutos de lectura. Publicarla como página pública solo cuando aporte contenido propio y ejemplos; enlazarla desde la portada y agregarla al sitemap. Evitar páginas repetidas creadas solo para acumular palabras clave.
- **Semana 4:** revisar consultas e impresiones reales en Search Console y ajustar títulos o explicaciones donde haya una necesidad clara. Priorizar contenido que responda a esas consultas y corregir problemas de acceso o rendimiento detectados.

El punto de partida es posicionar la marca y describir con claridad el seguimiento de hábitos y rutinas. Las expresiones genéricas como «app de hábitos» son una orientación de contenido, no una investigación de volumen ni una previsión de tráfico. La estrategia de contenidos requiere continuidad. No se han creado cuentas externas, enviado publicaciones ni activado analítica en este cambio.
