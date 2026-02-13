const { prisma } = require('../config/database');
const { ResponseHelper } = require('../utils/responseHelper');

/**
 * Middleware específico para funcionalidades Scrum
 */
class ScrumMiddleware {

  /**
   * Middleware para obtener estadísticas de sprint
   */
  static async getSprintStats(req, res, next) {
    try {
      const sprintId = parseInt(req.params.sprintId || req.params.id);
      
      if (isNaN(sprintId)) {
        return next();
      }

      const stats = await prisma.sprint.findUnique({
        where: { id: sprintId },
        include: {
          userStories: {
            include: {
              tasks: true
            }
          },
          _count: {
            select: {
              userStories: true,
              tasks: true,
              members: true
            }
          }
        }
      });

      if (stats) {
        // Calcular estadísticas adicionales
        const totalStoryPoints = stats.userStories.reduce((sum, story) => sum + (story.storyPoints || 0), 0);
        const completedStoryPoints = stats.userStories
          .filter(story => story.status === 'COMPLETED')
          .reduce((sum, story) => sum + (story.storyPoints || 0), 0);
        
        const totalTasks = stats.userStories.reduce((sum, story) => sum + story.tasks.length, 0);
        const completedTasks = stats.userStories
          .reduce((sum, story) => sum + story.tasks.filter(task => task.status === 'DONE').length, 0);

        req.sprintStats = {
          ...stats,
          calculatedStats: {
            totalStoryPoints,
            completedStoryPoints,
            remainingStoryPoints: totalStoryPoints - completedStoryPoints,
            completionPercentage: totalStoryPoints > 0 ? (completedStoryPoints / totalStoryPoints * 100).toFixed(2) : 0,
            totalTasks,
            completedTasks,
            taskCompletionPercentage: totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(2) : 0
          }
        };
      }

      next();
    } catch (error) {
      next();
    }
  }

  /**
   * Middleware para calcular velocidad del equipo
   */
  static async calculateTeamVelocity(req, res, next) {
    try {
      const projectId = parseInt(req.params.projectId || req.body.projectId);
      
      if (isNaN(projectId)) {
        return next();
      }

      // Obtener sprints completados del proyecto
      const completedSprints = await prisma.sprint.findMany({
        where: {
          projectId: projectId,
          status: 'COMPLETED'
        },
        include: {
          userStories: true
        },
        orderBy: { endDate: 'desc' },
        take: 5 // Últimos 5 sprints
      });

      if (completedSprints.length > 0) {
        const velocities = completedSprints.map(sprint => {
          const completedPoints = sprint.userStories
            .filter(story => story.status === 'COMPLETED')
            .reduce((sum, story) => sum + (story.storyPoints || 0), 0);
          
          return {
            sprintId: sprint.id,
            sprintName: sprint.name,
            storyPointsCompleted: completedPoints,
            startDate: sprint.startDate,
            endDate: sprint.endDate
          };
        });

        const averageVelocity = velocities.reduce((sum, v) => sum + v.storyPointsCompleted, 0) / velocities.length;

        req.teamVelocity = {
          velocities,
          averageVelocity: Math.round(averageVelocity * 100) / 100,
          sprintCount: completedSprints.length
        };
      }

      next();
    } catch (error) {
      next();
    }
  }

  /**
   * Middleware para validar transiciones de estado
   */
  static validateStateTransition(currentStatus, newStatus, entityType) {
    const validTransitions = {
      PROJECT: {
        'PLANNING': ['ACTIVE', 'CANCELLED'],
        'ACTIVE': ['ON_HOLD', 'COMPLETED', 'CANCELLED'],
        'ON_HOLD': ['ACTIVE', 'CANCELLED'],
        'COMPLETED': [],
        'CANCELLED': []
      },
      SPRINT: {
        'PLANNING': ['ACTIVE', 'CANCELLED'],
        'ACTIVE': ['COMPLETED', 'CANCELLED'],
        'COMPLETED': [],
        'CANCELLED': []
      },
      EPIC: {
        'DRAFT': ['READY', 'CANCELLED'],
        'READY': ['IN_PROGRESS', 'CANCELLED'],
        'IN_PROGRESS': ['COMPLETED', 'CANCELLED'],
        'COMPLETED': [],
        'CANCELLED': []
      },
      USER_STORY: {
        'DRAFT': ['READY', 'CANCELLED'],
        'READY': ['IN_PROGRESS', 'CANCELLED'],
        'IN_PROGRESS': ['COMPLETED', 'CANCELLED'],
        'COMPLETED': [],
        'CANCELLED': []
      },
      TASK: {
        'TODO': ['IN_PROGRESS', 'CANCELLED'],
        'IN_PROGRESS': ['IN_REVIEW', 'DONE', 'CANCELLED'],
        'IN_REVIEW': ['DONE', 'IN_PROGRESS', 'CANCELLED'],
        'DONE': [],
        'CANCELLED': []
      }
    };

    const allowedTransitions = validTransitions[entityType]?.[currentStatus] || [];
    return allowedTransitions.includes(newStatus);
  }

  /**
   * Middleware para validar transición de estado
   */
  static validateStatusTransition(entityType) {
    return (req, res, next) => {
      const { status } = req.body;
      const currentStatus = req[entityType.toLowerCase()]?.status;

      if (currentStatus && status && currentStatus !== status) {
        if (!ScrumMiddleware.validateStateTransition(currentStatus, status, entityType)) {
          return res.status(400).json({
            success: false,
            message: `Transición de estado inválida: ${currentStatus} -> ${status}`
          });
        }
      }

      next();
    };
  }

