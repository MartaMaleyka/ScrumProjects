/**
 * Feature Gate Middleware
 * 
 * Middleware para proteger rutas premium con feature flags.
 * Si una feature no está habilitada, responde con 404 (no 403) para no revelar endpoints.
 */

const { isFeatureEnabled, isPremiumEdition } = require('../config/features');

/**
 * Middleware que requiere que una feature específica esté habilitada
 * @param {string} featureKey - Clave de la feature ('github', 'roadmap', 'gantt', 'releases', 'multitenant_dashboard', 'super_admin')
 * @returns {Function} Express middleware
 */
function requireFeature(featureKey) {
  return (req, res, next) => {
    if (!isFeatureEnabled(featureKey)) {
      // Responder con 404 para no revelar que el endpoint existe
      return res.status(404).json({
        success: false,
        message: 'Not found'
      });
    }
    next();
  };
}

/**
 * Middleware que requiere que la edición sea premium
 * @returns {Function} Express middleware
 */
function requireEdition(edition) {
  return (req, res, next) => {
    if (edition === 'premium' && !isPremiumEdition()) {
      // Responder con 404 para no revelar que el endpoint existe
      return res.status(404).json({
        success: false,
        message: 'Not found'
      });
    }
    next();
  };
}

/**
 * Helper para combinar requireFeature con requireEdition
 * Útil para features premium que requieren edición premium
 * @param {string} featureKey - Clave de la feature
 * @param {string} edition - 'premium' | 'community'
 * @returns {Function} Express middleware
 */
function requireFeatureAndEdition(featureKey, edition = 'premium') {
  return (req, res, next) => {
    // Primero verificar edición
    if (edition === 'premium' && !isPremiumEdition()) {
      return res.status(404).json({
        success: false,
        message: 'Not found'
      });
    }
    
    // Luego verificar feature
    if (!isFeatureEnabled(featureKey)) {
      return res.status(404).json({
        success: false,
        message: 'Not found'
      });
    }
    
    next();
  };
}

module.exports = {
  requireFeature,
  requireEdition,
  requireFeatureAndEdition,
};

