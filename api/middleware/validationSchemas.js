/**
 * Esquemas de validación centralizados
 * Utiliza express-validator para validar datos de entrada
 */

const { body, param, query, validationResult } = require('express-validator');

// Middleware para validar los resultados de express-validator
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Datos de entrada inválidos',
      errors: errors.array()
    });
  }
  next();
};

// Validaciones de autenticación
const login = [
  body('username').trim().notEmpty().withMessage('Usuario es requerido'),
  body('password').notEmpty().withMessage('Contraseña es requerida')
];

const register = [
  body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Usuario debe tener entre 3 y 50 caracteres'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('Contraseña debe tener al menos 6 caracteres'),
  body('firstName').trim().isLength({ min: 1, max: 50 }).withMessage('Nombre es requerido y debe tener máximo 50 caracteres'),
  body('lastName').trim().isLength({ min: 1, max: 50 }).withMessage('Apellido es requerido y debe tener máximo 50 caracteres'),
  body('roleId').optional().isInt({ min: 1 }).withMessage('ID de rol inválido')
];

const refresh = [
  body('refreshToken').notEmpty().withMessage('Refresh token es requerido')
];

const logout = [
  body('refreshToken').optional().isString().withMessage('Refresh token debe ser una cadena')
];

const me = [];

// Validaciones de usuarios
const getUsers = [
  query('page').optional().isInt({ min: 1 }).withMessage('Página debe ser un número entero mayor a 0'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite debe ser un número entre 1 y 100'),
  query('search').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Búsqueda debe tener entre 1 y 100 caracteres'),
  query('role').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Rol debe tener entre 1 y 50 caracteres'),
  query('status').optional().isIn(['active', 'inactive']).withMessage('Estado inválido')
];

const getUserById = [
  param('id').isInt({ min: 1 }).withMessage('ID de usuario inválido')
];

const updateUser = [
  param('id').isInt({ min: 1 }).withMessage('ID de usuario inválido'),
  body('username').optional().trim().isLength({ min: 3, max: 50 }).withMessage('Usuario debe tener entre 3 y 50 caracteres'),
  body('email').optional().isEmail().withMessage('Email inválido'),
  body('firstName').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Nombre debe tener entre 1 y 50 caracteres'),
  body('lastName').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Apellido debe tener entre 1 y 50 caracteres'),
  body('roleId').optional().isInt({ min: 1 }).withMessage('ID de rol inválido'),
  body('isActive').optional().isBoolean().withMessage('isActive debe ser un booleano')
];

const deleteUser = [
  param('id').isInt({ min: 1 }).withMessage('ID de usuario inválido')
];

const activateUser = [
  param('id').isInt({ min: 1 }).withMessage('ID de usuario inválido'),
  body('isActive').isBoolean().withMessage('isActive debe ser un booleano')
];

const changePassword = [
  body('currentPassword').notEmpty().withMessage('Contraseña actual es requerida'),
  body('newPassword').isLength({ min: 6 }).withMessage('Nueva contraseña debe tener al menos 6 caracteres'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('Las contraseñas no coinciden');
    }
    return true;
  })
];

const updateAvatar = [
  body('avatar').optional().isString().withMessage('Avatar debe ser una cadena')
];

