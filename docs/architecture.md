# Arquitectura — Farmatízate Rotación de Tareas

## Clean Architecture

El proyecto sigue Clean Architecture con 4 capas concéntricas. La regla de dependencia es **siempre hacia adentro**: las capas internas NO conocen a las externas.

```
┌──────────────────────────────────────────────────────┐
│                  PRESENTATION                         │
│  React Components · TanStack Query · Zustand         │
│  (src/frontend/presentation/)                        │
├──────────────────────────────────────────────────────┤
│                  API ROUTES                           │
│  Next.js App Router Controllers (thin)               │
│  (src/app/api/)                                      │
├──────────────────────────────────────────────────────┤
│                  APPLICATION                          │
│  Services · Validators (Zod) · Use Cases             │
│  (src/backend/application/)                          │
├──────────────────────────────────────────────────────┤
│                  DOMAIN                               │
│  Entities · FairnessEngine · Types · Holidays        │
│  (src/backend/domain/)                               │
├──────────────────────────────────────────────────────┤
│                  INFRASTRUCTURE                       │
│  Prisma · SQLite · Repositories                      │
│  (src/backend/infrastructure/)                       │
└──────────────────────────────────────────────────────┘
```

### Responsabilidades por Capa

| Capa | Responsabilidad | Depende de |
|------|----------------|------------|
| **Domain** | Entidades puras, lógica de negocio (FairnessEngine), tipos. Sin dependencias externas. | Nada |
| **Application** | Servicios que orquestan casos de uso, validación de entrada (Zod schemas). | Domain |
| **Infrastructure** | Acceso a datos (Prisma), implementación de repositorios. | Domain, Application |
| **Presentation** | Componentes React, gestión de estado (Zustand), queries (TanStack Query). | Application (types) |
| **API Routes** | Controladores HTTP delgados. Delegan al servicio, validan con Zod. | Application |

---

## FairnessEngine

El corazón del sistema. Motor de asignación equitativa que distribuye tareas entre empleados minimizando el desbalance.

### Algoritmo de Scoring

Para cada fecha que necesita asignación, el motor calcula un **score** para cada empleado disponible:

```
score = 0

+ (deficit_total × balanceWeight)           // Premia al que menos tareas tiene
+ (deficit_mensual × monthlyBalanceWeight)   // Premia al que menos tareas tiene este mes
- (cooldown_violation × recencyPenalty)      // Penaliza si asignó hace poco
- (consecutive × consecutivePenalty)         // Penaliza asignaciones consecutivas
+ (newEmployee × joinDateWeight)             // Bonus si nunca ha sido asignado
- (sameDayAssignment × sameDayPenalty)       // Penaliza si ya tiene tarea ese día
```

### Configuración Default

| Parámetro | Valor | Descripción |
|-----------|-------|-------------|
| `cooldownDays` | 7 | Días mínimos entre asignaciones al mismo empleado |
| `consecutivePenalty` | 3.0 | Penalización por semana consecutiva |
| `recencyPenalty` | 2.0 | Penalización por asignación reciente |
| `balanceWeight` | 5.0 | Peso del balance total |
| `monthlyBalanceWeight` | 3.0 | Peso del balance mensual |
| `joinDateWeight` | 0.5 | Bonus para empleados sin asignaciones |
| `sameDayPenalty` | 5.0 | Penalización por doble asignación en el mismo día |
| `maxImbalance` | 1 | Máxima diferencia permitida entre empleados |

### Restricción de Equidad

Después de calcular scores, el motor aplica una **restricción de equidad**:

> Un empleado NUNCA recibe una asignación si tiene `maxImbalance + 1` más asignaciones que el empleado con menos asignaciones disponible.

Esto garantiza que la distribución sea siempre justa, incluso si el scoring sugeriría otra cosa.

### Flujo de Generación

```
1. Filtrar empleados activos del grupo
2. Filtrar reglas activas del grupo
3. Generar fechas que necesitan asignación (según reglas)
4. Para cada fecha+tarea:
   a. Verificar si ya existe asignación locked (saltar)
   b. Calcular score para cada empleado disponible
   c. Aplicar restricción de equidad
   d. Seleccionar al de mayor score
   e. Actualizar balance en tiempo real
5. Retornar asignaciones + reporte de balance
```

