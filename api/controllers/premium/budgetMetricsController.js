const { prisma } = require('../../config/database');
const ResponseHelper = require('../../utils/responseHelper');
const { ensureProjectInTenant } = require('../../middleware/tenant');
const Dinero = require('dinero.js');

// Configurar Dinero.js para usar centavos como unidad base
Dinero.defaultCurrency = 'USD';
Dinero.defaultPrecision = 2;

/**
 * Helper para convertir centavos a Dinero
 */
function centsToDinero(cents, currency = 'USD') {
  return Dinero({ amount: cents, currency });
}

/**
 * Helper para convertir Dinero a centavos
 */
function dineroToCents(dinero) {
  return dinero.getAmount();
}

class BudgetMetricsController {
  /**
   * Obtener métricas de un budget
   */
  static async getBudgetMetrics(req, res) {
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
          lines: true,
          rateCards: {
            where: {
              budgetId: budgetId, // Filtrar explícitamente por budgetId
            },
          },
        },
      });

      if (!budget) {
        return ResponseHelper.error(res, 'Presupuesto no encontrado', 404);
      }

      // Verificar tenant
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

      const currency = budget.currency || 'USD';

      // Calcular Planned Total (suma de todas las líneas)
      const plannedTotalCents = budget.lines.reduce((sum, line) => sum + line.plannedCents, 0);
      const plannedTotal = centsToDinero(plannedTotalCents, currency);
      
      console.log(`[BudgetMetrics] Budget Lines encontradas: ${budget.lines.length}`);
      budget.lines.forEach((line, idx) => {
        console.log(`[BudgetMetrics] Line ${idx + 1}: category=${line.category}, plannedCents=${line.plannedCents}`);
      });
      console.log(`[BudgetMetrics] Planned Total Cents: ${plannedTotalCents} (${plannedTotalCents / 100} dólares)`);

      // Calcular Actual Total (suma de todos los gastos)
      // IMPORTANTE: Hacer consulta directa para asegurar que solo se sumen expenses del budget correcto
      // Primero verificar que el budget existe y tiene la organización correcta
      const budgetCheck = await prisma.budget.findFirst({
        where: {
          id: budgetId,
          organizationId: organizationId,
        },
        select: {
          id: true,
          organizationId: true,
        },
      });

      if (!budgetCheck) {
        return ResponseHelper.error(res, 'Presupuesto no encontrado', 404);
      }

      // Consulta directa usando aggregate para sumar directamente en la BD
      const expenseSum = await prisma.expense.aggregate({
        where: {
          budgetId: parseInt(budgetId), // Asegurar que sea número
        },
        _sum: {
          amountCents: true,
        },
        _count: {
          id: true,
        },
      });

      // También obtener la lista para debugging
      const expenses = await prisma.expense.findMany({
        where: {
          budgetId: parseInt(budgetId),
        },
        select: {
          id: true,
          amountCents: true,
          currency: true,
          budgetId: true,
        },
      });

      // DEBUG: Log para verificar qué expenses se están sumando
      console.log(`[BudgetMetrics] Budget ID: ${budgetId}, Expenses encontrados: ${expenseSum._count.id}`);
      console.log(`[BudgetMetrics] Suma desde BD (aggregate): ${expenseSum._sum.amountCents || 0} centavos`);
      expenses.forEach((exp, idx) => {
        console.log(`[BudgetMetrics] Expense ${idx + 1}: ID=${exp.id}, amountCents=${exp.amountCents}, budgetId=${exp.budgetId}`);
      });

      // Usar la suma directa de la BD
      const actualTotalCents = expenseSum._sum.amountCents || 0;
      
      console.log(`[BudgetMetrics] Actual Total Cents: ${actualTotalCents} (${actualTotalCents / 100} dólares)`);
      
      const actualTotal = centsToDinero(actualTotalCents, currency);

      // Calcular Remaining
      // Asegurarse de que ambas monedas coincidan antes de restar
      const actualTotalSameCurrency = centsToDinero(actualTotalCents, currency);
      const remaining = plannedTotal.subtract(actualTotalSameCurrency);
      const remainingCents = dineroToCents(remaining);
      
      console.log(`[BudgetMetrics] Remaining Cents: ${remainingCents} (${remainingCents / 100} dólares)`);

      // Calcular Burn Rate (gastos por día)
      const startDate = budget.startsAt || budget.createdAt;
      const endDate = budget.endsAt || new Date();
      const now = new Date();
      const daysElapsed = Math.max(1, Math.ceil((now - startDate) / (1000 * 60 * 60 * 24)));
      const burnRateCents = daysElapsed > 0 ? Math.floor(actualTotalCents / daysElapsed) : 0;
      const burnRate = centsToDinero(burnRateCents, currency);
      
      console.log(`[BudgetMetrics] Burn Rate cálculo:`);
      console.log(`  - Start Date: ${startDate}`);
      console.log(`  - Now: ${now}`);
      console.log(`  - Days Elapsed: ${daysElapsed}`);
      console.log(`  - Actual Total Cents: ${actualTotalCents}`);
      console.log(`  - Burn Rate Cents: ${burnRateCents} (${burnRateCents / 100} dólares/día)`);

      // Calcular Forecast
      // 1. Obtener horas estimadas vs reales de tareas del proyecto/sprint/release
      let estimatedHoursRemaining = 0;
      let actualHoursTotal = 0;

      if (budget.scope === 'PROJECT') {
        const tasks = await prisma.task.findMany({
          where: {
            userStory: {
              epic: {
                projectId: budget.projectId,
              },
            },
            status: {
              not: 'COMPLETED',
            },
          },
          select: {
            estimatedHours: true,
            actualHours: true,
          },
        });

        estimatedHoursRemaining = tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
        actualHoursTotal = tasks.reduce((sum, task) => sum + (task.actualHours || 0), 0);
      } else if (budget.scope === 'SPRINT' && budget.sprintId) {
        const tasks = await prisma.task.findMany({
          where: {
            sprintId: budget.sprintId,
            status: {
              not: 'COMPLETED',
            },
          },
          select: {
            estimatedHours: true,
            actualHours: true,
          },
        });

        estimatedHoursRemaining = tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
        actualHoursTotal = tasks.reduce((sum, task) => sum + (task.actualHours || 0), 0);
      }

      // 2. Calcular costo laboral estimado usando RateCards
      let estimatedLaborCostCents = 0;

      if (budget.rateCards.length > 0 && estimatedHoursRemaining > 0) {
        // Calcular promedio de tarifas por rol
        const roleRates = {};
        budget.rateCards.forEach((rateCard) => {
          if (rateCard.projectRole) {
            if (!roleRates[rateCard.projectRole]) {
              roleRates[rateCard.projectRole] = [];
            }
            roleRates[rateCard.projectRole].push(rateCard.hourlyCents);
          }
        });

        // Usar promedio de tarifas o tarifa por defecto
        const avgRateCents = Object.values(roleRates).flat().reduce((sum, rate) => sum + rate, 0) / 
                            Object.values(roleRates).flat().length || 0;

        if (avgRateCents > 0) {
          estimatedLaborCostCents = Math.floor(estimatedHoursRemaining * avgRateCents);
        }
      }

      // 3. Calcular gastos planificados restantes (no laborales)
      const laborPlannedCents = budget.lines
        .filter((line) => line.categoryType === 'LABOR')
        .reduce((sum, line) => sum + line.plannedCents, 0);

      const nonLaborPlannedCents = budget.lines
        .filter((line) => line.categoryType !== 'LABOR')
        .reduce((sum, line) => sum + line.plannedCents, 0);

      // Obtener expenses no laborales (sin taskId)
      const nonLaborExpenses = await prisma.expense.findMany({
        where: {
          budgetId: budgetId,
          taskId: null, // Sin taskId = no laboral
          budget: {
            organizationId: organizationId,
          },
        },
        select: {
          amountCents: true,
        },
      });

      const nonLaborActualCents = nonLaborExpenses.reduce((sum, expense) => {
        const amount = expense.amountCents || 0;
        return sum + amount;
      }, 0);

      const nonLaborRemainingCents = Math.max(0, nonLaborPlannedCents - nonLaborActualCents);

      // 4. Forecast At Completion = Actual + Estimated Labor Remaining + Non-Labor Remaining
      const forecastAtCompletionCents = actualTotalCents + estimatedLaborCostCents + nonLaborRemainingCents;
      const forecastAtCompletion = centsToDinero(forecastAtCompletionCents, currency);

      // 5. Variance = Forecast - Planned
      const variance = forecastAtCompletion.subtract(plannedTotal);
      const forecastVarianceCents = dineroToCents(variance);

      // Calcular gastos últimos 30 días
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      // Obtener expenses de los últimos 30 días
      const last30DaysExpenses = await prisma.expense.findMany({
        where: {
          budgetId: budgetId,
          incurredAt: {
            gte: thirtyDaysAgo,
          },
          budget: {
            organizationId: organizationId,
          },
        },
        select: {
          amountCents: true,
        },
      });

      const last30DaysActualCents = last30DaysExpenses.reduce((sum, expense) => {
        const amount = expense.amountCents || 0;
        return sum + amount;
      }, 0);
      const last30DaysActual = centsToDinero(last30DaysActualCents, currency);

      // Calcular labor planned y actual
      // Obtener expenses laborales (con taskId)
      const laborExpenses = await prisma.expense.findMany({
        where: {
          budgetId: budgetId,
          taskId: {
            not: null, // Con taskId = laboral
          },
          budget: {
            organizationId: organizationId,
          },
        },
        select: {
          amountCents: true,
        },
      });

      const laborActualCents = laborExpenses.reduce((sum, expense) => {
        const amount = expense.amountCents || 0;
        return sum + amount;
      }, 0);
      const laborActual = centsToDinero(laborActualCents, currency);

      return ResponseHelper.success(res, {
        plannedTotalCents: dineroToCents(plannedTotal),
        actualTotalCents: dineroToCents(actualTotal),
        remainingCents: remainingCents,
        burnRateCentsPerDay: burnRateCents,
        forecastAtCompletionCents: forecastAtCompletionCents,
        forecastVarianceCents: forecastVarianceCents,
        laborPlannedCents: laborPlannedCents,
        laborActualCents: laborActualCents,
        last30DaysActualCents: last30DaysActualCents,
        currency,
        // Valores formateados para display (opcional)
        plannedTotalFormatted: plannedTotal.toFormat('$0,0.00'),
        actualTotalFormatted: actualTotal.toFormat('$0,0.00'),
        remainingFormatted: remaining.toFormat('$0,0.00'),
        burnRateFormatted: burnRate.toFormat('$0,0.00'),
        forecastAtCompletionFormatted: forecastAtCompletion.toFormat('$0,0.00'),
        forecastVarianceFormatted: variance.toFormat('$0,0.00'),
        laborPlannedFormatted: centsToDinero(laborPlannedCents, currency).toFormat('$0,0.00'),
        laborActualFormatted: laborActual.toFormat('$0,0.00'),
        last30DaysActualFormatted: last30DaysActual.toFormat('$0,0.00'),
      });
    } catch (error) {
      return ResponseHelper.error(res, error.message, error.statusCode || 500);
    }
  }
}

module.exports = BudgetMetricsController;

