/**
 * Premium Module Loader (Frontend)
 * 
 * Carga de forma segura el módulo premium desde el submodule /premium
 * Si no existe, retorna null sin romper el build.
 * 
 * Uso:
 *   import { loadPremiumUI } from './config/premiumLoader';
 *   const premiumUI = await loadPremiumUI();
 *   if (premiumUI) {
 *     premiumUI.registerPremiumUI();
 *   }
 */

/**
 * Verifica si el módulo premium está disponible (build-time check)
 * En runtime, confiamos en las variables de entorno
 */
function hasPremiumModule(): boolean {
  // En build-time, verificar si existe el directorio
  // En runtime, usar variables de entorno
  if (typeof window === 'undefined') {
    // SSR: verificar filesystem (solo en Node.js)
    try {
      const fs = require('fs');
      const path = require('path');
      const premiumPath = path.join(process.cwd(), 'premium', 'src', 'registerPremiumUI.ts');
      return fs.existsSync(premiumPath);
    } catch {
      return false;
    }
  }
  
  // Browser: usar variables de entorno
  return import.meta.env.PUBLIC_FEATURE_PREMIUM === 'true' || 
         import.meta.env.PUBLIC_APP_EDITION === 'premium';
}

/**
 * Carga de forma segura el módulo de registro de UI premium
 * @returns {Promise<Object|null>} Objeto con registerPremiumUI o null si no existe
 */
export async function loadPremiumUI(): Promise<{ registerPremiumUI: () => any; isPremiumAvailable: () => boolean } | null> {
  if (!hasPremiumModule()) {
    console.debug('Premium module not found, skipping premium UI registration');
    return null;
  }

  try {
    // Dynamic import con @vite-ignore para evitar errores de build si no existe
    const premiumModule = await import(
      /* @vite-ignore */
      '../../premium/src/registerPremiumUI'
    );
    
    if (typeof premiumModule.registerPremiumUI !== 'function') {
      console.warn('Premium module found but registerPremiumUI is not a function');
      return null;
    }

    console.log('✅ Premium UI module loaded successfully');
    return premiumModule;
  } catch (error: any) {
    console.warn('⚠️  Could not load premium UI module:', error.message);
    return null;
  }
}

/**
 * Carga de forma segura un componente premium específico
 * @param {string} componentPath - Ruta relativa desde premium/src (ej: 'components/budgets/BudgetsPage')
 * @returns {Promise<React.ComponentType|null>} Componente o null si no existe
 */
export async function loadPremiumComponent(
  componentPath: string
): Promise<React.ComponentType | null> {
  if (!hasPremiumModule()) {
    return null;
  }

  try {
    const component = await import(
      /* @vite-ignore */
      `../../premium/src/${componentPath}`
    );
    
    return component.default || component;
  } catch (error: any) {
    console.warn(`⚠️  Could not load premium component ${componentPath}:`, error.message);
    return null;
  }
}

/**
 * Carga de forma segura un servicio premium específico
 * @param {string} servicePath - Ruta relativa desde premium/src (ej: 'services/budgetService')
 * @returns {Promise<Object|null>} Servicio o null si no existe
 */
export async function loadPremiumService(servicePath: string): Promise<any | null> {
  if (!hasPremiumModule()) {
    return null;
  }

  try {
    const service = await import(
      /* @vite-ignore */
      `../../premium/src/${servicePath}`
    );
    
    return service.default || service;
  } catch (error: any) {
    console.warn(`⚠️  Could not load premium service ${servicePath}:`, error.message);
    return null;
  }
}

export { hasPremiumModule };

