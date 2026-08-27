// OpenAPI 3.0.3 Specification — Farmatízate API
// Auto-maintained: update this file when routes change

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Farmatízate — API de Rotación de Tareas",
    description:
      "Sistema de asignación rotativa de tareas para Club Del Droguista. " +
      "Gestiona grupos (pisos), empleados, reglas de rotación, asignaciones equitativas, " +
      "festivos colombianos, elegibilidad de tareas, respaldo/restauración y auditoría. " +
      "El motor de equidad garantiza distribución justa.",
    version: "2.1.0",
    contact: {
      name: "Farmatízate - Club Del Droguista",
    },
    license: {
      name: "Propietario",
    },
  },
  servers: [
    {
      url: "/api",
      description: "API del servidor actual",
    },
  ],
  tags: [
    { name: "Grupos", description: "Gestión de grupos/pisos de trabajo" },
    { name: "Empleados", description: "Gestión de empleados que rotan tareas" },
    { name: "Reglas", description: "Reglas de rotación (qué tarea, qué día, qué frecuencia)" },
    { name: "Asignaciones", description: "Asignaciones generadas por el motor de equidad" },
    { name: "Festivos", description: "Días festivos colombianos (no se asignan tareas)" },
    { name: "Elegibilidad", description: "Tareas que cada empleado puede o no realizar" },
    { name: "Task Eligibility", description: "Elegibilidad de tareas por empleado y grupo (matriz)" },
    { name: "Backup", description: "Respaldo y restauración de la base de datos" },
    { name: "Admin", description: "Verificación de clave administrativa" },
    { name: "Auditoría", description: "Registro de cambios en el sistema" },
    { name: "Configuración", description: "Clave admin y ajustes del sistema" },
    { name: "Mantenimiento", description: "Seed, reset y health check" },
    { name: "Documentación", description: "Especificación OpenAPI de la API" },
  ],
  paths: {
    // ────────────────────────────────────────────────────────────────
    // GRUPOS
    // ────────────────────────────────────────────────────────────────
    "/groups": {
      get: {
        tags: ["Grupos"],
        summary: "Listar todos los grupos",
        description: "Obtiene la lista de grupos (pisos de trabajo). Opcionalmente incluye inactivos.",
        operationId: "getGroups",
        parameters: [
          {
            name: "includeInactive",
            in: "query",
            description: "Incluir grupos inactivos (soft-deleted)",
            required: false,
            schema: { type: "boolean", default: false },
          },
        ],
        responses: {
          "200": {
            description: "Lista de grupos",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Group" },
                    },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      post: {
        tags: ["Grupos"],
        summary: "Crear un grupo",
        description: "Crea un nuevo grupo/piso de trabajo.",
        operationId: "createGroup",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateGroupInput" },
            },
          },
        },
        responses: {
          "201": {
            description: "Grupo creado exitosamente",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { data: { $ref: "#/components/schemas/Group" } },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "409": { $ref: "#/components/responses/Conflict" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/groups/{id}": {
      get: {
        tags: ["Grupos"],
        summary: "Obtener un grupo por ID",
        operationId: "getGroupById",
        parameters: [{ $ref: "#/components/parameters/GroupId" }],
        responses: {
          "200": {
            description: "Grupo encontrado",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { data: { $ref: "#/components/schemas/Group" } },
                },
              },
            },
          },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      put: {
        tags: ["Grupos"],
        summary: "Actualizar un grupo",
        operationId: "updateGroup",
        parameters: [{ $ref: "#/components/parameters/GroupId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateGroupInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Grupo actualizado",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { data: { $ref: "#/components/schemas/Group" } },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      delete: {
        tags: ["Grupos"],
        summary: "Eliminar un grupo (soft delete)",
        description: "Desactiva el grupo sin borrar el registro histórico.",
        operationId: "deleteGroup",
        parameters: [{ $ref: "#/components/parameters/GroupId" }],
        responses: {
          "200": {
            description: "Grupo desactivado",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { data: { $ref: "#/components/schemas/Group" } },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },

    // ────────────────────────────────────────────────────────────────
    // EMPLEADOS
    // ────────────────────────────────────────────────────────────────
    "/employees": {
      get: {
        tags: ["Empleados"],
        summary: "Listar empleados",
        description: "Obtiene la lista de empleados. Se puede filtrar por grupo e incluir inactivos.",
        operationId: "getEmployees",
        parameters: [
          {
            name: "groupId",
            in: "query",
            description: "Filtrar por grupo/piso",
            required: false,
            schema: { type: "string" },
          },
          {
            name: "includeInactive",
            in: "query",
            description: "Incluir empleados inactivos",
            required: false,
            schema: { type: "boolean", default: false },
          },
        ],
        responses: {
          "200": {
            description: "Lista de empleados",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Employee" },
                    },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      post: {
        tags: ["Empleados"],
        summary: "Crear un empleado",
        description: "Crea un nuevo empleado en un grupo/piso.",
        operationId: "createEmployee",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateEmployeeInput" },
            },
          },
        },
        responses: {
          "201": {
            description: "Empleado creado exitosamente",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { data: { $ref: "#/components/schemas/Employee" } },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "409": { $ref: "#/components/responses/Conflict" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/employees/{id}": {
      get: {
        tags: ["Empleados"],
        summary: "Obtener un empleado por ID",
        operationId: "getEmployeeById",
        parameters: [{ $ref: "#/components/parameters/EmployeeId" }],
        responses: {
          "200": {
            description: "Empleado encontrado",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { data: { $ref: "#/components/schemas/Employee" } },
                },
              },
            },
          },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      put: {
        tags: ["Empleados"],
        summary: "Actualizar un empleado",
        description: "Actualiza los datos del empleado. Permite cambiar nombre, cargo, área, grupo, fechas y estado.",
        operationId: "updateEmployee",
        parameters: [{ $ref: "#/components/parameters/EmployeeId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateEmployeeInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Empleado actualizado",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { data: { $ref: "#/components/schemas/Employee" } },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      delete: {
        tags: ["Empleados"],
        summary: "Eliminar un empleado (soft delete)",
        description: "Desactiva el empleado sin borrar su historial de asignaciones.",
        operationId: "deleteEmployee",
        parameters: [{ $ref: "#/components/parameters/EmployeeId" }],
        responses: {
          "200": {
            description: "Empleado desactivado",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { data: { $ref: "#/components/schemas/Employee" } },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/employees/{id}/task-eligibility": {
      get: {
        tags: ["Task Eligibility"],
        summary: "Obtener elegibilidad de tareas de un empleado",
        description:
          "Obtiene la lista completa de tareas con su estado de elegibilidad para un empleado específico.",
        operationId: "getEmployeeTaskEligibility",
        parameters: [{ $ref: "#/components/parameters/EmployeeId" }],
        responses: {
          "200": {
            description: "Elegibilidad de tareas del empleado",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/EmployeeTaskEligibilityItem" },
                    },
                  },
                },
              },
            },
          },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      put: {
        tags: ["Task Eligibility"],
        summary: "Actualizar elegibilidad de tareas de un empleado (reemplazo completo)",
        description:
          "Reemplaza la configuración completa de elegibilidad de tareas para un empleado. " +
          "Envía el arreglo completo de { taskLabel, isActive }.",
        operationId: "updateEmployeeTaskEligibility",
        parameters: [{ $ref: "#/components/parameters/EmployeeId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateEmployeeTaskEligibilityInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Elegibilidad de tareas actualizada",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/EmployeeTaskEligibilityItem" },
                    },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      patch: {
        tags: ["Task Eligibility"],
        summary: "Alternar elegibilidad de una tarea para un empleado",
        description:
          "Activa o desactiva una única tarea específica para un empleado.",
        operationId: "toggleEmployeeTaskEligibility",
        parameters: [{ $ref: "#/components/parameters/EmployeeId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ToggleEmployeeTaskEligibilityInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Elegibilidad de tarea actualizada",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { $ref: "#/components/schemas/EmployeeTaskEligibilityItem" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },

    // ────────────────────────────────────────────────────────────────
    // REGLAS
    // ────────────────────────────────────────────────────────────────
    "/rules": {
      get: {
        tags: ["Reglas"],
        summary: "Listar reglas de rotación",
        description:
          "Obtiene las reglas que definen qué tarea se hace qué día. Se puede filtrar por grupo.",
        operationId: "getRules",
        parameters: [
          {
            name: "groupId",
            in: "query",
            description: "Filtrar por grupo/piso",
            required: false,
            schema: { type: "string" },
          },
          {
            name: "includeInactive",
            in: "query",
            description: "Incluir reglas inactivas",
            required: false,
            schema: { type: "boolean", default: false },
          },
        ],
        responses: {
          "200": {
            description: "Lista de reglas",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Rule" },
                    },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      post: {
        tags: ["Reglas"],
        summary: "Crear una regla de rotación",
        description:
          "Define qué tarea se hace qué día y con qué frecuencia para un grupo.",
        operationId: "createRule",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateRuleInput" },
            },
          },
        },
        responses: {
          "201": {
            description: "Regla creada exitosamente",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { data: { $ref: "#/components/schemas/Rule" } },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "409": { $ref: "#/components/responses/Conflict" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/rules/{id}": {
      get: {
        tags: ["Reglas"],
        summary: "Obtener una regla por ID",
        operationId: "getRuleById",
        parameters: [{ $ref: "#/components/parameters/RuleId" }],
        responses: {
          "200": {
            description: "Regla encontrada",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { data: { $ref: "#/components/schemas/Rule" } },
                },
              },
            },
          },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      put: {
        tags: ["Reglas"],
        summary: "Actualizar una regla",
        operationId: "updateRule",
        parameters: [{ $ref: "#/components/parameters/RuleId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateRuleInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Regla actualizada",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { data: { $ref: "#/components/schemas/Rule" } },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      delete: {
        tags: ["Reglas"],
        summary: "Eliminar una regla",
        description:
          "Soft delete por defecto. Usar `?permanent=true` para eliminación permanente.",
        operationId: "deleteRule",
        parameters: [
          { $ref: "#/components/parameters/RuleId" },
          {
            name: "permanent",
            in: "query",
            description: "Eliminación permanente (hard delete)",
            required: false,
            schema: { type: "boolean", default: false },
          },
        ],
        responses: {
          "200": {
            description: "Regla eliminada",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { data: { $ref: "#/components/schemas/Rule" } },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },

    // ────────────────────────────────────────────────────────────────
    // ASIGNACIONES
    // ────────────────────────────────────────────────────────────────
    "/assignments": {
      get: {
        tags: ["Asignaciones"],
        summary: "Listar asignaciones",
        description:
          "Obtiene las asignaciones de tareas, opcionalmente filtradas por grupo y rango de fechas.",
        operationId: "getAssignments",
        parameters: [
          {
            name: "groupId",
            in: "query",
            description: "Filtrar por grupo/piso",
            required: false,
            schema: { type: "string" },
          },
          {
            name: "startDate",
            in: "query",
            description: "Fecha inicio (ISO 8601)",
            required: false,
            schema: { type: "string", format: "date" },
          },
          {
            name: "endDate",
            in: "query",
            description: "Fecha fin (ISO 8601). Se ajusta automáticamente a 23:59:59.",
            required: false,
            schema: { type: "string", format: "date" },
          },
        ],
        responses: {
          "200": {
            description: "Lista de asignaciones",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Assignment" },
                    },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/assignments/{id}": {
      patch: {
        tags: ["Asignaciones"],
        summary: "Actualizar empleado de una asignación",
        description:
          "Cambia el empleado asignado a una tarea. Solo se puede modificar si la asignación NO está bloqueada (isLocked=false). " +
          "Las asignaciones históricas (bloqueadas) son inmutables.",
        operationId: "updateAssignment",
        parameters: [{ $ref: "#/components/parameters/AssignmentId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateAssignmentInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Asignación actualizada",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { data: { $ref: "#/components/schemas/Assignment" } },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/assignments/generate": {
      post: {
        tags: ["Asignaciones"],
        summary: "Generar asignaciones equitativas",
        description:
          "Usa el **Motor de Equidad** para generar asignaciones rotativas justas. " +
          "Respeta elegibilidad, festivos, fechas de ingreso/salida y busca distribución equilibrada.",
        operationId: "generateAssignments",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GenerateAssignmentsInput" },
            },
          },
        },
        responses: {
          "201": {
            description: "Asignaciones generadas exitosamente",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        generated: { type: "integer", description: "Cantidad de asignaciones creadas" },
                        groupId: { type: "string" },
                        dateRange: {
                          type: "object",
                          properties: {
                            start: { type: "string", format: "date" },
                            end: { type: "string", format: "date" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/assignments/delete": {
      post: {
        tags: ["Asignaciones"],
        summary: "Eliminar asignaciones por grupo y rango de fechas",
        description:
          "Elimina asignaciones de un grupo. Sin fechas: elimina TODAS las asignaciones del grupo. " +
          "Con fechas: elimina asignaciones dentro del rango (incluye bloqueadas).",
        operationId: "deleteAssignments",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/DeleteAssignmentsInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Asignaciones eliminadas",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        deletedCount: { type: "integer", description: "Cantidad de asignaciones eliminadas" },
                        message: { type: "string", example: "Se eliminaron 5 asignaciones" },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/assignments/balance": {
      get: {
        tags: ["Asignaciones"],
        summary: "Reporte de balance/equidad",
        description:
          "Obtiene el reporte de balance por empleado, mostrando cuántas asignaciones tiene cada uno, " +
          "su puntuación de equidad y el rango de fechas cubierto.",
        operationId: "getBalanceReport",
        parameters: [
          {
            name: "groupId",
            in: "query",
            description: "ID del grupo (requerido)",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "startDate",
            in: "query",
            description: "Fecha inicio del rango (ISO 8601)",
            required: false,
            schema: { type: "string", format: "date" },
          },
          {
            name: "endDate",
            in: "query",
            description: "Fecha fin del rango (ISO 8601)",
            required: false,
            schema: { type: "string", format: "date" },
          },
        ],
        responses: {
          "200": {
            description: "Reporte de balance",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { $ref: "#/components/schemas/BalanceReport" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },

    // ────────────────────────────────────────────────────────────────
    // FESTIVOS
    // ────────────────────────────────────────────────────────────────
    "/holidays": {
      get: {
        tags: ["Festivos"],
        summary: "Listar festivos",
        description: "Obtiene los días festivos colombianos. Se puede filtrar por rango de fechas.",
        operationId: "getHolidays",
        parameters: [
          {
            name: "startDate",
            in: "query",
            description: "Fecha inicio (ISO 8601)",
            required: false,
            schema: { type: "string", format: "date" },
          },
          {
            name: "endDate",
            in: "query",
            description: "Fecha fin (ISO 8601)",
            required: false,
            schema: { type: "string", format: "date" },
          },
        ],
        responses: {
          "200": {
            description: "Lista de festivos",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Holiday" },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      post: {
        tags: ["Festivos"],
        summary: "Crear festivo o semillar festivos colombianos",
        description:
          "Crea un festivo individual O siembra festivos colombianos para un rango de años usando `{ seed: true }`.",
        operationId: "createHoliday",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                oneOf: [
                  { $ref: "#/components/schemas/CreateHolidayInput" },
                  { $ref: "#/components/schemas/SeedHolidaysInput" },
                ],
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Festivo creado o semillado",
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    { $ref: "#/components/schemas/Holiday" },
                    {
                      type: "object",
                      properties: {
                        created: { type: "integer" },
                        skipped: { type: "integer" },
                      },
                    },
                  ],
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/holidays/{id}": {
      patch: {
        tags: ["Festivos"],
        summary: "Actualizar un festivo",
        operationId: "updateHoliday",
        parameters: [{ $ref: "#/components/parameters/HolidayId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateHolidayInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Festivo actualizado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Holiday" },
              },
            },
          },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      delete: {
        tags: ["Festivos"],
        summary: "Eliminar un festivo",
        description: "Elimina permanentemente un festivo.",
        operationId: "deleteHoliday",
        parameters: [{ $ref: "#/components/parameters/HolidayId" }],
        responses: {
          "200": {
            description: "Festivo eliminado",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Festivo eliminado" },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },

    // ────────────────────────────────────────────────────────────────
    // ELEGIBILIDAD (legacy endpoint)
    // ────────────────────────────────────────────────────────────────
    "/eligibility": {
      get: {
        tags: ["Elegibilidad"],
        summary: "Consultar elegibilidad de tareas por empleado",
        description:
          "Obtiene qué tareas puede o no realizar un empleado específico.",
        operationId: "getEligibility",
        parameters: [
          {
            name: "employeeId",
            in: "query",
            description: "ID del empleado (requerido)",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Elegibilidad del empleado",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/TaskEligibility" },
                    },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      post: {
        tags: ["Elegibilidad"],
        summary: "Alternar elegibilidad de tarea",
        description:
          "Activa o desactiva una tarea específica para un empleado. " +
          "Si se desactiva, las asignaciones futuras de esa tarea se eliminan automáticamente.",
        operationId: "toggleEligibility",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ToggleEligibilityInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Elegibilidad actualizada",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { $ref: "#/components/schemas/ToggleEligibilityResponse" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },

    // ────────────────────────────────────────────────────────────────
    // TASK ELIGIBILITY (group matrix)
    // ────────────────────────────────────────────────────────────────
    "/task-eligibility": {
      get: {
        tags: ["Task Eligibility"],
        summary: "Obtener matriz de elegibilidad de tareas por grupo",
        description:
          "Obtiene la matriz de empleados × tareas con su estado de elegibilidad para un grupo completo.",
        operationId: "getTaskEligibilityMatrix",
        parameters: [
          {
            name: "groupId",
            in: "query",
            description: "ID del grupo (requerido)",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Matriz de elegibilidad del grupo",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/EmployeeTaskEligibilityItem" },
                    },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },

    // ────────────────────────────────────────────────────────────────
    // BACKUP
    // ────────────────────────────────────────────────────────────────
    "/backup/status": {
      get: {
        tags: ["Backup"],
        summary: "Verificar estado del backup",
        description:
          "Verifica si existe un archivo de backup y devuelve sus metadatos (timestamp, versión, conteos).",
        operationId: "getBackupStatus",
        responses: {
          "200": {
            description: "Estado del backup",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BackupStatusResponse" },
              },
            },
          },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/backup": {
      get: {
        tags: ["Backup"],
        summary: "Exportar y guardar backup",
        description:
          "Exporta todos los datos de la base de datos a un archivo JSON y lo guarda en el servidor.",
        operationId: "exportBackup",
        responses: {
          "200": {
            description: "Backup creado exitosamente",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BackupResponse" },
              },
            },
          },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      post: {
        tags: ["Backup"],
        summary: "Crear backup manual",
        description:
          "Crea un backup manual de todos los datos de la base de datos.",
        operationId: "createBackup",
        responses: {
          "200": {
            description: "Backup manual creado exitosamente",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BackupResponse" },
              },
            },
          },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/restore": {
      post: {
        tags: ["Backup"],
        summary: "Restaurar base de datos desde backup",
        description:
          "Restaura la base de datos completa desde el archivo de backup más reciente. " +
          "⚠️ Elimina todos los datos actuales y los reemplaza con los del backup.",
        operationId: "restoreBackup",
        responses: {
          "200": {
            description: "Base de datos restaurada exitosamente",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RestoreResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },

    // ────────────────────────────────────────────────────────────────
    // ADMIN
    // ────────────────────────────────────────────────────────────────
    "/admin/verify": {
      post: {
        tags: ["Admin"],
        summary: "Verificar clave admin",
        description:
          "Verifica si una clave admin es válida. Usado para desbloquear funciones administrativas.",
        operationId: "verifyAdminKey",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AdminVerifyInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Resultado de verificación",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AdminVerifyResponse" },
              },
            },
          },
          "400": {
            description: "Clave requerida",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        valid: { type: "boolean", example: false },
                        error: { type: "string", example: "Clave requerida" },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Clave incorrecta",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        valid: { type: "boolean", example: false },
                        error: { type: "string", example: "Clave incorrecta" },
                      },
                    },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },

    // ────────────────────────────────────────────────────────────────
    // AUDITORÍA
    // ────────────────────────────────────────────────────────────────
    "/audit": {
      get: {
        tags: ["Auditoría"],
        summary: "Consultar logs de auditoría",
        description:
          "Obtiene el registro de cambios en el sistema. Se puede filtrar por tipo de entidad, ID y grupo.",
        operationId: "getAuditLogs",
        parameters: [
          {
            name: "entityType",
            in: "query",
            description: "Tipo de entidad",
            required: false,
            schema: { type: "string", enum: ["group", "employee", "rule", "assignment"] },
          },
          {
            name: "entityId",
            in: "query",
            description: "ID de la entidad",
            required: false,
            schema: { type: "string" },
          },
          {
            name: "groupId",
            in: "query",
            description: "Filtrar por grupo",
            required: false,
            schema: { type: "string" },
          },
          {
            name: "limit",
            in: "query",
            description: "Cantidad de resultados (1-100)",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 100, default: 50 },
          },
          {
            name: "offset",
            in: "query",
            description: "Desplazamiento para paginación",
            required: false,
            schema: { type: "integer", minimum: 0, default: 0 },
          },
        ],
        responses: {
          "200": {
            description: "Logs de auditoría",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/AuditLog" },
                    },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },

    // ────────────────────────────────────────────────────────────────
    // CONFIGURACIÓN
    // ────────────────────────────────────────────────────────────────
    "/settings": {
      get: {
        tags: ["Configuración"],
        summary: "Obtener configuración del sistema",
        description:
          "Devuelve el estado de la configuración. La clave admin nunca se expone completa.",
        operationId: "getSettings",
        responses: {
          "200": {
            description: "Configuración del sistema",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        isConfigured: { type: "boolean" },
                        keyHint: { type: "string", nullable: true, example: "fa••••" },
                        createdAt: { type: "string", format: "date-time", nullable: true },
                      },
                    },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      post: {
        tags: ["Configuración"],
        summary: "Validar clave admin",
        description: "Verifica si una clave admin es válida.",
        operationId: "validateAdminKey",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["key"],
                properties: {
                  key: { type: "string", description: "Clave admin a validar" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Resultado de validación",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        valid: { type: "boolean" },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      put: {
        tags: ["Configuración"],
        summary: "Cambiar clave admin",
        description: "Actualiza la clave admin. Requiere la clave actual y la nueva.",
        operationId: "updateAdminKey",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["currentKey", "newKey"],
                properties: {
                  currentKey: { type: "string", description: "Clave admin actual" },
                  newKey: { type: "string", description: "Nueva clave admin" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Clave actualizada",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        message: { type: "string", example: "Clave actualizada exitosamente" },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },

    // ────────────────────────────────────────────────────────────────
    // MANTENIMIENTO
    // ────────────────────────────────────────────────────────────────
    "/seed": {
      post: {
        tags: ["Mantenimiento"],
        summary: "Sembrar datos iniciales",
        description:
          "Puebla la base de datos con datos de ejemplo: 2 grupos (Piso 1, Piso 2), " +
          "16 empleados reales, reglas de rotación, festivos colombianos (2024-2030) y asignaciones históricas.",
        operationId: "seedDatabase",
        responses: {
          "200": {
            description: "Datos sembrados exitosamente",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    groups: { type: "integer" },
                    employees: { type: "integer" },
                    rules: { type: "integer" },
                    holidays: { type: "integer" },
                    tasks: { type: "array", items: { type: "string" } },
                    skipped: { type: "boolean", description: "True si ya existían datos" },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/reset": {
      post: {
        tags: ["Mantenimiento"],
        summary: "Reiniciar base de datos",
        description:
          "⚠️ Elimina TODOS los datos (asignaciones, reglas, empleados, grupos, festivos, configuración, auditoría). " +
          "Operación irreversible.",
        operationId: "resetDatabase",
        responses: {
          "200": {
            description: "Base de datos reiniciada",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Base de datos reiniciada exitosamente" },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },

    // ────────────────────────────────────────────────────────────────
    // DOCUMENTACIÓN
    // ────────────────────────────────────────────────────────────────
    "/docs": {
      get: {
        tags: ["Documentación"],
        summary: "Obtener especificación OpenAPI",
        description: "Devuelve la especificación OpenAPI 3.0.3 completa de la API en formato JSON.",
        operationId: "getOpenApiSpec",
        responses: {
          "200": {
            description: "Especificación OpenAPI 3.0.3",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  description: "Especificación OpenAPI 3.0.3 completa",
                },
              },
            },
          },
        },
      },
    },

    // ────────────────────────────────────────────────────────────────
    // RAÍZ
    // ────────────────────────────────────────────────────────────────
    "/": {
      get: {
        tags: ["Mantenimiento"],
        summary: "Health check",
        description: "Verifica que la API está funcionando.",
        operationId: "healthCheck",
        responses: {
          "200": {
            description: "API funcionando",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Hello, world!" },
                  },
                },
              },
            },
          },
        },
      },
    },
  },

  // ──────────────────────────────────────────────────────────────────
  // COMPONENTS
  // ──────────────────────────────────────────────────────────────────
  components: {
    parameters: {
      GroupId: {
        name: "id",
        in: "path",
        description: "ID del grupo (CUID)",
        required: true,
        schema: { type: "string" },
      },
      EmployeeId: {
        name: "id",
        in: "path",
        description: "ID del empleado (CUID)",
        required: true,
        schema: { type: "string" },
      },
      RuleId: {
        name: "id",
        in: "path",
        description: "ID de la regla (CUID)",
        required: true,
        schema: { type: "string" },
      },
      HolidayId: {
        name: "id",
        in: "path",
        description: "ID del festivo (CUID)",
        required: true,
        schema: { type: "string" },
      },
      AssignmentId: {
        name: "id",
        in: "path",
        description: "ID de la asignación (CUID)",
        required: true,
        schema: { type: "string" },
      },
    },
    schemas: {
      // ── Domain Models ──────────────────────────────────────────
      Group: {
        type: "object",
        properties: {
          id: { type: "string", description: "CUID" },
          name: { type: "string", example: "Piso 1" },
          description: { type: "string", nullable: true, example: "Grupo de rotación Piso 1" },
          taskType: { type: "string", enum: ["cleaning", "kitchen", "reception", "opening", "closing", "inventory", "other"], example: "cleaning" },
          color: { type: "string", pattern: "^#[0-9a-fA-F]{6}$", example: "#10b981" },
          isActive: { type: "boolean", example: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Employee: {
        type: "object",
        properties: {
          id: { type: "string", description: "CUID" },
          name: { type: "string", example: "Juan Perez" },
          position: { type: "string", nullable: true, example: "Asesora integral de producto" },
          area: { type: "string", nullable: true, example: "POS" },
          groupId: { type: "string" },
          isActive: { type: "boolean", example: true },
          joinDate: { type: "string", format: "date-time" },
          leaveDate: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Rule: {
        type: "object",
        properties: {
          id: { type: "string", description: "CUID" },
          groupId: { type: "string" },
          dayOfWeek: { type: "integer", minimum: 0, maximum: 6, description: "0=Dom, 1=Lun, ..., 6=Sáb", example: 2 },
          frequencyType: { type: "string", enum: ["daily", "weekly", "monthly"], example: "weekly" },
          frequency: { type: "integer", example: 1, description: "Cada N semanas (legacy)" },
          taskLabel: { type: "string", example: "Sacar Basura" },
          validFrom: { type: "string", format: "date-time" },
          validTo: { type: "string", format: "date-time", nullable: true },
          isActive: { type: "boolean", example: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Assignment: {
        type: "object",
        properties: {
          id: { type: "string", description: "CUID" },
          groupId: { type: "string" },
          employeeId: { type: "string" },
          ruleId: { type: "string", nullable: true },
          date: { type: "string", format: "date-time" },
          taskName: { type: "string", example: "Sacar Basura" },
          isLocked: { type: "boolean", description: "true = histórico inmutable", example: false },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Holiday: {
        type: "object",
        properties: {
          id: { type: "string", description: "CUID" },
          date: { type: "string", format: "date-time" },
          name: { type: "string", example: "Año Nuevo" },
          type: { type: "string", example: "national", description: "Tipo: fixed, easter, emiliani, national" },
          isRecurring: { type: "boolean", example: true },
          isActive: { type: "boolean", example: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      TaskEligibility: {
        type: "object",
        properties: {
          id: { type: "string", description: "CUID" },
          employeeId: { type: "string" },
          taskName: { type: "string", example: "Sacar Basura" },
          isEnabled: { type: "boolean", example: true },
        },
      },
      AuditLog: {
        type: "object",
        properties: {
          id: { type: "string", description: "CUID" },
          entityType: { type: "string", enum: ["group", "employee", "rule", "assignment"] },
          entityId: { type: "string" },
          action: { type: "string", example: "create" },
          changedBy: { type: "string", nullable: true, example: "admin" },
          changes: { type: "string", nullable: true, description: "JSON con antes/después" },
          groupId: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      BalanceReport: {
        type: "object",
        properties: {
          groupId: { type: "string" },
          groupName: { type: "string" },
          dateRange: {
            type: "object",
            properties: {
              from: { type: "string", format: "date-time" },
              to: { type: "string", format: "date-time" },
            },
          },
          employees: {
            type: "array",
            items: {
              type: "object",
              properties: {
                employeeId: { type: "string" },
                employeeName: { type: "string" },
                totalAssignments: { type: "integer" },
                taskBreakdown: {
                  type: "object",
                  additionalProperties: { type: "integer" },
                  description: "Asignaciones por tarea: { 'Sacar Basura': 5, 'Lavar Cafetera': 10 }",
                },
                fairnessScore: { type: "number", description: "Desviación de la media (0 = perfecto)", example: 0.5 },
              },
            },
          },
          averageAssignments: { type: "number", description: "Promedio de asignaciones por empleado" },
        },
      },

      // ── Task Eligibility Schemas ───────────────────────────────
      EmployeeTaskEligibilityItem: {
        type: "object",
        description: "Estado de elegibilidad de una tarea para un empleado",
        properties: {
          id: { type: "string", description: "CUID del registro de elegibilidad" },
          employeeId: { type: "string" },
          taskName: { type: "string", example: "Sacar Basura" },
          taskLabel: { type: "string", example: "Sacar Basura", description: "Alias de taskName" },
          isActive: { type: "boolean", example: true, description: "true = el empleado puede realizar la tarea" },
          isEnabled: { type: "boolean", example: true, description: "true = la tarea está habilitada para el empleado" },
        },
      },
      UpdateEmployeeTaskEligibilityInput: {
        type: "object",
        required: ["settings"],
        properties: {
          settings: {
            type: "array",
            description: "Arreglo completo de configuraciones de elegibilidad",
            items: {
              type: "object",
              required: ["taskLabel", "isActive"],
              properties: {
                taskLabel: { type: "string", description: "Nombre de la tarea", example: "Sacar Basura" },
                isActive: { type: "boolean", description: "true = habilitada, false = deshabilitada" },
              },
            },
          },
        },
      },
      ToggleEmployeeTaskEligibilityInput: {
        type: "object",
        required: ["taskLabel", "isActive"],
        properties: {
          taskLabel: { type: "string", description: "Nombre de la tarea a alternar", example: "Lavar Cafetera" },
          isActive: { type: "boolean", description: "true = habilitar, false = deshabilitar" },
        },
      },

      // ── Assignment Schemas ─────────────────────────────────────
      UpdateAssignmentInput: {
        type: "object",
        required: ["employeeId"],
        properties: {
          employeeId: { type: "string", description: "ID del nuevo empleado a asignar (CUID)" },
        },
      },
      DeleteAssignmentsInput: {
        type: "object",
        required: ["groupId"],
        properties: {
          groupId: { type: "string", description: "ID del grupo cuyas asignaciones se eliminarán" },
          startDate: { type: "string", format: "date", description: "Fecha inicio del rango (ISO 8601). Opcional: sin fechas elimina todas." },
          endDate: { type: "string", format: "date", description: "Fecha fin del rango (ISO 8601). Opcional: sin fechas elimina todas." },
          force: { type: "boolean", default: false, description: "Si true, también elimina asignaciones bloqueadas (históricas). Por defecto false." },
        },
      },

      // ── Backup Schemas ─────────────────────────────────────────
      BackupCounts: {
        type: "object",
        description: "Conteo de registros por entidad en el backup",
        properties: {
          settings: { type: "integer", example: 1 },
          groups: { type: "integer", example: 2 },
          employees: { type: "integer", example: 16 },
          rules: { type: "integer", example: 14 },
          taskEligibility: { type: "integer", example: 32 },
          holidays: { type: "integer", example: 84 },
          assignments: { type: "integer", example: 120 },
          auditLogs: { type: "integer", example: 50 },
        },
      },
      BackupStatusResponse: {
        type: "object",
        description: "Estado del archivo de backup",
        properties: {
          exists: { type: "boolean", description: "Si existe un archivo de backup" },
          timestamp: { type: "string", format: "date-time", nullable: true, description: "Fecha/hora del backup" },
          version: { type: "integer", nullable: true, description: "Versión del formato de backup" },
          counts: {
            nullable: true,
            allOf: [{ $ref: "#/components/schemas/BackupCounts" }],
          },
        },
      },
      BackupResponse: {
        type: "object",
        description: "Respuesta después de crear un backup",
        properties: {
          message: { type: "string", example: "Backup creado exitosamente" },
          timestamp: { type: "string", format: "date-time", description: "Fecha/hora en que se creó el backup" },
          counts: { $ref: "#/components/schemas/BackupCounts" },
        },
      },
      RestoreResponse: {
        type: "object",
        description: "Respuesta después de restaurar desde backup",
        properties: {
          message: { type: "string", example: "Base de datos restaurada exitosamente" },
          timestamp: { type: "string", format: "date-time", description: "Fecha/hora del backup restaurado" },
          version: { type: "integer", description: "Versión del formato de backup restaurado" },
          restored: { $ref: "#/components/schemas/BackupCounts" },
        },
      },

      // ── Admin Schemas ──────────────────────────────────────────
      AdminVerifyInput: {
        type: "object",
        required: ["key"],
        properties: {
          key: { type: "string", description: "Clave admin a verificar" },
        },
      },
      AdminVerifyResponse: {
        type: "object",
        properties: {
          data: {
            type: "object",
            properties: {
              valid: { type: "boolean", description: "true si la clave es correcta" },
              error: { type: "string", nullable: true, description: "Mensaje de error si la clave es incorrecta" },
            },
          },
        },
      },

      // ── Eligibility Schemas ────────────────────────────────────
      ToggleEligibilityInput: {
        type: "object",
        required: ["employeeId", "taskName", "isEnabled"],
        properties: {
          employeeId: { type: "string", description: "ID del empleado" },
          taskName: { type: "string", description: "Nombre de la tarea", example: "Sacar Basura" },
          isEnabled: { type: "boolean", description: "true = puede realizar la tarea" },
        },
      },
      ToggleEligibilityResponse: {
        type: "object",
        description: "Respuesta al alternar elegibilidad, incluye asignaciones eliminadas si se desactivó",
        properties: {
          id: { type: "string", description: "CUID" },
          employeeId: { type: "string" },
          taskName: { type: "string", example: "Sacar Basura" },
          isEnabled: { type: "boolean" },
          deletedAssignments: { type: "integer", description: "Asignaciones futuras eliminadas al desactivar", example: 0 },
        },
      },

      // ── Input Schemas ──────────────────────────────────────────
      CreateGroupInput: {
        type: "object",
        required: ["name", "taskType", "color"],
        properties: {
          name: { type: "string", minLength: 1, maxLength: 100, example: "Piso 3" },
          description: { type: "string", maxLength: 500, nullable: true },
          taskType: { type: "string", enum: ["cleaning", "kitchen", "reception", "opening", "closing", "inventory", "other"] },
          color: { type: "string", pattern: "^#[0-9a-fA-F]{6}$", example: "#10b981" },
        },
      },
      UpdateGroupInput: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 1, maxLength: 100 },
          description: { type: "string", maxLength: 500, nullable: true },
          taskType: { type: "string", enum: ["cleaning", "kitchen", "reception", "opening", "closing", "inventory", "other"] },
          color: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
          isActive: { type: "boolean" },
        },
      },
      CreateEmployeeInput: {
        type: "object",
        required: ["name", "groupId"],
        properties: {
          name: { type: "string", minLength: 1, maxLength: 100, example: "Juan Pérez" },
          position: { type: "string", maxLength: 100, nullable: true, example: "Asesor comercial" },
          area: { type: "string", maxLength: 100, nullable: true, example: "Comercial" },
          groupId: { type: "string" },
          joinDate: { type: "string", format: "date", description: "Fecha de ingreso (ISO 8601). Por defecto hoy." },
        },
      },
      UpdateEmployeeInput: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 1, maxLength: 100 },
          position: { type: "string", maxLength: 100, nullable: true },
          area: { type: "string", maxLength: 100, nullable: true },
          groupId: { type: "string" },
          isActive: { type: "boolean" },
          joinDate: { type: "string", format: "date" },
          leaveDate: { type: "string", format: "date", nullable: true, description: "Fecha de salida" },
        },
      },
      CreateRuleInput: {
        type: "object",
        required: ["groupId", "dayOfWeek", "taskLabel"],
        properties: {
          groupId: { type: "string" },
          dayOfWeek: { type: "integer", minimum: 0, maximum: 6, description: "0=Dom, 1=Lun, ..., 6=Sáb" },
          frequencyType: { type: "string", enum: ["daily", "weekly", "monthly"], default: "weekly" },
          frequency: { type: "integer", minimum: 1, maximum: 52, default: 1 },
          taskLabel: { type: "string", minLength: 1, maxLength: 100, example: "Sacar Basura" },
          validFrom: { type: "string", format: "date" },
          validTo: { type: "string", format: "date", nullable: true },
        },
      },
      UpdateRuleInput: {
        type: "object",
        properties: {
          dayOfWeek: { type: "integer", minimum: 0, maximum: 6 },
          frequencyType: { type: "string", enum: ["daily", "weekly", "monthly"] },
          frequency: { type: "integer", minimum: 1, maximum: 52 },
          taskLabel: { type: "string", minLength: 1, maxLength: 100 },
          validFrom: { type: "string", format: "date" },
          validTo: { type: "string", format: "date", nullable: true },
          isActive: { type: "boolean" },
        },
      },
      GenerateAssignmentsInput: {
        type: "object",
        required: ["groupId", "startDate", "endDate"],
        properties: {
          groupId: { type: "string", description: "ID del grupo" },
          startDate: { type: "string", format: "date", description: "Fecha inicio" },
          endDate: { type: "string", format: "date", description: "Fecha fin (debe ser posterior a startDate)" },
        },
      },
      CreateHolidayInput: {
        type: "object",
        required: ["date", "name"],
        properties: {
          date: { type: "string", format: "date-time" },
          name: { type: "string", example: "Día de la Independencia" },
          type: { type: "string", default: "national" },
          isRecurring: { type: "boolean", default: true },
          isActive: { type: "boolean", default: true },
        },
      },
      SeedHolidaysInput: {
        type: "object",
        required: ["seed"],
        properties: {
          seed: { type: "boolean", description: "Debe ser true para activar modo semilla" },
          startYear: { type: "integer", default: 2024 },
          endYear: { type: "integer", default: 2030 },
        },
      },
      UpdateHolidayInput: {
        type: "object",
        properties: {
          date: { type: "string", format: "date-time" },
          name: { type: "string" },
          type: { type: "string" },
          isRecurring: { type: "boolean" },
          isActive: { type: "boolean" },
        },
      },
    },
    responses: {
      BadRequest: {
        description: "Datos inválidos o parámetros faltantes",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                error: { type: "string", example: "Datos inválidos" },
                details: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      code: { type: "string" },
                      message: { type: "string" },
                      path: { type: "array", items: { type: "string" } },
                    },
                  },
                  description: "Errores de validación Zod",
                },
              },
            },
          },
        },
      },
      Unauthorized: {
        description: "Clave incorrecta o no autorizado",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                error: { type: "string", example: "Clave incorrecta" },
              },
            },
          },
        },
      },
      Forbidden: {
        description: "Operación no permitida (ej: editar asignación bloqueada)",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                error: { type: "string", example: "No se puede editar una asignación bloqueada (histórica)" },
              },
            },
          },
        },
      },
      NotFound: {
        description: "Recurso no encontrado",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                error: { type: "string", example: "Error al obtener recurso" },
              },
            },
          },
        },
      },
      Conflict: {
        description: "Conflicto (ej: nombre ya existe, referencia no encontrada)",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                error: { type: "string", example: "Ya existe un grupo con ese nombre" },
              },
            },
          },
        },
      },
      InternalServerError: {
        description: "Error interno del servidor",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                error: { type: "string", example: "Error interno del servidor" },
              },
            },
          },
        },
      },
    },
  },
} as const satisfies Record<string, unknown>;

export type OpenApiSpec = typeof openApiSpec;
