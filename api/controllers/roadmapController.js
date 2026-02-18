const { prisma } = require('../config/database');
const { success, error } = require('../utils/responseHelper');

class RoadmapController {
  /**
   * Obtener datos del roadmap de un proyecto
   * GET /api/scrum/projects/:projectId/roadmap
   */
  static async getRoadmap(req, res) {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      console.log('🔍 [getRoadmap] Obteniendo roadmap para proyecto:', projectId);

      // Obtener épicas con sus historias y fechas estimadas
      const epics = await prisma.epic.findMany({
        where: { projectId, status: { not: 'CANCELLED' } },
        include: {
          userStories: {
            where: { status: { not: 'CANCELLED' } },
            include: {
              tasks: {
                where: { status: { not: 'CANCELLED' } },
                select: {
                  id: true,
                  startDate: true,
                  dueDate: true,
                  status: true,
                },
              },
              sprint: {
                select: {
                  id: true,
                  name: true,
                  startDate: true,
                  endDate: true,
                },
              },
            },
          },
        },
        orderBy: { priority: 'desc' },
      });

      // Calcular fechas estimadas para cada épica
      const roadmapData = epics.map((epic) => {
        const stories = epic.userStories || [];
        const allTasks = stories.flatMap((story) => story.tasks || []);
        
        // Calcular fechas mínimas y máximas
        const taskDates = allTasks
          .filter((task) => task.startDate || task.dueDate)
          .map((task) => ({
            start: task.startDate,
            end: task.dueDate || task.startDate,
          }));

        const sprintDates = stories
          .filter((story) => story.sprint)
          .map((story) => ({
            start: story.sprint.startDate,
            end: story.sprint.endDate,
          }));

        const allDates = [...taskDates, ...sprintDates];
        
        const startDates = allDates
          .map((d) => d.start)
          .filter(Boolean)
          .sort((a, b) => new Date(a) - new Date(b));
        
        const endDates = allDates
          .map((d) => d.end)
          .filter(Boolean)
          .sort((a, b) => new Date(b) - new Date(a));

        return {
          id: epic.id,
          title: epic.title,
          description: epic.description,
          status: epic.status,
          priority: epic.priority,
          estimatedStart: startDates[0] || null,
          estimatedEnd: endDates[0] || null,
          storyCount: stories.length,
          completedStories: stories.filter((s) => s.status === 'COMPLETED').length,
        };
      });

      return success(res, { roadmap: roadmapData }, 'Roadmap obtenido exitosamente');
    } catch (err) {
      console.error('❌ Error en getRoadmap:', err);
      console.error('Stack:', err.stack);
      console.error('ProjectId:', req.params.projectId);
      return error(res, err.message || 'Error al obtener roadmap', 500);
    }
  }

  /**
   * Obtener datos para diagrama de Gantt
   * GET /api/scrum/projects/:projectId/gantt
   */
  static async getGanttData(req, res) {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const sprintId = req.query.sprintId ? parseInt(req.query.sprintId, 10) : null;
      console.log('🔍 [getGanttData] Obteniendo datos de Gantt para proyecto:', projectId, 'sprint:', sprintId);

      const where = {
        userStory: {
          epic: { projectId },
        },
        status: { not: 'CANCELLED' },
      };

      if (sprintId) {
        where.sprintId = sprintId;
      }

      // Obtener tareas con sus dependencias
      const tasks = await prisma.task.findMany({
        where,
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          sprint: {
            select: {
              id: true,
              name: true,
              startDate: true,
              endDate: true,
            },
          },
          userStory: {
            select: {
              id: true,
              title: true,
              epic: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
          dependencies: {
            include: {
              dependsOn: {
                select: {
                  id: true,
                  title: true,
                  dueDate: true,
                  status: true,
                },
              },
            },
          },
        },
        orderBy: [
          { createdAt: 'asc' },
        ],
      });

      // Obtener sprints para el timeline
      const sprints = await prisma.sprint.findMany({
        where: {
          projectId,
          status: { not: 'CANCELLED' },
        },
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          status: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      return success(
        res,
        {
          tasks: tasks.map((task) => ({
            id: task.id,
            title: task.title,
            startDate: task.startDate,
            dueDate: task.dueDate,
            status: task.status,
            priority: task.priority,
            assignee: task.assignee,
            sprint: task.sprint,
            userStory: task.userStory,
            dependencies: (task.dependencies || []).map((dep) => ({
              id: dep.id,
              dependsOnId: dep.dependsOnId,
              type: dep.type,
              lagDays: dep.lagDays,
              dependsOn: dep.dependsOn,
            })),
          })),
          sprints,
        },
        'Datos de Gantt obtenidos exitosamente'
      );
    } catch (err) {
      console.error('Error en getGanttData:', err);
      console.error('Stack:', err.stack);
      return error(res, err.message || 'Error al obtener datos de Gantt', 500);
    }
  }

  /**
   * Calcular critical path
   * GET /api/scrum/projects/:projectId/critical-path
   */
  static async getCriticalPath(req, res) {
    try {
      const projectId = parseInt(req.params.projectId, 10);

      // Obtener todas las tareas con dependencias
      const tasks = await prisma.task.findMany({
        where: {
          userStory: {
            epic: { projectId },
          },
          status: { not: 'CANCELLED' },
        },
        include: {
          dependencies: {
            include: {
              dependsOn: true,
            },
          },
        },
      });

      // Construir grafo de dependencias
      const taskMap = new Map();
      tasks.forEach((task) => {
        // Extraer IDs de dependencias de los objetos TaskDependency
        const dependencyIds = (task.dependencies || []).map((dep) => {
          // dep puede ser un objeto TaskDependency con dependsOnId o directamente el ID
          return dep.dependsOnId || dep.id || dep;
        });
        
        taskMap.set(task.id, {
          id: task.id,
          title: task.title,
          startDate: task.startDate,
          dueDate: task.dueDate,
          estimatedHours: task.estimatedHours || 0,
          dependencies: dependencyIds,
          earlyStart: null,
          earlyFinish: null,
          lateStart: null,
          lateFinish: null,
          slack: null,
        });
      });

      // Forward pass - calcular early start/finish
      const calculateEarlyDates = (taskId, visited = new Set()) => {
        if (visited.has(taskId)) return;
        visited.add(taskId);

        const task = taskMap.get(taskId);
        if (!task) return;

        let maxEarlyFinish = 0;
        task.dependencies.forEach((depId) => {
          calculateEarlyDates(depId, visited);
          const depTask = taskMap.get(depId);
          if (depTask && depTask.earlyFinish > maxEarlyFinish) {
            maxEarlyFinish = depTask.earlyFinish;
          }
        });

        const startDate = task.startDate ? new Date(task.startDate) : null;
        task.earlyStart = maxEarlyFinish || (startDate ? startDate.getTime() : Date.now());
        task.earlyFinish = task.earlyStart + (task.estimatedHours * 60 * 60 * 1000); // Convertir horas a ms
      };

      // Backward pass - calcular late start/finish
      const calculateLateDates = (taskId, projectEndTime, visited = new Set()) => {
        if (visited.has(taskId)) return;
        visited.add(taskId);

        const task = taskMap.get(taskId);
        if (!task) return;

        // Encontrar tareas que dependen de esta
        const dependents = Array.from(taskMap.values()).filter((t) =>
          t.dependencies.includes(taskId)
        );

        if (dependents.length === 0) {
          // Tarea final
          task.lateFinish = projectEndTime || task.earlyFinish;
          task.lateStart = task.lateFinish - (task.estimatedHours * 60 * 60 * 1000);
        } else {
          let minLateStart = Infinity;
          dependents.forEach((depTask) => {
            calculateLateDates(depTask.id, projectEndTime, visited);
            if (depTask.lateStart < minLateStart) {
              minLateStart = depTask.lateStart;
            }
          });
          task.lateFinish = minLateStart;
          task.lateStart = task.lateFinish - (task.estimatedHours * 60 * 60 * 1000);
        }

        task.slack = task.lateStart - task.earlyStart;
      };

      // Calcular early dates para todas las tareas
      tasks.forEach((task) => {
        if (!taskMap.get(task.id).earlyStart) {
          calculateEarlyDates(task.id);
        }
      });

      // Encontrar fecha de finalización del proyecto
      const projectEndTime = Math.max(
        ...Array.from(taskMap.values()).map((t) => t.earlyFinish)
      );

      // Calcular late dates
      tasks.forEach((task) => {
        if (!taskMap.get(task.id).lateStart) {
          calculateLateDates(task.id, projectEndTime);
        }
      });

      // Identificar critical path (tareas con slack = 0)
      const criticalPath = Array.from(taskMap.values())
        .filter((task) => task.slack === 0 || Math.abs(task.slack) < 1000) // Tolerancia de 1 segundo
        .sort((a, b) => a.earlyStart - b.earlyStart);

      return success(
        res,
        {
          criticalPath: criticalPath.map((task) => ({
            id: task.id,
            title: task.title,
            earlyStart: new Date(task.earlyStart).toISOString(),
            earlyFinish: new Date(task.earlyFinish).toISOString(),
            slack: task.slack,
          })),
          totalDuration: projectEndTime - Math.min(...Array.from(taskMap.values()).map((t) => t.earlyStart)),
        },
        'Critical path calculado exitosamente'
      );
    } catch (err) {
      console.error('Error en getCriticalPath:', err);
      return error(res, err.message || 'Error al calcular critical path', 500);
    }
  }

  /**
   * Obtener dependencias de una tarea
   * GET /api/scrum/tasks/:id/dependencies
   */
  static async getTaskDependencies(req, res) {
    try {
      const taskId = parseInt(req.params.id, 10);

      const dependencies = await prisma.taskDependency.findMany({
        where: { taskId },
        include: {
          dependsOn: {
            select: {
              id: true,
              title: true,
              status: true,
              dueDate: true,
              assignee: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      return success(res, { dependencies }, 'Dependencias obtenidas exitosamente');
    } catch (err) {
      console.error('Error en getTaskDependencies:', err);
      return error(res, err.message || 'Error al obtener dependencias', 500);
    }
  }

  /**
   * Crear dependencia entre tareas
   * POST /api/scrum/tasks/:id/dependencies
   */
  static async createDependency(req, res) {
    try {
      const taskId = parseInt(req.params.id, 10);
      const { dependsOnId, type = 'FINISH_TO_START', lagDays = 0 } = req.body;

      if (!dependsOnId) {
        return error(res, 'dependsOnId es requerido', 400);
      }

      // Validar que no sea dependencia circular
      const wouldCreateCycle = await this.wouldCreateCycle(taskId, parseInt(dependsOnId, 10));
      if (wouldCreateCycle) {
        return error(res, 'No se puede crear dependencia circular', 400);
      }

      const dependency = await prisma.taskDependency.create({
        data: {
          taskId,
          dependsOnId: parseInt(dependsOnId, 10),
          type,
          lagDays: parseInt(lagDays, 10) || 0,
        },
        include: {
          dependsOn: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
      });

      return success(res, { dependency }, 'Dependencia creada exitosamente');
    } catch (err) {
      console.error('Error en createDependency:', err);
      if (err.code === 'P2002') {
        return error(res, 'Esta dependencia ya existe', 400);
      }
      return error(res, err.message || 'Error al crear dependencia', 500);
    }
  }

  /**
   * Eliminar dependencia
   * DELETE /api/scrum/tasks/:id/dependencies/:depId
   */
  static async deleteDependency(req, res) {
    try {
      const depId = parseInt(req.params.depId, 10);

      await prisma.taskDependency.delete({
        where: { id: depId },
      });

      return success(res, null, 'Dependencia eliminada exitosamente');
    } catch (err) {
      console.error('Error en deleteDependency:', err);
      return error(res, err.message || 'Error al eliminar dependencia', 500);
    }
  }

  /**
   * Helper: Verificar si crear una dependencia causaría un ciclo
   */
  static async wouldCreateCycle(taskId, dependsOnId) {
    // Si la tarea de la que depende ya depende de esta tarea (directa o indirectamente)
    const visited = new Set();
    const checkCycle = async (currentTaskId, targetTaskId) => {
      if (currentTaskId === targetTaskId) return true;
      if (visited.has(currentTaskId)) return false;
      visited.add(currentTaskId);

      const dependencies = await prisma.taskDependency.findMany({
        where: { taskId: currentTaskId },
        select: { dependsOnId: true },
      });

      for (const dep of dependencies) {
        if (await checkCycle(dep.dependsOnId, targetTaskId)) {
          return true;
        }
      }

      return false;
    };

    return await checkCycle(dependsOnId, taskId);
  }
}

module.exports = RoadmapController;

