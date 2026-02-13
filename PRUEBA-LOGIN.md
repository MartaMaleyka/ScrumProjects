# 🔐 Prueba del Endpoint de Login

## Endpoints Disponibles

### 1. POST /api/auth/login
Login con email y contraseña

**Request:**
```json
{
  "email": "marta.magallon@gestorproyectos.com",
  "password": "Imhpa2024!"
}
```

**Response exitosa (200):**
```json
{
  "success": true,
  "message": "Login exitoso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "marta.magallon@gestorproyectos.com",
    "username": "mmagallon",
    "name": "Marta Magallón",
    "avatar": null,
    "isActive": true,
    "lastLogin": "2026-02-12T00:00:00.000Z",
    "createdAt": "2026-02-12T00:00:00.000Z",
    "updatedAt": "2026-02-12T00:00:00.000Z"
  }
}
```

### 2. POST /api/auth/login-unified
Login que acepta email o username

**Request:**
```json
{
  "emailOrUsername": "mmagallon",
  "password": "Imhpa2024!"
}
```

O también:
```json
{
  "emailOrUsername": "marta.magallon@gestorproyectos.com",
  "password": "Imhpa2024!"
}
```

### 3. GET /api/auth/me
Obtener información del usuario actual (requiere token)

**Headers:**
```
Authorization: Bearer <token>
```

### 4. POST /api/auth/refresh
Renovar token (requiere token)

**Headers:**
```
Authorization: Bearer <token>
```

### 5. POST /api/auth/logout
Cerrar sesión (requiere token)

**Headers:**
```
Authorization: Bearer <token>
```

## 🧪 Pruebas con cURL

### Login con email
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"marta.magallon@gestorproyectos.com\",\"password\":\"Imhpa2024!\"}"
```

### Login con username
```bash
curl -X POST http://localhost:3001/api/auth/login-unified \
  -H "Content-Type: application/json" \
  -d "{\"emailOrUsername\":\"mmagallon\",\"password\":\"Imhpa2024!\"}"
```

### Obtener información del usuario
```bash
# Primero hacer login para obtener el token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"marta.magallon@gestorproyectos.com\",\"password\":\"Imhpa2024!\"}" \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Luego usar el token
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

## 🧪 Pruebas con PowerShell

### Login
```powershell
$body = @{
    email = "marta.magallon@gestorproyectos.com"
    password = "Imhpa2024!"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body

$token = $response.token
Write-Host "Token: $token"
```

### Obtener información del usuario
```powershell
$headers = @{
    Authorization = "Bearer $token"
}

$userInfo = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/me" `
    -Method GET `
    -Headers $headers

$userInfo | ConvertTo-Json
```

## 👥 Usuarios de Prueba

Todos los usuarios tienen la contraseña: **Imhpa2024!**

| Email | Username |
|-------|----------|
| marta.magallon@gestorproyectos.com | mmagallon |
| juan.perez@gestorproyectos.com | jperez |
| maria.gonzalez@gestorproyectos.com | mgonzalez |
| carlos.rodriguez@gestorproyectos.com | crodriguez |
| ana.martinez@gestorproyectos.com | amartinez |

## ✅ Verificación

1. El servidor debe estar corriendo en `http://localhost:3001`
2. Ejecuta una de las pruebas de login
3. Deberías recibir un token JWT
4. Usa ese token en el header `Authorization: Bearer <token>` para acceder a endpoints protegidos

## 🔒 Seguridad

- Las contraseñas están hasheadas con bcrypt
- Los tokens JWT expiran en 24 horas (configurable en `.env`)
- El password nunca se devuelve en las respuestas
- Se valida que el usuario esté activo antes de permitir login

