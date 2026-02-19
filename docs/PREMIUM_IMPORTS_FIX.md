# Fix de Imports en Premium Components

Los componentes en `premium/src/components/premium/budgets/` necesitan importar desde Community usando rutas relativas correctas.

## Estructura de Rutas

Desde `premium/src/components/premium/budgets/Component.tsx`:
- Para llegar a `src/config/features.ts`: `../../../../../../src/config/features`
- Para llegar a `src/components/ui/Button.tsx`: `../../../../../../src/components/ui/Button`
- Para llegar a `src/services/scrumService.ts`: `../../../../../../src/services/scrumService`

## Patrón de Corrección

Reemplazar:
```typescript
import { isFeatureEnabled } from '../../../config/features';
import { Button } from '../../ui/Button';
import scrumService from '../../../services/scrumService';
```

Por:
```typescript
import { isFeatureEnabled } from '../../../../../../src/config/features';
import { Button } from '../../../../../../src/components/ui/Button';
import scrumService from '../../../../../../src/services/scrumService';
```

## Archivos a Corregir

- BudgetsPage.tsx ✅ (ya corregido)
- BudgetCreateModal.tsx
- BudgetWidget.tsx
- ExpenseCreateModal.tsx
- RateCardCreateModal.tsx
- Y otros componentes que importen desde Community

## Nota

Los servicios premium (`services/premium/budgetService`) se mantienen con `../../../services/premium/` porque están en el mismo submodule premium.

