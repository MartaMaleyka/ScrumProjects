# 🚀 Inicio Rápido - Gestor de Proyectos

## ⚠️ IMPORTANTE: Ejecutar desde la carpeta `api/`

Todos los comandos npm deben ejecutarse desde la carpeta `api/`, no desde la raíz del proyecto.

## 📝 Pasos para Ejecutar

### 1. Abrir terminal en la carpeta `api`

```bash
cd C:\Users\marta\Documents\gestor-proyectos\api
```

### 2. Verificar que estás en la carpeta correcta

```bash
# Deberías ver: C:\Users\marta\Documents\gestor-proyectos\api
pwd
# O en PowerShell:
Get-Location
```

### 3. Verificar que existe package.json

```bash
# Debería mostrar: True
Test-Path package.json
```

### 4. Instalar dependencias (si no lo has hecho)

```bash
npm install
```

### 5. Generar cliente de Prisma

```bash
npx prisma generate
```

### 6. Iniciar el servidor

```bash
# Modo desarrollo (con auto-reload)
npm run dev

# O modo producción
npm start
```

## ✅ Verificar que funciona

Abre otra terminal y ejecuta:

```bash
curl http://localhost:3001/health
```

O abre en el navegador: **http://localhost:3001/health**

Deberías ver:
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "..."
}
```

## 🔧 Comandos Útiles

```bash
# Ver usuarios en la base de datos
mysql -u root -plabebe12 -D gestor_proyectos -e "SELECT email, username FROM users;"

# Abrir Prisma Studio (interfaz gráfica de la BD)
npx prisma studio

# Ver logs del servidor
# Los logs aparecen en la consola cuando ejecutas npm run dev
```

## 📍 Estructura de Carpetas

```
gestor-proyectos/          ← NO ejecutar npm aquí
├── api/                   ← ✅ Ejecutar npm AQUÍ
│   ├── package.json       ← Este es el package.json que necesitas
│   ├── server.js
│   └── ...
├── src/
└── .env
```

## ❌ Error Común

Si ves este error:
```
npm error enoent Could not read package.json
```

**Solución:** Asegúrate de estar en la carpeta `api/`:
```bash
cd api
```

