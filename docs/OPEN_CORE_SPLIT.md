# 🎯 Guía de Split Open-Core: Sprintiva Community → Premium

Esta guía detalla el proceso completo para dividir el repositorio actual en dos repositorios: **Sprintiva-Community** (public) y **Sprintiva-Premium** (private).

---

## 📋 Pre-requisitos

- Acceso a GitHub con permisos para crear repositorios
- Git configurado con tus credenciales
- El repositorio actual clonado localmente

---

## 🚀 Paso 1: Crear Repositorios en GitHub

### 1.1 Crear Sprintiva-Community (PUBLIC)

```bash
# En GitHub:
# 1. Ir a https://github.com/new
# 2. Nombre: Sprintiva-Community
# 3. Descripción: "Open-source Scrum project management system - Community Edition"
# 4. Visibilidad: PUBLIC
# 5. NO inicializar con README, .gitignore ni licencia
# 6. Click "Create repository"
```

### 1.2 Crear Sprintiva-Premium (PRIVATE)

```bash
# En GitHub:
# 1. Ir a https://github.com/new
# 2. Nombre: Sprintiva-Premium
# 3. Descripción: "Sprintiva Premium Edition - Private repository"
# 4. Visibilidad: PRIVATE
# 5. NO inicializar con README, .gitignore ni licencia
# 6. Click "Create repository"
```

---

## 📦 Paso 2: Preparar Repositorio Community

### 2.1 Crear Nueva Rama para el Split

```bash
cd gestor-proyectos
git checkout -b open-core-split
```

### 2.2 Verificar que los Archivos de Open-Core Están Creados

```bash
# Verificar estructura
ls -la premium/
ls -la api/stubs/
ls -la scripts/smoke-test.js
cat .gitmodules
```

### 2.3 Commit de los Cambios de Open-Core

```bash
git add .
git commit -m "feat: implement open-core architecture with premium submodule support"
```

---

## 🔀 Paso 3: Mover Código Premium al Repo Premium

### 3.1 Identificar Archivos Premium

Los siguientes archivos/componentes son **PREMIUM** y deben moverse:

**Backend:**
- `api/routes/superadmin.js` → `premium/api/routes/superadmin.js`
- `api/controllers/githubController.js` → `premium/api/controllers/githubController.js`
- `api/controllers/roadmapController.js` → `premium/api/controllers/roadmapController.js`
- `api/controllers/releaseController.js` → `premium/api/controllers/releaseController.js`
- `api/services/githubClient.js` → `premium/api/services/githubClient.js`
- `api/services/githubOAuth.js` → `premium/api/services/githubOAuth.js`
- `api/services/githubParser.js` → `premium/api/services/githubParser.js`

**Frontend:**
- `src/components/admin/OrgDashboard.tsx` → `premium/src/components/admin/OrgDashboard.tsx`
- `src/components/admin/OrgDetail.tsx` → `premium/src/components/admin/OrgDetail.tsx`
- `src/components/admin/OrgTable.tsx` → `premium/src/components/admin/OrgTable.tsx`
- `src/components/admin/OrgProjectsTab.tsx` → `premium/src/components/admin/OrgProjectsTab.tsx`
- `src/components/admin/OrgUsersTab.tsx` → `premium/src/components/admin/OrgUsersTab.tsx`
- `src/components/scrum/roadmap/` → `premium/src/components/scrum/roadmap/`
- `src/components/scrum/projects/ProjectGitHubSection.tsx` → `premium/src/components/scrum/projects/ProjectGitHubSection.tsx`
- `src/services/githubService.ts` → `premium/src/services/githubService.ts`
- `src/services/organizationService.ts` → `premium/src/services/organizationService.ts` (si es solo para multi-tenant)

**Rutas que deben quedar como stubs en Community:**
- `api/routes/superadmin.js` → Stub que retorna 404
- `api/routes/github.js` → Ya tiene featureGate, pero puede mejorarse
- `api/routes/roadmap.js` → Ya tiene featureGate, pero puede mejorarse

### 3.2 Crear Repositorio Premium Localmente

```bash
# Crear directorio temporal para el repo premium
cd ..
mkdir Sprintiva-Premium-temp
cd Sprintiva-Premium-temp

# Inicializar git
git init
git remote add origin https://github.com/your-org/Sprintiva-Premium.git

# Crear estructura base
mkdir -p premium/api/routes
mkdir -p premium/api/controllers
mkdir -p premium/api/services
mkdir -p premium/src/components/admin
mkdir -p premium/src/components/scrum/roadmap
mkdir -p premium/src/components/scrum/projects
mkdir -p premium/src/services
```

### 3.3 Copiar Archivos Premium

```bash
# Desde el directorio gestor-proyectos
cd gestor-proyectos

# Copiar archivos backend premium
cp api/routes/superadmin.js ../Sprintiva-Premium-temp/premium/api/routes/
cp api/controllers/githubController.js ../Sprintiva-Premium-temp/premium/api/controllers/
cp api/controllers/roadmapController.js ../Sprintiva-Premium-temp/premium/api/controllers/
cp api/controllers/releaseController.js ../Sprintiva-Premium-temp/premium/api/controllers/
cp api/services/githubClient.js ../Sprintiva-Premium-temp/premium/api/services/
cp api/services/githubOAuth.js ../Sprintiva-Premium-temp/premium/api/services/
cp api/services/githubParser.js ../Sprintiva-Premium-temp/premium/api/services/

# Copiar archivos frontend premium
cp -r src/components/admin/* ../Sprintiva-Premium-temp/premium/src/components/admin/
cp -r src/components/scrum/roadmap/* ../Sprintiva-Premium-temp/premium/src/components/scrum/roadmap/
cp src/components/scrum/projects/ProjectGitHubSection.tsx ../Sprintiva-Premium-temp/premium/src/components/scrum/projects/
cp src/services/githubService.ts ../Sprintiva-Premium-temp/premium/src/services/
cp src/services/organizationService.ts ../Sprintiva-Premium-temp/premium/src/services/

# Copiar archivos de registro
cp premium/api/registerPremiumRoutes.js ../Sprintiva-Premium-temp/premium/api/
cp premium/src/registerPremiumUI.ts ../Sprintiva-Premium-temp/premium/src/
```

