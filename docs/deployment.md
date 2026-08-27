# Deployment

## Docker (Producción Local)

### Requisitos
- Docker
- Docker Compose

### Ejecutar

```bash
# Construir y ejecutar
docker-compose up --build

# Ejecutar en segundo plano
docker-compose up -d --build

# Detener
docker-compose down

# Ver logs
docker-compose logs -f

# Reiniciar (preserva datos)
docker-compose restart
```

La aplicación estará disponible en `http://localhost:3000`.

### Configuración

El `docker-compose.yml` define el servicio `app`. Para entornos locales con
PostgreSQL (opcional), ajusta la variable de entorno:

| Variable | Valor | Propósito |
|----------|-------|-----------|
| NODE_ENV | production | Modo producción |
| DATABASE_URL | postgresql://… | Conexión PostgreSQL (rama Neon o Postgres local) |
| PORT | 3000 | Puerto del servidor |

> ⚠️ **Importante**: la BD real es **PostgreSQL / Neon**, inyectada por Netlify vía
> variables de entorno. El `provider` de `schema.prisma` es `postgresql` y
> `database.ts` **rechaza** URLs `file:` (SQLite) al arrancar. No uses `file:/…`
> para `DATABASE_URL`.

### Volúmenes

| Volumen | Montaje | Propósito |
|---------|---------|-----------|
| data | /app/data | Persiste los backups locales (NO la base de datos) |

> La base de datos no vive en el container: es **Neon** (externa). El volumen
> `data` solo guarda los respaldos generados por la app.

Los datos sobreviven reinicios y reconstrucciones del container.

### Dockerfile (Multi-stage)

```
Stage 1 (deps):    Instala dependencias npm
Stage 2 (builder): Genera Prisma client + Next.js build (standalone)
Stage 3 (runner):  Copia solo lo necesario, ejecuta server.js
```

El output standalone de Next.js permite que la imagen sea mínima (~150MB vs ~1GB con node_modules completo).

### Health Check

El container incluye un health check automático:
- Intervalo: 30s
- Timeout: 10s
- Start period: 30s
- Verifica: `wget http://localhost:3000/api/health` (ejecuta `SELECT 1` contra la BD, en lugar de la página estática `/`).

### Semillar Datos

Después de iniciar por primera vez:

```bash
# Semillar datos iniciales
curl -X POST http://localhost:3000/api/seed

# Verificar
curl http://localhost:3000/api/groups
```

## Desarrollo Local

### Requisitos
- Node.js 18+ (recomendado **Node 22**, ver `.nvmrc`)
- npm (gestor del proyecto)

### Setup

```bash
# Instalar dependencias (npm)
npm install

# Generar Prisma client
npm run db:generate

# Crear/actualizar schema de desarrollo (rama Neon)
npm run db:push

# Aplicar migraciones producción / CI
npm run db:deploy

# Iniciar desarrollo
npm run dev
```

### Variables de Entorno

Crear archivo `.env` (copiado de `.env.example`):
```
DATABASE_URL="postgresql://user:password@ep-xxxx.region.aws.neon.tech/dbname?sslmode=require"
```

> Para desarrollo usa una **rama/branch de Neon** y apunta `DATABASE_URL` a ella;
> así no afectas la base principal de producción. Nunca uses `file:...` (es SQLite).

### Implementar la rama dev de Neon con respaldo del env

1. En Neon crea una rama **`dev`** desde producción (elige "Branch data and schema").
   La principal queda intacta.
2. Dentro de la rama dev usa **Connection string** + **conexión DIRECTA** (sin pooling).
3. En local, crea una copia de referencia del entorno y el `.env` de trabajo:
   ```bash
   cp .env.example .env.example.dev   # plantilla/respaldo del entorno dev
   cp .env.example.dev .env           # .env de trabajo (apunta a la rama dev)
   ```
   > Ambos (`.env`, `.env.example.dev`) están ignorados por git (`.gitignore` → `.env*`).
4. Edita `.env` poniendo la cadena **directa** de la rama dev en `DATABASE_URL`.
5. Valida que quedas contra la RAMA dev:
   ```bash
   npm run db:generate
   npm run db:push
   npm run db:studio   # abre las tablas de la rama dev
   npm run dev
   ```
6. Para volver a producción: sustituye `DATABASE_URL` en `.env` por la de la
   rama principal (o deja que Netlify/entorno la inyecte).

> 🔴 Nunca ejecutes `db:reset`/`db:push` destructivo contra la principal; usa
> `npm run db:deploy` para promover cambios validados en dev.

## Respaldo y Restauración

### Crear Backup
```bash
curl -X POST http://localhost:3000/api/backup
```

### Descargar Backup
```bash
curl http://localhost:3000/api/backup > backup.json
```

### Restaurar
```bash
curl -X POST http://localhost:3000/api/restore \
  -H "Content-Type: application/json" \
  -d @backup.json
```

### Reset Completo
```bash
# ⚠️ Elimina TODOS los datos
curl -X POST http://localhost:3000/api/reset

# Luego semillar de nuevo
curl -X POST http://localhost:3000/api/seed
```
