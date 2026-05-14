# Data Models — Farmatízate Rotación de Tareas

## Diagrama Entidad-Relación

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│      Group       │     │    Employee      │     │       Rule       │
├──────────────────┤     ├──────────────────┤     ├──────────────────┤
│ id: String (CUID)│◄──┐ │ id: String (CUID)│     │ id: String (CUID)│
│ name: String     │   │ │ name: String     │     │ groupId: String  │──┐
│ description:?    │   │ │ position: ?      │     │ dayOfWeek: Int   │  │
│ taskType: String │   └─│ groupId: String   │     │ frequencyType    │  │
│ color: String    │     │ isActive: Bool    │     │ frequency: Int   │  │
│ isActive: Bool   │     │ joinDate: DateTime│     │ taskLabel: Str   │  │
│ createdAt: DT    │     │ leaveDate: ?      │     │ validFrom: DT    │  │
│ updatedAt: DT    │     │ createdAt: DT     │     │ validTo: ?       │  │
└──────────────────┘     │ updatedAt: DT     │     │ isActive: Bool   │  │
                         └──────────────────┘     │ createdAt: DT    │  │
                                                  │ updatedAt: DT    │  │
┌──────────────────┐     ┌──────────────────┐     └──────────────────┘  │
│   Assignment     │     │    AuditLog      │                            │
├──────────────────┤     ├──────────────────┤     ┌──────────────────┐  │
│ id: String (CUID)│     │ id: String (CUID)│     │     Holiday      │  │
│ groupId: String  │──┐  │ entityType: Str  │     ├──────────────────┤  │
│ employeeId: Str  │  │  │ entityId: String │     │ id: String (CUID)│  │
│ ruleId: ?        │  │  │ action: String   │     │ date: DateTime   │  │
│ date: DateTime   │  │  │ changedBy: ?     │     │ name: String     │  │
│ taskName: String │  │  │ changes: ? (JSON)│     │ type: String     │  │
│ isLocked: Bool   │  │  │ groupId: ?       │──┐  │ isRecurring: Bool│  │
│ createdAt: DT    │  │  │ createdAt: DT    │  │  │ isActive: Bool   │  │
│ updatedAt: DT    │  │  └──────────────────┘  │  │ createdAt: DT    │  │
└──────────────────┘  │                        │  │ updatedAt: DT    │  │
         │            │                        │  └──────────────────┘  │
         │            └────────────────────────┴───────────────────────┘
         │                         Todos los groupId → Group
         └── employeeId → Employee

┌──────────────────┐     ┌──────────────────┐
│ TaskEligibility  │     │     Settings     │
├──────────────────┤     ├──────────────────┤
│ id: String (CUID)│     │ id: "app"        │
│ employeeId: Str  │──┐  │ key: String      │
│ taskName: String │  │  │ value: String    │
│ isEnabled: Bool  │  │  │ createdAt: DT    │
└──────────────────┘  │  │ updatedAt: DT    │
                      │  └──────────────────┘
                      └── employeeId → Employee