### 3.4 Crear README y Estructura en Premium

```bash
cd ../Sprintiva-Premium-temp

# Crear README principal
cat > README.md << 'EOF'
# Sprintiva Premium Edition

Este es el repositorio PRIVADO que contiene el código premium de Sprintiva.

## Estructura

- `premium/api/` - Backend premium (routes, controllers, services)
- `premium/src/` - Frontend premium (components, services)

## Uso

Este repositorio se usa como Git Submodule dentro de Sprintiva-Community.

Ver documentación en el repositorio Community para más detalles.
EOF

# Commit inicial
git add .
git commit -m "feat: initial premium module structure"
git branch -M main
git push -u origin main
```

---

## 🔄 Paso 4: Actualizar Community con Stubs

### 4.1 Crear Stubs en Community

Los stubs ya están creados en `api/stubs/premiumStubs.js`. Ahora necesitamos actualizar las rutas para usar stubs cuando premium no está disponible.

### 4.2 Actualizar Rutas para Usar Stubs

Las rutas premium (`superadmin.js`, `github.js`, `roadmap.js`) ya tienen `featureGate` middleware que las protege. Los stubs son un fallback adicional.

### 4.3 Commit de Cambios en Community

```bash
cd gestor-proyectos

# Verificar que los stubs están en su lugar
git status

# Commit
git add .
git commit -m "feat: add premium stubs and open-core infrastructure"
```

---

## 🔗 Paso 5: Agregar Submodule a Community

### 5.1 Agregar Submodule

```bash
cd gestor-proyectos

# Agregar submodule premium
git submodule add https://github.com/your-org/Sprintiva-Premium.git premium

# Verificar que se creó .gitmodules
cat .gitmodules
```

### 5.2 Commit del Submodule

```bash
git add .gitmodules premium
git commit -m "feat: add premium submodule"
```

---

## 📤 Paso 6: Publicar Community

### 6.1 Agregar Remote y Push

```bash
cd gestor-proyectos

# Agregar remote del nuevo repo Community
git remote add community https://github.com/your-org/Sprintiva-Community.git

# Push de la rama open-core-split
git push -u community open-core-split

# O si quieres hacer merge a main primero:
git checkout main
git merge open-core-split
git push -u community main
```

### 6.2 Verificar en GitHub

- Ir a https://github.com/your-org/Sprintiva-Community
- Verificar que el submodule aparece como enlace
- Verificar que los archivos están presentes

---

## ✅ Paso 7: Verificación

### 7.1 Test Local sin Premium

```bash
# Eliminar submodule temporalmente
git submodule deinit premium
rm -rf premium

# Iniciar aplicación
docker compose up

# Verificar logs - debe decir "Premium module not found, using stubs"
# Probar endpoints premium - deben retornar 404
```

### 7.2 Test Local con Premium

```bash
# Restaurar submodule
git submodule update --init --recursive

# Configurar .env con FEATURE_PREMIUM=true
echo "FEATURE_PREMIUM=true" >> .env
echo "APP_EDITION=premium" >> .env

# Reiniciar aplicación
docker compose restart

# Verificar logs - debe decir "Premium module loaded successfully"
# Probar endpoints premium - deben funcionar si flags están activos
```

### 7.3 Ejecutar Smoke Test

```bash
# Ejecutar smoke test
node scripts/smoke-test.js

# Con premium
node scripts/smoke-test.js --with-premium
```

---

## 📝 Checklist Final

- [ ] Repositorio Sprintiva-Community creado (PUBLIC)
- [ ] Repositorio Sprintiva-Premium creado (PRIVATE)
- [ ] Código premium movido al repo Premium
- [ ] Stubs creados en Community
- [ ] Submodule agregado a Community
- [ ] `.gitmodules` configurado correctamente
- [ ] README actualizado con instrucciones
- [ ] Variables de entorno documentadas
- [ ] Smoke test pasa sin premium
- [ ] Smoke test pasa con premium
- [ ] Community funciona sin submodule
- [ ] Premium se carga correctamente cuando existe

---

## 🔐 Notas de Seguridad

1. **Nunca commitees código premium al repo Community**
2. **Verifica que `.gitignore` NO ignore `/premium` si usas submodule**
3. **El submodule debe apuntar al repo PRIVATE**
4. **Los stubs deben retornar 404, no 403, para ocultar existencia de endpoints**

---

## 🆘 Troubleshooting

### Submodule aparece vacío

```bash
git submodule update --init --recursive
```

### Error al cargar premium module

Verificar que:
1. El submodule está inicializado
2. `FEATURE_PREMIUM=true` en `.env`
3. El archivo `premium/api/registerPremiumRoutes.js` existe

### Endpoints premium no funcionan

Verificar:
1. Feature flags individuales están en `true`
2. `APP_EDITION=premium` en backend
3. `PUBLIC_APP_EDITION=premium` en frontend
4. El módulo premium está cargado (ver logs del servidor)

---

## 📚 Referencias

- [Git Submodules Documentation](https://git-scm.com/book/en/v2/Git-Tools-Submodules)
- [Open Core Model](https://en.wikipedia.org/wiki/Open-core_model)

