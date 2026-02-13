const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { prisma } = require('../config/database');
const { generateInternalToken } = require('../config/auth');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * Helper para omitir password del objeto usuario
 */
const omitPassword = (user) => {
  if (!user) return null;
  
  const userCopy = { ...user };
  delete userCopy.password;
  return userCopy;
};

/**
 * POST /api/auth/login
 * Iniciar sesión con email y contraseña
 */
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        error: 'Datos inválidos', 
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    // Buscar usuario por email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        password: true,
        avatar: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Verificar si el usuario existe y está activo
    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'Credenciales inválidas',
        message: 'Email o contraseña incorrectos' 
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ 
        success: false,
        error: 'Usuario inactivo',
        message: 'Tu cuenta está desactivada. Contacta al administrador.' 
      });
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false,
        error: 'Credenciales inválidas',
        message: 'Email o contraseña incorrectos' 
      });
    }

    // Actualizar último login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Generar token JWT
    const token = generateInternalToken({
      id: user.id,
      userId: user.id,
      email: user.email,
      username: user.username
    });

    // Devolver respuesta exitosa
    res.json({
      success: true,
      message: 'Login exitoso',
      token,
      user: omitPassword(user)
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor',
      message: 'Error al procesar el login' 
    });
  }
});

/**
 * POST /api/auth/login-unified
 * Login que acepta email o username
 */
router.post('/login-unified', [
  body('emailOrUsername').notEmpty().trim().withMessage('Email o username requerido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        error: 'Datos inválidos', 
        errors: errors.array() 
      });
    }

    const { emailOrUsername, password } = req.body;

    // Buscar usuario por email o username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrUsername },
          { username: emailOrUsername }
        ]
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        password: true,
        avatar: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Verificar si el usuario existe y está activo
    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'Credenciales inválidas',
        message: 'Email/username o contraseña incorrectos' 
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ 
        success: false,
        error: 'Usuario inactivo',
        message: 'Tu cuenta está desactivada. Contacta al administrador.' 
      });
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false,
        error: 'Credenciales inválidas',
        message: 'Email/username o contraseña incorrectos' 
      });
    }

    // Actualizar último login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Generar token JWT
    const token = generateInternalToken({
      id: user.id,
      userId: user.id,
      email: user.email,
      username: user.username
    });

    // Devolver respuesta exitosa
    res.json({
      success: true,
      message: 'Login exitoso',
      token,
      user: omitPassword(user),
      authType: 'internal'
    });

  } catch (error) {
    console.error('Error en login-unified:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor',
      message: 'Error al procesar el login' 
    });
  }
});

/**
 * GET /api/auth/me
 * Obtener información del usuario actual
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatar: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'Usuario no encontrado' 
      });
    }

    res.json({
      success: true,
      user: omitPassword(user)
    });

  } catch (error) {
    console.error('Error en /me:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
});

/**
 * POST /api/auth/refresh
 * Renovar token
 */
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const token = generateInternalToken({
      id: req.user.id,
      userId: req.user.id,
      email: req.user.email,
      username: req.user.username
    });

    res.json({
      success: true,
      message: 'Token renovado exitosamente',
      token
    });

  } catch (error) {
    console.error('Error en refresh:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
});

/**
 * POST /api/auth/logout
 * Cerrar sesión (solo informativo, el token se invalida en el cliente)
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    res.json({ 
      success: true,
      message: 'Sesión cerrada correctamente' 
    });
  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error cerrando sesión' 
    });
  }
});

module.exports = router;

