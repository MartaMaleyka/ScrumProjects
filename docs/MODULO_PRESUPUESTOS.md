# 📊 Módulo de Presupuestos Premium - Documentación Completa

## 📋 Tabla de Contenidos

1. [Introducción](#introducción)
2. [Conceptos Fundamentales](#conceptos-fundamentales)
3. [Estructura de Datos](#estructura-de-datos)
4. [Cálculos y Métricas](#cálculos-y-métricas)
5. [Rate Cards (Tarifas)](#rate-cards-tarifas)
6. [Flujo de Trabajo](#flujo-de-trabajo)
7. [API Endpoints](#api-endpoints)
8. [Componentes Frontend](#componentes-frontend)
9. [Ejemplos Prácticos](#ejemplos-prácticos)

---

## 🎯 Introducción

El módulo de **Presupuestos Premium** permite gestionar y controlar los costos de proyectos, sprints y releases. Proporciona herramientas para planificar gastos, registrar gastos reales, definir tarifas por hora, y calcular métricas de pronóstico y varianza.

### Características Principales

- ✅ **Presupuestos por Proyecto, Sprint o Release**
- ✅ **Líneas de Presupuesto Planificadas** (Budget Lines)
- ✅ **Registro de Gastos Reales** (Expenses)
- ✅ **Tarifas por Hora** (Rate Cards) para cálculo de costos laborales
- ✅ **Métricas Automáticas**: Planned, Actual, Remaining, Burn Rate, Forecast, Variance
- ✅ **Integración con Tareas**: Usa horas estimadas para calcular costos laborales futuros

---

## 📚 Conceptos Fundamentales

### 1. Budget (Presupuesto)

Un **Budget** es el contenedor principal que agrupa toda la información financiera de un proyecto, sprint o release.

**Características:**
- **Scope**: Puede ser `PROJECT`, `SPRINT` o `RELEASE`
- **Moneda**: USD, EUR, MXN, etc.
- **Fechas**: `startsAt` y `endsAt` (opcionales)
- **Relaciones**: Pertenece a un Proyecto, opcionalmente a un Sprint o Release

**Ejemplo:**
```
Budget: "Sprint 1 Budget"
- Scope: SPRINT
- Currency: USD
- Project: Sistema de Gestión
- Sprint: Sprint 1
- Start Date: Feb 8, 2026
- End Date: Feb 22, 2026
```

### 2. Budget Line (Línea de Presupuesto)

Una **Budget Line** representa un gasto planificado dentro del presupuesto.

**Características:**
- **Categoría**: Descripción del gasto (ej: "Software Licenses", "Hardware")
- **Tipo**: `LABOR`, `SOFTWARE`, `SERVICES`, `HARDWARE`, `TRAVEL`, `OTHER`
- **Monto Planificado**: En centavos (ej: $1,100.00 = 110,000 centavos)

**Ejemplo:**
```
Budget Line 1:
- Category: "AWS Hosting"
- Type: SOFTWARE
- Planned: $500.00 (50,000 centavos)

Budget Line 2:
- Category: "Developer Salaries"
- Type: LABOR
- Planned: $1,700.00 (170,000 centavos)
```

### 3. Expense (Gasto Real)

Un **Expense** representa un gasto real que ya se ha incurrido.

**Características:**
- **Monto Real**: En centavos
- **Fecha**: `incurredAt` (cuándo se gastó)
- **Categoría**: Descripción del gasto
- **Vendor**: Proveedor (opcional)
- **Relaciones**: Puede estar asociado a una Task, Sprint, Project

**Ejemplo:**
```
Expense 1:
- Category: "AWS Monthly Bill"
- Amount: $450.00 (45,000 centavos)
- Date: Feb 15, 2026
- Vendor: Amazon Web Services
```

### 4. Rate Card (Tarifa)

Un **Rate Card** define el costo por hora de un usuario o rol.

**Características:**
- **Usuario o Rol**: Puede ser específico (usuario) o genérico (rol)
- **Tarifa por Hora**: En centavos (ej: $12/hora = 1,200 centavos/hora)
- **Fechas Efectivas**: `effectiveFrom` y `effectiveTo` (opcionales)

**Ejemplo:**
```
Rate Card 1:
- User: Marta Magallón
- Rate: $12.00/hora (1,200 centavos/hora)
- Effective From: Feb 8, 2026

Rate Card 2:
- Role: DEVELOPER
- Rate: $50.00/hora (5,000 centavos/hora)
```

---

## 🗄️ Estructura de Datos

### Modelos de Base de Datos

#### Budget
```prisma
model Budget {
  id             Int            @id @default(autoincrement())
  organizationId Int
  projectId      Int
  sprintId       Int?           // Si scope = SPRINT
  releaseId      Int?            // Si scope = RELEASE
  scope          BudgetScope     // PROJECT, SPRINT, RELEASE
  name           String
  currency       String          @default("USD")
  startsAt       DateTime?
  endsAt         DateTime?
  notes          String?
  
  lines          BudgetLine[]    // Líneas planificadas
  expenses       Expense[]       // Gastos reales
  rateCards      RateCard[]      // Tarifas
}
```

#### BudgetLine
```prisma
model BudgetLine {
  id           Int                @id @default(autoincrement())
  budgetId     Int
  category     String
  categoryType BudgetCategoryType // LABOR, SOFTWARE, SERVICES, etc.
  plannedCents Int                // Monto en centavos
  notes        String?
}
```

#### Expense
```prisma
model Expense {
  id            Int       @id @default(autoincrement())
  budgetId      Int
  projectId     Int
  sprintId      Int?
  taskId        Int?      // Si es gasto laboral
  category      String
  amountCents   Int        // Monto en centavos
  currency      String
  incurredAt    DateTime
  vendor        String?
  description   String?
  createdById   Int
}
```

#### RateCard
```prisma
model RateCard {
  id            Int          @id @default(autoincrement())
  budgetId      Int
  projectId     Int
  userId        Int?         // Usuario específico
  projectRole   ProjectRole? // O rol genérico
  hourlyCents   Int          // Tarifa en centavos/hora
  currency      String
  effectiveFrom DateTime?
  effectiveTo   DateTime?
}
```

---

## 🧮 Cálculos y Métricas

### 1. Planned (Planificado)

**Qué es:** El total de dinero planificado en el presupuesto.

**Cálculo:**
```javascript
plannedTotalCents = 0
for each line in budget.lines:
    plannedTotalCents += line.plannedCents

plannedTotal = plannedTotalCents / 100  // Convertir a dólares
```

**Ejemplo:**
```
Línea 1: $1,100.00 (110,000 centavos)
Línea 2: $1,100.00 (110,000 centavos)
─────────────────────────────────────
Total:   $2,200.00 (220,000 centavos)
```

**Código:**
```javascript
const plannedTotalCents = budget.lines.reduce(
  (sum, line) => sum + line.plannedCents, 
  0
);
```

---

### 2. Actual (Gastado)

**Qué es:** El total de dinero que ya se ha gastado realmente.

**Cálculo:**
```javascript
actualTotalCents = 0
for each expense in budget.expenses:
    actualTotalCents += expense.amountCents

actualTotal = actualTotalCents / 100  // Convertir a dólares
```

**Ejemplo:**
```
Expense 1: $20.00 (2,000 centavos)
Expense 2: $1,180.00 (118,000 centavos)
─────────────────────────────────────
Total:     $1,200.00 (120,000 centavos)
```

**Código:**
```javascript
const expenseSum = await prisma.expense.aggregate({
  where: { budgetId: budgetId },
  _sum: { amountCents: true },
});

const actualTotalCents = expenseSum._sum.amountCents || 0;
```

---

### 3. Remaining (Restante)

**Qué es:** El dinero que aún está disponible en el presupuesto.

**Cálculo:**
```javascript
remaining = Planned - Actual
```

**Ejemplo:**
```
Planned:  $2,200.00
Actual:   $1,200.00
─────────────────────
Remaining: $1,000.00
```

**Interpretación:**
- ✅ **Positivo (Verde)**: Tienes dinero disponible
- ❌ **Negativo (Rojo)**: Te pasaste del presupuesto

**Código:**
```javascript
const remaining = plannedTotal.subtract(actualTotal);
const remainingCents = dineroToCents(remaining);
```

---

### 4. Burn Rate (Tasa de Quema)

**Qué es:** El promedio de gasto diario.

**Cálculo:**
```javascript
startDate = budget.startsAt || budget.createdAt
now = fecha actual
daysElapsed = (now - startDate) en días

burnRate = Actual / daysElapsed
```

**Ejemplo:**
```
Start Date: Feb 8, 2026
Today: Feb 18, 2026
Days Elapsed: 10 días

Actual: $1,200.00
Burn Rate = $1,200 / 10 = $120.00/día
```

**Uso:** Ayuda a predecir cuándo se acabará el presupuesto si se mantiene el ritmo actual.

**Código:**
```javascript
const startDate = budget.startsAt || budget.createdAt;
const now = new Date();
const daysElapsed = Math.max(1, Math.ceil((now - startDate) / (1000 * 60 * 60 * 24)));
const burnRateCents = Math.floor(actualTotalCents / daysElapsed);
```

---

### 5. Forecast (Pronóstico al Finalizar)

**Qué es:** Estimación del costo total al finalizar el proyecto/sprint/release.

**Cálculo Completo:**

#### Paso 1: Obtener Horas Estimadas de Tareas Pendientes

```javascript
// Para PROJECT scope
tasks = todas las tareas del proyecto donde status != 'COMPLETED'

// Para SPRINT scope
tasks = todas las tareas del sprint donde status != 'COMPLETED'

estimatedHoursRemaining = sum(tasks.estimatedHours)
```

**Ejemplo:**
```
Tarea 1: 8 horas estimadas, Status: IN_PROGRESS
Tarea 2: 12 horas estimadas, Status: TODO
Tarea 3: 20 horas estimadas, Status: TODO
Tarea 4: 10 horas estimadas, Status: COMPLETED (no se cuenta)
─────────────────────────────────────────────────────────
Total Horas Pendientes: 40 horas
```

#### Paso 2: Calcular Costo Laboral Estimado

```javascript
if (hay Rate Cards && estimatedHoursRemaining > 0):
    avgRate = promedio de todas las tarifas
    estimatedLaborCost = estimatedHoursRemaining × avgRate
else:
    estimatedLaborCost = 0
```

**Ejemplo:**
```
Horas Pendientes: 40 horas
Tarifa Promedio: $12/hora (1,200 centavos/hora)
─────────────────────────────────────────────────
Costo Laboral Estimado = 40 × $12 = $480.00
```

#### Paso 3: Calcular Gastos No Laborales Restantes

```javascript
nonLaborPlanned = sum(líneas donde categoryType != 'LABOR')
nonLaborActual = sum(expenses donde taskId == null)
nonLaborRemaining = max(0, nonLaborPlanned - nonLaborActual)
```

**Ejemplo:**
```
Gastos No Laborales Planificados: $500.00
Gastos No Laborales Ya Gastados: $300.00
─────────────────────────────────────────────────
Gastos No Laborales Restantes: $200.00
```

#### Paso 4: Calcular Forecast Final

```javascript
forecast = Actual + Estimated Labor Cost + Non-Labor Remaining
```

**Ejemplo Completo:**
```
Actual:                    $1,200.00
Costo Laboral Estimado:    $480.00
Gastos No Laborales Rest: $200.00
─────────────────────────────────────
Forecast:                  $1,880.00
```

**Código:**
```javascript
// 1. Obtener horas estimadas
const tasks = await prisma.task.findMany({
  where: {
    userStory: { epic: { projectId: budget.projectId } },
    status: { not: 'COMPLETED' },
  },
  select: { estimatedHours: true },
});

const estimatedHoursRemaining = tasks.reduce(
  (sum, task) => sum + (task.estimatedHours || 0), 
  0
);

// 2. Calcular costo laboral
let estimatedLaborCostCents = 0;
if (budget.rateCards.length > 0 && estimatedHoursRemaining > 0) {
  const avgRateCents = // promedio de tarifas
  estimatedLaborCostCents = Math.floor(estimatedHoursRemaining * avgRateCents);
}

// 3. Gastos no laborales restantes
const nonLaborPlannedCents = budget.lines
  .filter(line => line.categoryType !== 'LABOR')
  .reduce((sum, line) => sum + line.plannedCents, 0);

const nonLaborActualCents = // expenses sin taskId

const nonLaborRemainingCents = Math.max(0, nonLaborPlannedCents - nonLaborActualCents);

// 4. Forecast final
const forecastAtCompletionCents = 
  actualTotalCents + 
  estimatedLaborCostCents + 
  nonLaborRemainingCents;
```

---

### 6. Variance (Varianza)

**Qué es:** La diferencia entre el Forecast y lo Planificado.

**Cálculo:**
```javascript
variance = Forecast - Planned
```

**Ejemplo:**
```
Forecast: $1,880.00
Planned:  $2,200.00
─────────────────────
Variance: -$320.00 (Negativa = Verde = Vas bien)
```

**Interpretación:**
- ✅ **Negativa (Verde)**: El Forecast es menor que lo Planificado → Te quedarás por debajo del presupuesto
- ❌ **Positiva (Roja)**: El Forecast es mayor que lo Planificado → Riesgo de sobrepasar el presupuesto

**Código:**
```javascript
const variance = forecastAtCompletion.subtract(plannedTotal);
const forecastVarianceCents = dineroToCents(variance);
```

---

## 💰 Rate Cards (Tarifas)

### ¿Qué son?

Las **Rate Cards** definen el costo por hora de trabajo de los miembros del equipo o roles. Se usan para calcular automáticamente el costo laboral estimado en el Forecast.

### Tipos de Rate Cards

#### 1. Por Usuario Específico
```
Usuario: Marta Magallón
Tarifa: $12.00/hora
```

#### 2. Por Rol
```
Rol: DEVELOPER
Tarifa: $50.00/hora
```

**Nota:** No puedes tener ambos (usuario Y rol) en la misma Rate Card. Debe ser uno u otro.

### Cómo se Usan en el Forecast

1. El sistema obtiene las horas estimadas de tareas pendientes
2. Calcula el promedio de todas las tarifas disponibles
3. Multiplica: `Horas Pendientes × Tarifa Promedio = Costo Laboral Estimado`

**Ejemplo:**
```
Rate Cards:
- Marta Magallón: $12/hora
- DEVELOPER: $50/hora
Promedio: ($12 + $50) / 2 = $31/hora

Horas Pendientes: 40 horas
─────────────────────────────────
Costo Laboral Estimado = 40 × $31 = $1,240.00
```

### Fechas Efectivas

Las Rate Cards pueden tener fechas de vigencia:
- **effectiveFrom**: Desde cuándo aplica la tarifa
- **effectiveTo**: Hasta cuándo aplica la tarifa

Esto permite manejar cambios de tarifas en el tiempo.

---

## 🔄 Flujo de Trabajo

### 1. Crear un Presupuesto

1. Ir a **Presupuestos** → **Nuevo Presupuesto**
2. Seleccionar:
   - **Proyecto**
   - **Scope** (PROJECT, SPRINT, o RELEASE)
   - **Sprint/Release** (si aplica)
   - **Nombre** del presupuesto
   - **Moneda**
   - **Fechas** (opcional)
3. Agregar **Budget Lines** (gastos planificados):
   - Categoría
   - Tipo (LABOR, SOFTWARE, etc.)
   - Monto planificado
4. Guardar

### 2. Registrar Gastos Reales

1. Abrir el presupuesto
2. Ir a la pestaña **Expenses**
3. Click en **Add Expense**
4. Completar:
   - Categoría
   - Monto
   - Fecha
   - Vendor (opcional)
   - Sprint/Task (opcional)
5. Guardar

### 3. Definir Tarifas

1. Abrir el presupuesto
2. Ir a la pestaña **Rates**
3. Click en **Add Rate Card**
4. Seleccionar:
   - **Usuario** O **Rol** (no ambos)
   - **Tarifa por hora**
   - **Fechas efectivas** (opcional)
5. Guardar

### 4. Revisar Métricas

1. Abrir el presupuesto
2. Ir a la pestaña **Overview**
3. Revisar:
   - **Planned**: Lo que planificaste
   - **Actual**: Lo que ya gastaste
   - **Remaining**: Lo que te queda
   - **Burn Rate**: Promedio de gasto diario
   - **Forecast**: Estimación del costo total
   - **Variance**: Diferencia con lo planificado

---

## 🔌 API Endpoints

### Budgets

#### `GET /api/premium/budgets`
Obtiene todos los presupuestos con filtros.

**Query Parameters:**
- `projectId` (opcional): Filtrar por proyecto
- `scope` (opcional): PROJECT, SPRINT, RELEASE
- `page` (opcional): Número de página
- `limit` (opcional): Límite de resultados

**Response:**
```json
{
  "success": true,
  "data": {
    "budgets": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 10,
      "pages": 1
    }
  }
}
```

#### `GET /api/premium/budgets/:id`
Obtiene un presupuesto por ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Sprint 1 Budget",
    "scope": "SPRINT",
    "currency": "USD",
    "lines": [...],
    "expenses": [...],
    "rateCards": [...]
  }
}
```

#### `POST /api/premium/budgets`
Crea un nuevo presupuesto.

**Body:**
```json
{
  "projectId": 1,
  "sprintId": 1,
  "scope": "SPRINT",
  "name": "Sprint 1 Budget",
  "currency": "USD",
  "startsAt": "2026-02-08",
  "endsAt": "2026-02-22",
  "lines": [
    {
      "category": "AWS Hosting",
      "categoryType": "SOFTWARE",
      "plannedCents": 50000
    }
  ]
}
```

#### `PATCH /api/premium/budgets/:id`
Actualiza un presupuesto.

#### `DELETE /api/premium/budgets/:id`
Elimina un presupuesto.

### Budget Lines

#### `POST /api/premium/budgets/:id/lines`
Crea una nueva línea de presupuesto.

**Body:**
```json
{
  "category": "Hardware",
  "categoryType": "HARDWARE",
  "plannedCents": 100000
}
```

#### `PATCH /api/premium/budget-lines/:lineId`
Actualiza una línea de presupuesto.

#### `DELETE /api/premium/budget-lines/:lineId`
Elimina una línea de presupuesto.

### Expenses

#### `GET /api/premium/expenses`
Obtiene todos los gastos con filtros.

**Query Parameters:**
- `budgetId` (opcional): Filtrar por presupuesto
- `projectId` (opcional): Filtrar por proyecto
- `from` (opcional): Fecha desde
- `to` (opcional): Fecha hasta

#### `POST /api/premium/expenses`
Crea un nuevo gasto.

**Body:**
```json
{
  "budgetId": 1,
  "projectId": 1,
  "category": "AWS Monthly Bill",
  "amountCents": 45000,
  "currency": "USD",
  "incurredAt": "2026-02-15",
  "vendor": "Amazon Web Services"
}
```

#### `PATCH /api/premium/expenses/:id`
Actualiza un gasto.

#### `DELETE /api/premium/expenses/:id`
Elimina un gasto.

### Rate Cards

#### `GET /api/premium/rate-cards`
Obtiene todas las tarifas con filtros.

**Query Parameters:**
- `budgetId` (opcional): Filtrar por presupuesto
- `projectId` (opcional): Filtrar por proyecto

#### `POST /api/premium/rate-cards`
Crea una nueva tarifa.

**Body:**
```json
{
  "budgetId": 1,
  "projectId": 1,
  "userId": 5,
  "hourlyCents": 1200,
  "currency": "USD"
}
```

#### `PATCH /api/premium/rate-cards/:id`
Actualiza una tarifa.

#### `DELETE /api/premium/rate-cards/:id`
Elimina una tarifa.

### Metrics

#### `GET /api/premium/budgets/:id/metrics`
Obtiene todas las métricas del presupuesto.

**Response:**
```json
{
  "success": true,
  "data": {
    "plannedTotalCents": 220000,
    "actualTotalCents": 120000,
    "remainingCents": 100000,
    "burnRateCentsPerDay": 10909,
    "forecastAtCompletionCents": 1880000,
    "forecastVarianceCents": -32000,
    "currency": "USD"
  }
}
```

---

## 🎨 Componentes Frontend

### BudgetsPage
Componente principal que muestra la lista de presupuestos.

**Ubicación:** `src/components/premium/budgets/BudgetsPage.tsx`

**Características:**
- Lista de presupuestos en formato de cards
- Filtros por proyecto
- Modal para crear nuevos presupuestos

### BudgetViewModal
Modal que muestra los detalles de un presupuesto.

**Ubicación:** `src/components/premium/budgets/BudgetViewModal.tsx`

**Características:**
- Tabs: Overview, Planned Lines, Expenses, Rates
- Información básica del presupuesto
- Métricas en Overview

### BudgetMetricsCards
Muestra las métricas principales en formato de cards.

**Ubicación:** `src/components/premium/budgets/BudgetMetricsCards.tsx`

**Métricas mostradas:**
- Planned
- Actual
- Remaining
- Burn Rate
- Forecast
- Variance

### BudgetLinesTable
Tabla que muestra las líneas de presupuesto planificadas.

**Ubicación:** `src/components/premium/budgets/BudgetLinesTable.tsx`

**Características:**
- Lista de todas las Budget Lines
- Total planificado
- Opción de eliminar líneas

### ExpensesTable
Tabla que muestra los gastos reales.

**Ubicación:** `src/components/premium/budgets/ExpensesTable.tsx`

**Características:**
- Lista de todos los Expenses
- Filtros por fecha (from/to)
- Total de gastos
- Modal para crear nuevos gastos

### RateCardsTable
Tabla que muestra las tarifas.

**Ubicación:** `src/components/premium/budgets/RateCardsTable.tsx`

**Características:**
- Lista de todas las Rate Cards
- Usuario o Rol
- Tarifa por hora
- Fechas efectivas
- Modal para crear nuevas tarifas

---

## 📝 Ejemplos Prácticos

### Ejemplo 1: Presupuesto de Sprint

**Escenario:**
- Sprint: "Sprint 1 - Authentication"
- Duración: 2 semanas (Feb 8 - Feb 22, 2026)
- Presupuesto: $2,200.00

**Budget Lines:**
1. AWS Hosting: $500.00 (SOFTWARE)
2. Developer Salaries: $1,700.00 (LABOR)

**Expenses Registrados:**
1. AWS Bill: $450.00 (Feb 15)
2. Software License: $750.00 (Feb 10)

**Rate Cards:**
1. Marta Magallón: $12/hora

**Tareas del Sprint:**
1. "Implement Login": 8 horas, Status: IN_PROGRESS
2. "Create Auth API": 12 horas, Status: TODO
3. "Write Tests": 10 horas, Status: COMPLETED

**Cálculo de Métricas:**

```
Planned = $500 + $1,700 = $2,200.00
Actual = $450 + $750 = $1,200.00
Remaining = $2,200 - $1,200 = $1,000.00

Days Elapsed = 10 días (Feb 8 - Feb 18)
Burn Rate = $1,200 / 10 = $120.00/día

Horas Pendientes = 8 + 12 = 20 horas (Tarea 3 no cuenta)
Costo Laboral Estimado = 20 × $12 = $240.00

Gastos No Laborales Planificados = $500.00
Gastos No Laborales Actuales = $450.00
Gastos No Laborales Restantes = $500 - $450 = $50.00

Forecast = $1,200 + $240 + $50 = $1,490.00
Variance = $1,490 - $2,200 = -$710.00 (Verde - Vas bien)
```

### Ejemplo 2: Presupuesto de Proyecto Completo

**Escenario:**
- Proyecto: "Sistema de Gestión"
- Presupuesto: $50,000.00
- Duración: 6 meses

**Budget Lines:**
1. Infrastructure: $10,000.00 (HARDWARE)
2. Software Licenses: $5,000.00 (SOFTWARE)
3. Development Team: $30,000.00 (LABOR)
4. Travel: $5,000.00 (TRAVEL)

**Rate Cards:**
1. DEVELOPER: $50/hora
2. DESIGNER: $40/hora
3. QA: $35/hora

**Tareas Pendientes del Proyecto:**
- Total: 500 horas estimadas

**Cálculo:**
```
Promedio Tarifas = ($50 + $40 + $35) / 3 = $41.67/hora
Costo Laboral Estimado = 500 × $41.67 = $20,835.00

Forecast = Actual + $20,835 + Gastos No Laborales Restantes
```

---

## 🔒 Seguridad y Permisos

### RBAC (Role-Based Access Control)

**ADMIN y MANAGER:**
- ✅ Crear, editar, eliminar presupuestos
- ✅ Crear, editar, eliminar Budget Lines
- ✅ Crear, editar, eliminar Expenses
- ✅ Crear, editar, eliminar Rate Cards
- ✅ Ver todas las métricas

**USER:**
- ✅ Ver presupuestos de proyectos donde es miembro
- ✅ Ver métricas (solo lectura)
- ❌ No puede crear/editar/eliminar

### Tenant Isolation

Todos los presupuestos están aislados por `organizationId`. Los usuarios solo pueden ver presupuestos de su organización, excepto SUPER_ADMIN (solo en edición Premium).

---

## 🐛 Troubleshooting

### Problema: Forecast muestra $0.00

**Causas posibles:**
1. No hay Rate Cards definidas
2. No hay tareas pendientes con horas estimadas
3. Todas las tareas están completadas

**Solución:**
1. Crear Rate Cards en la pestaña "Rates"
2. Asegurarse de que las tareas tengan `estimatedHours` > 0
3. Verificar que las tareas no estén en estado `COMPLETED`

### Problema: Actual no coincide con Expenses

**Causas posibles:**
1. Expenses con `budgetId` incorrecto
2. Expenses de otros budgets se están sumando

**Solución:**
1. Verificar que cada Expense tenga el `budgetId` correcto
2. Revisar los logs del servidor para ver qué expenses se están sumando

### Problema: Burn Rate es muy alto

**Causas posibles:**
1. Fecha de inicio incorrecta
2. Muchos gastos en poco tiempo

**Solución:**
1. Verificar que `startsAt` sea correcta
2. Revisar los Expenses para ver si hay gastos duplicados

---

## 📊 Fórmulas Resumen

```
Planned = Σ(Budget Lines.plannedCents)
Actual = Σ(Expenses.amountCents)
Remaining = Planned - Actual
Burn Rate = Actual / Days Elapsed
Forecast = Actual + (Horas Pendientes × Tarifa Promedio) + Gastos No Laborales Restantes
Variance = Forecast - Planned
```

---

## 🔗 Integración con Otros Módulos

### Tareas (Tasks)
- El Forecast usa `estimatedHours` de tareas pendientes
- Los Expenses pueden estar asociados a Tasks (gastos laborales)

### Proyectos (Projects)
- Los presupuestos pertenecen a un proyecto
- El Forecast busca tareas del proyecto

### Sprints
- Los presupuestos pueden ser de scope SPRINT
- El Forecast busca tareas del sprint

### Releases
- Los presupuestos pueden ser de scope RELEASE
- Permite presupuestar releases completos

---

## 📚 Referencias

- **API Controllers:** `api/controllers/premium/budgetController.js`, `budgetMetricsController.js`, `expenseController.js`, `rateCardController.js`
- **Frontend Services:** `src/services/premium/budgetService.ts`, `expenseService.ts`, `rateCardService.ts`
- **Componentes:** `src/components/premium/budgets/*`
- **Prisma Schema:** `api/prisma/schema.prisma` (modelos Budget, BudgetLine, Expense, RateCard)

---

## ✅ Checklist de Uso

- [ ] Crear presupuesto con Budget Lines
- [ ] Registrar Expenses reales
- [ ] Definir Rate Cards (usuario o rol)
- [ ] Asegurarse de que las tareas tengan horas estimadas
- [ ] Revisar métricas en Overview
- [ ] Monitorear Forecast y Variance regularmente
- [ ] Actualizar horas estimadas cuando cambien
- [ ] Marcar tareas como COMPLETED cuando terminen

---

**Última actualización:** Febrero 2026

