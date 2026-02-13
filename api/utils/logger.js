/**
 * Sistema de logging centralizado
 * Utiliza Winston para logging estructurado
 */

const winston = require('winston');
const path = require('path');

// Configuración de niveles de log
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

// Configuración de colores
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue'
};

winston.addColors(logColors);

// Configuración de formato
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Configuración de transporte de consola
const consoleTransport = new winston.transports.Console({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  )
});

// Configuración de transporte de archivo
const fileTransport = new winston.transports.File({
  filename: path.join('logs', 'error.log'),
  level: 'error',
  format: logFormat
});

// Configuración de transporte de archivo de información
const infoFileTransport = new winston.transports.File({
  filename: path.join('logs', 'combined.log'),
  level: 'info',
  format: logFormat
});

// Crear logger
const logger = winston.createLogger({
  levels: logLevels,
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    consoleTransport,
    fileTransport,
    infoFileTransport
  ]
});

// Middleware para logging de requests
const logRequest = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };
    
    if (res.statusCode >= 400) {
      logger.error('HTTP Request Error', logData);
    } else {
      logger.info('HTTP Request', logData);
    }
  });
  
  next();
};

// Funciones de conveniencia
const log = {
  info: (message, meta = {}) => logger.info(message, meta),
  warn: (message, meta = {}) => logger.warn(message, meta),
  error: (message, meta = {}) => logger.error(message, meta),
  debug: (message, meta = {}) => logger.debug(message, meta),
  success: (message, meta = {}) => logger.info(`✅ ${message}`, meta),
  logRequest
};

module.exports = log;