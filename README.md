# Gestor de Proyectos - IMHPA

Sistema de gestión de proyectos basado en metodología Scrum, con autenticación de usuarios.

## Características

- **Sistema de Login**: Autenticación de usuarios
- **Gestión Scrum**: Proyectos, Sprints, Épicas, Historias de Usuario y Tareas
- **Base de Datos**: MySQL con Prisma ORM

## Estructura del Proyecto

```
gestor-proyectos/
├── api/                    # Backend (Node.js/Express)
│   ├── config/            # Configuración (base de datos, etc.)
│   ├── controllers/       # Controladores
│   ├── middleware/       # Middleware (auth, validación)
│   ├── routes/           # Rutas de la API
│   ├── prisma/           # Schema de Prisma
│   └── utils/            # Utilidades
├── src/                   # Frontend
│   ├── components/       # Componentes React
│   │   ├── auth/        # Componentes de autenticación
│   │   └── scrum/       # Componentes Scrum
│   ├── services/         # Servicios (API calls)
│   ├── types/            # Tipos TypeScript
│   ├── pages/            # Páginas
│   └── config/           # Configuración del frontend
└── public/               # Archivos estáticos
```

## Configuración

### Variables de Entorno

Crear un archivo `.env` en la raíz del proyecto con:

```env
# Configuración de Base de Datos MySQL
DATABASE_URL="mysql://root:lachichi12@localhost:3306/gestor_proyectos"

# Variables de entorno MySQL (alternativas)
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=lachichi12
MYSQL_DATABASE=gestor_proyectos

# Configuración de la aplicación
NODE_ENV=development
JWT_SECRET=tu_secret_key_aqui_cambiar_en_produccion
```

### Base de Datos

1. Crear la base de datos MySQL automáticamente:
```bash
cd api
node scripts/create-database.js
```

O manualmente:
```sql
CREATE DATABASE gestor_proyectos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Ejecutar migraciones de Prisma:
```bash
cd api
npx prisma migrate dev
```

3. Generar el cliente de Prisma:
```bash
npx prisma generate
```

## Instalación

### Backend

```bash
cd api
npm install
```

### Frontend

```bash
cd src
npm install
```

## Uso

### Iniciar el servidor de desarrollo

Backend:
```bash
cd api
npm run dev
```

Frontend:
```bash
cd src
npm run dev
```

## Tecnologías

- **Backend**: Node.js, Express, Prisma, MySQL
- **Frontend**: React, TypeScript, Astro
- **Autenticación**: JWT

## Notas

- Este proyecto está adaptado para usar MySQL en lugar de PostgreSQL
- El schema de Prisma ha sido simplificado para incluir solo lo necesario para login y scrum

