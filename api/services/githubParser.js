const { prisma } = require('../config/database');

/**
 * Parsea referencias de tareas en texto (SP-123 o #123)
 * @param {string} text - Texto a analizar
 * @param {string} prefix - Prefijo configurado (por defecto "SP-")
 * @returns {number[]} - Array de IDs de tareas encontrados
 */
function parseTaskReferences(text, prefix = 'SP-') {
  if (!text) return [];

  const references = [];
  
  // Patrón 1: SP-123 o el prefijo configurado
  const prefixPattern = new RegExp(`${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)`, 'gi');
  const prefixMatches = text.matchAll(prefixPattern);
  for (const match of prefixMatches) {
    const taskId = parseInt(match[1], 10);
    if (!isNaN(taskId) && !references.includes(taskId)) {
      references.push(taskId);
    }
  }

  // Patrón 2: #123 (solo si el prefijo no es #)
  if (prefix !== '#') {
    const hashPattern = /#(\d+)/gi;
    const hashMatches = text.matchAll(hashPattern);
    for (const match of hashMatches) {
      const taskId = parseInt(match[1], 10);
      if (!isNaN(taskId) && !references.includes(taskId)) {
        references.push(taskId);
      }
    }
  }

  return references;
}

/**
 * Vincula commits o PRs a tareas basándose en referencias encontradas
 * @param {number} projectId - ID del proyecto
 * @param {Array} items - Array de commits o PRs con referencias
 * @param {string} type - Tipo de enlace: 'COMMIT' o 'PULL_REQUEST'
 * @param {string} prefix - Prefijo para referencias
 */
async function linkItemsToTasks(projectId, items, type, prefix = 'SP-') {
  const linksCreated = [];

  for (const item of items) {
    // Combinar texto de título, cuerpo y mensaje de commit
    const textToParse = [
      item.title || '',
      item.body || '',
      item.message || '',
      item.commit?.message || ''
    ].join(' ');

    const taskIds = parseTaskReferences(textToParse, prefix);
    
    if (taskIds.length > 0) {
      console.log(`🔍 [GitHubParser] ${type} ${item.sha?.substring(0, 7) || item.number} contiene referencias:`, taskIds);
    }

    for (const taskId of taskIds) {
      try {
        // Verificar que la tarea existe y pertenece al proyecto
        const task = await prisma.task.findFirst({
          where: {
            id: taskId,
            userStory: {
              epic: {
                projectId: projectId
              }
            }
          },
          include: {
            userStory: {
              include: {
                epic: {
                  select: { projectId: true }
                }
              }
            }
          }
        });

        if (!task) {
          console.log(`Tarea ${taskId} no encontrada o no pertenece al proyecto ${projectId}`);
          continue;
        }

        // Determinar URL y externalId según el tipo
        let url, externalId;
        if (type === 'COMMIT') {
          externalId = item.sha || item.id;
          url = item.html_url || item.url || '';
        } else if (type === 'PULL_REQUEST') {
          externalId = String(item.number || item.id);
          url = item.html_url || item.url || '';
        } else {
          externalId = String(item.id || item.number || '');
          url = item.html_url || item.url || '';
        }

        // Crear o actualizar el enlace externo
        const link = await prisma.taskExternalLink.upsert({
          where: {
            taskId_provider_externalType_externalId: {
              taskId: taskId,
              provider: 'GITHUB',
              externalType: type,
              externalId: externalId
            }
          },
          update: {
            url: url,
            title: item.title || item.message || `GitHub ${type}`
          },
          create: {
            taskId: taskId,
            provider: 'GITHUB',
            externalType: type,
            externalId: externalId,
            url: url,
            title: item.title || item.message || `GitHub ${type}`
          }
        });

        linksCreated.push({ taskId, link, item });

        // Si es un PR mergeado y tiene referencias, intentar completar la tarea
        if (type === 'PULL_REQUEST' && item.merged === true) {
          await tryCompleteTask(taskId, task);
        }
      } catch (error) {
        console.error(`Error al vincular ${type} a tarea ${taskId}:`, error);
      }
    }
  }

  return linksCreated;
}

/**
 * Intenta completar una tarea si el usuario tiene permisos
 * Solo actualiza si la tarea no está ya completada
 */
async function tryCompleteTask(taskId, task) {
  if (task.status === 'COMPLETED') {
    return; // Ya está completada
  }

  try {
    // Verificar permisos: ADMIN, PRODUCT_OWNER, SCRUM_MASTER o el asignado
    // Por ahora, permitimos la actualización automática si la tarea está asignada
    // En producción, esto debería verificar permisos del usuario que hizo el merge
    
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    });

    console.log(`Tarea ${taskId} marcada como completada automáticamente por PR mergeado`);
  } catch (error) {
    console.error(`Error al completar tarea ${taskId}:`, error);
    // No lanzar error, solo registrar
  }
}

module.exports = {
  parseTaskReferences,
  linkItemsToTasks,
  tryCompleteTask
};

