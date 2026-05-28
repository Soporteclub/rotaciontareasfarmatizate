# Arquitectura del Sistema

## Visión General

Farmatízate es una aplicación monolítica construida con Next.js 16 que sigue una arquitectura en capas dentro de un solo proyecto, sin microservicios.

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENTE                               │
│  React 19 + Zustand + TanStack Query + shadcn/ui            │
├──────────────────────────────────────────────────────────────┤
│                     API ROUTES                               │
│  Next.js App Router (src/app/api/)                          │
├────────────────┬─────────────────────┬───────────────────────┤
│   SERVICES     │   FAIRNESS ENGINE   │   VALIDATORS          │
│   (Business)   │   (Domain)          │   (Zod schemas)       │
├────────────────┴─────────────────────┴───────────────────────┤
│                    REPOSITORIES                              │
│         Prisma ORM (src/backend/infrastructure/)             │
├──────────────────────────────────────────────────────────────┤
│                    DATABASE                                  │
│                    SQLite                                    │
└──────────────────────────────────────────────────────────────┘
```

## Capas

### 1. Frontend (src/frontend/)

**Responsabilidad**: UI, estado del cliente, comunicación con API.

| Componente | Tecnología | Propósito |
|------------|-----------|-----------|
| `presentation/components/` | React + shadcn/ui | Componentes visuales |
| `presentation/hooks/` | Zustand | Estado global (vista activa, admin) |
| `presentation/lib/query/` | TanStack Query | Fetching, cache, mutations |
| `lib/brand.ts` | Constants | Colores, nombres del branding |

**Patrón**: Cada módulo (dashboard, employees, rules, etc.) es auto-contenido con sus propios componentes, hooks y lógica.

### 2. API Routes (src/app/api/)

**Responsabilidad**: Endpoints HTTP, validación de entrada, orquestación.

Cada route.ts:
1. Parsea y valida el request
2. Delega al service correspondiente
3. Retorna respuesta JSON estandarizada

**Formato de respuesta**:
```json
{ "data": { ... } }          // Éxito
{ "error": "mensaje" }       // Error
```

### 3. Services (src/backend/application/services/)

**Responsabilidad**: Lógica de negocio, orquestación de repositorios, auditoría.

| Service | Propósito |
|---------|-----------|
| `assignment-service` | Generar, borrar, editar asignaciones |
| `employee-service` | CRUD empleados + sincronización |
| `rule-service` | CRUD reglas |
| `group-service` | CRUD grupos |
| `settings-service` | Clave admin |
| `audit-service` | Registro de cambios |
| `holiday-service` | Festivos colombianos |
| `task-eligibility-service` | Qué tareas hace cada empleado |

### 4. Fairness Engine (src/backend/domain/fairness/)

**Responsabilidad**: Algoritmo de distribución equitativa. Independiente y testeable.

**Input**: empleados, reglas, historial de asignaciones, rango de fechas
**Output**: nuevas asignaciones + reporte de balance

Ver [Motor de Equidad](#motor-de-equidad) para detalles del algoritmo.

### 5. Repositories (src/backend/infrastructure/repositories/)

**Responsabilidad**: Acceso a datos con Prisma ORM. Abstracción sobre la BD.

Cada repository encapsula queries Prisma y expone métodos tipados. Las transacciones complejas (como `transactionalRegenerate`) usan `db.$transaction()`.

### 6. Database (SQLite)

Schema definido en `prisma/schema.prisma` con migraciones via `prisma db push`.

## Flujo de Datos: Generar Asignaciones

```
1. UI (RegenerateDialog)
   ↓ POST /api/assignments/generate { groupId, startDate, endDate }
   
2. API Route
   ↓ Valida input → assignmentService.generate()
   
3. AssignmentService
   ↓ Carga empleados, reglas, historial, festivos, elegibilidad
   ↓ Lock pasadas → FairnessEngine.generateAssignments()
   ↓ assignmentRepository.transactionalRegenerate()
   ↓ auditLogRepository.create()
   
4. FairnessEngine
   ↓ Para cada fecha+tarea:
   │  → Filtra empleados disponibles
   │  → Calcula score (balance + cooldown + consecutivas + same-day)
   │  → Aplica constraint maxImbalance=1
   │  → Selecciona mejor candidato
   ↓ Retorna asignaciones + reporte
   
5. transactionalRegenerate (Prisma tx)
   ↓ Lock pasadas no bloqueadas
   ↓ Borra futuras desbloqueadas
   ↓ Crea nuevas (skip duplicados)
   
6. Response → UI actualiza cache (TanStack Query invalidation)
```

## Flujo de Datos: Borrar Asignaciones

```
1. UI (DeleteDialog)
   ↓ POST /api/assignments/delete { groupId, startDate, endDate }
   
2. API Route
   ↓ assignmentService.deleteByGroupAndDateRange()
   
3. AssignmentRepository
   ↓ deleteMany({ groupId, date: { gte, lte } })
   ↓ (borra bloqueadas y desbloqueadas)
   
4. AuditLog
   ↓ Registra la acción
```

## Seguridad

- **Clave Admin**: Las operaciones sensibles (borrar, generar, editar) requieren desbloquear admin
- **Asignaciones Bloqueadas**: Las pasadas son inmutables (no se pueden editar ni borrar con generación normal)
- **Soft Delete**: Empleados y grupos se desactivan, no se eliminan
- **Auditoría**: Todas las modificaciones quedan registradas

## Respaldo y Restauración

- **Auto-backup**: Se crea automáticamente cada vez que se modifica algo
- **Manual**: Botón de backup en la UI
- **Restaurar**: POST `/api/restore` con el JSON del backup
- El backup incluye todos los datos excepto configuración
