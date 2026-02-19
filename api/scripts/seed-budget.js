#!/usr/bin/env node
/**
 * Seed de Budget y todos sus componentes (BudgetLine, Expense, RateCard)
 * Para ejecutar en Docker: docker compose exec api node scripts/seed-budget.js
 * O local: cd api && node scripts/seed-budget.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('💰 Seed de Budget y componentes (BudgetLine, Expense, RateCard)\n');

  try {
    // Buscar un proyecto existente (el del seed principal o el primero)
    const project = await prisma.project.findFirst({
      where: { status: 'ACTIVE' },
      include: {
        organization: true,
        members: { take: 1 },
      },
    });

    if (!project) {
      console.log('⚠️  No hay proyectos activos. Ejecuta primero el seed principal: npm run db:seed');
      process.exit(1);
    }

    const organizationId = project.organizationId;
    const projectId = project.id;
    const createdById = project.members[0]?.userId ?? project.createdById;

    console.log(`📦 Proyecto: ${project.name} (ID: ${projectId}, Org: ${project.organization?.name ?? organizationId})\n`);

    // 1. Budget de proyecto (scope PROJECT)
    const existingBudget = await prisma.budget.findFirst({
      where: { projectId, scope: 'PROJECT' },
    });

    let budget;
    if (existingBudget) {
      console.log(`ℹ️  Ya existe un budget de proyecto (ID: ${existingBudget.id}). Se crearán líneas/expenses si no existen.\n`);
      budget = existingBudget;
    } else {
      budget = await prisma.budget.create({
        data: {
          organizationId,
          projectId,
          scope: 'PROJECT',
          name: `Presupuesto ${project.name}`,
          currency: 'EUR',
          startsAt: new Date(),
          endsAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // +6 meses
          notes: 'Presupuesto inicial del proyecto (seed).',
        },
      });
      console.log(`✅ Budget creado: ${budget.name} (ID: ${budget.id})\n`);
    }

    // 2. BudgetLines
    const lineCategories = [
      { category: 'Desarrollo', categoryType: 'LABOR', plannedCents: 50000 },
      { category: 'Licencias', categoryType: 'SOFTWARE', plannedCents: 12000 },
      { category: 'Infraestructura', categoryType: 'SERVICES', plannedCents: 8000 },
      { category: 'Hardware', categoryType: 'HARDWARE', plannedCents: 5000 },
      { category: 'Otros', categoryType: 'OTHER', plannedCents: 3000 },
    ];

    let linesCreated = 0;
    for (const line of lineCategories) {
      const exists = await prisma.budgetLine.findFirst({
        where: { budgetId: budget.id, category: line.category },
      });
      if (!exists) {
        await prisma.budgetLine.create({
          data: {
            budgetId: budget.id,
            category: line.category,
            categoryType: line.categoryType,
            plannedCents: line.plannedCents,
            notes: `Línea ${line.category} (seed)`,
          },
        });
        linesCreated++;
      }
    }
    console.log(`✅ BudgetLines: ${linesCreated} nuevas (total categorías: ${lineCategories.length})\n`);

    // 3. Expense(s) de ejemplo
    const expenseCount = await prisma.expense.count({ where: { budgetId: budget.id } });
    if (expenseCount === 0 && createdById) {
      await prisma.expense.create({
        data: {
          budgetId: budget.id,
          projectId,
          category: 'Licencias',
          amountCents: 2500,
          currency: 'EUR',
          incurredAt: new Date(),
          vendor: 'Ejemplo SaaS',
          description: 'Gasto de ejemplo (seed)',
          createdById,
        },
      });
      console.log('✅ Expense de ejemplo creado\n');
    } else {
      console.log(`ℹ️  Expenses en budget: ${expenseCount}\n`);
    }

    // 4. RateCard(s) de ejemplo
    const rateCardCount = await prisma.rateCard.count({ where: { budgetId: budget.id } });
    if (rateCardCount === 0) {
      await prisma.rateCard.create({
        data: {
          budgetId: budget.id,
          projectId,
          hourlyCents: 4500, // 45 €/h
          currency: 'EUR',
          projectRole: 'DEVELOPER',
        },
      });
      await prisma.rateCard.create({
        data: {
          budgetId: budget.id,
          projectId,
          hourlyCents: 5500,
          currency: 'EUR',
          projectRole: 'SCRUM_MASTER',
        },
      });
      console.log('✅ 2 RateCards de ejemplo creados (DEVELOPER, SCRUM_MASTER)\n');
    } else {
      console.log(`ℹ️  RateCards en budget: ${rateCardCount}\n`);
    }

    // Resumen
    const [lines, expenses, rateCards] = await Promise.all([
      prisma.budgetLine.count({ where: { budgetId: budget.id } }),
      prisma.expense.count({ where: { budgetId: budget.id } }),
      prisma.rateCard.count({ where: { budgetId: budget.id } }),
    ]);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Resumen Budget y componentes');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Budget:     ${budget.name} (ID: ${budget.id})`);
    console.log(`   Líneas:     ${lines}`);
    console.log(`   Expenses:   ${expenses}`);
    console.log(`   RateCards:  ${rateCards}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✨ Seed de budget completado.\n');
  } catch (error) {
    console.error('❌ Error en seed-budget:', error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