const searchUsers = [
  query('q').trim().isLength({ min: 1, max: 100 }).withMessage('Término de búsqueda es requerido y debe tener entre 1 y 100 caracteres'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Límite debe ser un número entre 1 y 50')
];

const getUserTickets = [
  param('id').isInt({ min: 1 }).withMessage('ID de usuario inválido'),
  query('page').optional().isInt({ min: 1 }).withMessage('Página debe ser un número entero mayor a 0'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite debe ser un número entre 1 y 100')
];

const getUserDocuments = [
  param('id').isInt({ min: 1 }).withMessage('ID de usuario inválido'),
  query('page').optional().isInt({ min: 1 }).withMessage('Página debe ser un número entero mayor a 0'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite debe ser un número entre 1 y 100')
];

// Validaciones de tickets
const getTickets = [
  query('page').optional().isInt({ min: 1 }).withMessage('Página debe ser un número entero mayor a 0'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite debe ser un número entre 1 y 100'),
  query('search').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Búsqueda debe tener entre 1 y 100 caracteres'),
  query('status').optional().isIn(['open', 'in_progress', 'resolved', 'closed']).withMessage('Estado inválido'),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Prioridad inválida'),
  query('category').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Categoría debe tener entre 1 y 50 caracteres'),
  query('assignedTo').optional().isInt({ min: 1 }).withMessage('ID de usuario asignado inválido'),
  query('createdBy').optional().isInt({ min: 1 }).withMessage('ID de usuario creador inválido')
];

const getTicketById = [
  param('id').isInt({ min: 1 }).withMessage('ID de ticket inválido')
];

const createTicket = [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Título es requerido y debe tener entre 1 y 200 caracteres'),
  body('description').trim().isLength({ min: 1, max: 2000 }).withMessage('Descripción es requerida y debe tener entre 1 y 2000 caracteres'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Prioridad inválida'),
  body('category').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Categoría debe tener entre 1 y 50 caracteres'),
  body('assignedToId').optional().isInt({ min: 1 }).withMessage('ID de usuario asignado inválido')
];

const updateTicket = [
  param('id').isInt({ min: 1 }).withMessage('ID de ticket inválido'),
  body('title').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Título debe tener entre 1 y 200 caracteres'),
  body('description').optional().trim().isLength({ min: 1, max: 2000 }).withMessage('Descripción debe tener entre 1 y 2000 caracteres'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Prioridad inválida'),
  body('category').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Categoría debe tener entre 1 y 50 caracteres'),
  body('status').optional().isIn(['open', 'in_progress', 'resolved', 'closed']).withMessage('Estado inválido'),
  body('assignedToId').optional().isInt({ min: 1 }).withMessage('ID de usuario asignado inválido')
];

const deleteTicket = [
  param('id').isInt({ min: 1 }).withMessage('ID de ticket inválido')
];

const addComment = [
  param('id').isInt({ min: 1 }).withMessage('ID de ticket inválido'),
  body('content').trim().isLength({ min: 1, max: 1000 }).withMessage('Contenido es requerido y debe tener entre 1 y 1000 caracteres')
];

// Validaciones de documentos
const getDocuments = [
  query('page').optional().isInt({ min: 1 }).withMessage('Página debe ser un número entero mayor a 0'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite debe ser un número entre 1 y 100'),
  query('search').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Búsqueda debe tener entre 1 y 100 caracteres'),
  query('category').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Categoría debe tener entre 1 y 50 caracteres'),
  query('purpose').optional().isIn(['reference', 'template', 'form', 'report']).withMessage('Propósito inválido'),
  query('uploadedBy').optional().isInt({ min: 1 }).withMessage('ID de usuario inválido')
];

const getDocumentById = [
  param('id').isInt({ min: 1 }).withMessage('ID de documento inválido')
];

const uploadDocument = [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Título es requerido y debe tener entre 1 y 200 caracteres'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Descripción debe tener máximo 1000 caracteres'),
  body('category').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Categoría debe tener entre 1 y 50 caracteres'),
  body('purpose').optional().isIn(['reference', 'template', 'form', 'report']).withMessage('Propósito inválido'),
  body('isPublic').optional().isBoolean().withMessage('isPublic debe ser un booleano')
];

const updateDocument = [
  param('id').isInt({ min: 1 }).withMessage('ID de documento inválido'),
  body('title').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Título debe tener entre 1 y 200 caracteres'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Descripción debe tener máximo 1000 caracteres'),
  body('category').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Categoría debe tener entre 1 y 50 caracteres'),
  body('purpose').optional().isIn(['reference', 'template', 'form', 'report']).withMessage('Propósito inválido'),
  body('isPublic').optional().isBoolean().withMessage('isPublic debe ser un booleano')
];

const deleteDocument = [
  param('id').isInt({ min: 1 }).withMessage('ID de documento inválido')
];

const downloadDocument = [
  param('id').isInt({ min: 1 }).withMessage('ID de documento inválido')
];

const shareDocument = [
  param('id').isInt({ min: 1 }).withMessage('ID de documento inválido'),
  body('userId').isInt({ min: 1 }).withMessage('ID de usuario inválido'),
  body('permission').isIn(['read', 'write', 'admin']).withMessage('Permiso inválido'),
  body('message').optional().trim().isLength({ max: 500 }).withMessage('Mensaje debe tener máximo 500 caracteres')
];

const requestDocumentAccess = [
  param('id').isInt({ min: 1 }).withMessage('ID de documento inválido'),
  body('message').optional().trim().isLength({ max: 500 }).withMessage('Mensaje debe tener máximo 500 caracteres')
];

module.exports = {
  validateRequest,
  auth: {
    login,
    register,
    refresh,
    logout,
    me
  },
  user: {
    getUsers,
    getUserById,
    updateUser,
    deleteUser,
    activateUser,
    changePassword,
    updateAvatar,
    searchUsers,
    getUserTickets,
    getUserDocuments
  },
  ticket: {
    getTickets,
    getTicketById,
    createTicket,
    updateTicket,
    deleteTicket,
    addComment
  },
  document: {
    getDocuments,
    getDocumentById,
    uploadDocument,
    updateDocument,
    deleteDocument,
    downloadDocument,
    shareDocument,
    requestDocumentAccess
  }
};