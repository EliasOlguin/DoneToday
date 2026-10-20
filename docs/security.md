# Security hardening / Refuerzo de seguridad

## English

The security fixes prepared after the 2026-10-18 audit do not require a database migration. Existing habits and records are preserved. No deployment takes place until these changes are committed, pushed and built by the hosting service.

- Microsoft application packages and the explicit PKCS dependency use 10.0.13. Tests also require the repaired XML cryptography package. Docker uses SDK 10.0.402 and ASP.NET/Core runtime 10.0.13; rebuild with `docker build --pull .`. Keep these patch pins updated. `global.json` requires SDK 10.0.402 or a newer stable .NET 10 feature band. The local development SDK/runtime is separate: check `dotnet --list-runtimes` and install a current .NET 10 SDK if it still lists only 10.0.12.
- SQL remains parameterized. Habit edits check ownership before obtaining a transaction lock. No input is concatenated into executable SQL.
- API requests have a 64 KiB body limit and database commands have a 15-second timeout. Account rate limits are 180 reads/minute and 60 writes/minute; IP limits are 300 API requests/minute. Authentication/reverification retains its shared 20 requests/minute per IP. The API also has a global 32-request concurrency limit; public health checks are excluded. Excess requests return 429, with a retry hint when the limiter provides one.
- Account quotas are 200 habits including archived habits, and 200 quantity ledger entries per habit/local day. Existing data is never deleted to meet a quota. Idempotent retries still work at the ledger limit. Transaction locks prevent concurrent requests from exceeding these quotas. The UI explains quota/rate errors in English, Spanish and German.
- Sensitive operations aggregate reverification failures per account across IPs and actions. Five failures impose a 15-minute cooldown. A correct password alone does not clear failed second factors. Identity lockout is also updated where supported. Only successful completion clears the sensitive-action counter.
- Google-only deletion requires a fresh, correlated Google flow for the provider key already linked to the signed-in account. The callback issues an opaque HttpOnly/Secure/SameSite=Strict cookie valid for five minutes. The server binds it to the account and security stamp and consumes it once. The callback does **not** delete anything: the user returns to Settings and explicitly confirms deletion. Google may reuse its own SSO session; the app requests explicit account selection/consent and does not claim to force Google to ask for a password.
- Production sends CSP (`script-src 'self'`, `frame-ancestors 'none'`, restricted forms including Google), DENY framing, nosniff, no-referrer and disabled camera/microphone/geolocation permissions. Inline styles remain permitted because existing React components use them; inline scripts do not. Development omits the production CSP so Vite can work. All API responses use `Cache-Control: no-store`.
- Create/edit accepts one to seven distinct weekdays, each in the valid enum range. Deletion verification fields have maximum lengths. `.env.*`, private keys and PEM certificates are ignored by Git, while `.env.example` can be committed.

### Verification and operational limits

`dotnet test DoneToday.Tests -c Release` includes real loopback HTTP tests for authorization, CSRF, rate limits, headers, synthetic Google callbacks, wrong-account rejection and one-time deletion. No real Google account, email, password or database is used by these tests. Additional checks use real PostgreSQL in a disposable local container to verify concurrent quotas and retries. Run frontend build, lint and tests as usual. Both application and test projects must pass `dotnet list <project> package --vulnerable --include-transitive`; use `npm audit` for the frontend.

Rate buckets and fresh Google proofs are in memory and designed for the current single Render instance. Restarting loses a pending deletion proof (the user must verify again), which fails closed. Identity lockout and data quotas live in PostgreSQL. If the app gains multiple instances, move counters/proofs to a shared atomic store before scaling. The nonce is never put in a URL or localStorage.

The audit's infrastructure observations still need separate operational checks: Render remains the sole trusted ingress for forwarded headers, runtime DB permissions must be inspected in Neon, and email timing/queueing or recipient budgets can be improved independently. These changes do not claim to implement a durable email outbox, CAPTCHA, provider-level anti-abuse or protection against every denial-of-service attack. No real account deletion was performed to validate Google SSO; test that provider interaction manually without confirming deletion before production release.

## Español

Las correcciones de la auditoría del 18/10/2026 no requieren migración. Conservan hábitos y registros existentes. Producción solo las recibirá después de commit, push y construcción de la nueva imagen.

