/**
 * Feature Flags Configuration (Frontend)
 * 
 * Este módulo centraliza la gestión de feature flags para el modelo Community vs Premium.
 * Lee variables de entorno públicas y detecta si existe el submodule premium.
 * 
 * Open-Core Architecture:
 * - Community Edition: Core features only, premium features show upgrade prompts
 * - Premium Edition: Requires premium submodule at /premium
 */

export type FeatureKey = 
  | 'github' 
  | 'roadmap' 
  | 'gantt' 
  | 'releases' 
  | 'multitenant_dashboard' 
  | 'super_admin';

export type Edition = 'community' | 'premium';

export interface Features {
  github: boolean;
  roadmap: boolean;
  gantt: boolean;
  releases: boolean;
  multitenant_dashboard: boolean;
  super_admin: boolean;
}

export interface FeaturesInfo {
  edition: Edition;
  features: Features;
}

/**
 * Verifica si el submodule premium existe (solo en build time, no runtime)
 * En runtime, confiamos en las variables de entorno
 * @returns {boolean}
 */
function hasPremiumModule(): boolean {
  // En el frontend, no podemos verificar el filesystem en runtime
  // Confiamos en las variables de entorno que se setean en build time
  return import.meta.env.PUBLIC_FEATURE_PREMIUM === 'true' || 
         import.meta.env.PUBLIC_APP_EDITION === 'premium';
}

/**
 * Obtiene la edición actual de la aplicación desde variables de entorno
 * @returns {Edition} 'community' | 'premium'
 */
export function getAppEdition(): Edition {
  // Si FEATURE_PREMIUM está explícitamente en true, forzar premium
  if (import.meta.env.PUBLIC_FEATURE_PREMIUM === 'true') {
    return 'premium';
  }
  
  const edition = import.meta.env.PUBLIC_APP_EDITION || 'community';
  return (edition.toLowerCase() as Edition) === 'premium' ? 'premium' : 'community';
}

/**
 * Verifica si una feature específica está habilitada
 * @param {FeatureKey} featureKey - Clave de la feature
 * @returns {boolean}
 */
export function isFeatureEnabled(featureKey: FeatureKey): boolean {
  const edition = getAppEdition();
  
  // Si es community, todas las features premium están deshabilitadas (safe default)
  if (edition === 'community') {
    return false;
  }
  
  // Si es premium, verificar que el módulo premium existe (vía env vars)
  if (!hasPremiumModule()) {
    return false;
  }
  
  // Si PREMIUM_FEATURES está en true, todas las features premium están habilitadas
  if (import.meta.env.PUBLIC_PREMIUM_FEATURES === 'true' || 
      import.meta.env.PUBLIC_FEATURE_PREMIUM === 'true') {
    return true;
  }
  
  // Verificar flags específicos por feature (con nombres legacy y nuevos)
  const featureFlags: Record<FeatureKey, string> = {
    github: import.meta.env.PUBLIC_ENABLE_GITHUB || import.meta.env.PUBLIC_FEATURE_GITHUB || 'false',
    roadmap: import.meta.env.PUBLIC_ENABLE_ROADMAP || import.meta.env.PUBLIC_FEATURE_ROADMAP || 'false',
    gantt: import.meta.env.PUBLIC_ENABLE_GANTT || import.meta.env.PUBLIC_FEATURE_GANTT || 'false',
    releases: import.meta.env.PUBLIC_ENABLE_RELEASES || import.meta.env.PUBLIC_FEATURE_RELEASES || 'false',
    multitenant_dashboard: import.meta.env.PUBLIC_ENABLE_MULTI_TENANT_DASHBOARD || import.meta.env.PUBLIC_FEATURE_MULTI_TENANT || 'false',
    super_admin: import.meta.env.PUBLIC_ENABLE_SUPER_ADMIN_UI || import.meta.env.PUBLIC_FEATURE_SUPER_ADMIN || 'false',
  };
  
  return featureFlags[featureKey] === 'true';
}

/**
 * Verifica si la edición actual es premium
 * @returns {boolean}
 */
export function isPremiumEdition(): boolean {
  return getAppEdition() === 'premium';
}

/**
 * Verifica si la edición actual es community
 * @returns {boolean}
 */
export function isCommunityEdition(): boolean {
  return getAppEdition() === 'community';
}

/**
 * Obtiene el estado de todas las features
 * @returns {FeaturesInfo} Objeto con el estado de cada feature
 */
export function getAllFeatures(): FeaturesInfo {
  return {
    edition: getAppEdition(),
    features: {
      github: isFeatureEnabled('github'),
      roadmap: isFeatureEnabled('roadmap'),
      gantt: isFeatureEnabled('gantt'),
      releases: isFeatureEnabled('releases'),
      multitenant_dashboard: isFeatureEnabled('multitenant_dashboard'),
      super_admin: isFeatureEnabled('super_admin'),
    }
  };
}

/**
 * Obtiene features desde el usuario actual (si vienen del endpoint /me)
 * Útil para sincronizar con el backend
 * @param {any} user - Objeto usuario del endpoint /me
 * @returns {FeaturesInfo | null}
 */
export function getFeaturesFromUser(user: any): FeaturesInfo | null {
  if (!user || !user.edition || !user.features) {
    return null;
  }
  
  return {
    edition: user.edition as Edition,
    features: user.features as Features,
  };
}

/**
 * Exporta hasPremiumModule para uso externo si es necesario
 */
export { hasPremiumModule };

