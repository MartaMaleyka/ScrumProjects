# 🔀 Comandos Git para Open-Core Split

Comandos exactos (copy/paste) para realizar el split open-core.

---

## 📋 Pre-requisitos

```bash
# Verificar que estás en el directorio correcto
cd C:\Users\marta\Documents\gestor-proyectos

# Verificar estado de git
git status
```

---

## 🚀 Paso 1: Preparar Cambios Locales

```bash
# Crear rama para el split
git checkout -b open-core-split

# Verificar todos los cambios
git status

# Agregar todos los archivos nuevos y modificados
git add .

# Commit
git commit -m "feat: implement open-core architecture with premium submodule support

- Add premium submodule structure and mount points
- Add feature flags with automatic premium detection
- Add premium stubs for safe fallback
- Add dynamic loading mechanism in server.js
- Update feature configs to support FEATURE_* variables
- Add smoke test script
- Update documentation with open-core instructions
- Add .gitmodules configuration"
```

---

## 📦 Paso 2: Crear Repositorios en GitHub

### 2.1 Sprintiva-Community (PUBLIC)

**En el navegador:**
1. Ir a: https://github.com/new
2. **Repository name**: `Sprintiva-Community`
3. **Description**: `Open-source Scrum project management system - Community Edition`
4. **Visibility**: ✅ **Public**
5. **NO marcar**: Add README, Add .gitignore, Choose a license
6. Click **"Create repository"**
7. **Copiar la URL**: `https://github.com/MartaMaleyka/Sprintiva-Community.git`

### 2.2 Sprintiva-Premium (PRIVATE)

**En el navegador:**
1. Ir a: https://github.com/new
2. **Repository name**: `Sprintiva-Premium`
3. **Description**: `Sprintiva Premium Edition - Private repository`
4. **Visibility**: 🔒 **Private**
5. **NO marcar**: Add README, Add .gitignore, Choose a license
6. Click **"Create repository"**
7. **Copiar la URL**: `https://github.com/MartaMaleyka/Sprintiva-Premium.git`

---

## 🔧 Paso 3: Actualizar .gitmodules con URL Real

```bash
# Editar .gitmodules manualmente con tu editor favorito
notepad .gitmodules

# Verificar que la URL es correcta
cat .gitmodules
```

**Contenido esperado de `.gitmodules`:**
```ini
[submodule "premium"]
	path = premium
	url = https://github.com/MartaMaleyka/Sprintiva-Premium.git
```

---

## 💎 Paso 4: Inicializar Repositorio Premium

```bash
# Crear directorio temporal para el repo premium
cd ..
mkdir Sprintiva-Premium-temp
cd Sprintiva-Premium-temp

# Inicializar git
git init

# Agregar remote
git remote add origin https://github.com/MartaMaleyka/Sprintiva-Premium.git

# Crear estructura de directorios
mkdir -p premium\api\routes
mkdir -p premium\api\controllers
mkdir -p premium\api\services
mkdir -p premium\src\components\admin
mkdir -p premium\src\components\scrum\roadmap
mkdir -p premium\src\components\scrum\projects
mkdir -p premium\src\services

# Copiar archivos de registro desde gestor-proyectos
copy ..\gestor-proyectos\premium\api\registerPremiumRoutes.js premium\api\
copy ..\gestor-proyectos\premium\src\registerPremiumUI.ts premium\src\
copy ..\gestor-proyectos\premium\README.md .
copy ..\gestor-proyectos\premium\api\README.md premium\api\
copy ..\gestor-proyectos\premium\src\README.md premium\src\

# Crear README principal
@"
# Sprintiva Premium Edition

Este es el repositorio PRIVADO que contiene el código premium de Sprintiva.

## Estructura

- `premium/api/` - Backend premium (routes, controllers, services)
- `premium/src/` - Frontend premium (components, services)

## Uso

Este repositorio se usa como Git Submodule dentro de Sprintiva-Community.

Ver documentación en el repositorio Community para más detalles.
"@ | Out-File -FilePath README.md -Encoding utf8

# Agregar todos los archivos
git add .

# Commit inicial
git commit -m "feat: initial premium module structure with mount points"

# Renombrar rama a main
git branch -M main

# Push al repositorio remoto
git push -u origin main

# Volver a gestor-proyectos
cd ..\gestor-proyectos
```

