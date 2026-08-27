# Documentación Técnica — Farmatízate

## 1. Visión General

Farmatízate es un sistema monolítico de asignación rotativa de tareas para **Club Del Droguista**.  
El objetivo es distribuir equitativamente tareas de limpieza/operación entre empleados de cada piso/grupo, garantizando que ningún empleado acumule más asignaciones que otro.

### Características principales
- Generación de asignaciones mediante un **Motor de Equidad** con restricciones duras.
- Calendario interactivo con vista mensual.
- Gestión de grupos, empleados, reglas y elegibilidad de tareas.
- Historial de auditoría de todas las modificaciones.
- Respaldo y restauración de la base de datos.
- Documentación OpenAPI disponible en `/api/docs`.

---

## 2. Arquitectura

El proyecto sigue una **arquitectura en capas** dentro de un solo repositorio (monolito), sin microservicios.

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
│                    PostgreSQL (Neon)                         │
└──────────────────────────────────────────────────────────────┘
```

### 2.1 Capas

#### Frontend (`src/frontend/`)
- **Responsabilidad**: UI, estado del cliente, comunicación con API.
- **Tecnologías**: React 19, Zustand, TanStack Query, shadcn/ui, Tailwind CSS 4.
- **Patrón**: Módulos autocontenidos (dashboard, employees, rules, calendar, audit).

#### API Routes (`src/app/api/`)
- **Responsabilidad**: Endpoints HTTP, validación de entrada, orquestación.
- **Formato de respuesta**:
  ```json
  { "data": { ... } }       // Éxito
  { "error": "mensaje" }    // Error
  ```

#### Services (`src/backend/application/services/`)
- **Responsabilidad**: Lógica de negocio, orquestación de repositorios, auditoría.
- Servicios principales: `assignment-service`, `employee-service`, `rule-service`, `group-service`, `settings-service`, `audit-service`, `holiday-service`, `task-eligibility-service`.

#### Fairness Engine (`src/backend/domain/fairness/`)
- **Responsabilidad**: Algoritmo de distribución equitativa. Independiente y testeable.
- **Input**: empleados, reglas, historial, rango de fechas.
- **Output**: nuevas asignaciones + reporte de balance.

#### Repositories (`src/backend/infrastructure/repositories/`)
- **Responsabilidad**: Acceso a datos con Prisma ORM.
- Cada repositorio encapsula queries Prisma y expone métodos tipados.

#### Database
- **Schema**: definido en `prisma/schema.prisma`.
- **Provider**: `postgresql` (Neon en producción).

### 2.2 Flujos de datos

#### Generar Asignaciones
1. UI (RegenerateDialog) → `POST /api/assignments/generate`
2. API Route valida input → `assignmentService.generate()`
3. Service carga empleados, reglas, historial, festivos, elegibilidad
4. `FairnessEngine.generateAssignments()` calcula la distribución óptima
5. `assignmentRepository.transactionalRegenerate()` aplica cambios en transacción
6. `auditLogRepository.create()` registra la acción
7. Response → UI actualiza cache (TanStack Query invalidation)

#### Borrar Asignaciones
1. UI (DeleteDialog) → `POST /api/assignments/delete`
2. API Route → `assignmentService.deleteByGroupAndDateRange()`
3. Repository elimina asignaciones (por defecto preserva bloqueadas)
4. AuditLog registra la eliminación

---

## 3. Modelo de Datos

### 3.1 Diagrama ER (texto)

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

### 3.2 Relaciones principales
- **Group → Employee**: 1:N
- **Group → Rule**: 1:N
- **Group → Assignment**: 1:N
- **Employee → Assignment**: 1:N
- **Employee → TaskEligibility**: 1:N

### 3.3 Constraints importantes
| Tabla | Constraint | Propósito |
|-------|-----------|-----------|
| Group | `name` UNIQUE | No duplicar nombres de pisos |
| Rule | `(groupId, dayOfWeek, taskLabel)` UNIQUE | Una tarea por día por grupo |
| Assignment | `(groupId, date, taskName)` UNIQUE | Una asignación por tarea por día por grupo |
| TaskEligibility | `(employeeId, taskName)` UNIQUE | Una entrada por tarea por empleado |
| Holiday | `(date, name)` UNIQUE | No duplicar festivos |

### 3.4 Soft Delete
Los modelos **Group**, **Employee**, **Rule** y **Holiday** usan `isActive = false`:
- Nunca se borran físicamente.
- Se excluyen de queries por defecto.
- El historial de asignaciones se preserva.

### 3.5 Asignaciones Bloqueadas
El campo `isLocked` en Assignment controla la inmutabilidad:
- **`true`**: Asignación histórica, NO modificable.
- **`false`**: Asignación futura, editable.

El Motor de Equidad:
- NUNCA modifica asignaciones bloqueadas.
- Al generar, primero bloquea las pasadas que quedaron desbloqueadas.
- Solo reemplaza asignaciones futuras (desbloqueadas).

### 3.6 Tipos de datos

#### DayOfWeek
```
0 = Domingo
1 = Lunes
2 = Martes
3 = Miércoles
4 = Jueves
5 = Viernes
6 = Sábado
```

#### FrequencyType
```
"daily"   = Todos los días hábiles (Lun-Vie)
"weekly"  = Día específico de la semana
"monthly" = Primer día especificado del mes
```

#### Task Labels (tareas comunes)
```
"Sacar Basura"
"Lavar Cafetera"
"Aseo General"
"Organizar Cocina"
"Recepción"
"Apertura"
"Cierre"
```

---

## 4. Motor de Equidad

El corazón del sistema. Garantiza distribución justa con estas reglas:

| Mecanismo | Config | Efecto |
|-----------|--------|--------|
| Balance global | `balanceWeight: 5.0` | Prioriza quién tiene menos asignaciones |
| Balance mensual | `monthlyBalanceWeight: 3.0` | Equilibra dentro de cada mes |
| Cooldown | `cooldownDays: 7` | Penaliza asignar a quien ya tuvo tarea recientemente |
| Consecutivas | `consecutivePenalty: 3.0` | Penaliza semanas consecutivas con la misma tarea |
| Mismo día | **Restricción dura** | Nadie recibe 2 tareas el mismo día mientras haya otro elegible libre |
| maxImbalance | `1` | **HARD CONSTRAINT**: nadie puede tener más de 1 asignación extra que otro |

### Resultados validados
- **Diferencia máxima**: 1 asignación entre cualquier par de empleados.
- **Repeticiones consecutivas**: 0 (nunca la misma persona hace la misma tarea seguida).
- **Desviación estándar**: < 0.5 en todos los escenarios.
- **Compensación automática**: si alguien tiene más historial, los demás reciben más asignaciones nuevas.
- **Escala**: funciona desde 1 mes hasta 1 año de asignaciones.

---

## 5. API Reference

La especificación completa está disponible en `GET /api/docs` (OpenAPI 3.0.3).

### 5.1 Endpoints principales

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
| PUT | `/api/employees/{id}/task-eligibility` | Actualizar elegibilidad completa |
| PATCH | `/api/employees/{id}/task-eligibility` | Alternar una tarea |
| | **Reglas** | |
| GET | `/api/rules` | Listar reglas |
| POST | `/api/rules` | Crear regla |
| GET | `/api/rules/{id}` | Obtener regla |
| PUT | `/api/rules/{id}` | Actualizar regla |
| DELETE | `/api/rules/{id}` | Desactivar regla (soft delete) |
| DELETE | `/api/rules/{id}?permanent=true` | Eliminar permanentemente |
| | **Asignaciones** | |
| GET | `/api/assignments` | Listar asignaciones |
| POST | `/api/assignments/generate` | Generar con Motor de Equidad |
| POST | `/api/assignments/delete` | Borrar por grupo + rango de fechas |
| PATCH | `/api/assignments/{id}` | Cambiar empleado (solo desbloqueadas) |
| GET | `/api/assignments/balance` | Reporte de equidad |
| | **Festivos** | |
| GET | `/api/holidays` | Listar festivos |
| POST | `/api/holidays` | Crear festivo |
| POST | `/api/holidays?seed=true` | Semillar festivos colombianos |
| PATCH | `/api/holidays/{id}` | Actualizar festivo |
| DELETE | `/api/holidays/{id}` | Eliminar festivo |
| | **Elegibilidad** | |
| GET | `/api/eligibility?employeeId=xxx` | Consultar por empleado |
| POST | `/api/eligibility` | Alternar tarea |
| GET | `/api/task-eligibility?groupId=xxx` | Matriz completa |
| | **Respaldo** | |
| GET | `/api/backup/status` | Estado del backup |
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
| GET | `/api/health` | Health check con verificación de BD |

### 5.2 Autenticación
- Las operaciones sensibles requieren el header `x-admin-key: <clave>`.
- La clave se valida mediante `settingsService.validateKey()` comparación de tiempo constante.
- El seed devuelve la clave generada una sola vez.

---

## 6. Backup y Restauración

### 6.1 ¿Qué hace el backup?
- Exporta todas las tablas a `/data/backup.json`.
- Excluye `key` y `value` de `settings` (clave admin).
- Serializa fechas a ISO strings.
- Se almacena fuera de `/public/` (no accesible vía web).

### 6.2 Endpoints
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/backup/status` | Verifica existencia y metadatos del backup |
| POST | `/api/backup` | Crea un backup manual |
| POST | `/api/restore` | Restaura desde backup |

