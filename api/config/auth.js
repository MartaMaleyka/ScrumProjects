/**
 * Configuración de autenticación simplificada
 * Para Gestor de Proyectos
 */

const jwt = require('jsonwebtoken');

// Validar que JWT_SECRET esté configurado
if (!process.env.JWT_SECRET) {
  console.warn('⚠️ JWT_SECRET no está configurado. Usando valor por defecto (solo desarrollo)');
}

// Configuración JWT
const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'gestor_proyectos_secret_key_2024_cambiar_en_produccion',
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
};

/**
 * Detectar el tipo de token (simplificado - solo interno)
 * @param {string} token - Token a analizar
 * @returns {string} - Tipo de token ('internal')
 */
function detectTokenType(token) {
  return 'internal';
}

/**
 * Verificar token interno
 * @param {string} token - Token a verificar
 * @returns {object} - Datos decodificados del token
 */
function verifyInternalToken(token) {
  return jwt.verify(token, JWT_CONFIG.secret);
}

/**
 * Verificar token externo (no usado en este proyecto)
 * @param {string} token - Token a verificar
 * @returns {object} - Datos decodificados del token
 */
function verifyExternalToken(token) {
  return jwt.verify(token, JWT_CONFIG.secret);
}

/**
 * Verificar token de Keycloak (no usado en este proyecto)
 * @param {string} token - Token a verificar
 * @returns {object} - Datos decodificados del token
 */
async function verifyKeycloakToken(token) {
  // No implementado para este proyecto
  throw new Error('Keycloak no está configurado en este proyecto');
}

/**
 * Generar token interno
 * @param {object} payload - Datos a incluir en el token
 * @returns {string} - Token generado
 */
function generateInternalToken(payload) {
  return jwt.sign(payload, JWT_CONFIG.secret, {
    expiresIn: JWT_CONFIG.expiresIn
  });
}

/**
 * Generar token externo
 * @param {object} payload - Datos a incluir en el token
 * @returns {string} - Token generado
 */
function generateExternalToken(payload) {
  return jwt.sign(payload, JWT_CONFIG.secret, {
    expiresIn: JWT_CONFIG.expiresIn
  });
}

// Configuración general de autenticación
const AUTH_CONFIG = {
  enableExternalAuth: false,
  enableKeycloakAuth: false,
  externalTimeout: 5000,
  fallbackToExternal: false
};

module.exports = {
  JWT_CONFIG,
  AUTH_CONFIG,
  detectTokenType,
  verifyInternalToken,
  verifyExternalToken,
  verifyKeycloakToken,
  generateInternalToken,
  generateExternalToken
};