---

## 🔗 Paso 5: Agregar Submodule a Community

```bash
# Desde gestor-proyectos
cd C:\Users\marta\Documents\gestor-proyectos

# Agregar submodule (asegúrate de que .gitmodules tiene la URL correcta)
git submodule add https://github.com/MartaMaleyka/Sprintiva-Premium.git premium

# Verificar que se creó correctamente
cat .gitmodules
dir premium

# Commit del submodule
git add .gitmodules premium
git commit -m "feat: add premium submodule"
```

---

## 📤 Paso 6: Publicar Community

```bash
# Agregar remote del nuevo repo Community
git remote add community https://github.com/MartaMaleyka/Sprintiva-Community.git

# Verificar remotes
git remote -v

# Push de la rama open-core-split
git push -u community open-core-split

# O si prefieres merge a main primero:
git checkout main
git merge open-core-split
git push -u community main
```

---

## ✅ Paso 7: Verificación

### 7.1 Verificar en GitHub

1. Ir a: https://github.com/MartaMaleyka/Sprintiva-Community
2. Verificar que el submodule aparece como enlace
3. Verificar que todos los archivos están presentes
4. Verificar que `.gitmodules` está en el repo

### 7.2 Test Local

```bash
# Clonar el repo Community (en otro directorio para test)
cd ..
git clone https://github.com/MartaMaleyka/Sprintiva-Community.git Sprintiva-Community-test

# Clonar SIN submodules (simula usuario Community)
cd Sprintiva-Community-test

# Verificar que funciona sin premium
docker compose up

# En los logs debe aparecer: "ℹ️  Premium module not found, using stubs"

# Clonar CON submodules (simula usuario Premium)
cd ..
rm -rf Sprintiva-Community-test
git clone --recursive https://github.com/MartaMaleyka/Sprintiva-Community.git Sprintiva-Community-test
cd Sprintiva-Community-test

# Configurar .env con FEATURE_PREMIUM=true
echo "FEATURE_PREMIUM=true" >> .env
echo "APP_EDITION=premium" >> .env

# Verificar que funciona con premium
docker compose up

# En los logs debe aparecer: "✅ Premium module loaded successfully"
```

---

## 🔄 Paso 8: Actualizar Submodule (Para Futuro)

Cuando hagas cambios en el repositorio Premium:

```bash
# Desde el repo Premium
cd premium
git checkout main
git pull origin main

# Volver al repo Community
cd ..
git add premium
git commit -m "chore: update premium submodule"
git push
```

---

## 📝 Notas Importantes

1. **Repositorio Community**: `https://github.com/MartaMaleyka/Sprintiva-Community.git` (PUBLIC)
2. **Repositorio Premium**: `https://github.com/MartaMaleyka/Sprintiva-Premium.git` (PRIVATE)
3. **El repo Premium debe ser PRIVATE** 🔒
4. **El repo Community debe ser PUBLIC** ✅
5. **No commitees código premium** al repo Community
6. **Solo stubs y placeholders** van en Community

---

## 🆘 Troubleshooting

### Error: "fatal: could not read Username"

```bash
# Configurar credenciales de GitHub
git config --global credential.helper wincred

# O usar SSH en lugar de HTTPS
git remote set-url origin git@github.com:MartaMaleyka/Sprintiva-Premium.git
```

### Error: "fatal: A submodule named 'premium' already exists"

```bash
# Eliminar submodule existente
git submodule deinit premium
git rm premium
rm -rf .git/modules/premium

# Agregar nuevamente
git submodule add https://github.com/MartaMaleyka/Sprintiva-Premium.git premium
```

### Submodule aparece vacío

```bash
# Inicializar y actualizar submodules
git submodule update --init --recursive
```

---

**Última actualización**: 2026-02-18

