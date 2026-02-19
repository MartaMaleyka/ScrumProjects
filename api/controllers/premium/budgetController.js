const { prisma } = require('../../config/database');
const ResponseHelper = require('../../utils/responseHelper');
const { ensureProjectInTenant } = require('../../middleware/tenant');

class BudgetController {
  /**
   * Obtener todos los budgets con filtros
   */
  static async getBudgets(req, res) {
    try {
      const userId = parseInt(req.user?.id);
      const organizationId = req.user?.organizationId;
      const globalRole = req.user?.globalRole || 'USER';

      const { projectId, scope, page = 1, limit = 20 } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const where = {
        organizationId,
      };

      // Si es USER, solo ver budgets de proyectos donde es miembro
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

      if (projectId) {
        const projectIdInt = parseInt(projectId);
        // Verificar tenant
        await ensureProjectInTenant(projectIdInt, organizationId, globalRole);
        where.projectId = projectIdInt;
      }

      if (scope) {
        where.scope = scope;
      }

      const [budgets, total] = await Promise.all([
        prisma.budget.findMany({
          where,
          skip,
          take: parseInt(limit),
          include: {
            project: {
              select: {
                id: true,
                name: true,
              },
            },
            sprint: {
              select: {
                id: true,
                name: true,
              },
            },
            release: {
              select: {
                id: true,
                version: true,
                name: true,
              },
            },
            lines: {
              select: {
                id: true,
                category: true,
                categoryType: true,
                plannedCents: true,
              },
            },
            _count: {
              select: {
                lines: true,
                expenses: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.budget.count({ where }),
      ]);

      return ResponseHelper.success(res, {
        budgets,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (error) {
      return ResponseHelper.error(res, error.message, 500);
    }
  }

  /**
   * Obtener un budget por ID
   */
  static async getBudgetById(req, res) {
    try {
      const budgetId = parseInt(req.params.id);
      const organizationId = req.user?.organizationId;
      const globalRole = req.user?.globalRole || 'USER';
      const userId = parseInt(req.user?.id);

      const budget = await prisma.budget.findFirst({
        where: {
          id: budgetId,
          organizationId,
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              organizationId: true,
            },
          },
          sprint: {
            select: {
              id: true,
              name: true,
            },
          },
          release: {
            select: {
              id: true,
              version: true,
              name: true,
            },
          },
          lines: {
            orderBy: { createdAt: 'asc' },
          },
          expenses: {
            include: {
              createdBy: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              task: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
            orderBy: { incurredAt: 'desc' },
            take: 50, // Limitar a últimos 50
          },
          rateCards: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!budget) {
        return ResponseHelper.error(res, 'Presupuesto no encontrado', 404);
      }

      // Verificar tenant del proyecto
      await ensureProjectInTenant(budget.projectId, organizationId, globalRole);

      // Si es USER, verificar que es miembro del proyecto
      if (globalRole === 'USER') {
        const isMember = await prisma.projectMember.findFirst({
          where: {
            projectId: budget.projectId,
            userId,
            leftAt: null,
          },
        });

        if (!isMember) {
          return ResponseHelper.error(res, 'No tienes acceso a este presupuesto', 403);
        }
      }

      return ResponseHelper.success(res, budget);
    } catch (error) {
      return ResponseHelper.error(res, error.message, error.statusCode || 500);
    }
  }

  /**
   * Crear un nuevo budget
   */
  static async createBudget(req, res) {
    try {
      const userId = parseInt(req.user?.id);
      const organizationId = req.user?.organizationId;
      const globalRole = req.user?.globalRole || 'USER';

      // Solo ADMIN y MANAGER pueden crear budgets
      if (globalRole !== 'ADMIN' && globalRole !== 'MANAGER') {
        return ResponseHelper.error(res, 'No tienes permisos para crear presupuestos', 403);
      }

      const {
        projectId,
        sprintId,
        releaseId,
        scope = 'PROJECT',
        name,
        currency = 'USD',
        startsAt,
        endsAt,
        notes,
        lines = [],
      } = req.body;

      // Validar scope
      if (scope === 'PROJECT' && (sprintId || releaseId)) {
        return ResponseHelper.error(res, 'Scope PROJECT no puede tener sprintId o releaseId', 400);
      }
      if (scope === 'SPRINT' && !sprintId) {
        return ResponseHelper.error(res, 'Scope SPRINT requiere sprintId', 400);
      }
      if (scope === 'RELEASE' && !releaseId) {
        return ResponseHelper.error(res, 'Scope RELEASE requiere releaseId', 400);
      }

      // Verificar tenant del proyecto
      const project = await ensureProjectInTenant(parseInt(projectId), organizationId, globalRole);

      // Verificar sprint si existe
      if (sprintId) {
        const sprint = await prisma.sprint.findFirst({
          where: {
            id: parseInt(sprintId),
            projectId: parseInt(projectId),
          },
        });
        if (!sprint) {
          return ResponseHelper.error(res, 'Sprint no encontrado o no pertenece al proyecto', 404);
        }
      }

      // Verificar release si existe
      if (releaseId) {
        const release = await prisma.release.findFirst({
          where: {
            id: parseInt(releaseId),
            projectId: parseInt(projectId),
          },
        });
        if (!release) {
          return ResponseHelper.error(res, 'Release no encontrado o no pertenece al proyecto', 404);
        }
      }

      // Crear budget con líneas
      const budget = await prisma.budget.create({
        data: {
          organizationId: project.organizationId,
          projectId: parseInt(projectId),
          sprintId: sprintId ? parseInt(sprintId) : null,
          releaseId: releaseId ? parseInt(releaseId) : null,
          scope,
          name,
          currency,
          startsAt: startsAt ? new Date(startsAt) : null,
          endsAt: endsAt ? new Date(endsAt) : null,
          notes,
          lines: {
            create: lines.map((line) => ({
              category: line.category,
              categoryType: line.categoryType || 'OTHER',
              plannedCents: parseInt(line.plannedCents),
              notes: line.notes,
            })),
          },
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
          lines: true,
        },
      });

      return ResponseHelper.success(res, budget, 201);
    } catch (error) {
      return ResponseHelper.error(res, error.message, error.statusCode || 500);
    }
  }

  /**
   * Actualizar un budget
   */
  static async updateBudget(req, res) {
    try {
      const budgetId = parseInt(req.params.id);
      const organizationId = req.user?.organizationId;
      const globalRole = req.user?.globalRole || 'USER';

      // Solo ADMIN y MANAGER pueden actualizar
      if (globalRole !== 'ADMIN' && globalRole !== 'MANAGER') {
        return ResponseHelper.error(res, 'No tienes permisos para actualizar presupuestos', 403);
      }

      const budget = await prisma.budget.findFirst({
        where: {
          id: budgetId,
          organizationId,
        },
      });

      if (!budget) {
        return ResponseHelper.error(res, 'Presupuesto no encontrado', 404);
      }

      // Verificar tenant del proyecto
      await ensureProjectInTenant(budget.projectId, organizationId, globalRole);

      const {
        name,
        currency,
        startsAt,
        endsAt,
        notes,
      } = req.body;

      const updated = await prisma.budget.update({
        where: { id: budgetId },
        data: {
          name,
          currency,
          startsAt: startsAt ? new Date(startsAt) : null,
          endsAt: endsAt ? new Date(endsAt) : null,
          notes,
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
          lines: true,
        },
      });

      return ResponseHelper.success(res, updated);
    } catch (error) {
      return ResponseHelper.error(res, error.message, error.statusCode || 500);
    }
  }

  /**
   * Eliminar un budget
   */
  static async deleteBudget(req, res) {
    try {
      const budgetId = parseInt(req.params.id);
      const organizationId = req.user?.organizationId;
      const globalRole = req.user?.globalRole || 'USER';

      // Solo ADMIN y MANAGER pueden eliminar
      if (globalRole !== 'ADMIN' && globalRole !== 'MANAGER') {
        return ResponseHelper.error(res, 'No tienes permisos para eliminar presupuestos', 403);
      }

      const budget = await prisma.budget.findFirst({
        where: {
          id: budgetId,
          organizationId,
        },
      });

      if (!budget) {
        return ResponseHelper.error(res, 'Presupuesto no encontrado', 404);
      }

      // Verificar tenant del proyecto
      await ensureProjectInTenant(budget.projectId, organizationId, globalRole);

      await prisma.budget.delete({
        where: { id: budgetId },
      });

      return ResponseHelper.success(res, { message: 'Presupuesto eliminado correctamente' });
    } catch (error) {
      return ResponseHelper.error(res, error.message, error.statusCode || 500);
    }
  }
}

module.exports = BudgetController;

