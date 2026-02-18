const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Script para investigar usuarios en la base de datos
 * Muestra información detallada sobre todos los usuarios y sus relaciones
 */

// Función para formatear fechas
const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Función para mostrar información de un usuario
const displayUserInfo = (user, index, total) => {
  console.log('\n' + '═'.repeat(80));
  console.log(`👤 USUARIO ${index + 1} de ${total}`);
  console.log('═'.repeat(80));
  console.log(`ID:                    ${user.id}`);
  console.log(`Email:                 ${user.email}`);
  console.log(`Username:              ${user.username || 'N/A'}`);
  console.log(`Nombre:                ${user.name}`);
  console.log(`Avatar:                ${user.avatar || 'N/A'}`);
  console.log(`Estado:                ${user.isActive ? '✅ Activo' : '❌ Inactivo'}`);
  console.log(`Último Login:          ${formatDate(user.lastLogin)}`);
  console.log(`Fecha Creación:        ${formatDate(user.createdAt)}`);
  console.log(`Última Actualización: ${formatDate(user.updatedAt)}`);
  console.log(`Tiene Contraseña:      ${user.password ? '✅ Sí' : '❌ No'}`);
};

// Función para mostrar estadísticas de relaciones
const displayUserRelations = async (userId) => {
  try {
    const [
      projectsCreated,
      projectsDeleted,
      projectMemberships,
      ledTeams,
      sprintMemberships,
      assignedTasks,
      dailyStandups
    ] = await Promise.all([
      prisma.project.count({ where: { createdById: userId } }),
      prisma.project.count({ where: { deletedBy: userId } }),
      prisma.projectMember.count({ where: { userId } }),
      prisma.projectTeam.count({ where: { teamLeadId: userId } }),
      prisma.sprintMember.count({ where: { userId } }),
      prisma.task.count({ where: { assigneeId: userId } }),
      prisma.dailyStandup.count({ where: { participantId: userId } })
    ]);

    console.log('\n📊 RELACIONES:');
    console.log('─'.repeat(80));
    console.log(`  Proyectos creados:        ${projectsCreated}`);
    console.log(`  Proyectos eliminados:    ${projectsDeleted}`);
    console.log(`  Miembros de proyectos:   ${projectMemberships}`);
    console.log(`  Equipos liderados:       ${ledTeams}`);
    console.log(`  Miembros de sprints:     ${sprintMemberships}`);
    console.log(`  Tareas asignadas:        ${assignedTasks}`);
    console.log(`  Daily standups:          ${dailyStandups}`);

    // Detalles de proyectos donde es miembro
    if (projectMemberships > 0) {
      const memberships = await prisma.projectMember.findMany({
        where: { userId },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              status: true
            }
          },
          team: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      if (memberships.length > 0) {
        console.log('\n  📁 Proyectos como miembro:');
        memberships.forEach(m => {
          console.log(`    - ${m.project.name} (${m.project.status}) - Rol: ${m.role}${m.team ? ` - Equipo: ${m.team.name}` : ''}`);
        });
      }
    }

    // Detalles de tareas asignadas
    if (assignedTasks > 0) {
      const tasks = await prisma.task.findMany({
        where: { assigneeId: userId },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          userStory: {
            select: {
              title: true,
              epic: {
                select: {
                  title: true,
                  project: {
                    select: {
                      name: true
                    }
                  }
                }
              }
            }
          }
        },
        take: 5
      });

      if (tasks.length > 0) {
        console.log('\n  ✅ Últimas 5 tareas asignadas:');
        tasks.forEach(t => {
          console.log(`    - ${t.title} (${t.status}) - Prioridad: ${t.priority}`);
          console.log(`      Proyecto: ${t.userStory.epic.project.name} | Épica: ${t.userStory.epic.title}`);
        });
        if (assignedTasks > 5) {
          console.log(`    ... y ${assignedTasks - 5} tareas más`);
        }
      }
    }

  } catch (error) {
    console.error('  ❌ Error al obtener relaciones:', error.message);
  }
};

// Función principal
async function investigateUsers() {
  try {
    console.log('\n🔍 INVESTIGACIÓN DE USUARIOS EN LA BASE DE DATOS');
    console.log('═'.repeat(80));
    console.log(`Fecha: ${new Date().toLocaleString('es-ES')}\n`);

    // Obtener todos los usuarios
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatar: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        password: true // Solo para verificar si existe, no se mostrará
      }
    });

    if (users.length === 0) {
      console.log('⚠️  No se encontraron usuarios en la base de datos.');
      console.log('💡 Ejecuta el seed para crear usuarios de ejemplo: npm run seed');
      return;
    }

    // Estadísticas generales
    console.log('📈 ESTADÍSTICAS GENERALES');
    console.log('─'.repeat(80));
    console.log(`Total de usuarios:        ${users.length}`);
    console.log(`Usuarios activos:         ${users.filter(u => u.isActive).length}`);
    console.log(`Usuarios inactivos:       ${users.filter(u => !u.isActive).length}`);
    console.log(`Con username:             ${users.filter(u => u.username).length}`);
    console.log(`Sin username:             ${users.filter(u => !u.username).length}`);
    console.log(`Con contraseña:          ${users.filter(u => u.password).length}`);
    console.log(`Sin contraseña:           ${users.filter(u => !u.password).length}`);
    console.log(`Con último login:         ${users.filter(u => u.lastLogin).length}`);
    console.log(`Sin último login:         ${users.filter(u => !u.lastLogin).length}`);

    // Usuarios más recientes
    const recentUsers = users.slice(0, 5);
    console.log('\n🆕 ÚLTIMOS 5 USUARIOS CREADOS:');
    console.log('─'.repeat(80));
    recentUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email}) - ${formatDate(user.createdAt)}`);
    });

    // Mostrar información detallada de cada usuario
    console.log('\n\n📋 DETALLES DE USUARIOS');
    console.log('═'.repeat(80));

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      displayUserInfo(user, i, users.length);
      await displayUserRelations(user.id);
    }

    // Resumen final
    console.log('\n\n📊 RESUMEN FINAL');
    console.log('═'.repeat(80));
    console.log(`✅ Investigación completada para ${users.length} usuario(s)`);
    console.log(`📅 Fecha de investigación: ${new Date().toLocaleString('es-ES')}`);

  } catch (error) {
    console.error('\n❌ Error durante la investigación:', error);
    throw error;
  }
}

// Ejecutar investigación
investigateUsers()
  .then(async () => {
    await prisma.$disconnect();
    console.log('\n✅ Script completado exitosamente\n');
  })
  .catch(async (e) => {
    console.error('\n❌ Error en el script:', e);
    await prisma.$disconnect();
    process.exit(1);
  });