### 6.3 Uso
```bash
# Estado del backup
curl -H "x-admin-key: TU_CLAVE" http://localhost:3000/api/backup/status

# Crear backup
curl -X POST -H "x-admin-key: TU_CLAVE" http://localhost:3000/api/backup

# Restaurar
curl -X POST -H "x-admin-key: TU_CLAVE" http://localhost:3000/api/restore
```

### 6.4 Seguridad
- Tanto backup como restore requieren clave admin.
- El archivo se guarda en `/data/backup.json`.
- La restauración se ejecuta en transacción: si falla, la BD queda intacta.

---

## 7. Deployment

### 7.1 Docker (Producción Local)
```bash
docker-compose up --build
# App en http://localhost:3000
```

- Multi-stage build (deps → builder → runner).
- Node 22 Alpine.
- Migraciones Prisma (`migrate deploy`) al iniciar.
- Puerto 3000.
- Health check: `GET /api/health` (ejecuta `SELECT 1`).

### 7.2 Variables de entorno
| Variable | Valor | Propósito |
|----------|-------|-----------|
| DATABASE_URL | postgresql://… | Conexión PostgreSQL (Neon) |
| NODE_ENV | production | Modo producción |
| PORT | 3000 | Puerto del servidor |

> ⚠️ No uses `file:/…` (SQLite). El schema requiere PostgreSQL.

