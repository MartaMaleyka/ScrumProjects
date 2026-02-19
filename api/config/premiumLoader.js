/**
 * Premium Module Loader (Backend)
 * 
 * Carga de forma segura el módulo premium desde el submodule /premium
 * Si no existe, retorna null sin crashear la aplicación.
 * 
 * Uso:
 *   const premiumLoader = require('./config/premiumLoader');
 *   const premiumRoutes = premiumLoader.loadPremiumRoutes();
 *   if (premiumRoutes) {
 *     premiumRoutes.registerPremiumRoutes(app);
 *   }
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Verifica si el módulo premium existe físicamente
 * @returns {boolean}
 */
function hasPremiumModule() {
  try {
    const premiumPath = path.join(__dirname, '../../premium');
    const premiumApiPath = path.join(premiumPath, 'api');
    const premiumRegisterPath = path.join(premiumApiPath, 'registerPremiumRoutes.js');
    
    return fs.existsSync(premiumPath) && 
           fs.existsSync(premiumApiPath) && 
           fs.existsSync(premiumRegisterPath);
  } catch (error) {
    return false;
  }
}

/**
 * Carga de forma segura el módulo de registro de rutas premium
 * @returns {Object|null} Objeto con registerPremiumRoutes o null si no existe
 */
function loadPremiumRoutes() {
  if (!hasPremiumModule()) {
    logger.debug('Premium module not found, skipping premium routes registration');
    return null;
  }

  try {
    const premiumRoutes = require('../../premium/api/registerPremiumRoutes');
    
    if (typeof premiumRoutes.registerPremiumRoutes !== 'function') {
      logger.warn('Premium module found but registerPremiumRoutes is not a function');
      return null;
    }

    logger.info('✅ Premium routes module loaded successfully');
    return premiumRoutes;
  } catch (error) {
    logger.warn('⚠️  Could not load premium routes module:', error.message);
    return null;
  }
}

/**
 * Carga de forma segura un controlador premium específico
 * @param {string} controllerName - Nombre del controlador (ej: 'budgetController')
 * @returns {Object|null} Controlador o null si no existe
 */
function loadPremiumController(controllerName) {
  if (!hasPremiumModule()) {
    return null;
  }

  try {
    const controllerPath = path.join(__dirname, '../../premium/api/controllers', `${controllerName}.js`);
    
    if (!fs.existsSync(controllerPath)) {
      return null;
    }

    return require(controllerPath);
  } catch (error) {
    logger.warn(`⚠️  Could not load premium controller ${controllerName}:`, error.message);
    return null;
  }
}

/**
 * Carga de forma segura una ruta premium específica
 * @param {string} routeName - Nombre de la ruta (ej: 'budgets')
 * @returns {Object|null} Router Express o null si no existe
 */
function loadPremiumRoute(routeName) {
  if (!hasPremiumModule()) {
    return null;
  }

  try {
    const routePath = path.join(__dirname, '../../premium/api/routes', `${routeName}.js`);
    
    if (!fs.existsSync(routePath)) {
      return null;
    }

    return require(routePath);
  } catch (error) {
    logger.warn(`⚠️  Could not load premium route ${routeName}:`, error.message);
    return null;
  }
}

module.exports = {
  hasPremiumModule,
  loadPremiumRoutes,
  loadPremiumController,
  loadPremiumRoute,
};

