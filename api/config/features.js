/**
 * Feature Flags Configuration
 * 
 * Este módulo centraliza la gestión de feature flags para el modelo Community vs Premium.
 * Lee variables de entorno y detecta si existe el submodule premium.
 * 
 * Open-Core Architecture:
 * - Community Edition: Core features only, premium features return 403/404
 * - Premium Edition: Requires premium submodule at /premium
 */

const fs = require('fs');
const path = require('path');

/**
 * Verifica si el submodule premium existe y está disponible
 * @returns {boolean}
 */
function hasPremiumModule() {
  try {
    const premiumPath = path.join(__dirname, '../../premium');
    const premiumApiPath = path.join(premiumPath, 'api');
    const premiumRegisterPath = path.join(premiumApiPath, 'registerPremiumRoutes.js');
    
    // Verificar que existe el directorio premium y el archivo de registro
    return fs.existsSync(premiumPath) && 
           fs.existsSync(premiumApiPath) && 
           fs.existsSync(premiumRegisterPath);
  } catch (error) {
    return false;
  }
}

/**
 * Obtiene la edición actual de la aplicación
 * @returns {string} 'community' | 'premium'
 */
function getAppEdition() {
  // Si FEATURE_PREMIUM está explícitamente en true, forzar premium
  if (process.env.FEATURE_PREMIUM === 'true') {
    return 'premium';
  }
  
  // Si existe el submodule premium, puede ser premium (pero requiere flags)
  if (hasPremiumModule()) {
    // Si APP_EDITION está en premium, usar premium
    if (process.env.APP_EDITION === 'premium') {
      return 'premium';
    }
    // Si no está explícitamente en community, permitir premium con flags
    if (process.env.APP_EDITION !== 'community') {
      return 'premium';
    }
  }
  
  // Por defecto, community
  return 'community';
}

/**
 * Verifica si una feature específica está habilitada
 * @param {string} featureKey - Clave de la feature ('github', 'roadmap', 'gantt', 'releases', 'multitenant_dashboard', 'super_admin')
 * @returns {boolean}
 */
function isFeatureEnabled(featureKey) {
  const edition = getAppEdition();
  
  // En community, todas las features premium están deshabilitadas (safe default)
  if (edition === 'community') {
    return false;
  }
  
  // Si es premium, verificar que el módulo premium existe
  if (!hasPremiumModule()) {
    return false;
  }
  
  // Si PREMIUM_FEATURES está en true, todas las features premium están habilitadas
  if (process.env.PREMIUM_FEATURES === 'true' || process.env.FEATURE_PREMIUM === 'true') {
    return true;
  }
  
  // Verificar flags específicos por feature (con nombres legacy y nuevos)
  const featureFlags = {
    github: process.env.ENABLE_GITHUB === 'true' || process.env.FEATURE_GITHUB === 'true',
    roadmap: process.env.ENABLE_ROADMAP === 'true' || process.env.FEATURE_ROADMAP === 'true',
    gantt: process.env.ENABLE_GANTT === 'true' || process.env.FEATURE_GANTT === 'true',
    releases: process.env.ENABLE_RELEASES === 'true' || process.env.FEATURE_RELEASES === 'true',
    multitenant_dashboard: process.env.ENABLE_MULTI_TENANT_DASHBOARD === 'true' || process.env.FEATURE_MULTI_TENANT === 'true',
    super_admin: process.env.ENABLE_SUPER_ADMIN_UI === 'true' || process.env.FEATURE_SUPER_ADMIN === 'true',
  };
  
  return featureFlags[featureKey] || false;
}

/**
 * Verifica si la edición actual es premium
 * @returns {boolean}
 */
function isPremiumEdition() {
  return getAppEdition() === 'premium';
}

/**
 * Verifica si la edición actual es community
 * @returns {boolean}
 */
function isCommunityEdition() {
  return getAppEdition() === 'community';
}

/**
 * Obtiene el estado de todas las features
 * @returns {Object} Objeto con el estado de cada feature
 */
function getAllFeatures() {
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

module.exports = {
  getAppEdition,
  isFeatureEnabled,
  isPremiumEdition,
  isCommunityEdition,
  getAllFeatures,
  hasPremiumModule,
};

