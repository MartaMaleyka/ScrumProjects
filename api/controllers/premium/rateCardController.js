const { prisma } = require('../../config/database');
const ResponseHelper = require('../../utils/responseHelper');
const { ensureProjectInTenant } = require('../../middleware/tenant');

class RateCardController {
  /**
   * Obtener todos los rate cards con filtros
   */
  static async getRateCards(req, res) {
    try {
      const userId = parseInt(req.user?.id);
      const organizationId = req.user?.organizationId;
      const globalRole = req.user?.globalRole || 'USER';

      const { budgetId, projectId } = req.query;

      const where = {
        budget: {
          organizationId,
        },
      };

      // Si es USER, solo ver rate cards de proyectos donde es miembro
      if (globalRole === 'USER') {
        where.project = {
          members: {
            some: {
              userId,
              leftAt: null,
            },
          },
        };
      }

      if (budgetId) {
        const budgetIdInt = parseInt(budgetId);
        const budget = await prisma.budget.findFirst({
          where: {
            id: budgetIdInt,
            organizationId,
          },
        });
        if (!budget) {
          return ResponseHelper.error(res, 'Presupuesto no encontrado', 404);
        }
        where.budgetId = budgetIdInt;
      }

      if (projectId) {
        const projectIdInt = parseInt(projectId);
        await ensureProjectInTenant(projectIdInt, organizationId, globalRole);
        where.projectId = projectIdInt;
      }

      const rateCards = await prisma.rateCard.findMany({
        where,
        include: {
          budget: {
            select: {
              id: true,
              name: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      return ResponseHelper.success(res, { rateCards });
    } catch (error) {
      return ResponseHelper.error(res, error.message, error.statusCode || 500);
    }
  }

  /**
   * Crear un nuevo rate card
   */
  static async createRateCard(req, res) {
    try {
      const userId = parseInt(req.user?.id);
      const organizationId = req.user?.organizationId;
      const globalRole = req.user?.globalRole || 'USER';

      // Solo ADMIN y MANAGER pueden crear rate cards
      if (globalRole !== 'ADMIN' && globalRole !== 'MANAGER') {
        return ResponseHelper.error(res, 'No tienes permisos para crear tarifas', 403);
      }

      const {
        budgetId,
        projectId,
        userId: targetUserId,
        projectRole,
        hourlyCents,
        currency = 'USD',
        effectiveFrom,
        effectiveTo,
      } = req.body;

      if (!budgetId || !projectId || !hourlyCents || hourlyCents <= 0) {
        return ResponseHelper.error(res, 'budgetId, projectId y hourlyCents son requeridos', 400);
      }

      // Debe tener userId O projectRole, pero no ambos
      if (!targetUserId && !projectRole) {
        return ResponseHelper.error(res, 'Debe especificar userId o projectRole', 400);
      }
      if (targetUserId && projectRole) {
        return ResponseHelper.error(res, 'No puede especificar userId y projectRole simultáneamente', 400);
      }

      // Verificar budget y tenant
      const budget = await prisma.budget.findFirst({
        where: {
          id: parseInt(budgetId),
          organizationId,
        },
      });

      if (!budget) {
        return ResponseHelper.error(res, 'Presupuesto no encontrado', 404);
      }

      // Verificar tenant del proyecto
      await ensureProjectInTenant(parseInt(projectId), organizationId, globalRole);

      // Verificar que el proyecto coincide con el budget
      if (budget.projectId !== parseInt(projectId)) {
        return ResponseHelper.error(res, 'El proyecto no coincide con el presupuesto', 400);
      }

      // Verificar usuario si se especifica
      if (targetUserId) {
        const user = await prisma.user.findFirst({
          where: {
            id: parseInt(targetUserId),
            organizationId,
          },
        });
        if (!user) {
          return ResponseHelper.error(res, 'Usuario no encontrado o no pertenece a tu organización', 404);
        }
      }

      const rateCard = await prisma.rateCard.create({
        data: {
          budgetId: parseInt(budgetId),
          projectId: parseInt(projectId),
          userId: targetUserId ? parseInt(targetUserId) : null,
          projectRole: projectRole || null,
          hourlyCents: parseInt(hourlyCents),
          currency,
          effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : null,
          effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
        },
        include: {
          budget: {
            select: {
              id: true,
              name: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return ResponseHelper.success(res, rateCard, 201);
    } catch (error) {
      return ResponseHelper.error(res, error.message, error.statusCode || 500);
    }
  }

  /**
   * Actualizar un rate card
   */
  static async updateRateCard(req, res) {
    try {
      const rateCardId = parseInt(req.params.id);
      const organizationId = req.user?.organizationId;
      const globalRole = req.user?.globalRole || 'USER';

      // Solo ADMIN y MANAGER pueden actualizar
      if (globalRole !== 'ADMIN' && globalRole !== 'MANAGER') {
        return ResponseHelper.error(res, 'No tienes permisos para actualizar tarifas', 403);
      }

      const rateCard = await prisma.rateCard.findFirst({
        where: { id: rateCardId },
        include: {
          budget: true,
          project: true,
        },
      });

      if (!rateCard) {
        return ResponseHelper.error(res, 'Tarifa no encontrada', 404);
      }

      // Verificar tenant
      if (rateCard.budget.organizationId !== organizationId) {
        return ResponseHelper.error(res, 'No tienes acceso a esta tarifa', 403);
      }

      await ensureProjectInTenant(rateCard.projectId, organizationId, globalRole);

      const {
        hourlyCents,
        currency,
        effectiveFrom,
        effectiveTo,
      } = req.body;

      const updated = await prisma.rateCard.update({
        where: { id: rateCardId },
        data: {
          hourlyCents: hourlyCents ? parseInt(hourlyCents) : undefined,
          currency,
          effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : undefined,
          effectiveTo: effectiveTo ? new Date(effectiveTo) : undefined,
        },
        include: {
          budget: {
            select: {
              id: true,
              name: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return ResponseHelper.success(res, updated);
    } catch (error) {
      return ResponseHelper.error(res, error.message, error.statusCode || 500);
    }
  }

  /**
   * Eliminar un rate card
   */
  static async deleteRateCard(req, res) {
    try {
      const rateCardId = parseInt(req.params.id);
      const organizationId = req.user?.organizationId;
      const globalRole = req.user?.globalRole || 'USER';

      // Solo ADMIN y MANAGER pueden eliminar
      if (globalRole !== 'ADMIN' && globalRole !== 'MANAGER') {
        return ResponseHelper.error(res, 'No tienes permisos para eliminar tarifas', 403);
      }

      const rateCard = await prisma.rateCard.findFirst({
        where: { id: rateCardId },
        include: {
          budget: true,
          project: true,
        },
      });

      if (!rateCard) {
        return ResponseHelper.error(res, 'Tarifa no encontrada', 404);
      }

      // Verificar tenant
      if (rateCard.budget.organizationId !== organizationId) {
        return ResponseHelper.error(res, 'No tienes acceso a esta tarifa', 403);
      }

      await ensureProjectInTenant(rateCard.projectId, organizationId, globalRole);

      await prisma.rateCard.delete({
        where: { id: rateCardId },
      });

      return ResponseHelper.success(res, { message: 'Tarifa eliminada correctamente' });
    } catch (error) {
      return ResponseHelper.error(res, error.message, error.statusCode || 500);
    }
  }
}

module.exports = RateCardController;