```

---

## Modelo: Settings

Configuración global de la aplicación. Almacena la clave admin y preferencias del sistema.  
Singleton: solo existe un registro con `id = "app"`.

| Campo | Tipo | Requerido | Default | Descripción |
|-------|------|-----------|---------|-------------|
| `id` | `String` | Auto | `"app"` | Identificador fijo (singleton) |
| `key` | `String` | ✅ | — | Nombre de la configuración (unique) |
| `value` | `String` | ❌ | `"***REMOVED***"` | Valor de la clave admin |
| `createdAt` | `DateTime` | Auto | `now()` | |
| `updatedAt` | `DateTime` | Auto | `@updatedAt` | |

**Tabla:** `settings`

**Notas:**
- El campo `key` almacena el nombre de la configuración (ej: la clave admin)
- El campo `value` almacena el valor real (ej: `***REMOVED***`)
- La API nunca expone la clave completa, solo un hint (ej: `"fa••••"`)

---

## Modelo: Group

Grupos independientes de rotación (pisos/equipos). Cada grupo tiene sus propios empleados, reglas y asignaciones.

| Campo | Tipo | Requerido | Default | Descripción |
|-------|------|-----------|---------|-------------|
| `id` | `String` | Auto | CUID | Identificador único |
| `name` | `String` | ✅ | — | Nombre del grupo (unique) |
| `description` | `String?` | ❌ | `null` | Descripción |
| `taskType` | `String` | ❌ | `"cleaning"` | Tipo de tarea del grupo |
| `color` | `String` | ❌ | `"#10b981"` | Color para el calendario |
| `isActive` | `Boolean` | ❌ | `true` | Soft-delete |
| `createdAt` | `DateTime` | Auto | `now()` | |
| `updatedAt` | `DateTime` | Auto | `@updatedAt` | |

**Tabla:** `groups`

**Task Types:** `cleaning`, `kitchen`, `reception`, `opening`, `closing`, `inventory`, `other`

**Relaciones:**
- `employees` → Employee[]
- `rules` → Rule[]
- `assignments` → Assignment[]
- `auditLogs` → AuditLog[]

---

## Modelo: Employee

Empleados con soporte para alta rotación: entrada, salida, cambio de grupo, desactivación.  
Nunca se elimina data histórica (soft-delete).

| Campo | Tipo | Requerido | Default | Descripción |
|-------|------|-----------|---------|-------------|
| `id` | `String` | Auto | CUID | |
| `name` | `String` | ✅ | — | Nombre completo |
| `position` | `String?` | ❌ | `null` | Cargo (ej: "Asesor comercial") |
| `area` | `String?` | ❌ | `null` | Área (ej: "Comercial", "POS") |
| `groupId` | `String` | ✅ | — | FK → Group |
| `isActive` | `Boolean` | ❌ | `true` | Soft-delete |
| `joinDate` | `DateTime` | ❌ | `now()` | Fecha de ingreso |
| `leaveDate` | `DateTime?` | ❌ | `null` | Fecha de salida |
| `createdAt` | `DateTime` | Auto | `now()` | |
| `updatedAt` | `DateTime` | Auto | `@updatedAt` | |

**Tabla:** `employees`
**Índices:** `groupId`, `isActive`

**Relaciones:**
- `group` → Group
- `assignments` → Assignment[]
- `eligibility` → TaskEligibility[]

---

## Modelo: Rule

Reglas configurables que definen qué tarea se rota, en qué día y con qué frecuencia.

| Campo | Tipo | Requerido | Default | Descripción |
|-------|------|-----------|---------|-------------|
| `id` | `String` | Auto | CUID | |
| `groupId` | `String` | ✅ | — | FK → Group |
| `dayOfWeek` | `Int` | ✅ | — | 0=Dom, 1=Lun, ..., 6=Sáb |
| `frequencyType` | `String` | ❌ | `"weekly"` | `daily` \| `weekly` \| `monthly` |
| `frequency` | `Int` | ❌ | `1` | Legacy: cada N semanas |
| `taskLabel` | `String` | ✅ | — | Etiqueta de tarea (ej: "Sacar Basura") |
| `validFrom` | `DateTime` | ❌ | `now()` | Inicio de vigencia |
| `validTo` | `DateTime?` | ❌ | `null` | Fin de vigencia |
| `isActive` | `Boolean` | ❌ | `true` | Soft-delete |
| `createdAt` | `DateTime` | Auto | `now()` | |
| `updatedAt` | `DateTime` | Auto | `@updatedAt` | |

**Tabla:** `rules`
**Unique Constraint:** `(groupId, dayOfWeek, taskLabel)`
**Índices:** `groupId`, `dayOfWeek`, `isActive`

**Task Labels predefinidos:**
| Label | Icono | Color |
|-------|-------|-------|
| `Sacar Basura` | 🗑 | `#f15a24` |
| `Lavar Cafetera` | ☕ | `#00cd98` |
| `Aseo General` | 🧹 | `#1545cb` |
| `Organizar Cocina` | ✨ | `#425ae0` |
| `Recepción` | 🚪 | `#066aab` |
| `Apertura` | 🔓 | `#ca8a04` |
| `Cierre` | 🔒 | `#9333ea` |

**Frequency Types:**
| Valor | Comportamiento |
|-------|---------------|
| `daily` | Aplica todos los días hábiles (Lun-Vie), `dayOfWeek` ignorado |
| `weekly` | Aplica cada semana en `dayOfWeek` |
| `monthly` | Aplica una vez al mes en `dayOfWeek` (primera ocurrencia) |

---

## Modelo: Assignment

La entidad central: quién hace qué, cuándo.  
Las asignaciones históricas están **bloqueadas** (`isLocked=true`) y son inmutables.

| Campo | Tipo | Requerido | Default | Descripción |
|-------|------|-----------|---------|-------------|
| `id` | `String` | Auto | CUID | |
| `groupId` | `String` | ✅ | — | FK → Group |
| `employeeId` | `String` | ✅ | — | FK → Employee |
| `ruleId` | `String?` | ❌ | `null` | FK → Rule |
| `date` | `DateTime` | ✅ | — | Fecha de la asignación |
| `taskName` | `String` | ✅ | — | Nombre de la tarea (de rule.taskLabel) |
| `isLocked` | `Boolean` | ❌ | `false` | Asignaciones históricas = locked |
| `createdAt` | `DateTime` | Auto | `now()` | |
| `updatedAt` | `DateTime` | Auto | `@updatedAt` | |

