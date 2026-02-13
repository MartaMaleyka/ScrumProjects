# 🚀 Gestor de Proyectos Scrum

Sistema completo de gestión de proyectos basado en metodología Scrum, con autenticación de usuarios, API REST y interfaz moderna.

## ✨ Características

- 🔐 **Autenticación Segura**: Sistema de login con JWT y gestión de sesiones
- 📊 **Gestión Scrum Completa**: 
  - Proyectos con múltiples miembros
  - Sprints con seguimiento de fechas
  - Épicas para agrupar funcionalidades
  - Historias de Usuario con prioridades
  - Tareas con estados Kanban
- 🗄️ **Base de Datos Robusta**: MySQL con Prisma ORM
- 🎨 **Interfaz Moderna**: React + TypeScript + Astro con Tailwind CSS
- 📈 **Reportes y Exportación**: Generación de reportes semanales y exportación a Excel/PDF
- 🗑️ **Papelera de Reciclaje**: Recuperación de elementos eliminados

## 🛠️ Tecnologías

### Backend
- **Node.js** + **Express** - Servidor API REST
- **Prisma** - ORM para gestión de base de datos
- **MySQL** - Base de datos relacional
- **JWT** - Autenticación y autorización
- **Winston** - Sistema de logging
- **Express Validator** - Validación de datos

### Frontend
- **Astro** - Framework web moderno
- **React** + **TypeScript** - Componentes interactivos
- **Tailwind CSS** - Estilos modernos y responsivos
- **React Hooks** - Gestión de estado y efectos

## 📁 Estructura del Proyecto

```
gestor-proyectos/
├── api/                          # Backend API
│   ├── config/                  # Configuración (DB, auth)
│   ├── controllers/             # Lógica de negocio
│   ├── middleware/              # Auth, validación, logging
│   ├── routes/                  # Definición de rutas
│   ├── prisma/                  # Schema y migraciones
│   │   ├── schema.prisma        # Modelo de datos
│   │   └── migrations/          # Historial de migraciones
│   ├── scripts/                 # Scripts de utilidad
│   └── utils/                   # Utilidades (logger, helpers)
├── src/                          # Frontend
│   ├── components/              # Componentes React
│   │   ├── auth/               # Autenticación
│   │   ├── scrum/              # Componentes Scrum
│   │   │   ├── projects/       # Gestión de proyectos
│   │   │   ├── sprints/        # Gestión de sprints
│   │   │   ├── epics/          # Gestión de épicas
│   │   │   ├── userStories/    # Historias de usuario
│   │   │   ├── tasks/          # Gestión de tareas
│   │   │   └── reports/        # Reportes y dashboards
│   │   └── layout/             # Layouts y navegación
│   ├── services/                # Servicios API
│   ├── hooks/                   # Custom React hooks
│   ├── types/                   # Definiciones TypeScript
│   ├── pages/                   # Páginas Astro
│   └── config/                  # Configuración frontend
└── public/                       # Archivos estáticos
```

## 🚀 Inicio Rápido

### Prerrequisitos

- **Node.js** >= 18.x
- **MySQL** >= 8.0
- **npm** o **yarn**

### Instalación

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

Crear archivo `.env` en la raíz del proyecto:
```env
# Base de Datos MySQL
DATABASE_URL="mysql://usuario:tu_password@localhost:3306/gestor_proyectos"

# Variables de entorno MySQL (alternativas)
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=usuario
MYSQL_PASSWORD=tu_password
MYSQL_DATABASE=gestor_proyectos

# Configuración de la aplicación
NODE_ENV=development
JWT_SECRET=tu_secret_key_aqui_cambiar_en_produccion
PORT=3000
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
- **Backend API**: http://localhost:3000

## 📖 Uso

### Autenticación

1. Accede a la página de login
2. Inicia sesión con tus credenciales
3. El sistema gestiona automáticamente la sesión con JWT

### Gestión de Proyectos

1. **Crear un Proyecto**: Define nombre, descripción y miembros
2. **Crear Épicas**: Agrupa funcionalidades relacionadas
3. **Planificar Sprints**: Define períodos de trabajo
4. **Crear Historias de Usuario**: Describe funcionalidades desde la perspectiva del usuario
5. **Gestionar Tareas**: Asigna tareas a historias y cambia estados en el tablero Kanban

### Reportes

- Accede al dashboard de reportes semanales
- Exporta datos a Excel o PDF
- Visualiza métricas de progreso

## 🔧 Scripts Disponibles

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
npm run db:studio    # Abrir Prisma Studio
npm run db:reset     # Resetear base de datos
```

## 🗄️ Modelo de Datos

El sistema gestiona las siguientes entidades principales:

- **User**: Usuarios del sistema
- **Project**: Proyectos Scrum
- **Epic**: Épicas dentro de proyectos
- **Sprint**: Sprints de trabajo
- **UserStory**: Historias de usuario
- **Task**: Tareas individuales
- **ProjectMember**: Relación usuarios-proyectos

## 🔒 Seguridad

- Autenticación JWT con tokens seguros
- Validación de datos en backend y frontend
- Middleware de autenticación en todas las rutas protegidas
- Sanitización de inputs
- Headers de seguridad con Helmet

## 📝 Notas de Desarrollo

- El proyecto está adaptado para usar MySQL en lugar de PostgreSQL
- El schema de Prisma ha sido optimizado para gestión Scrum
- La API sigue principios RESTful
- El frontend utiliza componentes reutilizables y hooks personalizados

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 👤 Autor

**Marta**

- GitHub: [@MartaMaleyka](https://github.com/MartaMaleyka)

---

⭐ Si te gusta este proyecto, ¡dale una estrella!