### Manejo de Festivos

El motor recibe un `Set<string>` de fechas festivas (formato `YYYY-MM-DD`). Las fechas festivas se excluyen de la generación de asignaciones.

### Soporte Multi-Tarea

Múltiples tareas pueden asignarse en el mismo día para el mismo grupo. El motor:
- Rastrea qué empleados ya tienen asignación ese día (`alreadyAssignedToday`)
- Penaliza asignar dos tareas al mismo empleado el mismo día
- Permite la doble asignación si es la opción más justa (penalizada pero no bloqueada)

### Tipos de Frecuencia

| Tipo | Comportamiento | `dayOfWeek` |
|------|---------------|-------------|
| `daily` | Todos los días hábiles (Lun-Vie) | Ignorado |
| `weekly` | Cada semana en el día indicado | Requerido |
| `monthly` | Primera ocurrencia del día en cada mes | Requerido |

---

## Festivos Colombianos

El módulo `colombian-holidays.ts` genera los 18 festivos oficiales de Colombia para cualquier año:

### Cálculo de Semana Santa

Usa el **Algoritmo Gregoriano Anónimo** para calcular el domingo de Pascua, y deriva:

| Festivo | Offset desde Pascua |
|---------|---------------------|
| Jueves Santo | -3 días |
| Viernes Santo | -2 días |
| Ascensión | +39 días (Ley Emiliani) |
| Corpus Christi | +60 días (Ley Emiliani) |
| Sagrado Corazón | +68 días (Ley Emiliani) |

### Ley Emiliani

Los festivos tipo "emiliani" se mueven al lunes siguiente si no caen en lunes:

```
Si es Lunes → mantener
Si es Martes-Domingo → mover al próximo Lunes
```

### Los 18 Festivos

| # | Festivo | Tipo | Fecha Base |
|---|---------|------|------------|
| 1 | Año Nuevo | Fixed | Ene 1 |
| 2 | Reyes Magos | Emiliani | Ene 6 |
| 3 | San José | Emiliani | Mar 19 |
| 4 | Jueves Santo | Easter | Variable |
| 5 | Viernes Santo | Easter | Variable |
| 6 | Día del Trabajo | Fixed | May 1 |
| 7 | Ascensión | Emiliani | Pascua+39 |
| 8 | Corpus Christi | Emiliani | Pascua+60 |
| 9 | Sagrado Corazón | Emiliani | Pascua+68 |
| 10 | San Pedro y San Pablo | Emiliani | Jun 29 |
| 11 | Grito de Independencia | Fixed | Jul 20 |
| 12 | Batalla de Boyacá | Fixed | Ago 7 |
| 13 | Asunción de la Virgen | Emiliani | Ago 15 |
| 14 | Día de la Raza | Emiliani | Oct 12 |
| 15 | Todos los Santos | Emiliani | Nov 1 |
| 16 | Independencia de Cartagena | Emiliani | Nov 11 |
| 17 | Inmaculada Concepción | Fixed | Dic 8 |
| 18 | Navidad | Fixed | Dic 25 |

---

## Panel "Hoy" (TodayPanel)

Componente de vista rápida que muestra las asignaciones del día actual en la parte superior del Dashboard.

### Arquitectura

```
┌──────────────────────────────────────────────────────────────────┐
│  TodayPanel (dashboard/today-panel.tsx)                          │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  getLocalTodayStr() → "2026-03-15" (local date string)     │  │
│  │  useAssignments(undefined, todayStr, todayStr)             │  │
│  │  ↓                                                         │  │
│  │  GET /api/assignments?startDate=...&endDate=...            │  │
│  │  (endDate usa 23:59:59.999Z para inclusión timezone-safe)  │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐                              │
│  │  GroupColumn  │  │  GroupColumn  │  (1 por piso)              │
│  │  Piso 1 (3)  │  │  Piso 2 (2)  │                              │
│  │  🗑 Basura   │  │  ☕ Cafetera  │                              │
│  │  ☕ Cafetera  │  │  🧹 Aseo     │                              │
│  └──────────────┘  └──────────────┘                              │
└──────────────────────────────────────────────────────────────────┘
```

