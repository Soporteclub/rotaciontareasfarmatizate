# Deployment — Farmatízate Rotación de Tareas

## Docker (Recomendado)

### Requisitos
- Docker 20.10+
- Docker Compose v2+

### Build & Run

```bash
# Construir y levantar
docker-compose up -d

# Ver logs
docker-compose logs -f app

# Detener
docker-compose down

# Reconstruir después de cambios
docker-compose up -d --build
```

La aplicación estará disponible en **http://localhost:4000**

### Estructura del Docker

| Archivo | Descripción |
|---------|-------------|
| `Dockerfile` | Build multi-stage (deps → builder → runner) |
| `docker-compose.yml` | Servicio `app` con volumen persistente |
| `.dockerignore` | Exclusiones para el contexto de build |

### Multi-Stage Build

```
Stage 1 (deps):     Instala dependencias con npm
Stage 2 (builder):  prisma generate + next build
Stage 3 (runner):   Node 22 Alpine, non-root user, port 4000
```

### Persistencia de Datos

La base de datos SQLite se persiste en un volumen Docker:

```yaml
volumes:
  db-data:
    driver: local
```

Montado en `/app/db` dentro del contenedor.  
El archivo `custom.db` sobrevive reinicios y recreaciones del contenedor.

### Startup Script

El contenedor ejecuta un script de inicio que:

1. Ejecuta `prisma db push --skip-generate` (crea tablas si no existen)
2. Inicia `node server.js` (Next.js standalone)

### Variables de Entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `PORT` | `4000` | Puerto del servidor |
| `NODE_ENV` | `production` | Ambiente de ejecución |
| `DATABASE_URL` | `file:/app/db/custom.db` | Ruta de la BD SQLite |
| `NEXT_TELEMETRY_DISABLED` | `1` | Deshabilita telemetría |

### Health Check

El contenedor incluye health check automático:

```
GET http://localhost:4000/ → 200 OK
```

Intervalo: 30s | Timeout: 10s | Start period: 30s | Retries: 3

---

## Desarrollo Local

### Requisitos
- Node.js 22+ o Bun 1.x
- npm o bun

### Setup

```bash
# Instalar dependencias
bun install

# Generar Prisma client
bun run db:generate

# Crear tablas
bun run db:push

# Poblar datos iniciales
curl -X POST http://localhost:3000/api/seed

# Iniciar servidor de desarrollo
bun run dev
```

El servidor de desarrollo corre en **http://localhost:3000**.

### Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `bun run dev` | Servidor de desarrollo (puerto 3000) |
| `bun run build` | Build de producción (standalone) |
| `bun run start` | Servidor de producción |
| `bun run lint` | ESLint check |
| `bun run db:push` | Sincronizar schema con BD |
| `bun run db:generate` | Generar Prisma client |
| `bun run db:migrate` | Crear migración |
| `bun run db:reset` | Reset de BD + migración |

---

## Despliegue en Producción (Standalone)

### Build Manual

```bash
# Generar build standalone
bun run build

# El output está en:
# .next/standalone/     → Server + dependencias
# .next/static/         → Archivos estáticos
# public/               → Assets públicos
```

### Estructura Standalone

```
.next/standalone/
├── server.js           ← Entry point
├── .next/
│   └── static/         ← Archivos estáticos (copiar)
├── node_modules/
│   ├── .prisma/        ← Prisma client
│   └── @prisma/        ← Prisma runtime
└── public/             ← Assets (copiar)
```

### Ejecutar

```bash
DATABASE_URL="file:./db/custom.db" \
PORT=4000 \
node .next/standalone/server.js
```

---

## Troubleshooting

### Error: EADDRINUSE (puerto en uso)

```bash
# Encontrar proceso usando el puerto
lsof -i :3000   # o :4000

# Matar proceso
kill -9 <PID>

# O usar fuser
fuser -k 3000/tcp
```

### Error: Prisma Client could not be generated

```bash
# Regenerar client
bun run db:generate
```

### Base de datos corrupta

```bash
# Reset completo
curl -X POST http://localhost:3000/api/reset
# Re-seed
curl -X POST http://localhost:3000/api/seed
```

### Docker: Container no inicia

```bash
# Ver logs
docker-compose logs -f app

# Reconstruir sin cache
docker-compose build --no-cache
docker-compose up -d
```

### Docker: Base de datos vacía después de restart

El volumen `db-data` debería persistir la BD. Verificar:

```bash
# Listar volúmenes
docker volume ls | grep db-data

# Inspeccionar volumen
docker volume inspect farmatizate_db-data
```

Si el volumen no existe, recrear con `docker-compose up -d` y hacer seed.