**Tabla:** `assignments`
**Unique Constraint:** `(groupId, date, taskName)` — Una sola persona por tarea por día por grupo.
**Índices:** `groupId+date`, `employeeId`, `isLocked`, `taskName`

> ⚠️ **Timezone-Safe:** Las consultas por rango de fechas en la API ajustan `endDate` a `23:59:59.999Z` para garantizar comparaciones inclusivas independientes de la zona horaria. Ver [architecture.md](./architecture.md#manejo-timezone-safe-de-fechas).

---

## Modelo: TaskEligibility

Define qué tareas puede o no puede hacer cada empleado. Permite desactivar tareas específicas por empleado (ej: alguien que no toma café no lava la cafetera). El FairnessEngine excluye automáticamente a los empleados con tareas desactivadas.

| Campo | Tipo | Requerido | Default | Descripción |
|-------|------|-----------|---------|-------------|
| `id` | `String` | Auto | CUID | |
| `employeeId` | `String` | ✅ | — | FK → Employee |
| `taskName` | `String` | ✅ | — | Nombre de la tarea (ej: "Sacar Basura") |
| `isEnabled` | `Boolean` | ❌ | `true` | `true` = el empleado puede hacer la tarea |

**Tabla:** `task_eligibility`
**Unique Constraint:** `(employeeId, taskName)`
**Índices:** `employeeId`

**Relaciones:**
- `employee` → Employee

**Comportamiento:**
- Cuando `isEnabled = false`, el FairnessEngine excluye al empleado de esa tarea
- La gestión de elegibilidad requiere admin (módulo "employees")
- Se accede desde el diálogo "Actividades" en la tabla de empleados

---

## Modelo: Holiday

Festivos colombianos. Usados por el FairnessEngine para omitir asignaciones en días no laborables.

| Campo | Tipo | Requerido | Default | Descripción |
|-------|------|-----------|---------|-------------|
| `id` | `String` | Auto | CUID | |
| `date` | `DateTime` | ✅ | — | Fecha exacta del festivo |
| `name` | `String` | ✅ | — | Nombre (ej: "Año Nuevo") |
| `type` | `String` | ❌ | `"national"` | `national` \| `regional` \| `local` |
| `isRecurring` | `Boolean` | ❌ | `true` | `true` = misma fecha cada año |
| `isActive` | `Boolean` | ❌ | `true` | Soft-delete |
| `createdAt` | `DateTime` | Auto | `now()` | |
| `updatedAt` | `DateTime` | Auto | `@updatedAt` | |

**Tabla:** `holidays`
**Unique Constraint:** `(date, name)`
**Índices:** `date`, `isActive`

**Tipos de festivo colombiano:**
| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| `fixed` | Fecha fija, no cambia | Año Nuevo (Ene 1) |
| `easter` | Basado en Semana Santa | Jueves Santo, Viernes Santo |
| `emiliani` | Ley Emiliani → se mueve al lunes | Reyes Magos, San José |

---

## Modelo: AuditLog

Registro completo de auditoría. Rastrea QUIÉN hizo QUÉ, CUÁNDO y QUÉ CAMBIÓ.

| Campo | Tipo | Requerido | Default | Descripción |
|-------|------|-----------|---------|-------------|
| `id` | `String` | Auto | CUID | |
| `entityType` | `String` | ✅ | — | `grupo` \| `empleado` \| `regla` \| `asignación` |
| `entityId` | `String` | ✅ | — | ID de la entidad afectada |
| `action` | `String` | ✅ | — | `crear` \| `editar` \| `eliminar` \| `desactivar` |
| `changedBy` | `String?` | ❌ | `null` | Usuario que hizo el cambio |
| `changes` | `String?` | ❌ | `null` | JSON con before/after |
| `groupId` | `String?` | ❌ | `null` | FK → Group |
| `createdAt` | `DateTime` | Auto | `now()` | |

**Tabla:** `audit_logs`
**Índices:** `entityType`, `entityId`, `createdAt`

**Relaciones:**
- `group` → Group? (opcional)

> ⚠️ **Nota:** La UI de auditoría requiere desbloquear el módulo de admin (`AdminGuard module="audit"`). Sin la clave admin, el módulo está completamente bloqueado (no hay modo solo lectura).
