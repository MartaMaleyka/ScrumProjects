const { body, param, query, validationResult } = require('express-validator');
const { prisma } = require('../config/database');

/**
 * Middleware para validar datos de Scrum
 */
class ScrumValidation {
  
  /**
   * Validar que un proyecto existe
   */
  static async validateProjectExists(req, res, next) {
    try {
      const projectId = parseInt(req.params.projectId || req.body.projectId);
      
      if (isNaN(projectId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de proyecto inválido'
        });
      }

      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Proyecto no encontrado'
        });
      }

      req.project = project;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Validar que un sprint existe
   */
  static async validateSprintExists(req, res, next) {
    try {
      const sprintId = parseInt(req.params.sprintId || req.params.id || req.body.sprintId);
      
      if (isNaN(sprintId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de sprint inválido'
        });
      }

      const sprint = await prisma.sprint.findUnique({
        where: { id: sprintId },
        include: { project: true }
      });

      if (!sprint) {
        return res.status(404).json({
          success: false,
          message: 'Sprint no encontrado'
        });
      }

      req.sprint = sprint;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Validar que una épica existe
   */
  static async validateEpicExists(req, res, next) {
    try {
      const epicId = parseInt(req.params.epicId || req.body.epicId);
      
      if (isNaN(epicId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de épica inválido'
        });
      }

      const epic = await prisma.epic.findUnique({
        where: { id: epicId },
        include: { project: true }
      });

      if (!epic) {
        return res.status(404).json({
          success: false,
          message: 'Épica no encontrada'
        });
      }

      req.epic = epic;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Validar que una historia de usuario existe
   */
  static async validateUserStoryExists(req, res, next) {
    try {
      const userStoryId = parseInt(req.params.userStoryId || req.body.userStoryId);
      
      if (isNaN(userStoryId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de historia de usuario inválido'
        });
      }

      const userStory = await prisma.userStory.findUnique({
        where: { id: userStoryId },
        include: { 
          epic: { include: { project: true } },
          sprint: true
        }
      });

      if (!userStory) {
        return res.status(404).json({
          success: false,
          message: 'Historia de usuario no encontrada'
        });
      }

      req.userStory = userStory;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Validar que una tarea existe
   */
  static async validateTaskExists(req, res, next) {
    try {
      const taskId = parseInt(req.params.taskId || req.params.id);
      
      if (isNaN(taskId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de tarea inválido'
        });
      }

      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: { 
          userStory: { 
            include: { 
              epic: { include: { project: true } } 
            } 
          },
          sprint: true,
          assignee: true
        }
      });

      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Tarea no encontrada'
        });
      }

      req.task = task;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Validar que un usuario existe
   */
  static async validateUserExists(req, res, next) {
    try {
      const userId = parseInt(req.body.assigneeId || req.body.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de usuario inválido'
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Validar permisos de proyecto
   */
  static async validateProjectPermissions(req, res, next) {
    try {
      const projectId = parseInt(req.params.projectId || req.body.projectId);
      const userId = req.user.id;

      // Verificar si el usuario es miembro del proyecto
      const membership = await prisma.projectMember.findFirst({
        where: {
          projectId: projectId,
          userId: userId
        }
      });

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para acceder a este proyecto'
        });
      }

      req.projectMembership = membership;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Validar permisos de sprint
   */
  static async validateSprintPermissions(req, res, next) {
    try {
      const sprintId = parseInt(req.params.sprintId || req.params.id || req.body.sprintId);
      const userId = req.user.id;

      // Verificar si el usuario es miembro del sprint
      const membership = await prisma.sprintMember.findFirst({
        where: {
          sprintId: sprintId,
          userId: userId
        }
      });

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para acceder a este sprint'
        });
      }

      req.sprintMembership = membership;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Validar fechas de sprint
   */
  static validateSprintDates(req, res, next) {
    const { startDate, endDate } = req.body;

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start >= end) {
        return res.status(400).json({
          success: false,
          message: 'La fecha de inicio debe ser anterior a la fecha de fin'
        });
      }

      // Validar que el sprint no sea muy largo (máximo 4 semanas)
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 28) {
        return res.status(400).json({
          success: false,
          message: 'Un sprint no puede durar más de 4 semanas'
        });
      }
    }

    next();
  }

  /**
   * Validar story points
   */
  static validateStoryPoints(req, res, next) {
    const { storyPoints } = req.body;

    if (storyPoints !== undefined) {
      // Validar que sea un número de la secuencia de Fibonacci
      const fibonacci = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
      
      if (!fibonacci.includes(parseInt(storyPoints))) {
        return res.status(400).json({
          success: false,
          message: 'Los story points deben ser números de la secuencia de Fibonacci (1, 2, 3, 5, 8, 13, 21, 34, 55, 89)'
        });
      }
    }

    next();
  }

  /**
   * Validar que no hay conflictos de fechas en el proyecto
   */
  static async validateNoDateConflicts(req, res, next) {
    try {
      const { projectId, startDate, endDate } = req.body;
      const sprintId = req.params.id;

      if (!startDate || !endDate) {
        return next();
      }

      const where = {
        projectId: parseInt(projectId),
        id: sprintId ? { not: parseInt(sprintId) } : undefined,
        OR: [
          {
            AND: [
              { startDate: { lte: new Date(startDate) } },
              { endDate: { gte: new Date(startDate) } }
            ]
          },
          {
            AND: [
              { startDate: { lte: new Date(endDate) } },
              { endDate: { gte: new Date(endDate) } }
            ]
          },
          {
            AND: [
              { startDate: { gte: new Date(startDate) } },
              { endDate: { lte: new Date(endDate) } }
            ]
          }
        ]
      };

      const conflictingSprint = await prisma.sprint.findFirst({
        where
      });

      if (conflictingSprint) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un sprint activo en este rango de fechas'
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Validar capacidad del sprint
   */
  static async validateSprintCapacity(req, res, next) {
    try {
      const { sprintId, storyPoints } = req.body;
      
      if (!sprintId || !storyPoints) {
        return next();
      }

      const sprint = await prisma.sprint.findUnique({
        where: { id: parseInt(sprintId) },
        include: {
          userStories: true
        }
      });

      if (!sprint) {
        return next();
      }

      const currentPoints = sprint.userStories.reduce((sum, story) => sum + (story.storyPoints || 0), 0);
      const newTotal = currentPoints + parseInt(storyPoints);

      if (sprint.velocity && newTotal > sprint.velocity) {
        return res.status(400).json({
          success: false,
          message: `La capacidad del sprint (${sprint.velocity} puntos) se excedería. Puntos actuales: ${currentPoints}, Nuevos puntos: ${parseInt(storyPoints)}, Total: ${newTotal}`
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = {
  validateProjectExists: ScrumValidation.validateProjectExists,
  validateSprintExists: ScrumValidation.validateSprintExists,
  validateEpicExists: ScrumValidation.validateEpicExists,
  validateUserStoryExists: ScrumValidation.validateUserStoryExists,
  validateUserExists: ScrumValidation.validateUserExists
};
