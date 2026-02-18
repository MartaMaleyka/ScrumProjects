const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');
const { 
  detectTokenType, 
  verifyInternalToken, 
  verifyExternalToken,
  verifyKeycloakToken,
  AUTH_CONFIG 
} = require('../config/auth');

/**
 * Middleware de autenticación simplificado
 * Verifica el token JWT y carga el usuario en req.user
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: 'Token no proporcionado',
        message: 'Se requiere token de autenticación' 
      });
    }

    // Detectar tipo de token
    const tokenType = detectTokenType(token);
    
    let decoded;
    
    // Verificar token según su tipo
    try {
      if (tokenType === 'internal') {
        decoded = verifyInternalToken(token);
      } else if (tokenType === 'external') {
        decoded = verifyExternalToken(token);
      } else if (tokenType === 'keycloak') {
        decoded = await verifyKeycloakToken(token);
      } else {
        // Por defecto, intentar como token interno
        decoded = verifyInternalToken(token);
      }
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false,
          error: 'Token expirado',
          message: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.' 
        });
      } else if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          success: false,
          error: 'Token inválido',
          message: 'El token proporcionado no es válido' 
        });
      }
      throw error;
    }

    // Obtener el usuario de la base de datos
    const userId = decoded.id || decoded.userId || decoded.user_id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'Token inválido',
        message: 'El token no contiene información de usuario válida' 
      });
    }

    // Buscar usuario en la base de datos
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        globalRole: true,
        organizationId: true,
        isActive: true,
        avatar: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuario no encontrado',
        message: 'El usuario asociado al token no existe' 
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ 
        success: false,
        error: 'Usuario inactivo',
        message: 'Tu cuenta está desactivada. Contacta al administrador.' 
      });
    }

    // Agregar usuario y información de autenticación a la request
    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      globalRole: user.globalRole,
      organizationId: user.organizationId,
      isActive: user.isActive,
      avatar: user.avatar
    };
    req.userId = user.id;
    req.organizationId = user.organizationId;
    req.authType = tokenType || 'internal';

    // Actualizar último login
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      });
    } catch (error) {
      // No fallar si no se puede actualizar el último login
      console.warn('No se pudo actualizar último login:', error.message);
    }

    next();
  } catch (error) {
    console.error('Error en autenticación:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Error de autenticación',
      message: 'Error al verificar la autenticación' 
    });
  }
};

/**
 * Middleware para verificar permisos (simplificado)
 * En este proyecto básico, todos los usuarios autenticados tienen acceso
 */
const checkPermission = (resource, action) => {
  return (req, res, next) => {
    // Por ahora, si el usuario está autenticado, tiene permiso
    if (req.user) {
      return next();
    }
    
    return res.status(403).json({ 
      success: false,
      error: 'Acceso denegado',
      message: 'No tienes permiso para realizar esta acción' 
    });
  };
};

/**
 * Middleware para verificar si es admin
 * Por ahora, todos los usuarios autenticados pueden ser considerados admin
 * Puedes personalizar esto según tus necesidades
 */
const isAdmin = (req, res, next) => {
  if (req.user) {
    return next();
  }
  
  return res.status(403).json({ 
    success: false,
    error: 'Acceso denegado',
    message: 'Se requieren permisos de administrador' 
  });
};

module.exports = {
  authenticateToken,
  checkPermission,
  isAdmin
};
