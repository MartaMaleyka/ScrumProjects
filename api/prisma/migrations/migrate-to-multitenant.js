/**
 * Script de migración de datos para multi-tenant
 * 
 * Este script debe ejecutarse DESPUÉS de aplicar la migración de Prisma
 * que crea la tabla organizations y agrega organizationId a users y projects.
 * 
 * Uso:
 *   node prisma/migrations/migrate-to-multitenant.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateToMultiTenant() {
  console.log('🔄 Iniciando migración a multi-tenant...\n');

  try {
    // 1. Crear organización por defecto
    console.log('📦 Creando organización por defecto...');
    const defaultOrg = await prisma.organization.upsert({
      where: { slug: 'default-organization' },
      update: {},
      create: {
        name: 'Default Organization',
        slug: 'default-organization',
        isActive: true
      }
    });
    console.log(`✅ Organización creada: ${defaultOrg.name} (ID: ${defaultOrg.id})\n`);

    // 2. Actualizar usuarios existentes sin organizationId
    console.log('👥 Actualizando usuarios existentes...');
    const usersUpdated = await prisma.user.updateMany({
      where: {
        organizationId: null
      },
      data: {
        organizationId: defaultOrg.id
      }
    });
    console.log(`✅ ${usersUpdated.count} usuarios actualizados\n`);

    // 3. Actualizar proyectos existentes sin organizationId
    console.log('📊 Actualizando proyectos existentes...');
    
    // Primero, obtener todos los proyectos sin organizationId
    const projectsWithoutOrg = await prisma.project.findMany({
      where: {
        organizationId: null
      },
      select: {
        id: true,
        createdById: true
      }
    });

    let updatedCount = 0;
    for (const project of projectsWithoutOrg) {
      // Intentar obtener la organización del creador
      const creator = await prisma.user.findUnique({
        where: { id: project.createdById },
        select: { organizationId: true }
      });

      const orgId = creator?.organizationId || defaultOrg.id;

      await prisma.project.update({
        where: { id: project.id },
        data: { organizationId: orgId }
      });
      updatedCount++;
    }

    console.log(`✅ ${updatedCount} proyectos actualizados\n`);

    // 4. Verificar que no queden registros sin organizationId
    const usersWithoutOrg = await prisma.user.count({
      where: { organizationId: null }
    });
    const projectsWithoutOrgCount = await prisma.project.count({
      where: { organizationId: null }
    });

    if (usersWithoutOrg > 0 || projectsWithoutOrgCount > 0) {
      console.warn('⚠️  Advertencia: Aún hay registros sin organizationId');
      console.warn(`   Usuarios: ${usersWithoutOrg}`);
      console.warn(`   Proyectos: ${projectsWithoutOrgCount}\n`);
    } else {
      console.log('✅ Todos los registros tienen organizationId asignado\n');
    }

    console.log('✨ Migración completada exitosamente!\n');
    console.log('📋 Resumen:');
    console.log(`   - Organización por defecto: ${defaultOrg.name} (ID: ${defaultOrg.id})`);
    console.log(`   - Usuarios actualizados: ${usersUpdated.count}`);
    console.log(`   - Proyectos actualizados: ${updatedCount}\n`);

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar migración
if (require.main === module) {
  migrateToMultiTenant()
    .then(() => {
      console.log('✅ Script de migración completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en script de migración:', error);
      process.exit(1);
    });
}

module.exports = { migrateToMultiTenant };

