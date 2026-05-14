# API Reference — Farmatízate Rotación de Tareas

Base URL: `http://localhost:3000/api`  
Docker: `http://localhost:4000/api`

## Convenciones

### Formato de Respuesta (Éxito)
```json
{
  "data": { ... }       // Objeto o array
}
```

### Formato de Respuesta (Error)
```json
{
  "error": "Mensaje descriptivo",
  "details": [          // Solo en validación (400)
    {
      "code": "invalid_type",
      "path": ["fieldName"],
      "message": "Descripción del error"
    }
  ]
}
```

### Códigos de Estado
| Código | Significado |
|--------|-------------|
| 200 | OK |
| 201 | Created |
| 400 | Validación fallida (Zod) |
| 404 | No encontrado |
| 409 | Conflicto (duplicado, referencia inválida) |
| 500 | Error interno del servidor |

---

## 1. Grupos (`/api/groups`)

### GET /api/groups

Lista todos los grupos de asignación.

**Query Parameters:**
| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `includeInactive` | `boolean` | `false` | Incluir grupos inactivos |

**Response 200:**
```json
{
  "data": [
    {
      "id": "cm...",
      "name": "Piso 1",
      "description": "Grupo de rotación...",
      "taskType": "cleaning",
      "color": "#1545cb",
      "isActive": true,
      "createdAt": "2026-03-01T00:00:00.000Z",
      "updatedAt": "2026-03-01T00:00:00.000Z",
      "_count": {
        "employees": 10,
        "rules": 7,
        "assignments": 45
      }
    }
  ]
}
```

---

### POST /api/groups

Crea un nuevo grupo.

**Request Body:**
```json
{
  "name": "Piso 3",
  "description": "Grupo del tercer piso",
  "taskType": "cleaning",
  "color": "#10b981"
}
```

**Contrato (Zod `createGroupSchema`):**
| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| `name` | `string` | ✅ | 1-100 caracteres |
| `description` | `string` | ❌ | Max 500 caracteres |
| `taskType` | `enum` | ✅ | `cleaning` \| `kitchen` \| `reception` \| `opening` \| `closing` \| `inventory` \| `other` |
| `color` | `string` | ✅ | Regex `^#[0-9a-fA-F]{6}$` |

