# Premium UI Module

Este directorio contiene el código premium del frontend.

## Estructura

```
premium/src/
├── registerPremiumUI.ts  # Punto de montaje principal
├── components/            # Componentes premium
│   ├── admin/            # Multi-tenant dashboard
│   ├── roadmap/           # Roadmap, Gantt, Releases
│   └── integrations/     # GitHub integration UI
└── services/              # Servicios premium (opcional)
```

## Uso

El archivo `registerPremiumUI.ts` se importa dinámicamente desde los componentes de la UI cuando:
1. El submodule premium existe
2. `PUBLIC_FEATURE_PREMIUM=true` o `PUBLIC_APP_EDITION=premium`

## Nota para desarrolladores Premium

Este código es PRIVADO y solo está disponible en el repositorio Sprintiva-Premium.

