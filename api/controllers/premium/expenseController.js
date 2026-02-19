const { prisma } = require('../../config/database');
const ResponseHelper = require('../../utils/responseHelper');
const { ensureProjectInTenant } = require('../../middleware/tenant');

class ExpenseController {
  /**
   * Obtener todos los expenses con filtros
   */
  static async getExpenses(req, res) {
    try {
      const userId = parseInt(req.user?.id);
      const organizationId = req.user?.organizationId;
      const globalRole = req.user?.globalRole || 'USER';

      const { budgetId, projectId, from, to, page = 1, limit = 50 } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const where = {
        budget: {
          organizationId,
        },
      };

      // Si es USER, solo ver expenses de proyectos donde es miembro
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

      if (from || to) {
        where.incurredAt = {};
        if (from) {
          where.incurredAt.gte = new Date(from);
        }
        if (to) {
          where.incurredAt.lte = new Date(to);
        }
      }

      const [expenses, total] = await Promise.all([
        prisma.expense.findMany({
          where,
          skip,
          take: parseInt(limit),
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
            sprint: {
              select: {
                id: true,
                name: true,
              },
            },
            task: {
              select: {
                id: true,
                title: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { incurredAt: 'desc' },
        }),
        prisma.expense.count({ where }),
      ]);

      return ResponseHelper.success(res, {
        expenses,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (error) {
      return ResponseHelper.error(res, error.message, error.statusCode || 500);
    }
  }

  /**
   * Crear un nuevo expense
   */
  static async createExpense(req, res) {
    try {
      const userId = parseInt(req.user?.id);
      const organizationId = req.user?.organizationId;
      const globalRole = req.user?.globalRole || 'USER';

      // Solo ADMIN y MANAGER pueden crear expenses
      if (globalRole !== 'ADMIN' && globalRole !== 'MANAGER') {
        return ResponseHelper.error(res, 'No tienes permisos para crear gastos', 403);
      }

      const {
        budgetId,
        projectId,
        sprintId,
        taskId,
        category,
        amountCents,
        currency = 'USD',
        incurredAt,
        vendor,
        description,
        attachmentUrl,
      } = req.body;

      if (!budgetId || !projectId || !category || !amountCents || amountCents <= 0) {
        return ResponseHelper.error(res, 'budgetId, projectId, category y amountCents son requeridos', 400);
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

      // Verificar task si existe
      if (taskId) {
        const task = await prisma.task.findFirst({
          where: {
            id: parseInt(taskId),
            projectId: parseInt(projectId),
          },
          include: {
            userStory: {
              include: {
                epic: true,
              },
            },
          },
        });
        if (!task) {
          return ResponseHelper.error(res, 'Tarea no encontrada o no pertenece al proyecto', 404);
        }
      }

      const expense = await prisma.expense.create({
        data: {
          budgetId: parseInt(budgetId),
          projectId: parseInt(projectId),
          sprintId: sprintId ? parseInt(sprintId) : null,
          taskId: taskId ? parseInt(taskId) : null,
          category,
          amountCents: parseInt(amountCents),
          currency,
          incurredAt: incurredAt ? new Date(incurredAt) : new Date(),
          vendor,
          description,
          attachmentUrl,
          createdById: userId,
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
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return ResponseHelper.success(res, expense, 201);
    } catch (error) {
      return ResponseHelper.error(res, error.message, error.statusCode || 500);
    }
  }

  /**
   * Actualizar un expense
   */
  static async updateExpense(req, res) {
    try {
      const expenseId = parseInt(req.params.id);
      const organizationId = req.user?.organizationId;
      const globalRole = req.user?.globalRole || 'USER';

      // Solo ADMIN y MANAGER pueden actualizar
      if (globalRole !== 'ADMIN' && globalRole !== 'MANAGER') {
        return ResponseHelper.error(res, 'No tienes permisos para actualizar gastos', 403);
      }

      const expense = await prisma.expense.findFirst({
        where: { id: expenseId },
        include: {
          budget: true,
          project: true,
        },
      });

      if (!expense) {
        return ResponseHelper.error(res, 'Gasto no encontrado', 404);
      }

      // Verificar tenant
      if (expense.budget.organizationId !== organizationId) {
        return ResponseHelper.error(res, 'No tienes acceso a este gasto', 403);
      }

      await ensureProjectInTenant(expense.projectId, organizationId, globalRole);

      const {
        category,
        amountCents,
        currency,
        incurredAt,
        vendor,
        description,
        attachmentUrl,
      } = req.body;

      const updated = await prisma.expense.update({
        where: { id: expenseId },
        data: {
          category,
          amountCents: amountCents ? parseInt(amountCents) : undefined,
          currency,
          incurredAt: incurredAt ? new Date(incurredAt) : undefined,
          vendor,
          description,
          attachmentUrl,
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
          createdBy: {
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
   * Eliminar un expense
   */
  static async deleteExpense(req, res) {
    try {
      const expenseId = parseInt(req.params.id);
      const organizationId = req.user?.organizationId;
      const globalRole = req.user?.globalRole || 'USER';

      // Solo ADMIN y MANAGER pueden eliminar
      if (globalRole !== 'ADMIN' && globalRole !== 'MANAGER') {
        return ResponseHelper.error(res, 'No tienes permisos para eliminar gastos', 403);
      }

      const expense = await prisma.expense.findFirst({
        where: { id: expenseId },
        include: {
          budget: true,
          project: true,
        },
      });

      if (!expense) {
        return ResponseHelper.error(res, 'Gasto no encontrado', 404);
      }

      // Verificar tenant
      if (expense.budget.organizationId !== organizationId) {
        return ResponseHelper.error(res, 'No tienes acceso a este gasto', 403);
      }

      await ensureProjectInTenant(expense.projectId, organizationId, globalRole);

      await prisma.expense.delete({
        where: { id: expenseId },
      });

      return ResponseHelper.success(res, { message: 'Gasto eliminado correctamente' });
    } catch (error) {
      return ResponseHelper.error(res, error.message, error.statusCode || 500);
    }
  }
}

module.exports = ExpenseController;

