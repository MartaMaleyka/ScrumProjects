# Sprintiva Premium Module

Este directorio es un **Git Submodule** que apunta al repositorio privado `Sprintiva-Premium`.

## ⚠️ IMPORTANTE

Este directorio **NO debe contener código** en el repositorio Community. Solo debe existir como submodule cuando se clona con `--recursive` o después de ejecutar `git submodule update --init`.

## Estructura

```
premium/
├── api/              # Backend premium
│   └── registerPremiumRoutes.js
├── src/              # Frontend premium
│   └── registerPremiumUI.ts
└── README.md         # Este archivo
```

## Para usuarios de Community Edition

Si solo usas Community Edition, este directorio estará vacío o no existirá. La aplicación funcionará perfectamente sin él, mostrando stubs para features premium.

## Para usuarios de Premium Edition

1. Clonar el repositorio con submodules:
   ```bash
   git clone --recursive https://github.com/your-org/Sprintiva-Community.git
   ```

2. O inicializar submodules después de clonar:
   ```bash
   git submodule update --init --recursive
   ```

3. Configurar variables de entorno:
   ```env
   FEATURE_PREMIUM=true
   APP_EDITION=premium
   ```

## Desarrollo

Si eres mantenedor del código premium, trabaja directamente en el repositorio `Sprintiva-Premium` (private). Los cambios se reflejarán aquí cuando actualices el submodule.

