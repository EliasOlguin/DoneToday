# Auditoría de dependencias y despliegue — 2026-10-31

## Estado tras la corrección adicional

Las 12 alertas de desarrollo descritas en la primera revisión quedaron resueltas con un override acotado: `minimatch@10.2.6` se sustituye por **11.0.3**. `npm audit` completo devuelve **0 vulnerabilidades detectadas**, incluidas dependencias de desarrollo. Las secciones originales siguientes conservan los resultados y la decisión de la primera revisión.

ESLint 10.14.0, `@eslint/config-array` 0.23.5 y typescript-eslint 8.72.1 todavía solicitan la rama 10. El override cruza un major de esa dependencia transitiva; se revisaron las APIs consumidas (`Minimatch`, `minimatch` y sus opciones) y se validó el tooling del proyecto con Node 24. La versión 11.0.3 declara soporte para Node 18, 20 y >=22, CommonJS y ESM. El override solo afecta a 10.2.6, no fuerza otras ramas presentes o futuras. Retirarlo cuando los consumidores adopten una versión corregida y repetir auditoría y lint; si se incorpora otra versión vulnerable, revisar el selector. No se deshabilitaron avisos ni se usó `audit fix --force`.

Validación de la corrección: `npm ci` reproducible, `npm audit` sin avisos, `npm ls minimatch` con los tres consumidores en 11.0.3, lint y build correctos, 52 tests Node y 31 UI correctos. ESLint conserva los mismos 100 archivos analizados y rechaza una variable sin usar introducida por stdin como prueba negativa; no se guardó ese código de prueba. No se modificó backend. En la revisión posterior se repitieron auditoría NuGet y tests .NET: sin paquetes vulnerables detectados, 133 tests correctos y 20 omitidos por falta de PostgreSQL desechable. Se mantiene la versión 1.2.3 pendiente: es mantenimiento del tooling.

## Alcance y resultado

Revisión local del repositorio DoneToday: React/Vite/TypeScript, ASP.NET Core/EF Core/Npgsql, Docker, CI, configuración de proxy y documentación. Se consultaron npm, NuGet y avisos públicos. No se accedió al home server ni se modificaron producción, DNS, secretos, OAuth o datos. Los informes anteriores describen el hosting de su fecha; sus referencias a Render se conservan como evidencia histórica.

Dominio actual indicado por el propietario: **https://donetoday.eliasolguin.dev**, alojado en su notebook/home server. READMEs y guía principal actualizados; guía anterior archivada en `deployment-render-legacy.md`. El blueprint de Render está marcado como alternativa histórica. La guía nueva especifica `Authentication__FrontendUrl` y el callback `/signin-google`, sin asumir ubicación de PostgreSQL ni proveedor de correo.

## Dependencias frontend

Versiones efectivas del lockfile antes/después; `npm update` mantiene los rangos compatibles declarados. Vite y Prettier tienen pins explícitos actualizados. TypeScript conserva la rama 6 y los tipos de Node la rama 24.

| Paquete | Antes | Después |
| --- | --- | --- |
| `react` | 19.3.0 | 19.3.1 |
| `react-dom` | 19.3.0 | 19.3.1 |
| `vite` | 8.3.3 | 8.3.5 |
| `typescript` | 6.0.3 | 6.0.3 |
| `@tanstack/react-query` | 5.104.1 | 5.105.0 |
| `react-router` | 8.4.0 | 8.5.1 |
| `i18next` | 26.4.4 | 26.5.12 |
| `react-i18next` | 17.0.16 | 17.1.9 |
| `i18next-browser-languagedetector` | 8.2.1 | 8.2.4 |
| `eslint` | 10.12.0 | 10.14.0 |
| `typescript-eslint` | 8.71.1 | 8.72.1 |
| `prettier` | 3.9.9 | 3.9.10 |
| `zod` | 4.6.5 | 4.6.7 |
| `minimatch` | 10.2.6 | 10.2.6 |

### Vulnerabilidades

- Auditoría inicial: **13 paquetes afectados: 1 alerta alta y 12 moderadas**, sin críticas. Los 12 avisos moderados son propagación de un único problema de minimatch a sus consumidores, no doce fallos independientes.
- **Corregida:** Zod, consumo excesivo de memoria, [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5). La dependencia transitiva de las herramientas de lint queda en 4.6.7; el aviso marca corregido desde 4.6.6.
- **Pendiente:** minimatch 10.2.6, amplificación de patrones glob y denegación de servicio, [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249). El aviso exige 11.0.1. ESLint 10.14.0 y typescript-eslint 8.72.1 todavía resuelven la rama 10. Un override a 11 cruza un major de una dependencia transitiva fuera del contrato de sus consumidores; no se aplicó como actualización compatible. Seguir los parches upstream y evitar patrones/configuraciones de lint no confiables. `npm audit fix --force` propone retrocesos incompatibles y no se ejecutó.
- Auditoría posterior: **12 moderadas, 0 altas, 0 críticas**. `npm audit --omit=dev`: **0 vulnerabilidades**. El hallazgo residual pertenece al tooling de desarrollo, no al árbol de producción del frontend. Esto no demuestra ausencia de fallos desconocidos.

