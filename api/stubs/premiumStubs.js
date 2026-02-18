/**
 * Premium Feature Stubs
 * 
 * Estos stubs se usan cuando el módulo premium no está disponible.
 * Retornan respuestas controladas (403/404) para endpoints premium.
 */

const { error: errorResponse } = require('../utils/responseHelper');

/**
 * Stub para rutas premium - retorna 403 con mensaje controlado
 */
function premiumStub(req, res) {
  return errorResponse(
    res,
    'Premium feature disabled',
    403,
    'This feature is part of Sprintiva Premium Edition. Please upgrade to access premium features.'
  );
}

/**
 * Stub para rutas premium - retorna 404 (para ocultar existencia del endpoint)
 */
function premiumStub404(req, res) {
  return errorResponse(
    res,
    'Not found',
    404
  );
}

/**
 * Registra stubs para todas las rutas premium
 * @param {Express.App} app - Aplicación Express
 */
function registerPremiumStubs(app) {
  // Stubs para superadmin (404 para ocultar)
  app.use('/api/superadmin', premiumStub404);
  
  // Stubs para roadmap (403 con mensaje)
  app.use('/api/scrum/projects/:projectId/roadmap', premiumStub);
  app.use('/api/scrum/projects/:projectId/gantt', premiumStub);
  app.use('/api/scrum/projects/:projectId/critical-path', premiumStub);
  app.use('/api/scrum/tasks/:id/dependencies', premiumStub);
  
  // Stubs para releases (403 con mensaje)
  app.use('/api/scrum/projects/:projectId/releases', premiumStub);
  app.use('/api/scrum/releases', premiumStub);
  
  // Stubs para GitHub (403 con mensaje)
  app.use('/api/integrations/github', premiumStub);
  
  // Nota: Las rutas ya están protegidas por featureGate middleware,
  // pero estos stubs son un fallback adicional si el middleware falla
}

module.exports = {
  premiumStub,
  premiumStub404,
  registerPremiumStubs,
};

