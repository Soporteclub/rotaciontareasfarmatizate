# Farmatízate — Sistema de Rotación de Tareas

## Descripción General

Sistema de asignación rotativa de tareas para **Club Del Droguista**. Gestiona la distribución equitativa de tareas (Sacar Basura, Lavar Cafetera, Aseo General, etc.) entre los empleados de cada piso/grupo, garantizando que nadie tenga más asignaciones que otro.

## Arquitectura

```
┌─────────────────────────────────────────────────────┐
│                    Next.js 16                        │
│                   App Router                         │
├──────────┬──────────────────────────┬───────────────┤
│ Frontend │       Backend            │   Database    │
│          │                          │               │
│ React +  │ API Routes (src/app/api) │  Prisma +     │
│ Zustand  │                          │  SQLite       │
│ TanStack │ Services                 │               │
│ Query    │ Repositories             │               │
│          │ Fairness Engine          │               │
│ shadcn/ui│ Validators               │               │
└──────────┴──────────────────────────┴───────────────┘
```

### Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Lenguaje | TypeScript 5 |
| UI | React 19 + shadcn/ui + Tailwind CSS 4 |
| Estado | Zustand (cliente) + TanStack Query (servidor) |
| Base de datos | Prisma ORM + SQLite |
| Deploy | Docker (standalone) |

## Estructura del Proyecto

```
src/
├── app/                    # Next.js App Router
│   ├── api/                # API Routes (backend)
│   │   ├── admin/          # Verificación admin
│   │   ├── assignments/    # Asignaciones CRUD + generar + borrar + balance
│   │   ├── audit/          # Logs de auditoría
│   │   ├── backup/         # Respaldo y restauración
│   │   ├── docs/           # OpenAPI spec
│   │   ├── eligibility/    # Elegibilidad de tareas
│   │   ├── employees/      # Empleados CRUD + task-eligibility
│   │   ├── groups/         # Grupos CRUD
│   │   ├── holidays/       # Festivos CRUD
│   │   ├── reset/          # Reset DB
│   │   ├── restore/        # Restaurar backup
│   │   ├── rules/          # Reglas CRUD
│   │   ├── seed/           # Datos iniciales
│   │   ├── settings/       # Configuración admin
│   │   └── task-eligibility/ # Matriz de elegibilidad
│   ├── layout.tsx
│   └── page.tsx            # SPA principal
│
├── backend/
│   ├── application/
│   │   ├── services/       # Lógica de negocio
│   │   └── validators/     # Schemas de validación (Zod)
│   ├── domain/
│   │   ├── entities/       # Tipos de dominio
│   │   ├── fairness/       # Motor de Equidad
│   │   └── holidays/       # Festivos colombianos
│   ├── infrastructure/
│   │   ├── repositories/   # Capa de acceso a datos (Prisma)
│   │   └── openapi-spec.ts # OpenAPI 3.0.3 specification
│   └── index.ts
│
├── components/ui/          # shadcn/ui (48 componentes)
│
└── frontend/
    ├── hooks/              # use-mobile, use-toast
    ├── lib/
    │   ├── utils.ts        # cn() utility
    │   ├── brand.ts        # Branding constants
    │   └── query/          # TanStack Query hooks + API client
    └── presentation/
        ├── components/
        │   ├── layout/     # Providers, Sidebar, AdminKeyModal
        │   ├── modules/
        │   │   ├── audit/      # Historial de cambios
        │   │   ├── calendar/   # Vista de calendario
        │   │   ├── dashboard/  # Vista principal con filtros
        │   │   ├── employees/  # Gestión de empleados
        │   │   ├── groups/     # Gestión de grupos
        │   │   └── rules/      # Reglas + Generar/Borrar asignaciones
        │   └── shared/     # DeleteDialog, TaskIcon, AdminGuard, etc.
        └── hooks/          # use-ui-store, use-admin-store, use-admin
```

## Modelo de Datos

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│  Group   │────<│   Employee   │     │    Rule      │
│ (Piso)   │     │ (Empleado)   │     │ (Regla)      │
└────┬─────┘     └──────┬───────┘     └──────────────┘
     │                  │
     │           ┌──────┴───────┐
     │           │              │
     ▼           ▼              ▼
┌──────────┐  ┌──────────────┐ ┌──────────────────┐
│Assignment│  │TaskEligibility│ │   AuditLog       │
│(Asignac.)│  │(Elegibilidad)│ │   (Auditoría)    │
└──────────┘  └──────────────┘ └──────────────────┘

