const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Importar configuración de base de datos
const { connectDB, prisma } = require('./config/database');
const logger = require('./utils/logger');
const { hasPremiumModule } = require('./config/features');
const premiumLoader = require('./config/premiumLoader');

// Importar rutas core (siempre disponibles)
const authRoutes = require('./routes/auth');
const scrumRoutes = require('./routes/scrum');
const adminRoutes = require('./routes/admin');

// Importar rutas premium (pueden ser stubs o reales)
const roadmapRoutes = require('./routes/roadmap');
// GitHub routes se cargan dinámicamente desde premium si está disponible
// Si no, se usan stubs (ver más abajo)
const superadminRoutes = require('./routes/superadmin');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware de seguridad
app.use(helmet());

// Configuración de CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Middleware para parsing JSON y cookies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Middleware de logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Middleware de logging personalizado
app.use(logger.logRequest);

// Ruta de health check
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      status: 'ok', 
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      database: 'disconnected',
      error: error.message 
    });
  }
});

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    message: 'API de Gestor de Proyectos - Sistema Scrum',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      scrum: '/api/scrum'
    }
  });
});

// Rutas de la API - Core (siempre disponibles)
app.use('/api/auth', authRoutes);
app.use('/api/scrum', scrumRoutes);
app.use('/api/admin', adminRoutes);

// Rutas Premium - Carga dinámica segura
// Intenta cargar desde /premium submodule, si no existe usa stubs
const premiumRoutesModule = premiumLoader.loadPremiumRoutes();

if (premiumRoutesModule) {
  // Premium submodule existe: registrar rutas reales
  try {
    premiumRoutesModule.registerPremiumRoutes(app);
    logger.success('✅ Premium routes registered from submodule');
  } catch (error) {
    logger.error('❌ Error registering premium routes:', error);
    // Fallback a stubs si hay error
    const { registerPremiumStubs } = require('./stubs/premiumStubs');
    registerPremiumStubs(app);
    logger.info('ℹ️  Falling back to premium stubs');
  }
} else {
  // Premium submodule no existe: usar stubs
  logger.info('ℹ️  Premium module not found, using stubs');
  const { registerPremiumStubs } = require('./stubs/premiumStubs');
  registerPremiumStubs(app);
}

// Montar rutas premium de Community (con feature gates, funcionan como stubs si premium no está disponible)
// Estas rutas están en Community pero son premium features
app.use('/api/superadmin', superadminRoutes); // Rutas de SUPER_ADMIN (gated por feature flags)
app.use('/api/scrum', roadmapRoutes); // Rutas de roadmap y releases (gated por feature flags)
// Rutas de GitHub - Carga dinámica desde premium
// Si premium está disponible, se registran en registerPremiumRoutes
// Si no, se usan stubs (ya registrados en registerPremiumStubs)

// Nota: Las rutas premium ya tienen middleware featureGate que retorna 404 si no están habilitadas
// Esto proporciona una capa adicional de seguridad además de los stubs

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  logger.error('Error no manejado:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Iniciar servidor
async function startServer() {
  try {
    // Conectar a la base de datos
    await connectDB();
    
    // Iniciar servidor
    app.listen(PORT, () => {
      logger.success(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      logger.info(`📊 Health check: http://localhost:${PORT}/health`);
      logger.info(`🔧 Entorno: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

// Manejar cierre graceful
process.on('SIGTERM', async () => {
  logger.info('🔄 Recibida señal SIGTERM, cerrando servidor...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('🔄 Recibida señal SIGINT, cerrando servidor...');
  await prisma.$disconnect();
  process.exit(0);
});

// Iniciar
startServer();

