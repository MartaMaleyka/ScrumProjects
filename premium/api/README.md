# Premium API Module

Este directorio contiene el código premium del backend.

## Estructura

```
premium/api/
├── registerPremiumRoutes.js  # Punto de montaje principal
├── routes/                    # Rutas premium (opcional, si se separan)
├── controllers/               # Controladores premium (opcional)
└── middleware/                # Middleware premium (opcional)
```

## Uso

El archivo `registerPremiumRoutes.js` es importado dinámicamente desde `api/server.js` cuando:
1. El submodule premium existe
2. `FEATURE_PREMIUM=true` o `APP_EDITION=premium`

## Nota para desarrolladores Premium

Este código es PRIVADO y solo está disponible en el repositorio Sprintiva-Premium.

