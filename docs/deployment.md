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

El `docker-compose.yml` define:

| Variable | Valor | Propósito |
|----------|-------|-----------|
| NODE_ENV | production | Modo producción |
| DATABASE_URL | file:/app/db/custom.db | Path de SQLite dentro del container |
| PORT | 3000 | Puerto del servidor |

### Volúmenes

| Volumen | Montaje | Propósito |
|---------|---------|-----------|
| db-data | /app/db | Persiste la base de datos SQLite |

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
- Verifica: `wget http://localhost:3000/`

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
- Node.js 22+ o Bun
- npm/bun

### Setup

```bash
# Instalar dependencias
bun install

# Generar Prisma client
bun run db:generate

# Crear/actualizar schema
bun run db:push

# Iniciar desarrollo
bun run dev
```

### Variables de Entorno

Crear archivo `.env`:
```
DATABASE_URL="file:./db/custom.db"
```

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
