# 🚀 Gestor de Proyectos Scrum

Sistema completo de gestión de proyectos basado en metodología Scrum, con autenticación de usuarios, API REST y interfaz moderna.

---

## 📑 Tabla de Contenidos

- [🎯 Community Edition](#-community-edition)
- [🚀 Inicio Rápido](#-inicio-rápido)
  - [🐳 Con Docker (Recomendado)](#-con-docker-recomendado)
  - [💻 Instalación Manual](#-instalación-manual-sin-docker)
- [✨ Características Principales](#-características-principales)
- [🎯 Características de Community Edition](#-características-de-community-edition)
- [🚫 Premium Features (Disabled in Community)](#-premium-features-disabled-in-community)
- [📖 Guía de Uso Completo](#-guía-de-uso-completo)
  - [🔐 Primeros Pasos: Autenticación](#-primeros-pasos-autenticación)
  - [🏢 Gestión de Proyectos](#-gestión-de-proyectos)
  - [🎯 Flujo de Trabajo Scrum Completo](#-flujo-de-trabajo-scrum-completo)
  - [📈 Reportes y Analíticas](#-reportes-y-analíticas)
- [🛠️ Tecnologías y Estructura](#️-tecnologías-y-estructura)
- [🔧 Scripts y Comandos](#-scripts-y-comandos)
- [🧪 Testing](#-testing)
- [🔒 Seguridad y Permisos](#-seguridad-y-permisos)
  - [🏢 Sistema Single-Tenant (Organizaciones)](#-sistema-single-tenant-organizaciones)
- [📝 Información Adicional](#-información-adicional)
- [🤝 Contribuir](#-contribuir)

---

## 🎯 Community Edition

Sprintiva Community Edition es una solución completa y gratuita de gestión de proyectos Scrum.

**Repositorio**: [ScrumProjects](https://github.com/MartaMaleyka/ScrumProjects) (PUBLIC)

### Funcionalidades Incluidas

- ✅ **Gestión de Proyectos, Sprints, Épicas, Historias de Usuario, Tareas**: Sistema completo de Scrum
- ✅ **RBAC Básico**: Roles y permisos (ADMIN, MANAGER, USER)
- ✅ **Single-Tenant**: Cada usuario pertenece a una organización fija
- ✅ **Métricas y Reportes**: Dashboard con analíticas del proyecto
- ✅ **API REST Completa**: Backend completo para todas las funcionalidades core
- ✅ **Interfaz Moderna**: React + TypeScript + Astro con Tailwind CSS
- ✅ **Internacionalización**: Soporte para Español e Inglés
- ✅ **Papelera de Reciclaje**: Recuperación de elementos eliminados

> 💡 **Nota**: Existe una edición Premium con funcionalidades adicionales (Roadmap, Gantt, Releases, GitHub Integration, Multi-tenant Dashboard).

---

## 🚀 Inicio Rápido

### 🐳 Con Docker (Recomendado)

> **💡 La forma más rápida de empezar:** Si tienes Docker instalado, puedes tener el proyecto funcionando en menos de 5 minutos.

#### Prerrequisitos
- **Docker Desktop** instalado y ejecutándose
- **Docker Compose** v3.8 o superior

#### Pasos Rápidos

1. **Configurar variables de entorno**
```bash
# Copiar el archivo de ejemplo
cp docker.env.example .env

# Editar .env y ajustar los valores (especialmente MYSQL_ROOT_PASSWORD)
# El password por defecto es: rootpassword
```

2. **Construir e iniciar servicios**
```bash
# Construir las imágenes
docker compose build

# Iniciar todos los servicios (base de datos, API y frontend)
docker compose up
```

3. **Acceder a la aplicación**
- **Frontend**: http://localhost:4321
- **API**: http://localhost:3001
- **MySQL**: Solo accesible desde dentro de Docker

#### ¿Qué incluye Docker?

✅ **Hot Reload**: Los cambios en el código se reflejan automáticamente  
✅ **Base de datos MySQL 8.4**: Configurada y lista para usar  
✅ **Seed automático**: Se ejecuta automáticamente al iniciar (crea usuarios y proyecto de ejemplo)  
✅ **Sin configuración manual**: Todo está preconfigurado  

#### Credenciales por defecto

El seed crea automáticamente usuarios de ejemplo con la contraseña: **`pruebadev123`**

- **Admin**: `marta.magallon@gestorproyectos.com` / `pruebadev123`
- **Manager**: `juan.perez@gestorproyectos.com` / `pruebadev123`
- **Developer**: `carlos.rodriguez@gestorproyectos.com` / `pruebadev123`
- Y más usuarios... (ver `api/prisma/seed.js`)


#### Comandos útiles de Docker

```bash
# Ver logs de todos los servicios
docker compose logs -f

# Ver logs de un servicio específico
docker compose logs -f api
docker compose logs -f web
docker compose logs -f db

# Detener servicios
docker compose down

# Detener y eliminar volúmenes (⚠️ elimina la base de datos)
docker compose down -v

# Ejecutar seed manualmente
docker compose exec api npx prisma db seed

# Acceder al contenedor de la API
docker compose exec api sh
```

---

### 💻 Instalación Manual (Sin Docker)

#### Prerrequisitos

- **Node.js** >= 18.x
- **MySQL** >= 8.0
- **npm** o **yarn**

#### Instalación

1. **Clonar el repositorio**
```bash
git clone https://github.com/MartaMaleyka/ScrumProjects.git
cd gestor-proyectos
```

2. **Instalar dependencias**
```bash
# Instalar dependencias del frontend y backend
npm run install:all
```

3. **Configurar variables de entorno**

Crear archivo `.env` en la raíz del proyecto y `.env` en `api/`:

**Raíz del proyecto (`/.env`):**
```env
# Configuración del Frontend
PORT=4321
API_URL=http://localhost:3001
```

**Backend (`/api/.env`):**
```env
# Base de Datos MySQL
DATABASE_URL="mysql://usuario:tu_password@localhost:3306/gestor_proyectos"

# Configuración del Backend
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:4321

# Autenticación
JWT_SECRET=tu_secret_key_aqui_cambiar_en_produccion

# GitHub OAuth (Premium Edition - Opcional)
# GITHUB_CLIENT_ID=tu_client_id_aqui
# GITHUB_CLIENT_SECRET=tu_client_secret_aqui
# GITHUB_CALLBACK_URL=http://localhost:4321/api/integrations/github/oauth/callback
# GITHUB_TOKEN_ENC_KEY=tu_clave_de_cifrado_base64_aqui
```

4. **Configurar la base de datos**

```bash
# Crear la base de datos automáticamente
cd api
npm run db:create

# Ejecutar migraciones
npm run db:migrate

# Generar cliente Prisma
npm run db:generate

# Ejecutar seed (crear usuarios y proyecto de ejemplo)
npm run db:seed
```

O crear manualmente:
```sql
CREATE DATABASE gestor_proyectos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

5. **Iniciar la aplicación**

**Opción 1: Iniciar frontend y backend juntos**
```bash
npm run dev:full
```

**Opción 2: Iniciar por separado**

Terminal 1 - Backend:
```bash
cd api
npm run dev
```

Terminal 2 - Frontend:
```bash
npm run dev
```

La aplicación estará disponible en:
- **Frontend**: http://localhost:4321
- **Backend API**: http://localhost:3001

---

## ✨ Características Principales

- 🔐 **Autenticación Segura**: Sistema de login con JWT y gestión de sesiones
- 📊 **Gestión Scrum Completa**: 
  - Proyectos con múltiples miembros y roles
  - Sprints con seguimiento de fechas y velocidad
  - Épicas para agrupar funcionalidades
  - Historias de Usuario con prioridades y story points
  - Tareas con estados Kanban y seguimiento de tiempo
- 📈 **Analíticas Básicas**: Dashboard con métricas del proyecto
- 🗄️ **Base de Datos Robusta**: MySQL con Prisma ORM
- 🎨 **Interfaz Moderna**: React + TypeScript + Astro con Tailwind CSS
- 🌐 **Internacionalización**: Soporte completo para Español e Inglés

> 💡 **Nota**: Esta es la Community Edition. Funcionalidades adicionales como Roadmap, Gantt, Releases e integración con GitHub están disponibles en la Premium Edition.

---

## 🎯 Características de Community Edition

Esta edición incluye todas las funcionalidades esenciales para gestionar proyectos Scrum:

- ✅ **Proyectos, Sprints, Historias, Tareas**: Gestión completa de Scrum
- ✅ **RBAC Básico**: Roles y permisos por proyecto (ADMIN, MANAGER, USER)
- ✅ **Single-Tenant**: Cada usuario pertenece a una organización fija
- ✅ **Analíticas Básicas**: Dashboard con métricas del proyecto
- ✅ **Tablero Kanban**: Gestión visual de tareas
- ✅ **Seguimiento de Tiempo**: Registro de horas estimadas vs reales
- ✅ **Exportación de Datos**: Exportar reportes a JSON o CSV

---

## 🚫 Premium Features (Disabled in Community)

Las siguientes funcionalidades están disponibles únicamente en la Premium Edition:

- 🗺️ **Roadmap** ✅ (Premium only)
- 📊 **Gantt** ✅ (Premium only)
- 🚀 **Releases** ✅ (Premium only)
- 🔗 **GitHub Integration** ✅ (Premium only)
- 🏢 **Multi-tenant dashboard** ✅ (Premium only)
- 👑 **SUPER_ADMIN UI** ✅ (Premium only)

En la Community Edition, estas funcionalidades aparecen como stubs con mensaje "Upgrade to Premium" o devuelven 404 en los endpoints.

---

## 📖 Guía de Uso Completo

### 🔐 Primeros Pasos: Autenticación

#### Iniciar Sesión

1. Accede a http://localhost:4321
2. Ingresa tus credenciales:
   - **Email**: Usa uno de los usuarios del seed (ej: `marta.magallon@gestorproyectos.com`)
   - **Contraseña**: `pruebadev123`
3. El sistema te redirigirá automáticamente al dashboard

#### Gestión de Sesión

- **Sesión Automática**: El sistema mantiene tu sesión activa con tokens JWT
- **Expiración**: Si tu sesión expira, verás un modal para renovarla
- **Cerrar Sesión**: Usa el botón de logout en el menú superior

#### Roles y Permisos

El sistema tiene tres niveles de roles globales:

1. **ADMIN**: Acceso total al sistema
   - Puede gestionar usuarios y proyectos
   - Acceso a configuración del sistema
   - Puede editar cualquier elemento

2. **MANAGER**: Gestión de proyectos
   - Puede crear y gestionar proyectos
   - Puede gestionar miembros en cualquier proyecto
   - Acceso a configuración del sistema

3. **USER**: Acceso limitado
   - Solo puede ver proyectos donde es miembro
   - Acceso basado en su rol dentro de cada proyecto

---

### 🏢 Gestión de Proyectos

#### Crear un Nuevo Proyecto

**Paso a paso:**

1. **Acceder a la lista de proyectos**
   - Desde el menú principal, selecciona "Proyectos"
   - O usa el botón "Nuevo Proyecto" si tienes permisos

2. **Completar el formulario**
   - **Nombre**: Nombre descriptivo del proyecto (ej: "Sistema de E-commerce")
   - **Descripción**: Descripción detallada del objetivo del proyecto
   - **Fecha de Inicio**: Fecha en que comenzará el proyecto
   - **Fecha de Fin**: Fecha estimada de finalización
   - **Estado**: PLANNING (planificación), ACTIVE (activo), ON_HOLD (pausado), COMPLETED (completado), CANCELLED (cancelado)

3. **Guardar el proyecto**
   - Haz clic en "Crear Proyecto"
   - Serás redirigido a la vista detallada del proyecto

#### Vista Detallada del Proyecto

La vista detallada incluye múltiples pestañas:

**📋 Resumen**
- Información general del proyecto
- Métricas principales (épicas, historias, tareas, velocidad)
- Miembros del equipo

**📈 Analíticas**
- Dashboard completo con métricas
- Gráficos interactivos por estado y prioridad
- Análisis de velocidad del equipo
- Gestión de horas (estimadas vs reales)
- Exportación a JSON o CSV

**🎯 Épicas, 📖 Historias, 🏃 Sprints, ✅ Tareas, 👥 Miembros**
- Gestión detallada de cada entidad
- Listas, filtros y búsqueda
- Creación, edición y eliminación


#### Gestionar Miembros del Proyecto

1. **Agregar miembros**
   - Ve a la pestaña "Miembros" en la vista del proyecto
   - Haz clic en "Agregar Miembro"
   - Selecciona un usuario de la lista
   - Asigna un rol: PRODUCT_OWNER, SCRUM_MASTER, DEVELOPER, TESTER, DESIGNER, etc.

2. **Cambiar roles**
   - En la lista de miembros, haz clic en el menú de acciones
   - Selecciona "Cambiar Rol"
   - Elige el nuevo rol

3. **Eliminar miembros**
   - Usa el botón de eliminar en el menú de acciones
   - Confirma la eliminación

---

### 🎯 Flujo de Trabajo Scrum Completo

#### 1. Planificación del Proyecto

**Crear Épicas**

Las épicas agrupan funcionalidades relacionadas:

1. Ve a la pestaña "Épicas" en tu proyecto
2. Haz clic en "Nueva Épica"
3. Completa:
   - **Título**: Nombre descriptivo (ej: "Módulo de Autenticación")
   - **Descripción**: Detalles de lo que incluye la épica
   - **Prioridad**: LOW, MEDIUM, HIGH, CRITICAL
   - **Valor de Negocio**: Puntos de valor (1-100)
   - **Estado**: DRAFT, READY, IN_PROGRESS, COMPLETED, CANCELLED

**Crear Historias de Usuario**

Las historias desglosan las épicas en funcionalidades específicas:

1. Ve a la pestaña "Historias" o dentro de una épica
2. Haz clic en "Nueva Historia"
3. Completa:
   - **Título**: Formato "Como [usuario] quiero [acción] para [beneficio]"
     - Ejemplo: "Como usuario quiero poder iniciar sesión para acceder a mi cuenta"
   - **Descripción**: Detalles de la funcionalidad
   - **Criterios de Aceptación**: Lista de condiciones que debe cumplir
   - **Story Points**: Estimación (1, 2, 3, 5, 8, 13, 21)
   - **Prioridad**: LOW, MEDIUM, HIGH, CRITICAL
   - **Épica**: Selecciona la épica a la que pertenece
   - **Estado**: DRAFT, READY, IN_PROGRESS, TESTING, COMPLETED, CANCELLED

**Planificar Sprints**

Los sprints organizan el trabajo en iteraciones:

1. Ve a la pestaña "Sprints"
2. Haz clic en "Nuevo Sprint"
3. Completa:
   - **Nombre**: Ej: "Sprint 1 - Autenticación Básica"
   - **Descripción**: Objetivos del sprint
   - **Fecha de Inicio**: Cuándo comienza
   - **Fecha de Fin**: Cuándo termina (típicamente 2 semanas)
   - **Objetivo (Goal)**: Meta del sprint
   - **Velocidad**: Capacidad del equipo en story points
   - **Estado**: PLANNING, ACTIVE, COMPLETED, CANCELLED

4. **Asignar historias al sprint**
   - En la vista del sprint, haz clic en "Asignar Historias"
   - Selecciona las historias del backlog
   - Arrastra y suelta para reordenar

#### 2. Ejecución del Trabajo

**Crear Tareas**

Las tareas desglosan las historias en trabajo técnico:

1. Ve a una historia de usuario o al tablero Kanban
2. Haz clic en "Nueva Tarea"
3. Completa:
   - **Título**: Descripción breve de la tarea
   - **Descripción**: Detalles técnicos
   - **Tipo**: DEVELOPMENT, TESTING, DESIGN, DOCUMENTATION, BUG_FIX, RESEARCH, REFACTORING
   - **Historia de Usuario**: A qué historia pertenece
   - **Sprint**: En qué sprint se trabajará
   - **Asignado**: Miembro del equipo responsable
   - **Prioridad**: LOW, MEDIUM, HIGH, CRITICAL
   - **Horas Estimadas**: Tiempo estimado de trabajo
   - **Fecha de Inicio**: Cuándo comenzará
   - **Fecha de Fin**: Cuándo debe completarse

**Usar Plantillas de Tareas**

Para acelerar la creación, usa plantillas predefinidas:

1. Al crear una tarea, selecciona "Usar Plantilla"
2. Elige una plantilla:
   - **Endpoint API**: Estructura para crear endpoints REST
   - **Diseño UI**: Tareas de diseño de interfaz
   - **Tests**: Estructura para escribir tests
   - **Bug Fix**: Formato para corrección de errores

**Trabajar con el Tablero Kanban**

El tablero Kanban muestra todas las tareas organizadas por estado:

1. **Ver el tablero**
   - Ve a la pestaña "Tareas" o "Kanban"
   - Las tareas están organizadas en columnas: TODO, IN_PROGRESS, IN_REVIEW, DONE

2. **Mover tareas**
   - Arrastra y suelta tareas entre columnas
   - El estado se actualiza automáticamente

3. **Filtrar tareas**
   - Usa los filtros por tipo, asignado, prioridad o sprint
   - Busca tareas por título o descripción

4. **Ver detalles**
   - Haz clic en una tarea para ver todos los detalles
   - Edita la tarea desde el modal de detalles

**Registrar Horas Trabajadas**

1. Abre una tarea
2. En la sección "Seguimiento de Tiempo"
3. Ingresa las horas reales trabajadas
4. El sistema calcula automáticamente la eficiencia (estimado vs real)

#### 3. Seguimiento y Monitoreo

**Ver Métricas del Sprint**

1. Ve a la vista detallada de un sprint
2. Verás:
   - **Burndown Chart**: Gráfico de progreso del sprint
   - **Velocidad**: Story points completados
   - **Tareas por Estado**: Distribución de trabajo
   - **Progreso**: Porcentaje de completitud

**Revisar Analíticas del Proyecto**

1. Ve a la pestaña "Analíticas" en el proyecto
2. Explora:
   - **Métricas Principales**: Épicas, historias, tareas, velocidad
   - **Gráficos por Estado**: Distribución de trabajo
   - **Gráficos por Prioridad**: Análisis de prioridades
   - **Velocidad del Equipo**: Tendencias a lo largo del tiempo
   - **Gestión de Horas**: Eficiencia del equipo

3. **Usar filtros**
   - Filtra por período: Todo, Semana, Mes, Trimestre, Año
   - Cambia el modo de vista: Resumen, Detallado, Comparativo
   - Muestra/oculta gráficos individuales

4. **Exportar datos**
   - Haz clic en "Exportar"
   - Elige formato: JSON o CSV
   - Descarga el archivo para análisis externo

#### 4. Cierre y Release

**Completar Tareas**

1. Mueve las tareas al estado "DONE" en el Kanban
2. Registra las horas finales trabajadas
3. Verifica que se cumplieron los criterios de aceptación

**Finalizar Historias**

1. Cuando todas las tareas de una historia estén completadas
2. Cambia el estado de la historia a "COMPLETED"
3. Verifica los criterios de aceptación

**Cerrar Sprints**

1. Al finalizar el sprint, cambia el estado a "COMPLETED"
2. Revisa el burndown chart y métricas
3. Realiza la retrospectiva del sprint


---

### 📈 Reportes y Analíticas

#### Dashboard de Analíticas

El dashboard proporciona una vista completa de las métricas del proyecto:

**Métricas Principales:**
- **Épicas**: Total y distribución por estado
- **Historias**: Total y distribución por estado
- **Tareas**: Total y distribución por estado
- **Velocidad**: Story points completados por sprint

**Gráficos Interactivos:**

1. **Distribución por Estado**
   - Barras verticales animadas
   - Muestra épicas, historias y tareas por estado
   - Haz clic en una barra para ver detalles

2. **Distribución por Prioridad**
   - Barras horizontales con animación
   - Muestra la distribución de prioridades
   - Efectos visuales al interactuar

3. **Velocidad del Equipo**
   - Gráfico de línea con puntos interactivos
   - Muestra la velocidad a lo largo del tiempo
   - Línea de referencia de velocidad promedio

4. **Gestión de Horas**
   - Comparación de horas estimadas vs reales
   - Barras de progreso visuales
   - Cálculo de eficiencia

**Filtros y Controles:**

- **Filtros de Período**: Todo, Semana, Mes, Trimestre, Año
- **Modos de Vista**:
  - **Resumen**: Vista compacta con gráficos principales
  - **Detallado**: Información completa con tasas de completado
  - **Comparativo**: Comparaciones lado a lado
- **Control de Visibilidad**: Muestra/oculta gráficos individuales
- **Exportación**: Exporta datos a JSON o CSV

#### Exportar Datos

**Exportar Tareas:**

1. Ve al tablero Kanban
2. Haz clic en "Exportar"
3. Elige formato:
   - **PDF**: Formato profesional con toda la información
   - **Excel**: Para análisis en hojas de cálculo
4. El archivo se descargará automáticamente

**Exportar Analíticas:**

1. En la pestaña "Analíticas"
2. Configura los filtros que necesites
3. Haz clic en "Exportar"
4. Elige formato: JSON o CSV
5. Descarga el archivo

---

## 🛠️ Tecnologías y Estructura

### Stack Tecnológico

**Backend:**
- **Node.js** + **Express** - Servidor API REST
- **Prisma** - ORM para gestión de base de datos
- **MySQL 8.4** - Base de datos relacional
- **JWT** - Autenticación y autorización
- **Winston** - Sistema de logging
- **Express Validator** - Validación de datos

**Frontend:**
- **Astro** - Framework web moderno
- **React** + **TypeScript** - Componentes interactivos
- **Tailwind CSS** - Estilos modernos y responsivos
- **React Hooks** - Gestión de estado y efectos
- **react-i18next** - Internacionalización y traducción

### Estructura del Proyecto

```
gestor-proyectos/
├── api/                          # Backend API
│   ├── config/                  # Configuración (DB, auth, features)
│   ├── controllers/             # Lógica de negocio
│   ├── middleware/              # Auth, validación, logging, feature gates
│   ├── routes/                  # Definición de rutas
│   ├── stubs/                   # Stubs para features premium
│   ├── prisma/                  # Schema y migraciones
│   │   ├── schema.prisma        # Modelo de datos
│   │   ├── seed.js             # Seed de datos iniciales
│   │   └── migrations/          # Historial de migraciones
│   ├── scripts/                 # Scripts de utilidad
│   └── utils/                   # Utilidades (logger, helpers)
├── src/                          # Frontend
│   ├── components/              # Componentes React
│   │   ├── auth/               # Autenticación
│   │   ├── landing/            # Página de inicio
│   │   ├── scrum/              # Componentes Scrum
│   │   │   ├── projects/       # Gestión de proyectos
│   │   │   ├── sprints/        # Gestión de sprints
│   │   │   ├── epics/          # Gestión de épicas
│   │   │   ├── userStories/    # Historias de usuario
│   │   │   ├── tasks/          # Gestión de tareas
│   │   │   ├── projects/       # Gestión de proyectos
│   │   │   │   └── ProjectAnalytics.tsx # Dashboard de analíticas
│   │   │   └── reports/        # Reportes y dashboards
│   │   ├── common/             # Componentes comunes
│   │   │   └── UpgradeRequired.tsx # Componente para features premium
│   │   └── layout/             # Layouts y navegación
│   ├── services/                # Servicios API
│   ├── hooks/                   # Custom React hooks
│   ├── types/                   # Definiciones TypeScript
│   ├── pages/                   # Páginas Astro
│   ├── i18n/                    # Configuración de internacionalización
│   │   └── locales/            # Archivos de traducción
│   │       ├── es.json         # Traducciones en español
│   │       └── en.json         # Traducciones en inglés
│   └── config/                  # Configuración frontend (features)
└── public/                       # Archivos estáticos
```

---

## 🔧 Scripts y Comandos

### Frontend
```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run preview      # Preview del build
```

### Backend
```bash
npm run api:dev      # Servidor API en desarrollo
npm run api:start    # Servidor API en producción
```

### Base de Datos
```bash
cd api
npm run db:generate  # Generar cliente Prisma
npm run db:migrate   # Ejecutar migraciones
npm run db:seed      # Ejecutar seed (crear datos iniciales)
npm run db:studio    # Abrir Prisma Studio
npm run db:reset     # Resetear base de datos
```

### Docker
```bash
docker compose build        # Construir imágenes
docker compose up            # Iniciar servicios
docker compose down          # Detener servicios
docker compose logs -f       # Ver logs en tiempo real
docker compose exec api sh   # Acceder al contenedor de la API
```

---

## 🔒 Seguridad y Permisos

### Sistema de Roles (RBAC)

**Roles Globales:**

1. **ADMIN**: Acceso total dentro de su organización
   - Gestionar usuarios y roles de su organización
   - Crear y gestionar proyectos de su organización
   - Acceso a configuración del sistema
   - ❌ NO ve datos de otras organizaciones

2. **MANAGER**: Gestión de proyectos dentro de su organización
   - Crear proyectos en su organización
   - Gestionar miembros en proyectos de su organización
   - Ver todos los proyectos de su organización

3. **USER**: Acceso limitado
   - Solo ver proyectos donde es miembro (de su organización)
   - Acceso basado en rol dentro del proyecto


**Roles por Proyecto:**

- **PRODUCT_OWNER**: Crear/editar épicas, sprints, historias y tareas
- **SCRUM_MASTER**: Crear/editar épicas, sprints, historias y tareas
- **DEVELOPER**: Leer todo, crear tareas, editar tareas asignadas
- **TESTER**: Leer todo, crear tareas, editar tareas asignadas
- **DESIGNER**: Leer todo, crear tareas, editar tareas asignadas
- **INFRAESTRUCTURA, REDES, SEGURIDAD**: Leer todo, crear tareas, editar tareas asignadas
- **STAKEHOLDER, OBSERVER**: Solo lectura

**Permisos por Acción:**

| Acción | ADMIN | MANAGER | PRODUCT_OWNER | SCRUM_MASTER | DEVELOPER | Otros |
|--------|-------|---------|---------------|--------------|-----------|-------|
| Crear Proyecto | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Editar Proyecto | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Crear Épica | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Crear Historia | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Crear Tarea | ✅ | ❌ | ✅ | ✅ | ✅ | ✅* |
| Editar Tarea | ✅ | ❌ | ✅ | ✅ | ✅** | ✅** |
| Gestionar Miembros | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |

\* Solo crear tareas  
\** Solo editar tareas asignadas

### Características de Seguridad

- **Autenticación JWT**: Tokens seguros con expiración
- **Validación de Datos**: Tanto en frontend como backend
- **Sanitización**: Protección contra inyecciones SQL y XSS
- **Headers de Seguridad**: Helmet para seguridad HTTP
- **Middleware de Autorización**: Verificación de permisos en cada endpoint
- **Single-tenant**: Aislamiento completo de datos por organización

### 🏢 Sistema Single-Tenant (Organizaciones)

El sistema implementa un modelo single-tenant donde cada usuario pertenece a una organización y solo puede acceder a datos de su organización.

#### Reglas de Negocio

1. **Cada usuario pertenece a UNA sola organización**
   - No hay "switch" de organización en la UI
   - El `organizationId` se asigna automáticamente al crear el usuario

2. **ADMIN de organización** (GlobalRole=ADMIN):
   - ✅ Ve usuarios de su organización
   - ✅ Ve proyectos de su organización
   - ✅ Gestiona roles globales dentro de su org (MANAGER/USER)
   - ✅ Puede activar/desactivar usuarios de su org
   - ❌ NO ve usuarios/proyectos de otras organizaciones

3. **MANAGER/USER**:
   - ✅ Solo ven su organización
   - ✅ Mantienen permisos existentes por proyecto


---

## 📝 Información Adicional

### Modelo de Datos

El sistema gestiona las siguientes entidades principales:

- **Organization**: Organizaciones (single-tenant en Community Edition)
- **User**: Usuarios del sistema con rol global y organización
- **Project**: Proyectos Scrum (pertenecen a una organización)
- **Epic**: Épicas dentro de proyectos
- **Sprint**: Sprints de trabajo
- **UserStory**: Historias de usuario
- **Task**: Tareas individuales con fechas y dependencias
- **ProjectMember**: Relación usuarios-proyectos con roles
- **TaskDependency**: Dependencias entre tareas


### Internacionalización (i18n)

El sistema soporta múltiples idiomas:

- **Español (es)**: Idioma por defecto
- **Inglés (en)**: Disponible

**Cambiar idioma:**
- Usa el selector de idioma en el menú superior
- El idioma se guarda en localStorage
- Todos los componentes están traducidos


### Notas de Desarrollo

- El proyecto usa MySQL 8.4 con Prisma ORM
- La API sigue principios RESTful
- El frontend utiliza componentes React con TypeScript
- El sistema RBAC está implementado con middlewares reutilizables
- Los componentes están optimizados para rendimiento

---

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

---

## 👤 Autor

**Marta**

- GitHub: [@MartaMaleyka](https://github.com/MartaMaleyka)

---

⭐ Si te gusta este proyecto, ¡dale una estrella!