┌──────────┐  ┌──────────┐  ┌──────────┐
│ Holiday  │  │ Settings │  │  Backup  │
│(Festivo) │  │(Config)  │  │(Respaldo)│
└──────────┘  └──────────┘  └──────────┘
```

### Relaciones Principales

- **Group → Employee**: Uno a muchos (cada empleado pertenece a un piso)
- **Group → Rule**: Uno a muchos (cada piso tiene sus reglas de rotación)
- **Group → Assignment**: Uno a muchos (asignaciones por piso)
- **Employee → Assignment**: Uno a muchos (asignaciones por empleado)
- **Employee → TaskEligibility**: Uno a muchos (qué tareas puede hacer)
- **Assignment**: Unique constraint `(groupId, date, taskName)` — una tarea por día por grupo

## Motor de Equidad

El corazón del sistema. Garantiza distribución justa con estas reglas:

| Mecanismo | Config | Efecto |
|-----------|--------|--------|
| Balance global | `balanceWeight: 5.0` | Prioriza quién tiene menos asignaciones |
| Balance mensual | `monthlyBalanceWeight: 3.0` | Equilibra dentro de cada mes |
| Cooldown | `cooldownDays: 7` | Penaliza asignar a quien ya tuvo tarea recientemente |
| Consecutivas | `consecutivePenalty: 3.0` | Penaliza semanas consecutivas con la misma tarea |
| Mismo día | `sameDayPenalty: 5.0` | Evita 2 tareas el mismo día a la misma persona |
| maxImbalance | `1` | **HARD CONSTRAINT**: nadie puede tener más de 1 asignación extra que otro |

### Resultados del Motor (validado con tests)

- **Diferencia máxima**: 1 asignación entre cualquier par de empleados
- **Repeticiones consecutivas**: 0 (nunca la misma persona hace la misma tarea seguida)
- **Desviación estándar**: < 0.5 en todos los escenarios
- **Compensación automática**: si alguien tiene más historial, los demás reciben más asignaciones nuevas
- **Funciona impecablemente** desde 1 mes hasta 1 año de asignaciones

## API Reference

La especificación completa está disponible en `GET /api/docs` (OpenAPI 3.0.3).

### Endpoints Principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| | **Grupos** | |
| GET | `/api/groups` | Listar grupos |
| POST | `/api/groups` | Crear grupo |
| GET | `/api/groups/{id}` | Obtener grupo |
| PUT | `/api/groups/{id}` | Actualizar grupo |
| DELETE | `/api/groups/{id}` | Desactivar grupo |
| | **Empleados** | |
| GET | `/api/employees` | Listar empleados |
| POST | `/api/employees` | Crear empleado |
| GET | `/api/employees/{id}` | Obtener empleado |
| PUT | `/api/employees/{id}` | Actualizar empleado |
| DELETE | `/api/employees/{id}` | Desactivar empleado |
| GET | `/api/employees/{id}/task-eligibility` | Elegibilidad de tareas |
| | **Reglas** | |
| GET | `/api/rules` | Listar reglas |
| POST | `/api/rules` | Crear regla |
| GET | `/api/rules/{id}` | Obtener regla |
| PUT | `/api/rules/{id}` | Actualizar regla |
| DELETE | `/api/rules/{id}` | Desactivar regla |
| | **Asignaciones** | |
| GET | `/api/assignments` | Listar asignaciones |
| POST | `/api/assignments/generate` | Generar con Motor de Equidad |
| POST | `/api/assignments/delete` | Borrar por grupo + rango de fechas |
| PATCH | `/api/assignments/{id}` | Cambiar empleado (solo desbloqueadas) |
| GET | `/api/assignments/balance` | Reporte de equidad |
| | **Festivos** | |
| GET | `/api/holidays` | Listar festivos |
| POST | `/api/holidays` | Crear/semillar festivos |
| PATCH | `/api/holidays/{id}` | Actualizar festivo |
| DELETE | `/api/holidays/{id}` | Eliminar festivo |
| | **Elegibilidad** | |
| GET | `/api/eligibility` | Consultar por empleado |
| POST | `/api/eligibility` | Alternar tarea |
| GET | `/api/task-eligibility` | Matriz completa |
| | **Respaldo** | |
| GET | `/api/backup/status` | Estado del backup |
| GET | `/api/backup` | Exportar backup |
| POST | `/api/backup` | Crear backup |
| POST | `/api/restore` | Restaurar backup |
| | **Configuración** | |
| GET | `/api/settings` | Estado de configuración |
| POST | `/api/settings` | Validar clave admin |
| PUT | `/api/settings` | Cambiar clave admin |
| POST | `/api/admin/verify` | Verificar clave admin |
| | **Auditoría** | |
| GET | `/api/audit` | Logs de auditoría |
| | **Mantenimiento** | |
| POST | `/api/seed` | Sembrar datos iniciales |
| POST | `/api/reset` | Reiniciar base de datos |
| GET | `/api/` | Health check |

## Docker (Producción Local)

```bash
# Construir y ejecutar
docker-compose up --build

# La app estará en http://localhost:3000
```

### Dockerfile
- Multi-stage build (deps → builder → runner)
- Node 22 Alpine
- Prisma db push automático al iniciar
- Puerto 3000
- Volume persistente para la base de datos (`db-data`)

## Desarrollo

```bash
# Instalar dependencias
bun install

# Iniciar en modo desarrollo
bun run dev

# Push del schema a la BD
bun run db:push

# Lint
bun run lint
```

## Flujos Principales

### Generar Asignaciones
1. Ir a **Reglas** → "Generar Asignaciones"
2. Seleccionar grupos (checkboxes con "Todos"/"Ninguno")
3. Elegir rango de fechas (Desde/Hasta)
4. Click "Generar Asignaciones"
5. El Motor de Equidad distribuye las tareas justamente

### Borrar Asignaciones
1. Ir a **Calendario** → "Borrar Asignaciones" (requiere admin)
2. Seleccionar grupos y rango de fechas
3. Click "Borrar Asignaciones"
4. Luego ir a Reglas para regenerar

### Editar Asignación Individual
1. Click en una asignación en el calendario
2. Cambiar el empleado asignado (solo si no está bloqueada)
3. Guardar — se registra en auditoría
