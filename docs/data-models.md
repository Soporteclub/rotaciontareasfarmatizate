# Modelo de Datos

## Diagrama ER

```
┌───────────────┐       ┌───────────────────┐
│    Group       │       │     Employee       │
│───────────────│       │───────────────────│
│ id (CUID)     │──┐    │ id (CUID)         │
│ name (unique) │  │    │ name              │
│ description   │  │    │ position          │
│ taskType      │  │    │ area              │
│ color         │  │    │ groupId (FK) ─────┤──┐
│ isActive      │  │    │ isActive          │  │
│ createdAt     │  │    │ joinDate          │  │
│ updatedAt     │  │    │ leaveDate         │  │
└───────────────┘  │    │ createdAt         │  │
                   │    │ updatedAt         │  │
                   │    └───────┬───────────┘  │
                   │            │              │
                   │    ┌───────┴────────┐     │
                   │    │                │     │
                   ▼    ▼                ▼     ▼
            ┌──────────────┐    ┌──────────────────────┐
            │  Assignment   │    │  TaskEligibility      │
            │──────────────│    │──────────────────────│
            │ id (CUID)    │    │ id (CUID)            │
            │ groupId (FK) │    │ employeeId (FK)      │
            │ employeeId(FK)│   │ taskName             │
            │ ruleId (FK)  │    │ isEnabled            │
            │ date         │    └──────────────────────┘
            │ taskName     │       @@unique(employeeId, taskName)
            │ isLocked     │
            │ createdAt    │
            │ updatedAt    │
            └──────────────┘
            @@unique(groupId, date, taskName)

┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│     Rule       │    │    Holiday     │    │   AuditLog    │
│───────────────│    │───────────────│    │───────────────│
│ id (CUID)     │    │ id (CUID)     │    │ id (CUID)     │
│ groupId (FK)  │    │ date          │    │ entityType    │
│ dayOfWeek     │    │ name          │    │ entityId      │
│ frequencyType │    │ type          │    │ action        │
│ frequency     │    │ isRecurring   │    │ changedBy     │
│ taskLabel     │    │ isActive      │    │ changes (JSON)│
│ validFrom     │    │ createdAt     │    │ groupId (FK)  │
│ validTo       │    │ updatedAt     │    │ createdAt     │
│ isActive      │    └───────────────┘    └───────────────┘
│ createdAt     │    @@unique(date, name)
│ updatedAt     │
└───────────────┘
@@unique(groupId, dayOfWeek, taskLabel)

┌───────────────┐
│   Settings     │
│───────────────│
│ id ("app")    │
│ key (unique)  │
│ value         │
│ createdAt     │
│ updatedAt     │
└───────────────┘
```

## Constraints Importantes

| Tabla | Constraint | Propósito |
|-------|-----------|-----------|
| Group | `name` UNIQUE | No duplicar nombres de pisos |
| Rule | `(groupId, dayOfWeek, taskLabel)` UNIQUE | Una tarea por día por grupo |
| Assignment | `(groupId, date, taskName)` UNIQUE | Una asignación por tarea por día por grupo |
| TaskEligibility | `(employeeId, taskName)` UNIQUE | Una entrada por tarea por empleado |
| Holiday | `(date, name)` UNIQUE | No duplicar festivos |

## Soft Delete

Los modelos **Group**, **Employee**, **Rule** y **Holiday** usan soft delete (`isActive = false`):
- Nunca se borran físicamente
- Se excluyen de queries por defecto
- El historial de asignaciones se preserva

## Asignaciones Bloqueadas

El campo `isLocked` en Assignment controla la inmutabilidad:
- **`true`**: Asignación histórica (fecha pasada), NO modificable
- **`false`**: Asignación futura, editable

El Motor de Equidad:
- NUNCA modifica asignaciones bloqueadas
- Al generar, primero bloquea las pasadas que quedaron desbloqueadas
- Solo reemplaza asignaciones futuras (desbloqueadas)

## Tipos de Datos

### DayOfWeek
```
0 = Domingo
1 = Lunes
2 = Martes
3 = Miércoles
4 = Jueves
5 = Viernes
6 = Sábado
```

### FrequencyType
```
"daily"   = Todos los días hábiles (Lun-Vie)
"weekly"  = Día específico de la semana
"monthly" = Primer día especificado del mes
```

### Task Labels (tareas comunes)
```
"Sacar Basura"
"Lavar Cafetera"
"Aseo General"
"Organizar Cocina"
"Recepción"
"Apertura"
"Cierre"
```
