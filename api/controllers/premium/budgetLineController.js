const { prisma } = require('../../config/database');
const ResponseHelper = require('../../utils/responseHelper');
const { ensureProjectInTenant } = require('../../middleware/tenant');

class BudgetLineController {
  /**
   * Crear una línea de presupuesto
   */
  static async createBudgetLine(req, res) {
    try {
      const budgetId = parseInt(req.params.budgetId);
      const organizationId = req.user?.organizationId;
      const globalRole = req.user?.globalRole || 'USER';

      // Solo ADMIN y MANAGER pueden crear líneas
      if (globalRole !== 'ADMIN' && globalRole !== 'MANAGER') {
        return ResponseHelper.error(res, 'No tienes permisos para crear líneas de presupuesto', 403);
      }

      const budget = await prisma.budget.findFirst({
        where: {
          id: budgetId,
          organizationId,
        },
        include: {
          project: true,
        },
      });

      if (!budget) {
        return ResponseHelper.error(res, 'Presupuesto no encontrado', 404);
      }

      // Verificar tenant
      await ensureProjectInTenant(budget.projectId, organizationId, globalRole);

      const {
        category,
        categoryType = 'OTHER',
        plannedCents,
        notes,
      } = req.body;

      if (!category || !plannedCents || plannedCents <= 0) {
        return ResponseHelper.error(res, 'category y plannedCents son requeridos', 400);
      }

      const line = await prisma.budgetLine.create({
        data: {
          budgetId,
          category,
          categoryType,
          plannedCents: parseInt(plannedCents),
          notes,
        },
      });

      return ResponseHelper.success(res, line, 201);
    } catch (error) {
      return ResponseHelper.error(res, error.message, error.statusCode || 500);
    }
  }

  /**
   * Actualizar una línea de presupuesto
   */
  static async updateBudgetLine(req, res) {
    try {
      const lineId = parseInt(req.params.lineId);
      const organizationId = req.user?.organizationId;
      const globalRole = req.user?.globalRole || 'USER';

      // Solo ADMIN y MANAGER pueden actualizar
      if (globalRole !== 'ADMIN' && globalRole !== 'MANAGER') {
        return ResponseHelper.error(res, 'No tienes permisos para actualizar líneas de presupuesto', 403);
      }

      const line = await prisma.budgetLine.findFirst({
        where: { id: lineId },
        include: {
          budget: {
            include: {
              project: true,
            },
          },
        },
      });

      if (!line) {
        return ResponseHelper.error(res, 'Línea de presupuesto no encontrada', 404);
      }

      // Verificar tenant
      if (line.budget.organizationId !== organizationId) {
        return ResponseHelper.error(res, 'No tienes acceso a esta línea de presupuesto', 403);
      }

      await ensureProjectInTenant(line.budget.projectId, organizationId, globalRole);

      const {
        category,
        categoryType,
        plannedCents,
        notes,
      } = req.body;

      const updated = await prisma.budgetLine.update({
        where: { id: lineId },
        data: {
          category,
          categoryType,
          plannedCents: plannedCents ? parseInt(plannedCents) : undefined,
          notes,
        },
      });

      return ResponseHelper.success(res, updated);
    } catch (error) {
      return ResponseHelper.error(res, error.message, error.statusCode || 500);
    }
  }

  /**
   * Eliminar una línea de presupuesto
   */
  static async deleteBudgetLine(req, res) {
    try {
      const lineId = parseInt(req.params.lineId);
      const organizationId = req.user?.organizationId;
      const globalRole = req.user?.globalRole || 'USER';

      // Solo ADMIN y MANAGER pueden eliminar
      if (globalRole !== 'ADMIN' && globalRole !== 'MANAGER') {
        return ResponseHelper.error(res, 'No tienes permisos para eliminar líneas de presupuesto', 403);
      }

      const line = await prisma.budgetLine.findFirst({
        where: { id: lineId },
        include: {
          budget: {
            include: {
              project: true,
            },
          },
        },
      });

      if (!line) {
        return ResponseHelper.error(res, 'Línea de presupuesto no encontrada', 404);
      }

      // Verificar tenant
      if (line.budget.organizationId !== organizationId) {
        return ResponseHelper.error(res, 'No tienes acceso a esta línea de presupuesto', 403);
      }

      await ensureProjectInTenant(line.budget.projectId, organizationId, globalRole);

      await prisma.budgetLine.delete({
        where: { id: lineId },
      });

      return ResponseHelper.success(res, { message: 'Línea de presupuesto eliminada correctamente' });
    } catch (error) {
      return ResponseHelper.error(res, error.message, error.statusCode || 500);
    }
  }
}

module.exports = BudgetLineController;