## Backend y PostgreSQL

| Componente | Cambio |
| --- | --- |
| Microsoft ASP.NET Core/Identity/OpenAPI/EF Core y PKCS | 10.0.13 → 10.0.14 |
| Criptografía XML de tests | 10.0.13 → 10.0.14 |
| MailKit | 4.18.1 → 4.18.2 |
| Swashbuckle.AspNetCore | 10.2.3 → 10.3.1 |
| Docker ASP.NET runtime | 10.0.13 → 10.0.14 |
| SDK/global.json/Docker SDK | Se conserva 10.0.402 |
| Npgsql.EntityFrameworkCore.PostgreSQL | Se conserva 10.0.3, sin actualización estable señalada por NuGet |

`dotnet list DoneToday.slnx package --vulnerable --include-transitive` no detecta paquetes vulnerables antes ni después. La solución incluye la aplicación y tests; las utilidades de `tools` referencian la aplicación y no declaran paquetes propios. Los majors nuevos de coverlet, Microsoft.NET.Test.Sdk y el runner de xUnit se dejan fuera de esta actualización compatible.

[Microsoft publica .NET 10.0.14 como parche de seguridad](https://dotnet.microsoft.com/en-us/download/dotnet/10.0). Actualizar paquetes no actualiza el runtime instalado: este equipo ejecuta 10.0.13 y el runtime real del home server no se ha comprobado. Reconstruir la imagen con `--pull` o actualizar .NET 10 en el host si el despliegue es nativo.

La versión del **servidor PostgreSQL** no aparece fijada en el repositorio. No se puede determinar su estado de parches ni vulnerabilidades sin consultar la instancia. Npgsql es el cliente/proveedor, no el servidor. Confirmar versión, mantenimiento de la rama, autenticación, TLS, permisos del rol y restauración de backups en el home server.

## Revisión de controles y pendientes operativos

- Se verificó en código el orden de forwarded headers antes de HTTPS/autenticación, cookies Secure/HttpOnly, HSTS, CSP, limitación de cuerpos y peticiones, SQL interpolado parametrizado y cifrado del key ring de Data Protection en PostgreSQL.
- **Condición relevante de despliegue:** `ProductionHosting.ConfigureForwarding` vacía las listas de confianza; sin `Forwarding__KnownProxies` acepta cualquier peer. Se documentó la necesidad de configurar los proxies reales y aislar el puerto de la API. El comportamiento no se cambió sin conocer la topología; el comentario ya no presupone Render. Si la API fuese accesible directamente, las cabeceras falsas podrían afectar esquema/IP y límites por IP. Verificar con peticiones propias desde dos redes.
- `/health` devuelve estado del proceso; no consulta PostgreSQL. Usar monitorización adicional de base de datos.
- Los límites de intentos en memoria se reinician con el proceso y no se comparten entre instancias. Confirmar el rol PostgreSQL restringido, migraciones separadas, certificado persistente, backups fuera de la notebook y disponibilidad/energía del equipo. Las verificaciones anteriores de Neon/Render no acreditan la nueva infraestructura.

## Validación realizada

| Comando | Resultado |
| --- | --- |
| `npm ci` | Instalación reproducible del lockfile correcta |
| `npm run lint` | Correcto |
| `npm run build` | TypeScript y Vite correctos |
| `npm test` | 52 tests Node + 31 tests UI en 5 archivos, todos correctos |
| `dotnet test DoneToday.slnx -c Release` | 133 correctos, 20 omitidos, 0 fallos |
| `dotnet publish DoneToday/DoneToday.csproj -c Release --no-restore` | Correcto; salida local ignorada por Git |
| Auditoría NuGet con transitivas | Sin paquetes vulnerables detectados |
| Auditoría npm de producción | Sin vulnerabilidades detectadas |

Los 20 tests omitidos requieren `DONETODAY_SECURITY_TEST_CONNECTION` a un PostgreSQL desechable con permisos para crear bases; no se configuró ni se usó la conexión de producción. No se ejecutó build Docker ni escaneo del SO de la imagen; se verificaron build frontend y publish nativo. No se probaron entrega real de correo, TLS público, DNS, OAuth ni recuperación de backups del home server.