**Response 201:**
```json
{
  "data": {
    "id": "cm...",
    "name": "Piso 3",
    "description": "Grupo del tercer piso",
    "taskType": "cleaning",
    "color": "#10b981",
    "isActive": true,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Response 409:** Nombre duplicado.

---

### GET /api/groups/[id]

Obtiene un grupo por ID.

**Response 200:** Mismo formato que un item del array de GET.

**Response 404:** Grupo no encontrado.

---

### PUT /api/groups/[id]

Actualiza un grupo. Todos los campos son opcionales (partial).

**Request Body:**
```json
{
  "name": "Piso 1 - Actualizado",
  "description": "Nueva descripción",
  "taskType": "kitchen",
  "color": "#f15a24",
  "isActive": false
}
```

**Contrato (Zod `updateGroupSchema`):** Igual que create pero todos los campos opcionales. `description` acepta `null`.

**Response 200:** Grupo actualizado.

---

### DELETE /api/groups/[id]

Soft-delete (desactiva el grupo, `isActive = false`).

**Response 200:** Grupo desactivado.

---

## 2. Empleados (`/api/employees`)

### GET /api/employees

Lista empleados con filtros opcionales.

**Query Parameters:**
| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `groupId` | `string` | — | Filtrar por grupo |
| `includeInactive` | `boolean` | `false` | Incluir empleados inactivos |

**Response 200:**
```json
{
  "data": [
    {
      "id": "cm...",
      "name": "Camila Guerrero",
      "position": "Asesora integral de producto",
      "area": "POS",
      "groupId": "cm...",
      "isActive": true,
      "joinDate": "2026-03-01T00:00:00.000Z",
      "leaveDate": null,
      "createdAt": "...",
      "updatedAt": "...",
      "group": {
        "id": "cm...",
        "name": "Piso 1",
        "color": "#1545cb"
      }
    }
  ]
}
```

---

### POST /api/employees

Crea un empleado.

**Request Body:**
```json
{
  "name": "Juan Pérez",
  "position": "Asesor comercial",
  "area": "Comercial",
  "groupId": "cm...",
  "joinDate": "2026-03-15"
}
```

**Contrato (Zod `createEmployeeSchema`):**
| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| `name` | `string` | ✅ | 1-100 caracteres |
| `position` | `string` | ❌ | Max 100, nullable |
| `area` | `string` | ❌ | Max 100, nullable |
| `groupId` | `string` | ✅ | Mín 1 caracter (CUID válido) |
| `joinDate` | `string` | ❌ | ISO date string |

**Response 201:** Empleado creado.

**Response 409:** Grupo no existe.

---

### GET /api/employees/[id]

Obtiene un empleado por ID.

---

### PUT /api/employees/[id]

Actualiza un empleado. Campos parciales.

**Contrato (Zod `updateEmployeeSchema`):**
| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `name` | `string` | ❌ | 1-100 chars |
| `position` | `string` | ❌ | Nullable |
| `area` | `string` | ❌ | Nullable |
| `groupId` | `string` | ❌ | Transferir de grupo |
| `isActive` | `boolean` | ❌ | Activar/desactivar |
| `leaveDate` | `string` | ❌ | Nullable, ISO date |

---

### DELETE /api/employees/[id]

Soft-delete (desactiva el empleado).

---

## 3. Reglas (`/api/rules`)

### GET /api/rules

Lista reglas de asignación con filtros.

**Query Parameters:**
| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `groupId` | `string` | — | Filtrar por grupo |
| `includeInactive` | `boolean` | `false` | Incluir reglas inactivas |

**Response 200:**
```json
{
  "data": [
    {
      "id": "cm...",
      "groupId": "cm...",
      "dayOfWeek": 2,
      "frequencyType": "weekly",
      "frequency": 1,
      "taskLabel": "Sacar Basura",
      "validFrom": "2026-03-01T00:00:00.000Z",
      "validTo": null,
      "isActive": true,
      "createdAt": "...",
      "updatedAt": "...",
      "group": {
        "id": "cm...",
        "name": "Piso 1",
        "color": "#1545cb"
      }
    }
  ]
}
```

**Valores de `dayOfWeek`:**
| Valor | Día |
|-------|-----|
| 0 | Domingo |
| 1 | Lunes |
| 2 | Martes |
| 3 | Miércoles |
| 4 | Jueves |
| 5 | Viernes |
| 6 | Sábado |

**Valores de `frequencyType`:**
| Valor | Significado |
|-------|-------------|
| `daily` | Todos los días hábiles (Lun-Vie) |
| `weekly` | Día específico cada semana |
| `monthly` | Día específico una vez al mes |

---

### POST /api/rules

Crea una regla.

**Request Body:**
```json
{
  "groupId": "cm...",
  "dayOfWeek": 2,
  "frequencyType": "weekly",
  "taskLabel": "Sacar Basura"
}
```

**Contrato (Zod `createRuleSchema`):**
| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| `groupId` | `string` | ✅ | Mín 1 caracter |
| `dayOfWeek` | `number` | ✅ | Int 0-6 |
| `frequencyType` | `enum` | ✅ | `daily` \| `weekly` \| `monthly` (default: `weekly`) |
| `frequency` | `number` | ❌ | Int 1-52 (legacy) |
| `taskLabel` | `string` | ✅ | 1-100 caracteres |
| `validFrom` | `string` | ❌ | ISO date |
| `validTo` | `string` | ❌ | ISO date, nullable |

**Unique Constraint:** `(groupId, dayOfWeek, taskLabel)` — No se pueden crear reglas duplicadas.

**Response 201:** Regla creada.

**Response 409:** Regla duplicada o grupo no existe.

---

### GET /api/rules/[id]

Obtiene una regla por ID.

---

### PUT /api/rules/[id]

Actualiza una regla. Campos parciales.

**Contrato (Zod `updateRuleSchema`):** Igual que create pero todos opcionales + `isActive`.

---

### DELETE /api/rules/[id]

Elimina una regla. Soporta soft-delete y hard-delete.

**Query Parameters:**
| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `permanent` | `boolean` | `false` | Si `true`, elimina permanentemente de la BD |

- Sin `permanent`: Soft-delete (`isActive = false`)
- Con `permanent=true`: Hard-delete (borrado permanente)

---

## 4. Asignaciones (`/api/assignments`)

### GET /api/assignments

Lista asignaciones para el calendario.

> ⚠️ **Timezone-Safe:** El parámetro `endDate` se ajusta automáticamente a `23:59:59.999Z` (end-of-day) para garantizar que todas las asignaciones del último día del rango sean incluidas, independientemente de la zona horaria del servidor o cliente. Ver [architecture.md](./architecture.md#manejo-timezone-safe-de-fechas).

**Query Parameters:**
| Param | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `groupId` | `string` | ❌ | Filtrar por grupo |
| `startDate` | `string` | ❌ | Fecha inicio (YYYY-MM-DD) |
| `endDate` | `string` | ❌ | Fecha fin (YYYY-MM-DD) |

- Si `groupId` + `startDate` + `endDate`: Asignaciones de un grupo en rango.
- Si solo `startDate` + `endDate`: Todas las asignaciones en rango.
- Sin parámetros: Todas las asignaciones.

**Response 200:**
```json
{
  "data": [
    {
      "id": "cm...",
      "groupId": "cm...",
      "employeeId": "cm...",
      "ruleId": "cm...",
      "date": "2026-03-03T00:00:00.000Z",
      "taskName": "Sacar Basura",
      "isLocked": false,
      "createdAt": "...",
      "updatedAt": "...",
      "employee": {
        "id": "cm...",
        "name": "Camila Guerrero",
        "position": "Asesora integral de producto",
        "area": "POS"
      },
      "group": {
        "id": "cm...",
        "name": "Piso 1",
        "color": "#1545cb"
      }
    }
  ]
}
```

---

### POST /api/assignments/generate

Genera asignaciones justas usando el FairnessEngine.

**Request Body:**
```json
{
  "groupId": "cm...",
  "startDate": "2026-03-01",
  "endDate": "2026-06-30"
}
```

**Contrato (Zod `generateAssignmentsSchema`):**
| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| `groupId` | `string` | ✅ | Mín 1 caracter |
| `startDate` | `string` | ✅ | ISO date, debe ser < endDate |
| `endDate` | `string` | ✅ | ISO date |

**Response 201:**
```json
{
  "data": {
    "assignments": [
      {
        "id": "cm...",
        "groupId": "cm...",
        "employeeId": "cm...",
        "ruleId": "cm...",
        "date": "2026-03-03T00:00:00.000Z",
        "taskName": "Sacar Basura",
        "isLocked": false,
        "createdAt": "...",
        "updatedAt": "...",
        "employee": { "..." },
        "group": { "..." }
      }
    ],
    "balanceReport": [
      {
        "employeeId": "cm...",
        "employeeName": "Camila Guerrero",
        "totalAssignments": 12,
        "monthlyBalance": { "2026-03": 4, "2026-04": 4, "2026-05": 4 },
        "fairnessScore": 0.5,
        "lastAssignmentDate": "2026-05-28T00:00:00.000Z",
        "consecutiveCount": 0
      }
    ],
    "generatedAt": "2026-03-01T12:00:00.000Z"
  }
}
```

---

### GET /api/assignments/balance

Obtiene el reporte de balance/equidad de un grupo.

**Query Parameters:**
| Param | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `groupId` | `string` | ✅ | ID del grupo |

**Response 200:**
```json
{
  "data": [
    {
      "employeeId": "cm...",
      "employeeName": "Camila Guerrero",
      "totalAssignments": 12,
      "monthlyBalance": { "2026-03": 4 },
      "fairnessScore": 0.5,
      "lastAssignmentDate": "2026-05-28T00:00:00.000Z",
      "consecutiveCount": 0
    }
  ]
}
```

---

## 5. Festivos (`/api/holidays`)

### GET /api/holidays

Lista festivos colombianos.

**Query Parameters:**
| Param | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `startDate` | `string` | ❌ | Fecha inicio |
| `endDate` | `string` | ❌ | Fecha fin |

**Response 200:**
```json
[
  {
    "id": "cm...",
    "date": "2026-01-01T00:00:00.000Z",
    "name": "Año Nuevo",
    "type": "national",
    "isRecurring": true,
    "isActive": true,
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

> ⚠️ **Nota:** Los festivos no envuelven en `{ data: ... }`, retornan el array directo.

---

### POST /api/holidays

Crea un festivo individual, o pobla festivos colombianos en lote.

**Crear festivo individual:**
```json
{
  "date": "2026-12-25",
  "name": "Navidad",
  "type": "national",
  "isRecurring": true
}
```

**Poblar festivos colombianos (2024-2030):**
```json
{
  "seed": true,
  "startYear": 2024,
  "endYear": 2030
}
```

---

### PATCH /api/holidays/[id]

Actualiza un festivo.

---

### DELETE /api/holidays/[id]

Elimina un festivo permanentemente.

---

## 6. Elegibilidad (`/api/eligibility`)

### GET /api/eligibility

Obtiene la elegibilidad de tareas para un empleado específico.

**Query Parameters:**
| Param | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `employeeId` | `string` | ✅ | ID del empleado |

**Response 200:**
```json
{
  "data": [
    {
      "id": "cm...",
      "employeeId": "cm...",
      "taskName": "Sacar Basura",
      "isEnabled": true
    },
    {
      "id": "cm...",
      "employeeId": "cm...",
      "taskName": "Lavar Cafetera",
      "isEnabled": false
    }
  ]
}
```

**Response 400:** `employeeId` no proporcionado.

---

### POST /api/eligibility

Activa o desactiva la elegibilidad de una tarea para un empleado.

**Request Body:**
```json
{
  "employeeId": "cm...",
  "taskName": "Lavar Cafetera",
  "isEnabled": false
}
```

**Contrato:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `employeeId` | `string` | ✅ | ID del empleado |
| `taskName` | `string` | ✅ | Nombre de la tarea |
| `isEnabled` | `boolean` | ✅ | `true` = puede hacer la tarea |

**Response 200:** Registro de elegibilidad actualizado.

**Response 404:** Empleado no encontrado.

---

## 7. Configuración (`/api/settings`)

### GET /api/settings

Obtiene la configuración de la aplicación. La clave admin nunca se expone completa.

**Response 200:**
```json
{
  "data": {
    "isConfigured": true,
    "keyHint": "fa••••",
    "createdAt": "2026-03-01T00:00:00.000Z"
  }
}
```

---

### POST /api/settings

Valida la clave admin. Usado por el modal de desbloqueo para verificar si la clave ingresada es correcta.

**Request Body:**
```json
{
  "key": "farmatizate2025"
}
```

**Contrato:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `key` | `string` | ✅ | Clave admin a validar |

**Response 200:**
```json
{
  "data": {
    "valid": true
  }
}
```

---

### PUT /api/settings

Cambia la clave admin. Requiere la clave actual y la nueva.

**Request Body:**
```json
{
  "currentKey": "farmatizate2025",
  "newKey": "nuevaclave123"
}
```

**Contrato:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `currentKey` | `string` | ✅ | Clave admin actual |
| `newKey` | `string` | ✅ | Nueva clave admin |

**Response 200:**
```json
{
  "data": {
    "message": "Clave actualizada exitosamente"
  }
}
```

**Response 401:** Clave actual incorrecta.

---

## 8. Auditoría (`/api/audit`)

### GET /api/audit

Consulta logs de auditoría con filtros.

**Query Parameters:**
| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `entityType` | `enum` | — | `group` \| `employee` \| `rule` \| `assignment` |
| `entityId` | `string` | — | ID de la entidad |
| `groupId` | `string` | — | Filtrar por grupo |
| `limit` | `number` | `50` | Resultados por página (1-100) |
| `offset` | `number` | `0` | Offset para paginación |

**Response 200:**
```json
{
  "data": [
    {
      "id": "cm...",
      "entityType": "rule",
      "entityId": "cm...",
      "action": "create",
      "changedBy": "admin",
      "changes": "{\"before\": null, \"after\": {\"taskLabel\": \"Sacar Basura\"}}",
      "groupId": "cm...",
      "createdAt": "2026-03-01T12:00:00.000Z"
    }
  ]
}
```

**Valores de `entityType`:** `group`, `employee`, `rule`, `assignment`  
**Valores de `action`:** `create`, `update`, `delete`, `deactivate`, `reactivate`, `regenerate`, `lock`

> ⚠️ **Nota:** La interfaz de auditoría en la UI requiere desbloquear el módulo admin (`AdminGuard module="audit"`). Sin la clave admin, el módulo está completamente bloqueado (no hay modo solo lectura).

---

## 9. Seed & Reset

### POST /api/seed

Puebla la BD con datos iniciales (grupos, empleados, reglas, festivos, asignaciones históricas).

- **Idempotente:** Si ya existen grupos, retorna `{ message: "Ya existen datos", skipped: true }`.
- Crea 2 grupos (Piso 1, Piso 2), 16 empleados, 14 reglas, festivos 2024-2030.
- Genera asignaciones históricas del mes pasado (locked).

**Response 200:**
```json
{
  "data": {
    "message": "Datos creados exitosamente",
    "groups": 2,
    "employees": 16,
    "rules": 14,
    "holidays": 126,
    "tasks": ["Sacar Basura (Mar, Jue)", "Lavar Cafetera (Lun-Vie)"]
  }
}
```

---

### POST /api/reset

Elimina TODOS los datos de la BD (en orden inverso de dependencias).

**Response 200:**
```json
{
  "message": "Base de datos reiniciada exitosamente"
}
```

> ⚠️ **Peligro:** Esta operación es irreversible. Elimina: auditLog → assignment → rule → employee → group → holiday.

---

## 10. Health Check

### GET /api

Endpoint raíz de verificación.

**Response 200:**
```json
{
  "message": "Hello, world!"
}
```
