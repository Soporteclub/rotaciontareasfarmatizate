# Farmatízate — Sistema de Rotación de Tareas

## Descripción General

Sistema de asignación rotativa de tareas para **Club del Droguista Farmatízate**.  
Garantiza distribución equitativa de tareas (sacar basura, lavar cafetera, etc.) entre empleados de dos pisos, usando un motor de equidad (FairnessEngine) con rotación ponderada.

### ✨ Características Principales

| Característica | Descripción |
|----------------|-------------|
| **Panel "Hoy"** | Vista rápida de las asignaciones del día actual, agrupadas por piso, con detección de fines de semana y festivos colombianos |
| **Motor de Equidad** | FairnessEngine con scoring ponderado, restricción de desbalance y cooldown entre asignaciones |
| **Detección de Festivos Colombianos** | 18 festivos oficiales calculados dinámicamente (incluida Ley Emiliani y Semana Santa) |
| **Sistema de Clave Admin por Módulo** | Cada módulo funcional se desbloquea independientemente con clave admin |
| **Manejo Timezone-Safe** | Las fechas en la API manejan correctamente zonas horarias usando end-of-day (23:59:59.999Z) para comparaciones inclusivas |
| **Elegibilidad por Empleado** | Cada empleado puede tener tareas específicas activadas/desactivadas |
| **Soft Delete** | Datos históricos preservados, asignaciones bloqueadas e inmutables |

### 🔐 Sistema de Clave Admin por Módulo

Cada módulo de configuración está protegido con una clave admin independiente. Los 5 módulos se desbloquean por separado:

| Módulo | Descripción | Protegido |
|--------|-------------|----------|
| **Grupos** | Gestión de pisos/equipos | ✅ AdminGuard |
| **Empleados** | CRUD de empleados, elegibilidad de tareas | ✅ AdminGuard |
| **Reglas** | Configuración de tareas y frecuencias | ✅ AdminGuard |
| **Calendario** | Filtros y generación de asignaciones | ✅ AdminOnly (acciones) |
| **Auditoría** | Registro de cambios del sistema | ✅ AdminGuard |

- **Clave por defecto:** `farmatizate2025`
- Cada módulo se desbloquea independientemente (ingresar la clave en uno no desbloquea los demás)
- Solo el módulo de **Grupos** tiene el botón "Bloquear todo" (cierre maestro)
- El estado de desbloqueo se persiste en `localStorage` (sobrevive recargas)
- El módulo de **Auditoría** está completamente bloqueado detrás de AdminGuard (requiere desbloqueo para ver contenido)

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router, TypeScript 5) |
| Base de Datos | SQLite via Prisma ORM |
| Estado Cliente | Zustand + TanStack Query |
| UI | Tailwind CSS 4 + shadcn/ui (New York) |
| Validación | Zod v4 (compartido frontend/backend) |
| Calendario | FullCalendar |
| Formularios | React Hook Form |
| Containerización | Docker + docker-compose |

---

## Estructura del Proyecto

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes (controladores)
│   │   ├── groups/               # CRUD de grupos
│   │   ├── employees/            # CRUD de empleados
│   │   ├── rules/                # CRUD de reglas
│   │   ├── assignments/          # Asignaciones + generación (timezone-safe)
│   │   ├── holidays/             # Festivos colombianos
│   │   ├── audit/                # Logs de auditoría (admin-locked)
│   │   ├── eligibility/          # Elegibilidad de tareas por empleado
│   │   ├── settings/             # Configuración y clave admin
│   │   ├── seed/                 # Poblado inicial
│   │   └── reset/                # Reset de BD
│   └── page.tsx                  # SPA principal
├── backend/                      # Clean Architecture
│   ├── domain/                   # Entidades puras, FairnessEngine
│   │   ├── entities/types.ts     # Tipos de dominio
│   │   ├── fairness/             # Motor de equidad
│   │   └── holidays/             # Festivos colombianos
│   ├── application/              # Casos de uso
│   │   ├── services/             # Servicios de aplicación
│   │   └── validators/           # Schemas Zod
│   └── infrastructure/           # Implementaciones
│       ├── database.ts           # Prisma client
│       └── repositories/         # Repositorios
└── frontend/                     # Presentación
    └── presentation/
        ├── components/           # Componentes React
        │   ├── layout/           # Sidebar, Providers, AdminGuard, AdminOnly
        │   ├── modules/          # Módulos funcionales
        │   │   ├── dashboard/    # Panel "Hoy" + Calendario + Filtros
        │   │   ├── groups/       # Gestión de grupos
        │   │   ├── employees/    # Gestión de empleados + elegibilidad
        │   │   ├── rules/        # Gestión de reglas
        │   │   └── audit/        # Auditoría (admin-locked)
        │   └── shared/           # Componentes compartidos
        ├── hooks/                # Custom hooks
        ├── lib/query/            # TanStack Query hooks
        └── stores/               # Zustand stores (adminModules, activeView)
```

---

## Documentación

| Documento | Descripción |
|-----------|-------------|
| [API Reference](./api-reference.md) | Endpoints, contratos, request/response |
| [Data Models](./data-models.md) | Esquema Prisma, entidades de dominio |
| [Architecture](./architecture.md) | Clean Architecture, FairnessEngine |
| [Deployment](./deployment.md) | Docker, variables de entorno |

---

## Datos Reales del Proyecto

### Grupos
| Grupo | Color | Empleados |
|-------|-------|-----------|
| Piso 1 | `#1545cb` (azul) | 10 |
| Piso 2 | `#066aab` (azul claro) | 6 |

### Tareas Configuradas
| Tarea | Días | Frecuencia |
|-------|------|-----------|
| Sacar Basura 🗑 | Martes + Jueves | Semanal |
| Lavar Cafetera ☕ | Lunes a Viernes | Semanal |

### Empleados Piso 1
Camila Guerrero, Danna Gamboa, David Rampla, Estella Puerta, Fernando Neira, Jeniffer López, Johana Filo, Julian Vélez, Karime Santamaria, Marcela Bonilla

### Empleados Piso 2
Jamiel Jackson, José Luis Mariño, Kevin López, Roberto José, Sebastian Camacho, Yirson Alejandro Ordoñez
