/**
 * Premium Routes Registration
 * 
 * Este archivo se encuentra en el repositorio PRIVATE Sprintiva-Premium.
 * Se importa dinámicamente desde el repositorio Community cuando el submodule está disponible.
 * 
 * IMPORTANTE: Este archivo NO debe estar en el repositorio Community.
 * Solo existe en el repositorio Premium (private).
 */

/**
 * Registra todas las rutas premium en la aplicación Express
 * @param {Express.App} app - Aplicación Express
 */
function registerPremiumRoutes(app) {
  // Importar rutas premium
  // Estas rutas reemplazan los stubs cuando el módulo premium está disponible
  
  try {
    // Rutas de superadmin (multi-tenant)
    const superadminRoutes = require('./routes/superadmin');
    app.use('/api/superadmin', superadminRoutes);
    
    // Rutas de roadmap (ya montadas en server.js, pero aquí se pueden registrar handlers premium)
    // Las rutas de roadmap ya están en api/routes/roadmap.js y se montan condicionalmente
    
    // Rutas de GitHub (ya montadas en server.js)
    // Las rutas de GitHub ya están en api/routes/github.js y se montan condicionalmente
    
    // Rutas adicionales premium pueden agregarse aquí
    
    console.log('✅ Premium routes registered successfully');
  } catch (error) {
    console.error('❌ Error registering premium routes:', error);
    throw error;
  }
}

module.exports = {
  registerPremiumRoutes,
};

