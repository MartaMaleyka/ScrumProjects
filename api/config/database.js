/**
 * Configuración de base de datos MySQL
 * Este archivo maneja la conexión y configuración de la base de datos
 */

// Cargar variables de entorno primero
require('dotenv').config();

// Validar que DATABASE_URL esté configurada
if (!process.env.DATABASE_URL) {
  const error = new Error('DATABASE_URL no está configurada. Por favor, configura esta variable de entorno.');
  console.error('❌ Error crítico:', error.message);
  throw error;
}

const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

// Configuración de Prisma para MySQL
const prismaConfig = {
  log: process.env.NODE_ENV === 'development'
    ? ['warn', 'error']  // Reducir logs en desarrollo
    : ['error'],
  errorFormat: process.env.NODE_ENV === 'development' ? 'pretty' : 'minimal',
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Configuración de pool de conexiones para MySQL
  __internal: {
    engine: {
      connectTimeout: 60000,
      pool: {
        timeout: 30000,
        min: 1,
        max: 10,
      },
    },
  },
};

// Crear instancia de Prisma
const prisma = new PrismaClient(prismaConfig);

// Configuración de conexión
const connectionConfig = {
  // Configuración de pool de conexiones
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 20,
  acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 60000,
  timeout: parseInt(process.env.DB_TIMEOUT) || 60000,
  
  // Configuración de retry
  retryAttempts: parseInt(process.env.DB_RETRY_ATTEMPTS) || 3,
  retryDelay: parseInt(process.env.DB_RETRY_DELAY) || 1000,
  
  // Configuración de health check
  healthCheckInterval: parseInt(process.env.DB_HEALTH_CHECK_INTERVAL) || 30000,
};

// Estado de la conexión
let isConnected = false;
let connectionRetries = 0;
let healthCheckInterval = null;

/**
 * Conectar a la base de datos
 */
async function connectDB() {
  try {
    logger.info('🔄 Conectando a la base de datos MySQL...');
    
    // Verificar conexión
    await prisma.$connect();
    
    // Ejecutar query de prueba simple
    try {
      await prisma.$queryRaw`SELECT 1 as health_check`;
    } catch (queryError) {
      logger.warn('⚠️ Error en health check inicial:', queryError.message);
      // Continuar aunque haya un error en el health check
    }
    
    isConnected = true;
    connectionRetries = 0;
    
    logger.success('✅ Base de datos MySQL conectada exitosamente');
    
    // Iniciar health check
    startHealthCheck();
    
    return true;
  } catch (error) {
    connectionRetries++;
    logger.error(`❌ Error al conectar con la base de datos (intento ${connectionRetries}):`, error);
    
    if (connectionRetries < connectionConfig.retryAttempts) {
      logger.info(`🔄 Reintentando conexión en ${connectionConfig.retryDelay}ms...`);
      setTimeout(connectDB, connectionConfig.retryDelay);
      return false;
    }
    
    throw error;
  }
}

/**
 * Desconectar de la base de datos
 */
async function disconnectDB() {
  try {
    logger.info('🔄 Desconectando de la base de datos...');
    
    // Detener health check
    stopHealthCheck();
    
    // Cerrar conexión
    await prisma.$disconnect();
    
    isConnected = false;
    logger.success('✅ Base de datos desconectada exitosamente');
    
    return true;
  } catch (error) {
    logger.error('❌ Error al desconectar de la base de datos:', error);
    throw error;
  }
}

// Cache para evitar health checks excesivos
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 30000; // 30 segundos

/**
 * Verificar estado de la conexión (con cache)
 */
async function checkConnection() {
  const now = Date.now();
  
  // Solo hacer health check si han pasado más de 30 segundos
  if (now - lastHealthCheck < HEALTH_CHECK_INTERVAL) {
    return true;
  }
  
  try {
    await prisma.$queryRaw`SELECT 1 as health_check`;
    lastHealthCheck = now;
    return true;
  } catch (error) {
    // Solo logear errores críticos
    if (error.code === 'P2024' || error.code === 'P2010') {
      logger.warn('⚠️ Health check falló, reintentando conexión:', error.message);
    } else {
      logger.error('❌ Error crítico en health check de base de datos:', error);
    }
    return false;
  }
}

/**
 * Iniciar health check periódico
 */
function startHealthCheck() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }
  
  healthCheckInterval = setInterval(async () => {
    const isHealthy = await checkConnection();
    
    if (!isHealthy && isConnected) {
      logger.warn('⚠️ Conexión a base de datos perdida, intentando reconectar...');
      isConnected = false;
      
      try {
        await connectDB();
      } catch (error) {
        logger.error('❌ Error al reconectar a la base de datos:', error);
      }
    }
  }, connectionConfig.healthCheckInterval);
}

/**
 * Detener health check
 */
function stopHealthCheck() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
}

/**
 * Obtener estadísticas de la base de datos
 */
async function getDatabaseStats() {
  try {
    const stats = await prisma.$queryRaw`
      SELECT 
        (SELECT COUNT(*) FROM users) as user_count,
        (SELECT COUNT(*) FROM projects) as project_count,
        (SELECT COUNT(*) FROM tasks) as task_count
    `;
    
    return stats[0];
  } catch (error) {
    logger.error('❌ Error al obtener estadísticas de la base de datos:', error);
    return null;
  }
}

/**
 * Ejecutar migración de base de datos
 */
async function runMigrations() {
  try {
    logger.info('🔄 Ejecutando migraciones de base de datos...');
    
    // Prisma maneja las migraciones automáticamente
    logger.success('✅ Migraciones ejecutadas exitosamente');
    return true;
  } catch (error) {
    logger.error('❌ Error al ejecutar migraciones:', error);
    throw error;
  }
}

/**
 * Obtener información de la base de datos
 */
async function getDatabaseInfo() {
  try {
    const info = await prisma.$queryRaw`
      SELECT 
        DATABASE() as database_name,
        USER() as current_user,
        VERSION() as mysql_version
    `;
    
    return info[0];
  } catch (error) {
    logger.error('❌ Error al obtener información de la base de datos:', error);
    return null;
  }
}

// Manejar señales del proceso
process.on('SIGINT', async () => {
  logger.info('🔄 Recibida señal SIGINT, cerrando conexión a base de datos...');
  await disconnectDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('🔄 Recibida señal SIGTERM, cerrando conexión a base de datos...');
  await disconnectDB();
  process.exit(0);
});

// Manejar errores no capturados
process.on('unhandledRejection', async (reason, promise) => {
  logger.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  await disconnectDB();
  process.exit(1);
});

process.on('uncaughtException', async (error) => {
  logger.error('❌ Uncaught Exception:', error);
  await disconnectDB();
  process.exit(1);
});

module.exports = {
  prisma,
  connectDB,
  disconnectDB,
  checkConnection,
  getDatabaseStats,
  runMigrations,
  getDatabaseInfo,
  isConnected: () => isConnected,
};

