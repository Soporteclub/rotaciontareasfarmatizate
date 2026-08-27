# Casos borde y deudas técnicas — documentación

> Este documento **enumera y describe** problemas de borde detectados en la
> revisión del código. NO incluye su implementación: quedan fuera del alcance de
> la migración npm/limpieza y se anotan aquí para una pasada posterior de QA.

## BC-1 · Timezone en `getBalanceReport` (mismatch con el Fairness Engine)

- **Archivo**: `src/backend/application/services/assignment-service.ts`,
  método `getBalanceReport` (≈ líneas 365-395).
- **Problema**: el `balance` (`assignments/balance`) construye `monthlyBalance` y
  `dateRange` con `getFullYear/getMonth/getDate` (**timezone LOCAL**), mientras
  el `FairnessEngine` usa `getUTC*` (BUG-01/10 ya corregidos ahí). En un servidor
  en `America/Bogota` (UTC-5), las fechas guardadas como `00:00:00Z` se cortan
  con un día de desfase y el balance mensual reporta mal.
- **Sugerencia**: unificar `getBalanceReport` a accesores UTC.

## BC2 · Timezone en `seed/route.ts` (helpers de fecha LOCAL)

- **Archivo**: `src/app/api/seed/route.ts` (`setHours(0,0,0,0)`,
  `formatDateKey`, `buildHolidayDateSet` usan accessors **locales**).
- **Problema**: en un servidor con TZ≠UTC el `while (datePointer <= today)`
  puede desfasar un día el límite "hoy", generando/omitando asignaciones de
  un día. Es el mismo bug de UTC que ya se corrigió en `assignment-service.generate`.
- **Sugerencia**: unificar a UTC los helpers del seed.

## BC3 · Validación débil en `generateAssignmentsSchema`

- **Archivo**: `src/backend/application/validators/schemas.ts`.
- **Problema**:
  1. `new Date("garbage")` (Invalid Date) supera el `refine` (que solo compara
     `start < end` con `<`, y `NaN` comparaciones pasan) y falla después en el
     service con `NaN`.
  2. No hay tope de rango: generar 10 años de asignaciones es una carga enorme.
- **Sugerencia**: validar fecha real (no `NaN`) y acotar el rango (p. ej. ≤ 366 días).

## BC3 · Default de admin key en `schema.prisma`

- **Archivo**: `prisma/schema.prisma` (model `Settings.value` tiene un
  `@default("…")` de solo lectura).
- **Problema**: placeholder débil en el schema.
- **Mitigación actual**: el seed genera una clave aleatoria (32 hex) y la devuelve
  una sola vez; no hay auto-init. No es un fallo sub de crítica, pero conviene
  documentar el flujo seed→guardar clave (ya reflejado en `.env.example`).

## BC4 · Precisión de healthcheck frente a BD

- **Archivo**: `Dockerfile` / `docker-compose.yml`.
- **Problema**: el healthcheck usa `/` (response estático `Hello, world!`) y por
  tanto devuelve 200 aunque la BD (Neon) esté caída. La ruta `/api/health`
  referenciada en `FIX (CFG-09)` **no existe** aún.
- **Sugerencia**: crear `/api/health` que ejecute `SELECT 1` y usarlo en el healthcheck.

## BC5 · `docker-compose.yml` con `DATABASE_URL` SQLite

- **Archivo**: `docker-compose.yml` (línea 16: `DATABASE_URL=file:/app/db/custom.db`).
- **Problema**: contradice el schema (`postgresql`) y `database.ts` **rechaza**
  URLs `file:` al arrancar → `docker-compose up` fallaría hoy.
- **Sugerencia** (fuera de alcance de la limpieza): apuntar a PostgreSQL/Neon o
  levantar un servicio postgres; actualizar el healthcheck.

## BC6 · Migraciones de Prisma ausentes

- **Problema**: `start.sh` (Docker) ejecuta `npx prisma migrate deploy`, pero no
  existe `prisma/migrations/` (solo `schema.prisma`); históricamente se usó
  `db push`. Sin migraciones que aplicar, la ruta de producción es poco fiable.
- **Sugerencia**: generar una migración inicial y versionarla; usar
  `db:deploy`/`migrate deploy` en producción.

## BC7 · Scripts de mini-services eliminados (decisión de la pasada)

- **Acción ya tomada**: `mini-services/` y `.zscripts/` se eliminaron (infra
  heredada rota e incompatible con npm/PostgreSQL). Se retiraron también las
  reglas correspondientes de `.gitignore` y el `bun.lock`.

## DoDelete/archivos sin probar contra Postgres

- Dockerfile y docker-compose no se validaron con una BD real en esta pasada; la
  validación de build se hace en CI/Netlify. No ejecutar `db:reset` ni `db:push`
  contra la Neon de producción; usar una rama/branch de Neon.

## Estado de resolución (post-migración)

> Correcciones aplicadas en esta pasada. Validadas por lectura estática; el
> entorno local carecía de `node/npm`, por lo que `npm run lint && npm run
> typecheck && npm run build && npm run test` deben ejecutarse en CI/Netlify y
> localmente con un toolchain real antes de publicar.

- BC-1 ✅ `getBalanceReport` ahora usa accessores **UTC** (assignment-service.ts).
- BC-2 ✅ Helpers de fecha del `seed` usan accessores **UTC**; `holiday-repository`
      usa `setUTCHours`. (Quedan documentados los constructores de festivos en
      `colombian-holidays.ts`, consistentes bajo la TZ recomendada
      `America/Bogota`/`UTC`; el frontend los consume en LOCAL y se dejó así para
      no alterar el renderizado del calendario.)
- BC-3 ✅ `generateAssignmentsSchema` valida fecha ISO real, rechaza `Invalid Date`
      y limita el rango a 366 días.
- BC-4 ✅ `GET /api/health` (SELECT 1); Dockerfile y `docker-compose.yml` healthchecks
      apuntan a `/api/health`.
- BC-5 ✅ `docker-compose.yml` usa `DATABASE_URL=${DATABASE_URL:?...}` (PostgreSQL) y
      persiste backups en el volumen `data` en vez de la BD.
- BC-6 ⏳ (migraciones ausentes) — fuera de esta pasada; se sigue usando `db push` en
      ramas dev (no se aplicó migración contra prod).
- Settings default ✅ Quitado el `@default("***REMOVED***")` de `schema.prisma` (P4).
- SEC-01 ✅ Credenciales reales eliminadas de `.env.example`; secuencia de rotación
      documentada (ver nota de seguridad más abajo).
- PROC-06 ✅ Añadida suite Vitest (`vitest.config.ts` + tests) y job CI `test`.

### Nota de seguridad (SEC-01) — ROTACIÓN OBLIGATORIA
- Se eliminaron las credenciales de `.env.example`, pero **la contraseña real de
  Neon (`npg_...`) expuesta en git history sigue activa**. Debe **rotarse en la
  consola de Neon** (cambiar contraseña del rol / regenerar rama) y luego
  actualizarse la variable `DATABASE_URL` en Netlify → Site settings → Env vars,
  y borrarse local `.env`. Gitleaks en CI ya no la volverá a permitir.
