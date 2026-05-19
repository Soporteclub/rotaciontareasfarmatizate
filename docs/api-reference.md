# Referencia de API

Especificación OpenAPI 3.0.3 disponible en `GET /api/docs`.

## Autenticación

La API no usa tokens. Las operaciones sensibles requieren enviar la clave admin en el body o haberla validado previamente en la UI.

## Formato de Respuestas

### Éxito
```json
{ "data": { ... } }
{ "data": [ ... ] }
```

### Error
```json
{ "error": "Descripción del error" }
```

## Endpoints

### Grupos

#### GET /api/groups
Listar grupos.

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| includeInactive | boolean | false | Incluir grupos desactivados |

**Respuesta 200**:
```json
{
  "data": [
    {
      "id": "clx...",
      "name": "Piso 1",
      "description": "Primer piso",
      "taskType": "cleaning",
      "color": "#10b981",
      "isActive": true,
      "_count": { "employees": 8 },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### POST /api/groups
Crear grupo.

**Body**:
```json
{ "name": "Piso 3", "description": "Tercer piso", "color": "#3b82f6" }
```

#### PUT /api/groups/{id}
Actualizar grupo.

#### DELETE /api/groups/{id}
Desactivar grupo (soft delete).

---

### Empleados

#### GET /api/employees
Listar empleados.

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| groupId | string | - | Filtrar por grupo |
| includeInactive | boolean | false | Incluir desactivados |

#### POST /api/employees
Crear empleado.

**Body**:
```json
{
  "name": "Juan Pérez",
  "position": "Auxiliar",
  "area": "Farmacia",
  "groupId": "clx..."
}
```

#### PUT /api/employees/{id}
Actualizar empleado. Permite cambiar grupo, estado, fechas.

#### DELETE /api/employees/{id}
Desactivar empleado (soft delete). Borra asignaciones futuras desbloqueadas.

#### GET /api/employees/{id}/task-eligibility
Obtener qué tareas puede/no puede hacer el empleado.

**Respuesta 200**:
```json
{
  "data": [
    { "taskName": "Sacar Basura", "isEnabled": true },
    { "taskName": "Lavar Cafetera", "isEnabled": false }
  ]
}
```

---

### Reglas

#### GET /api/rules
Listar reglas.

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| groupId | string | - | Filtrar por grupo |
| includeInactive | boolean | false | Incluir inactivas |

#### POST /api/rules
Crear regla.

**Body**:
```json
{
  "groupId": "clx...",
  "dayOfWeek": 1,
  "frequencyType": "weekly",
  "taskLabel": "Sacar Basura"
}
```

| Campo | Valores |
|-------|---------|
| dayOfWeek | 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb |
| frequencyType | "daily", "weekly", "monthly" |

#### PUT /api/rules/{id}
Actualizar regla.

#### DELETE /api/rules/{id}
Desactivar regla. Usar `?permanent=true` para eliminar permanentemente.

---

### Asignaciones

#### GET /api/assignments
Listar asignaciones.

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| groupId | string | No | Filtrar por grupo |
| startDate | date | No | Fecha inicio (YYYY-MM-DD) |
| endDate | date | No | Fecha fin (YYYY-MM-DD) |

#### POST /api/assignments/generate
Generar asignaciones con el Motor de Equidad.

**Body**:
```json
{
  "groupId": "clx...",
  "startDate": "2026-06-01",
  "endDate": "2026-08-31"
}
```

**Respuesta 201**:
```json
{
  "data": {
    "assignments": [...],
    "balanceReport": [...],
    "generatedAt": "2026-05-19T...",
    "groupId": "clx...",
    "dateRange": { "start": "2026-06-01", "end": "2026-08-31" }
  }
}
```

#### POST /api/assignments/delete
Borrar asignaciones por grupo y rango de fechas.

**Body**:
```json
{
  "groupId": "clx...",
  "startDate": "2026-06-01",
  "endDate": "2026-08-31"
}
```

Sin fechas: borra TODAS las asignaciones del grupo.
Con fechas: borra solo las del rango (incluye bloqueadas).

#### PATCH /api/assignments/{id}
Cambiar el empleado de una asignación (solo desbloqueadas).

**Body**:
```json
{ "employeeId": "clx..." }
```

#### GET /api/assignments/balance
Reporte de equidad por grupo.

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| groupId | string | Sí | ID del grupo |
| startDate | string | No | Fecha inicio |
| endDate | string | No | Fecha fin |

---

### Festivos

#### GET /api/holidays
Listar festivos colombianos.

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| startDate | date | Fecha inicio |
| endDate | date | Fecha fin |

#### POST /api/holidays
Crear festivo individual o semillar festivos colombianos.

**Crear individual**:
```json
{ "date": "2026-07-20", "name": "Día de la Independencia", "type": "national" }
```

**Semillar**:
```json
{ "seed": true, "startYear": 2024, "endYear": 2030 }
```

#### PATCH /api/holidays/{id}
Actualizar festivo.

#### DELETE /api/holidays/{id}
Eliminar festivo permanentemente.

---

### Elegibilidad de Tareas

#### GET /api/eligibility
Consultar elegibilidad por empleado.

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| employeeId | string | Sí |

#### POST /api/eligibility
Alternar tarea habilitada/deshabilitada.

**Body**:
```json
{ "employeeId": "clx...", "taskName": "Lavar Cafetera" }
```

#### GET /api/task-eligibility
Matriz completa de elegibilidad (todos los empleados × todas las tareas).

---

### Respaldo

#### GET /api/backup/status
Estado del último backup.

**Respuesta 200**:
```json
{
  "data": {
    "exists": true,
    "timestamp": "2026-05-19T...",
    "version": "2.1.0",
    "counts": { "groups": 2, "employees": 16, "rules": 6, "assignments": 156 }
  }
}
```

#### POST /api/backup
Crear backup de todos los datos.

#### POST /api/restore
Restaurar desde backup.

**Body**:
```json
{ "data": { ... } }
```

---

### Configuración

#### GET /api/settings
Estado de la configuración (la clave nunca se expone completa).

#### POST /api/settings
Validar clave admin.

**Body**: `{ "key": "***REMOVED***" }`

#### PUT /api/settings
Cambiar clave admin.

**Body**: `{ "currentKey": "...", "newKey": "..." }`

#### POST /api/admin/verify
Verificar clave admin.

**Body**: `{ "key": "***REMOVED***" }`

---

### Auditoría

#### GET /api/audit
Logs de auditoría.

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| entityType | string | - | group, employee, rule, assignment |
| entityId | string | - | ID de la entidad |
| groupId | string | - | Filtrar por grupo |
| limit | integer | 50 | Resultados (1-100) |
| offset | integer | 0 | Paginación |

---

### Mantenimiento

#### POST /api/seed
Sembrar datos iniciales (2 grupos, 16 empleados, reglas, festivos 2024-2030).

#### POST /api/reset
⚠️ Eliminar TODOS los datos. Operación irreversible.

#### GET /api/
Health check.

---

### Documentación

#### GET /api/docs
Especificación OpenAPI 3.0.3 en formato JSON.