### 7.3 Desarrollo local
```bash
npm install
npm run db:push
npm run dev
```

---

## 8. Pruebas y Calidad

- **Testing**: Vitest (`npm run test`, `npm run test:watch`).
- **Lint**: ESLint (`npm run lint`).
- **Typecheck**: TypeScript (`npm run typecheck`).
- Pruebas unitarias en `src/backend/domain/fairness/__tests__` y `src/backend/domain/shared/__tests__`.

---

## 9. Seguridad

- **Clave Admin**: Operaciones sensibles requieren clave admin (header `x-admin-key`).
- **Asignaciones Bloqueadas**: Las pasadas son inmutables.
- **Soft Delete**: Empleados y grupos se desactivan, no se eliminan.
- **Auditoría**: Todas las modificaciones quedan registradas en `AuditLog`.
- **Sanitización de Backup**: La clave admin se excluye del dump.
- **Validación**: Zod schemas en API routes para prevenir entradas maliciosas.

---

## 10. Troubleshooting

### Warning de React Strict Mode en `/docs`
Si ves:
```
Using UNSAFE_componentWillReceiveProps in strict mode...
Please update the following components: ModelCollapse
```
Se debe a que `swagger-ui-react` v5.x usa ciclos de vida legacy. El proyecto monta Swagger UI de forma imperativa (sin componentes React de la librería) para mitigar el warning. Si persiste, es un issue upstream y no afecta funcionalidad.

### Backup no accesible
El backup se guarda en `/data/backup.json`, fuera de `/public/`. Para descargarlo, accede al archivo directamente en el servidor (no vía API GET por diseño).

### Health check falla
Verifica que la variable `DATABASE_URL` sea válida y que Neon/PostgreSQL esté accesible. El endpoint `/api/health` ejecuta `SELECT 1`.