### Funcionalidades

| Estado | Comportamiento |
|--------|---------------|
| **Día normal con tareas** | Muestra asignaciones agrupadas por grupo en grid 2 columnas |
| **Fin de semana** | EmptyState: "¡Fin de semana!" con ícono 🎉 |
| **Festivo colombiano** | EmptyState: "¡Festivo: [nombre]!" con ícono 💗 |
| **Sin asignaciones** | EmptyState: "Sin asignaciones para hoy" |

### Zona Horaria

El panel usa `getLocalTodayStr()` para obtener la fecha local del navegador en formato `YYYY-MM-DD`, evitando problemas de offset UTC. Esto garantiza que la consulta a la API use la fecha correcta independientemente de la zona horaria del servidor.

---

## Manejo Timezone-Safe de Fechas

### Problema

Las comparaciones de fechas en la API podían fallar cuando la fecha del cliente (ej: `2026-03-15`) se convertía a `Date` en UTC (`2026-03-15T00:00:00.000Z`). Si una asignación tenía fecha `2026-03-15T00:00:00.000Z`, una comparación `date <= endDate` con `endDate = new Date("2026-03-15")` resultaba en `2026-03-15T00:00:00.000Z <= 2026-03-15T00:00:00.000Z` que es `true`, pero fechas con cualquier componente de hora mayor serían excluidas.

### Solución

El endpoint `GET /api/assignments` ahora ajusta el `endDate` a end-of-day:

```typescript
// Antes (bug):
const endDate = endStr ? new Date(endStr) : undefined;

// Después (fix):
let endDate: Date | undefined;
if (endStr) {
  const end = new Date(endStr);
  end.setUTCHours(23, 59, 59, 999);  // End-of-day para comparación inclusiva
  endDate = end;
}
```

Esto garantiza que todas las asignaciones del día final del rango sean incluidas, independientemente de la zona horaria.

---

## Patrones de Diseño

### Repository Pattern

Cada entidad tiene un repositorio que encapsula el acceso a datos:

```
infrastructure/repositories/
├── group-repository.ts
├── employee-repository.ts
├── rule-repository.ts
├── assignment-repository.ts
├── holiday-repository.ts
└── audit-log-repository.ts
```

### Service Layer

Los servicios orquestan la lógica de negocio:

```
application/services/
├── group-service.ts       # CRUD de grupos + validaciones
├── employee-service.ts    # CRUD de empleados + transferencias
├── rule-service.ts        # CRUD de reglas + hard/soft delete
├── assignment-service.ts  # Generación vía FairnessEngine
├── holiday-service.ts     # Festivos + seed colombiano
└── audit-service.ts       # Consulta de logs
```

### Validación Compartida

Los schemas Zod están en `application/validators/schemas.ts` y se usan tanto en:
- **Backend:** API routes validan input con `schema.safeParse()`
- **Frontend:** Los tipos se infieren con `z.infer<typeof schema>`

Esto garantiza que los contratos son siempre consistentes entre frontend y backend.

### Soft Delete

Todas las entidades principales soportan soft-delete vía `isActive`:
- **Delete** → `isActive = false` (datos preservados)
- Solo `AssignmentRule` soporta hard-delete (`permanent=true`)
- Las asignaciones históricas son **inmutables** (`isLocked = true`)

---

## Sistema de Autenticación por Módulo

El sistema implementa un modelo de autenticación **per-module**: cada módulo funcional se desbloquea independientemente con una clave admin. No existe un estado global de "admin"; cada módulo tiene su propio estado de desbloqueo.

### Arquitectura