- Dependencias Microsoft/PKCS reparadas en 10.0.13 y XML reparado para tests. Imagen Docker con SDK 10.0.402 y runtime 10.0.13. Reconstruir con `docker build --pull .` y mantener los parches al día. `global.json` exige SDK 10.0.402 o una banda estable posterior de .NET 10. El SDK/runtime instalado en la PC es independiente de Docker: comprobar `dotnet --list-runtimes` y actualizar .NET 10 si solo aparece 10.0.12.
- SQL parametrizado y comprobación de dueño antes del bloqueo de edición.
- Máximo de 64 KiB por petición y timeout de 15 segundos por comando de base de datos. Por cuenta: 180 lecturas y 60 escrituras/minuto. Por IP: 300 peticiones API/minuto y 20 operaciones de autenticación/reverificación/minuto. Hasta 32 peticiones API simultáneas; la comprobación pública de salud queda fuera. Los excesos responden 429.
- Hasta 200 hábitos por cuenta, incluidos archivados, y 200 registros de cantidades por hábito/día de la zona horaria de la cuenta. No se borra información previa. Los reintentos idempotentes siguen funcionando al alcanzar la cuota. Las transacciones serializan escrituras concurrentes. Los mensajes están traducidos a inglés, español y alemán.
- Cinco fallos de reverificación por cuenta provocan una espera de 15 minutos; cambiar de IP o acertar solo la contraseña no reinicia el contador del segundo factor. Se actualiza también el bloqueo de Identity cuando corresponde. Solo una verificación completa lo reinicia.
- Para borrar una cuenta sin contraseña local, se vuelve a verificar con la misma cuenta Google vinculada. Google puede reutilizar su sesión SSO; se pide selección/consentimiento explícitos, sin prometer que Google solicite otra vez la contraseña. Se emite una prueba opaca de cinco minutos, ligada al usuario y security stamp, en cookie HttpOnly/Secure/SameSite=Strict y de un solo uso. **Verificar no borra la cuenta:** hay que regresar a Settings y confirmar el borrado.
- Cabeceras contra incrustación, scripts ajenos, detección de tipos indebida y permisos de navegador innecesarios. CSP obligatoria en producción y caché `no-store` en toda la API. Se permiten estilos inline necesarios para la UI, no scripts inline; desarrollo permite Vite.
- Entre uno y siete días distintos válidos; longitudes de reverificación acotadas. Git excluye `.env.*`, `.key` y `.pem` y permite `.env.example`.

### Pruebas y límites operativos

La suite incluye un servidor HTTP de prueba que comprueba autorización, CSRF, límites, cabeceras, callback Google sintético, rechazo de otra cuenta y prueba de borrado de un solo uso, sin cuentas ni correos reales. PostgreSQL desechable verifica las cuotas concurrentes y la idempotencia. Ejecutar también build/lint/tests del frontend y auditorías NuGet/npm.

Los contadores de frecuencia y pruebas Google usan memoria para la única instancia actual de Render. Reiniciar invalida una verificación pendiente: hay que repetirla. El bloqueo de Identity y las cuotas de datos se conservan en PostgreSQL. Antes de escalar a varias instancias, usar un almacén compartido con operaciones atómicas. La prueba de borrado nunca viaja por URL ni localStorage.

Quedan verificaciones operativas separadas: confianza en el proxy de Render, permisos del rol de Neon y posibles mejoras de cola/presupuesto por destinatario y tiempos de respuesta del correo. No se implementó una cola durable de emails, CAPTCHA ni una garantía contra todo abuso. La interacción con Google real debe probarse sin confirmar el borrado antes de publicar; las pruebas automatizadas no usan cuentas reales.

## 2026-10-19 follow-up

The guest-authentication findings and additional lifecycle protections are addressed in [the remediation report](security-remediation-2026-10-19.md). It supersedes the session/confirmation behavior described before that follow-up: early request limits now precede Identity; logout revokes all account sessions; sessions have a 90-day absolute maximum; guest email conversion stays pending until browser-bound email proof is confirmed; recipient budgets cover guest conversion; and unlinked guest retention is 120 days from creation. No schema migration is required for this follow-up. Single-instance memory-counter and trusted-ingress assumptions remain operational constraints.

## 2026-10-20 follow-up

Findings #1–#4 from [the October audit](security-audit-2026-10.md) are addressed locally, preserving the browser-bound guest proof, chosen-password confirmation, security-stamp rotation, CSRF, and existing recipient throttles. No dependency or schema migration is added.

- Empty unlinked guests expire after 24 hours; guests with habits retain the 120-day rule. At the 5,000-guest cap, the same locked creation transaction evicts the oldest empty unlinked guest, never a guest with habits or external logins. If none is eligible, it still returns `429 guestCapacity`.
- Every confirmation/recovery send shares an atomic singleton budget: `Email:DailyBudget` / `Email__DailyBudget`, default **250 attempts per UTC day**, with **0** disabling sends. Exhaustion silently skips sending with the same generic HTTP response and one warning per day. Failed delivery attempts count. Recipient cooldowns still apply. `POST /api/auth/register` now has its own **5/hour per-IP** policy; other authentication limits remain unchanged. The budget resets on restart and is not shared between instances.
- A verified Google sign-up can replace an unconfirmed non-guest local account with no external logins, after a lock and state reload, in one transaction. A failed replacement rolls back deletion; confirmed or linked accounts remain protected from automatic replacement. Cleanup also removes unconfirmed local accounts older than 48 hours, excluding externally linked accounts and any unexpected account with habits. Email confirmation continues to require the sign-up password.
- Password validation now precedes the email existence check for normal sign-up, so weak passwords get identical validation responses for known and unknown addresses. Optional login timing equalization is not included.

The Release suite includes real loopback HTTP/Identity/PostgreSQL regression cases, using only disposable databases when `DONETODAY_SECURITY_TEST_CONNECTION` is supplied. Findings **#5–#8 remain open**: TOTP/recovery storage, targeted lockout, forwarded-IP trust on Render, and runtime database privileges. No production operation or deployment is part of this follow-up.

Validated locally with `dotnet test DoneToday.Tests/DoneToday.Tests.csproj -c Release`: **144 passed, 0 failed, 0 skipped**, with disposable loopback PostgreSQL enabled. The dependency review also updates Vite to 8.3.3 for GHSA-698v-4r3x-3vcv (Windows development-server editor launch). `npm test` runs the existing Node and UI suites. Frontend build, lint and tests are checked for this toolchain update; frontend application behavior is unchanged.