  /**
   * Middleware para generar burndown chart
   */
  static async generateBurndownChart(req, res, next) {
    try {
      const sprintId = parseInt(req.params.sprintId || req.params.id);
      
      if (isNaN(sprintId)) {
        return next();
      }

      const sprint = await prisma.sprint.findUnique({
        where: { id: sprintId },
        include: {
          userStories: {
            include: {
              tasks: true
            }
          }
        }
      });

      if (sprint && sprint.startDate && sprint.endDate) {
        const totalPoints = sprint.userStories.reduce((sum, story) => sum + (story.storyPoints || 0), 0);
        const startDate = new Date(sprint.startDate);
        const endDate = new Date(sprint.endDate);
        const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

        // Generar datos del burndown ideal
        const idealBurndown = [];
        for (let i = 0; i <= totalDays; i++) {
          const remainingPoints = totalPoints - (totalPoints * i / totalDays);
          idealBurndown.push({
            day: i,
            remainingPoints: Math.max(0, remainingPoints),
            date: new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
          });
        }

        // Generar datos del burndown real (simplificado)
        const realBurndown = [];
        for (let i = 0; i <= totalDays; i++) {
          const currentDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
          const completedPoints = sprint.userStories
            .filter(story => {
              // Simulación: considerar completadas las historias con tareas completadas
              const completedTasks = story.tasks.filter(task => task.status === 'DONE').length;
              return completedTasks === story.tasks.length && story.tasks.length > 0;
            })
            .reduce((sum, story) => sum + (story.storyPoints || 0), 0);
          
          realBurndown.push({
            day: i,
            remainingPoints: Math.max(0, totalPoints - completedPoints),
            date: currentDate
          });
        }

        req.burndownChart = {
          sprintId: sprint.id,
          sprintName: sprint.name,
          totalPoints,
          totalDays,
          idealBurndown,
          realBurndown,
          startDate,
          endDate
        };
      }

      next();
    } catch (error) {
      next();
    }
  }

  /**
   * Middleware para calcular métricas de equipo
   */
  static async calculateTeamMetrics(req, res, next) {
    try {
      const projectId = parseInt(req.params.projectId || req.body.projectId);
      
      if (isNaN(projectId)) {
        return next();
      }

      // Obtener métricas del equipo
      const [
        teamMembers,
        completedTasks,
        totalTasks,
        averageTaskCompletionTime
      ] = await Promise.all([
        prisma.projectMember.findMany({
          where: { projectId: projectId },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }),
        prisma.task.count({
          where: {
            userStory: {
              epic: { projectId: projectId }
            },
            status: 'DONE'
          }
        }),
        prisma.task.count({
          where: {
            userStory: {
              epic: { projectId: projectId }
            }
          }
        }),
        prisma.task.findMany({
          where: {
            userStory: {
              epic: { projectId: projectId }
            },
            status: 'DONE',
            completedAt: { not: null }
          },
          select: {
            createdAt: true,
            completedAt: true
          }
        })
      ]);

      // Calcular tiempo promedio de completación
      let avgCompletionTime = 0;
      if (averageTaskCompletionTime.length > 0) {
        const totalTime = averageTaskCompletionTime.reduce((sum, task) => {
          const completionTime = new Date(task.completedAt) - new Date(task.createdAt);
          return sum + completionTime;
        }, 0);
        avgCompletionTime = totalTime / averageTaskCompletionTime.length / (1000 * 60 * 60 * 24); // en días
      }

      req.teamMetrics = {
        teamSize: teamMembers.length,
        teamMembers: teamMembers.map(member => ({
          id: member.user.id,
          name: member.user.name,
          email: member.user.email,
          role: member.role
        })),
        taskMetrics: {
          total: totalTasks,
          completed: completedTasks,
          completionRate: totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(2) : 0,
          averageCompletionTime: Math.round(avgCompletionTime * 100) / 100
        }
      };

      next();
    } catch (error) {
      next();
    }
  }

  /**
   * Middleware para validar capacidad de sprint
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

      if (sprint && sprint.velocity) {
        const currentPoints = sprint.userStories.reduce((sum, story) => sum + (story.storyPoints || 0), 0);
        const newTotal = currentPoints + parseInt(storyPoints);

        if (newTotal > sprint.velocity) {
          return res.status(400).json({
            success: false,
            message: `La capacidad del sprint (${sprint.velocity} puntos) se excedería. Puntos actuales: ${currentPoints}, Nuevos puntos: ${parseInt(storyPoints)}, Total: ${newTotal}`
          });
        }
      }

      next();
    } catch (error) {
      next();
    }
  }

  /**
   * Middleware para logging de actividades Scrum
   */
  static logScrumActivity(activity) {
    return (req, res, next) => {
      const originalSend = res.send;
      
      res.send = function(data) {
        // Log de la actividad si la respuesta es exitosa
        if (res.statusCode >= 200 && res.statusCode < 300) {
        }
        
        originalSend.call(this, data);
      };
      
      next();
    };
  }
}

module.exports = {
  validateSprintDates: ScrumMiddleware.validateSprintDates,
  validateNoDateConflicts: ScrumMiddleware.validateNoDateConflicts,
  validateStoryPoints: ScrumMiddleware.validateStoryPoints,
  validateSprintCapacity: ScrumMiddleware.validateSprintCapacity,
  validateStatusTransition: ScrumMiddleware.validateStatusTransition,
  calculateSprintStats: ScrumMiddleware.calculateSprintStats,
  calculateBurndown: ScrumMiddleware.calculateBurndown,
  calculateTeamMetrics: ScrumMiddleware.calculateTeamMetrics,
  calculateVelocity: ScrumMiddleware.calculateVelocity
};