```
┌──────────────────────────────────────────────────────────────┐
│                     UI Store (Zustand)                       │
│  adminModules: { groups: false, employees: false,            │
│                  rules: false, calendar: false, audit: false }│
│  adminPendingModule: AdminModule | null                      │
├──────────────────────────────────────────────────────────────┤
│              Admin Key Modal (shared)                        │
│  Muestra qué módulo se está desbloqueando                    │
│  Valida clave contra /api/settings (POST)                    │
├──────────────────────────────────────────────────────────────┤
│              Componentes de Protección                        │
│  ┌─ AdminGuard ─────────────────────────────────────────┐   │
│  │ Banner "Solo lectura" + botón Desbloquear            │   │
│  │ Envuelve todo el contenido del módulo                │   │
│  │ module: AdminModule (requerido)                      │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌─ AdminOnly ──────────────────────────────────────────┐   │
│  │ Renderiza children solo si módulo desbloqueado        │   │
│  │ Muestra 🔒 + tooltip si no                          │   │
│  │ module: AdminModule (requerido)                      │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### Módulos Protegidos

Los 5 módulos del sistema y su nivel de protección:

| Módulo | `AdminModule` | Protección | Patrón |
|--------|--------------|------------|--------|
| **Grupos** | `"groups"` | AdminGuard | Todo el módulo envuelto |
| **Empleados** | `"employees"` | AdminGuard | Todo el módulo envuelto |
| **Reglas** | `"rules"` | AdminGuard | Todo el módulo envuelto |
| **Calendario** | `"calendar"` | AdminOnly | Solo botones de acción (generar, filtros) |
| **Auditoría** | `"audit"` | AdminGuard | Todo el módulo envuelto (requiere desbloqueo para ver contenido) |

### Tipo AdminModule

```typescript
type AdminModule = "groups" | "employees" | "rules" | "calendar" | "audit";
```

### Flujo de Desbloqueo

```
1. Usuario intenta acción protegida en módulo X
2. AdminGuard/AdminOnly detecta que adminModules[X] !== true
3. Se muestra banner "Solo lectura" o ícono 🔒
4. Usuario hace clic en "Desbloquear"
5. Se establece adminPendingModule = X
6. AdminKeyModal se abre mostrando "Desbloquear [módulo]"
7. Usuario ingresa la clave
8. POST /api/settings con { key: "..." }
9. Si es válida → unlockModule(X) → adminModules[X] = true
10. El contenido protegido se muestra inmediatamente
```

### Componentes

**AdminGuard** — Envuelve un módulo completo. Muestra un banner amarillo "Solo lectura — ingresa la clave para configurar [módulo]" cuando está bloqueado. El contenido sigue visible (solo lectura) pero las acciones internas están protegidas con `AdminOnly`. **Excepción:** El módulo de Auditoría está completamente oculto detrás de AdminGuard (no hay modo solo lectura; sin la clave, solo se ve el banner).

**AdminOnly** — Renderiza `children` solo si el módulo está desbloqueado. Si no, muestra un ícono 🔒 que al hacer clic solicita desbloqueo. Acepta un `fallback` opcional.

**ModuleAdminBadge** — Badge en el sidebar que muestra el estado admin de cada módulo (🔓 Admin / 🔒 Bloqueado).

### Clave Admin

| Propiedad | Valor |
|-----------|-------|
| Modelo | `Settings` (`id="app"`, campo `key`) |
| Clave por defecto | `***REMOVED***` |
| Almacenamiento | BD SQLite (tabla `settings`) |
| Validación | `POST /api/settings` con `{ key }` |
| Cambio de clave | `PUT /api/settings` con `{ currentKey, newKey }` |
| Persistencia UI | `localStorage` (clave `farmatizate-ui`, campo `adminModules`) |

### Cierre Maestro

Solo el módulo de **Grupos** tiene el botón "Bloquear todo" (`LockAllButton`), que ejecuta `lockAllModules()` y bloquea todos los módulos a la vez. Este botón solo es visible cuando al menos un módulo está desbloqueado.

### Patrón de Uso en page.tsx

```tsx
{activeView === "groups" && <AdminGuard module="groups"><GroupsModule /></AdminGuard>}
{activeView === "employees" && <AdminGuard module="employees"><EmployeesModule /></AdminGuard>}
{activeView === "rules" && <AdminGuard module="rules"><RulesModule /></AdminGuard>}
{activeView === "audit" && <AdminGuard module="audit"><AuditModule /></AdminGuard>}
```

Dentro de cada módulo, las acciones específicas usan:
```tsx
<AdminOnly module="employees">
  <Button>Agregar empleado</Button>
</AdminOnly>
```
