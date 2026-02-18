const { prisma } = require('../config/database');
const ResponseHelper = require('../utils/responseHelper');
const PDFDocument = require('pdfkit');
const { getOrganizationFilter } = require('../middleware/tenant');

class ScrumController {
  // ===== PROYECTOS =====

  /**
   * Obtener todos los proyectos con filtros
   */
  static async getProjects(req, res) {
    try {
      const rawUserId = req.user?.id;
      if (rawUserId == null || rawUserId === '') {
        return ResponseHelper.error(res, 'No autenticado', 401);
      }
      const userId = parseInt(rawUserId, 10);
      if (Number.isNaN(userId)) {
        return ResponseHelper.error(res, 'Usuario inválido', 401);
      }

      const globalRole = req.user?.globalRole || 'USER';
      const organizationId = req.user?.organizationId;

      const {
        page = 1,
        limit = 20,
        search,
        status,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const skip = (page - 1) * limit;

      // Construir where según rol global y tenant
      const where = {
        deletedAt: null,
        ...getOrganizationFilter(organizationId, globalRole) // Filtro de organización
      };

      // SUPER_ADMIN ve todos los proyectos de todas las organizaciones
      // ADMIN y MANAGER ven todos los proyectos de su organización (excepto eliminados)
      // USER solo ve proyectos donde es miembro Y de su organización
      if (globalRole !== 'SUPER_ADMIN' && globalRole !== 'ADMIN' && globalRole !== 'MANAGER') {
        if (!where.AND) where.AND = [];
        where.AND.push({
          OR: [
            { createdById: userId },
            {
              members: {
                some: {
                  userId: userId,
                  leftAt: null
                }
              }
            }
          ]
        });
      }
      if (search) {
        where.AND.push({
          OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
          ]
        });
      }
      if (status) {
        where.status = status;
      }

      // Obtener proyectos con paginación
      const [projects, total] = await Promise.all([
        prisma.project.findMany({
          where,
          skip: parseInt(skip),
          take: parseInt(limit),
          include: {
            epics: {
              select: {
                id: true,
                title: true,
                status: true,
                priority: true
              }
            },
            sprints: {
              select: {
                id: true,
                name: true,
                status: true,
                startDate: true,
                endDate: true
              },
              orderBy: { createdAt: 'desc' }
            },
            members: {
              where: {
                leftAt: null  // Solo miembros activos
              },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            },
            _count: {
              select: {
                epics: true,
                sprints: true,
                members: {
                  where: {
                    leftAt: null  // Contar solo miembros activos
                  }
                }
              }
            }
          },
          orderBy: { [sortBy]: sortOrder }
        }),
        prisma.project.count({ where })
      ]);

      return ResponseHelper.success(res, {
        projects,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }, 'Proyectos obtenidos exitosamente');

    } catch (error) {
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }

  /**
   * Obtener todos los proyectos sin filtros (incluyendo eliminados)
   */
  static async getAllProjects(req, res) {
    try {
      // Obtener todos los proyectos sin filtros de usuario ni deletedAt
      const projects = await prisma.project.findMany({
        include: {
          epics: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true
            }
          },
          sprints: {
            select: {
              id: true,
              name: true,
              status: true,
              startDate: true,
              endDate: true
            },
            orderBy: { createdAt: 'desc' }
          },
          members: {
            where: {
              leftAt: null  // Solo miembros activos
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          },
          _count: {
            select: {
              epics: true,
              sprints: true,
              members: {
                where: {
                  leftAt: null  // Contar solo miembros activos
                }
              }
            }
          }
        },
        orderBy: { id: 'desc' }  // Ordenar por ID descendente (más recientes primero)
      });

      return ResponseHelper.success(res, {
        projects,
        total: projects.length
      }, 'Todos los proyectos obtenidos exitosamente');

    } catch (error) {
      console.error('Error en getAllProjects:', error);
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }

  /**
   * Obtener un proyecto por ID
   */
  static async getProjectById(req, res) {
    try {
      const { id } = req.params;
      const projectId = parseInt(id);


      if (isNaN(projectId)) {
        return ResponseHelper.error(res, 'ID de proyecto inválido', 400);
      }

      // Query optimizada con select explícito para reducir datos transferidos
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          startDate: true,
          endDate: true,
          createdAt: true,
          updatedAt: true,
          epics: {
            select: {
              id: true,
              title: true,
              description: true,
              status: true,
              priority: true,
              businessValue: true,
              createdAt: true,
              updatedAt: true,
              userStories: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                  storyPoints: true,
                  status: true,
                  priority: true,
                  createdAt: true,
                  tasks: {
                    select: {
                      id: true,
                      title: true,
                      description: true,
                      type: true,
                      status: true,
                      priority: true,
                      estimatedHours: true,
                      actualHours: true,
                      assignee: {
                        select: {
                          id: true,
                          name: true,
                          email: true
                        }
                      }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 10 // Limitar tareas por user story
                  }
                },
                orderBy: { createdAt: 'desc' },
                take: 20 // Limitar user stories por epic
              }
            },
            orderBy: { createdAt: 'desc' }
          },
          sprints: {
            select: {
              id: true,
              name: true,
              description: true,
              status: true,
              startDate: true,
              endDate: true,
              goal: true,
              velocity: true,
              createdAt: true,
              userStories: {
                select: {
                  id: true,
                  title: true,
                  status: true,
                  storyPoints: true
                },
                take: 50 // Limitar user stories en sprint
              },
              members: {
                select: {
                  id: true,
                  capacity: true,
                  availability: true,
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true
                    }
                  }
                },
                take: 20 // Limitar miembros
              },
              planning: {
                select: {
                  id: true,
                  plannedStories: true,
                  plannedPoints: true,
                  actualStories: true,
                  actualPoints: true
                }
              },
              retrospective: {
                select: {
                  id: true,
                  whatWentWell: true,
                  whatWentWrong: true,
                  teamMood: true
                }
              },
              review: {
                select: {
                  id: true,
                  completedStories: true,
                  incompleteStories: true
                }
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 20 // Limitar sprints cargados
          },
          members: {
            where: {
              leftAt: null  // Solo miembros activos (no eliminados)
            },
            select: {
              id: true,
              role: true,
              joinedAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            },
            take: 100 // Limitar miembros
          },
          teams: {
            select: {
              id: true,
              name: true,
              description: true,
              teamLead: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              },
              members: {
                select: {
                  id: true,
                  role: true,
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true
                    }
                  }
                },
                take: 50 // Limitar miembros por team
              }
            },
            take: 20 // Limitar teams
          },
          _count: {
            select: {
              epics: true,
              sprints: true,
              members: {
                where: {
                  leftAt: null  // Contar solo miembros activos
                }
              }
            }
          }
        }
      });

      if (!project) {
        return ResponseHelper.error(res, 'Proyecto no encontrado', 404);
      }

      // Verificar que el proyecto no esté eliminado
      if (project.deletedAt) {
        return ResponseHelper.error(res, 'Proyecto no encontrado', 404);
      }


      // Recopilar todas las user stories de todos los épicas
      const allUserStories = [];
      if (project.epics && project.epics.length > 0) {
        project.epics.forEach(epic => {
          if (epic.userStories && epic.userStories.length > 0) {
            epic.userStories.forEach(story => {
              allUserStories.push({
                ...story,
                epicId: epic.id,
                epic: {
                  id: epic.id,
                  title: epic.title
                }
              });
            });
          }
        });
      }

      // Agregar user stories al proyecto
      project.userStories = allUserStories;

      return ResponseHelper.success(res, { project }, 'Proyecto obtenido exitosamente');

    } catch (error) {
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }

  /**
   * Crear un nuevo proyecto
   */
  static async createProject(req, res) {
    try {
      
      const {
        name,
        description,
        status = 'PLANNING',
        startDate,
        endDate
      } = req.body;

      // Obtener el ID del usuario autenticado y su organización
      const createdById = req.user?.id;
      const organizationId = req.user?.organizationId;
      
      if (!createdById) {
        return ResponseHelper.error(res, 'Usuario no autenticado', 401);
      }

      if (!organizationId) {
        return ResponseHelper.error(res, 'Usuario sin organización asignada', 400);
      }

      const project = await prisma.project.create({
        data: {
          name,
          description,
          status,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          createdById: createdById,
          organizationId: organizationId // Asignar organización del usuario
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          _count: {
            select: {
              epics: true,
              sprints: true,
              members: true
            }
          }
        }
      });

      return ResponseHelper.success(res, { project }, 'Proyecto creado exitosamente', 201);

    } catch (error) {
      console.error('Error al crear proyecto:', error);
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }

  /**
   * Actualizar un proyecto
   */
  static async updateProject(req, res) {
    try {
      const { id } = req.params;
      const projectId = parseInt(id);
      const updateData = req.body;

      // Sanitizar strings vacíos a null
      if (updateData.endDate === '') {
        updateData.endDate = null;
      }
      if (updateData.startDate === '') {
        updateData.startDate = null;
      }


      if (isNaN(projectId)) {
        return ResponseHelper.error(res, 'ID de proyecto inválido', 400);
      }

      // Verificar que el proyecto existe
      const existingProject = await prisma.project.findUnique({
        where: { id: projectId }
      });

      if (!existingProject) {
        return ResponseHelper.error(res, 'Proyecto no encontrado', 404);
      }

      // Preparar datos de actualización
      const cleanUpdateData = {};
      if (updateData.name) cleanUpdateData.name = updateData.name;
      if (updateData.description !== undefined) cleanUpdateData.description = updateData.description;
      if (updateData.status) cleanUpdateData.status = updateData.status;
      
      // Manejar startDate: puede ser null (para limpiar), una fecha, o undefined (no cambiar)
      if (updateData.startDate !== undefined) {
        if (updateData.startDate === null || updateData.startDate === '') {
          cleanUpdateData.startDate = null;
        } else {
          const startDateObj = new Date(updateData.startDate);
          if (isNaN(startDateObj.getTime())) {
            return ResponseHelper.error(res, 'Fecha de inicio inválida', 400);
          }
          cleanUpdateData.startDate = startDateObj;
        }
      }
      
      // Manejar endDate: puede ser null (para limpiar), una fecha, o undefined (no cambiar)
      if (updateData.endDate !== undefined) {
        if (updateData.endDate === null || updateData.endDate === '') {
          cleanUpdateData.endDate = null;
        } else {
          const endDateObj = new Date(updateData.endDate);
          if (isNaN(endDateObj.getTime())) {
            return ResponseHelper.error(res, 'Fecha de fin inválida', 400);
          }
          cleanUpdateData.endDate = endDateObj;
        }
      }
      

      // Verificar que hay al menos un campo para actualizar
      if (Object.keys(cleanUpdateData).length === 0) {
        return ResponseHelper.error(res, 'No se proporcionaron datos para actualizar', 400);
      }

      // Actualizar el proyecto usando updateMany para evitar el error de RETURNING clause
      // updateMany no retorna datos, así que evitamos el problema de funciones no-inmutables
      const updateResult = await prisma.project.updateMany({
        where: { id: projectId },
        data: cleanUpdateData
      });

      if (updateResult.count === 0) {
        return ResponseHelper.error(res, 'No se pudo actualizar el proyecto', 404);
      }

      // Obtener el proyecto actualizado con los conteos
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          _count: {
            select: {
              epics: true,
              sprints: true,
              members: true
            }
          }
        }
      });

      if (!project) {
        return ResponseHelper.error(res, 'Proyecto no encontrado después de la actualización', 404);
      }

      return ResponseHelper.success(res, { project }, 'Proyecto actualizado exitosamente');

    } catch (error) {
      // Proporcionar más detalles del error en desarrollo
      const errorMessage = process.env.NODE_ENV === 'development' 
        ? error.message || 'Error interno del servidor'
        : 'Error interno del servidor';
      return ResponseHelper.error(res, errorMessage, 500);
    }
  }

  /**
   * Eliminar un proyecto (soft delete - mover a papelera)
   */
  static async deleteProject(req, res) {
    try {
      const { id } = req.params;
      const projectId = parseInt(id);
      const userId = req.user?.id;

      if (isNaN(projectId)) {
        return ResponseHelper.error(res, 'ID de proyecto inválido', 400);
      }

      if (!userId) {
        return ResponseHelper.error(res, 'Usuario no autenticado', 401);
      }

      // Verificar que el proyecto existe y no está eliminado
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });

      if (!project) {
        return ResponseHelper.error(res, 'Proyecto no encontrado', 404);
      }

      if (project.deletedAt) {
        return ResponseHelper.error(res, 'El proyecto ya está en la papelera', 400);
      }

      // Soft delete - marcar como eliminado
      await prisma.project.update({
        where: { id: projectId },
        data: {
          deletedAt: new Date(),
          deletedBy: userId
        }
      });

      return ResponseHelper.success(res, null, 'Proyecto eliminado exitosamente.');

    } catch (error) {
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }

  /**
   * Obtener todas las tareas de un proyecto
   */
  static async getProjectTasks(req, res) {
    try {
      const { projectId } = req.params;
      const { status, priority, type } = req.query;
      const id = parseInt(projectId);

      if (isNaN(id)) {
        return ResponseHelper.error(res, 'ID de proyecto inválido', 400);
      }


      // Construir filtros
      const where = {
        userStory: {
          epic: {
            projectId: id
          }
        }
      };

      if (status) {
        where.status = status;
      }
      if (priority) {
        where.priority = priority;
      }
      if (type) {
        where.type = type;
      }

      // Obtener todas las tareas del proyecto a través de sus épicas y user stories
      const tasks = await prisma.task.findMany({
        where,
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          },
          userStory: {
            select: {
              id: true,
              title: true,
              epic: {
                select: {
                  id: true,
                  title: true
                }
              },
              sprint: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        },
        orderBy: [
          { status: 'asc' },
          { priority: 'desc' },
          { createdAt: 'desc' }
        ]
      });


      return ResponseHelper.success(res, { tasks }, 'Tareas obtenidas exitosamente');

    } catch (error) {
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }

  // ===== MIEMBROS DE PROYECTO =====

  /**
   * Obtener miembros de un proyecto
   */
  static async getProjectMembers(req, res) {
    try {
      const { projectId } = req.params;
      const id = parseInt(projectId);

      if (isNaN(id)) {
        return ResponseHelper.error(res, 'ID de proyecto inválido', 400);
      }

      // Verificar que el proyecto existe
      const project = await prisma.project.findUnique({
        where: { id }
      });

      if (!project) {
        return ResponseHelper.error(res, 'Proyecto no encontrado', 404);
      }

      const members = await prisma.projectMember.findMany({
        where: { 
          projectId: id,
          leftAt: null // Solo miembros activos
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              username: true,
              isActive: true
            }
          }
        },
        orderBy: { joinedAt: 'asc' }
      });

      return ResponseHelper.success(res, { members }, 'Miembros obtenidos exitosamente');

    } catch (error) {
      console.error('Error al obtener miembros del proyecto:', error);
      return ResponseHelper.error(res, `Error interno del servidor: ${error.message}`, 500);
    }
  }

  /**
   * Agregar un miembro a un proyecto
   */
  static async addProjectMember(req, res) {
    try {
      const { projectId } = req.params;
      const { userId, role = 'DEVELOPER', teamId } = req.body;
      const id = parseInt(projectId);
      const uid = parseInt(userId);


      if (isNaN(id) || isNaN(uid)) {
        return ResponseHelper.error(res, 'ID de proyecto o usuario inválido', 400);
      }

      // Verificar que el proyecto existe
      const project = await prisma.project.findUnique({
        where: { id }
      });

      if (!project) {
        return ResponseHelper.error(res, 'Proyecto no encontrado', 404);
      }

      // Verificar que el usuario existe
      const user = await prisma.user.findUnique({
        where: { id: uid }
      });

      if (!user) {
        return ResponseHelper.error(res, 'Usuario no encontrado', 404);
      }

      // Verificar si el usuario ya es miembro activo
      const activeMember = await prisma.projectMember.findFirst({
        where: {
          projectId: id,
          userId: uid,
          leftAt: null
        }
      });

      if (activeMember) {
        return ResponseHelper.error(res, 'El usuario ya es miembro del proyecto', 400);
      }

      // Verificar si existe un registro previo eliminado (reactivar)
      const deletedMember = await prisma.projectMember.findFirst({
        where: {
          projectId: id,
          userId: uid,
          leftAt: { not: null }
        }
      });

      let member;

      if (deletedMember) {
        // Reactivar el miembro eliminado
        // Primero actualizar sin include para evitar el error de PostgreSQL
        await prisma.projectMember.update({
          where: { id: deletedMember.id },
          data: {
            role,
            teamId: teamId ? parseInt(teamId) : null,
            leftAt: null,  // Reactivar
            joinedAt: new Date()  // Nueva fecha de ingreso
          },
          select: {
            id: true
          }
        });
        // Luego obtener el miembro completo con las relaciones
        member = await prisma.projectMember.findUnique({
          where: { id: deletedMember.id },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                username: true,
                isActive: true
              }
            }
          }
        });
      } else {
        // Crear nuevo miembro
        member = await prisma.projectMember.create({
          data: {
            projectId: id,
            userId: uid,
            role,
            teamId: teamId ? parseInt(teamId) : null
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                username: true,
                isActive: true
              }
            }
          }
        });
      }

      return ResponseHelper.success(res, { member }, 'Miembro agregado exitosamente', 201);

    } catch (error) {
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }

  /**
   * Actualizar rol de un miembro del proyecto
   */
  static async updateProjectMember(req, res) {
    try {
      const { projectId, memberId } = req.params;
      const { role } = req.body;
      const pid = parseInt(projectId);
      const mid = parseInt(memberId);

      if (isNaN(pid) || isNaN(mid)) {
        return ResponseHelper.error(res, 'ID de proyecto o miembro inválido', 400);
      }

      // Verificar que el miembro existe
      const existingMember = await prisma.projectMember.findFirst({
        where: {
          id: mid,
          projectId: pid
        }
      });

      if (!existingMember) {
        return ResponseHelper.error(res, 'Miembro no encontrado', 404);
      }

      // Actualizar rol
      const member = await prisma.projectMember.update({
        where: { id: mid },
        data: { role },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              position: {
                select: {
                  id: true,
                  name: true,
                  code: true
                }
              }
            }
          }
        }
      });

      return ResponseHelper.success(res, { member }, 'Rol actualizado exitosamente');

    } catch (error) {
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }

  /**
   * Eliminar un miembro del proyecto
   */
  static async removeProjectMember(req, res) {
    try {
      const { projectId, memberId } = req.params;
      const pid = parseInt(projectId);
      const mid = parseInt(memberId);


      if (isNaN(pid) || isNaN(mid)) {
        return ResponseHelper.error(res, 'ID de proyecto o miembro inválido', 400);
      }

      // Verificar que el miembro existe
      const existingMember = await prisma.projectMember.findFirst({
        where: {
          id: mid,
          projectId: pid
        }
      });


      if (!existingMember) {
        return ResponseHelper.error(res, 'Miembro no encontrado', 404);
      }

      // Marcar como removido (soft delete)
      // Usar update sin include para evitar el error de PostgreSQL con funciones no inmutables
      await prisma.projectMember.update({
        where: { id: mid },
        data: { 
          leftAt: new Date() 
        },
        select: {
          id: true
        }
      });


      return ResponseHelper.success(res, null, 'Miembro eliminado exitosamente');

    } catch (error) {
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }

  // ===== SPRINTS =====

  /**
   * Obtener todos los sprints
   */
  static async getSprints(req, res) {
    try {
      const { status, includeCompleted = false, page = 1, limit = 20 } = req.query;

      const where = {};
      if (status) {
        where.status = status;
      } else if (!includeCompleted) {
        where.status = { not: 'COMPLETED' };
      }

      const [sprints, total] = await Promise.all([
        prisma.sprint.findMany({
          where,
          include: {
            project: {
              select: {
                id: true,
                name: true
              }
            },
            userStories: {
              include: {
                tasks: {
                  include: {
                    assignee: {
                      select: {
                        id: true,
                        name: true,
                        email: true
                      }
                    }
                  }
                }
              }
            },
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            },
            _count: {
              select: {
                userStories: true,
                tasks: true,
                members: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: (parseInt(page) - 1) * parseInt(limit),
          take: parseInt(limit)
        }),
        prisma.sprint.count({ where })
      ]);

      return ResponseHelper.success(res, {
        sprints,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }, 'Sprints obtenidos exitosamente');

    } catch (error) {
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }

  /**
   * Obtener sprints de un proyecto
   */
  static async getProjectSprints(req, res) {
    try {
      const { projectId } = req.params;
      const { status, includeCompleted = false } = req.query;

      const where = {
        projectId: parseInt(projectId)
      };

      if (status) {
        where.status = status;
      } else if (!includeCompleted) {
        where.status = { not: 'COMPLETED' };
      }

      const sprints = await prisma.sprint.findMany({
        where,
        include: {
          userStories: {
            include: {
              tasks: {
                include: {
                  assignee: {
                    select: {
                      id: true,
                      name: true,
                      email: true
                    }
                  }
                }
              }
            }
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          },
          planning: true,
          retrospective: true,
          review: true,
          _count: {
            select: {
              userStories: true,
              tasks: true,
              members: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return ResponseHelper.success(res, { sprints }, 'Sprints obtenidos exitosamente');

    } catch (error) {
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }

  /**
   * Crear un nuevo sprint
   */
  static async createSprint(req, res) {
    try {
      const {
        name,
        description,
        projectId,
        startDate,
        endDate,
        goal,
        velocity
      } = req.body;

      // Verificar que el proyecto existe
      const project = await prisma.project.findUnique({
        where: { id: parseInt(projectId) }
      });

      if (!project) {
        return ResponseHelper.error(res, 'Proyecto no encontrado', 404);
      }

      const sprint = await prisma.sprint.create({
        data: {
          name,
          description,
          projectId: parseInt(projectId),
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          goal,
          velocity: velocity ? parseInt(velocity) : null
        },
        include: {
          project: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: {
              userStories: true,
              tasks: true,
              members: true
            }
          }
        }
      });

      return ResponseHelper.success(res, { sprint }, 'Sprint creado exitosamente', 201);

    } catch (error) {
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }

  /**
   * Actualizar un sprint
   */
  static async updateSprint(req, res) {
    try {
      const { id } = req.params;
      const sprintId = parseInt(id);
      const updateData = req.body;

      if (isNaN(sprintId)) {
        return ResponseHelper.error(res, 'ID de sprint inválido', 400);
      }

      // Verificar que el sprint existe
      const existingSprint = await prisma.sprint.findUnique({
        where: { id: sprintId }
      });

      if (!existingSprint) {
        return ResponseHelper.error(res, 'Sprint no encontrado', 404);
      }

      // Preparar datos de actualización
      const cleanUpdateData = {};
      if (updateData.name !== undefined) cleanUpdateData.name = updateData.name;
      if (updateData.description !== undefined) cleanUpdateData.description = updateData.description;
      if (updateData.status !== undefined) cleanUpdateData.status = updateData.status;
      if (updateData.startDate !== undefined) {
        cleanUpdateData.startDate = updateData.startDate ? new Date(updateData.startDate) : null;
      }
      if (updateData.endDate !== undefined) {
        cleanUpdateData.endDate = updateData.endDate ? new Date(updateData.endDate) : null;
      }
      if (updateData.goal !== undefined) cleanUpdateData.goal = updateData.goal;
      if (updateData.velocity !== undefined) cleanUpdateData.velocity = updateData.velocity ? parseInt(updateData.velocity) : null;

      // Actualizar el sprint usando updateMany para evitar problemas con RETURNING clause
      const updateResult = await prisma.sprint.updateMany({
        where: { id: sprintId },
        data: cleanUpdateData
      });

      if (updateResult.count === 0) {
        return ResponseHelper.error(res, 'Sprint no encontrado o sin cambios', 404);
      }

      // Obtener el sprint actualizado con todos los datos relacionados
      const sprint = await prisma.sprint.findUnique({
        where: { id: sprintId },
        include: {
          project: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: {
              userStories: true,
              tasks: true,
              members: true
            }
          }
        }
      });

      return ResponseHelper.success(res, { sprint }, 'Sprint actualizado exitosamente');

    } catch (error) {
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }

  // ===== ÉPICAS =====

  /**
   * Obtener épicas de un proyecto
   */
  static async getProjectEpics(req, res) {
    try {
      const { projectId } = req.params;
      const { status, priority } = req.query;

      const where = {
        projectId: parseInt(projectId)
      };

      if (status) where.status = status;
      if (priority) where.priority = priority;

      const epics = await prisma.epic.findMany({
        where,
        include: {
          userStories: {
            include: {
              tasks: {
                include: {
                  assignee: {
                    select: {
                      id: true,
                      name: true,
                      email: true
                    }
                  }
                }
              }
            }
          },
          _count: {
            select: {
              userStories: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return ResponseHelper.success(res, { epics }, 'Épicas obtenidas exitosamente');

    } catch (error) {
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }

  /**
   * Obtener una épica por ID
   */
  static async getEpicById(req, res) {
    try {
      const { id } = req.params;
      const epicId = parseInt(id);

      if (isNaN(epicId)) {
        return ResponseHelper.error(res, 'ID de épica inválido', 400);
      }

      const epic = await prisma.epic.findUnique({
        where: { id: epicId },
        include: {
          project: {
            select: {
              id: true,
              name: true
            }
          },
          userStories: {
            include: {
              sprint: {
                select: {
                  id: true,
                  name: true,
                  status: true,
                  startDate: true,
                  endDate: true
                }
              },
              tasks: {
                include: {
                  assignee: {
                    select: {
                      id: true,
                      name: true,
                      email: true
                    }
                  }
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          },
          _count: {
            select: {
              userStories: true
            }
          }
        }
      });

      if (!epic) {
        return ResponseHelper.error(res, 'Épica no encontrada', 404);
      }

      // Agrupar user stories por sprint para mostrar los sprints asociados
      const sprintsMap = new Map();
      epic.userStories.forEach(story => {
        if (story.sprint) {
          const sprintId = story.sprint.id;
          if (!sprintsMap.has(sprintId)) {
            sprintsMap.set(sprintId, {
              ...story.sprint,
              userStories: [],
              totalStoryPoints: 0
            });
          }
          sprintsMap.get(sprintId).userStories.push(story);
          sprintsMap.get(sprintId).totalStoryPoints += story.storyPoints || 0;
        }
      });

      const associatedSprints = Array.from(sprintsMap.values());

      return ResponseHelper.success(res, { 
        epic: {
          ...epic,
          associatedSprints
        }
      }, 'Épica obtenida exitosamente');

    } catch (error) {
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }

  /**
   * Crear una nueva épica
   */
  static async createEpic(req, res) {
    try {
      const {
        title,
        description,
        projectId,
        status = 'DRAFT',
        priority = 'MEDIUM',
        businessValue
      } = req.body;

      // Verificar que el proyecto existe
      const project = await prisma.project.findUnique({
        where: { id: parseInt(projectId) }
      });

      if (!project) {
        return ResponseHelper.error(res, 'Proyecto no encontrado', 404);
      }

      const epic = await prisma.epic.create({
        data: {
          title,
          description,
          projectId: parseInt(projectId),
          status,
          priority,
          businessValue
        },
        include: {
          project: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: {
              userStories: true
            }
          }
        }
      });

      return ResponseHelper.success(res, { epic }, 'Épica creada exitosamente', 201);

    } catch (error) {
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }

  /**
   * Actualizar una épica
   */
  static async updateEpic(req, res) {
    try {
      const { id } = req.params;
      const {
        title,
        description,
        projectId,
        status,
        priority,
        businessValue
      } = req.body;

      const epicId = parseInt(id);

      if (isNaN(epicId)) {
        return ResponseHelper.error(res, 'ID de épica inválido', 400);
      }

      // Verificar que la épica existe
      const existingEpic = await prisma.epic.findUnique({
        where: { id: epicId }
      });

      if (!existingEpic) {
        return ResponseHelper.error(res, 'Épica no encontrada', 404);
      }

      // Si se cambia el proyecto, verificar que existe
      if (projectId && projectId !== existingEpic.projectId) {
        const project = await prisma.project.findUnique({
          where: { id: parseInt(projectId) }
        });

        if (!project) {
          return ResponseHelper.error(res, 'Proyecto no encontrado', 404);
        }
      }

      // Construir objeto de datos solo con campos definidos
      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (projectId !== undefined) updateData.projectId = parseInt(projectId);
      if (status !== undefined) updateData.status = status;
      if (priority !== undefined) updateData.priority = priority;
      if (businessValue !== undefined) updateData.businessValue = businessValue;

      // Actualizar la épica usando updateMany para evitar problemas con RETURNING clause
      const updateResult = await prisma.epic.updateMany({
        where: { id: epicId },
        data: updateData
      });

      if (updateResult.count === 0) {
        return ResponseHelper.error(res, 'Épica no encontrada o sin cambios', 404);
      }

      // Obtener la épica actualizada con todos los datos relacionados
      const epic = await prisma.epic.findUnique({
        where: { id: epicId },
        include: {
          project: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: {
              userStories: true
            }
          }
        }
      });

      return ResponseHelper.success(res, { epic }, 'Épica actualizada exitosamente');

    } catch (error) {
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }

  /**
   * Eliminar una épica
   */
  static async deleteEpic(req, res) {
    try {
      const { id } = req.params;
      const epicId = parseInt(id);

      if (isNaN(epicId)) {
        return ResponseHelper.error(res, 'ID de épica inválido', 400);
      }

      // Verificar que la épica existe
      const epic = await prisma.epic.findUnique({
        where: { id: epicId }
      });

      if (!epic) {
        return ResponseHelper.error(res, 'Épica no encontrada', 404);
      }

      await prisma.epic.delete({
        where: { id: epicId }
      });

      return ResponseHelper.success(res, null, 'Épica eliminada exitosamente');

    } catch (error) {
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }

  // ===== HISTORIAS DE USUARIO =====

  /**
   * Obtener historias de usuario de una épica
   */
  static async getEpicUserStories(req, res) {
    try {
      const { epicId } = req.params;
      const { status, priority, sprintId } = req.query;

      const where = {
        epicId: parseInt(epicId)
      };

      if (status) where.status = status;
      if (priority) where.priority = priority;
      if (sprintId) where.sprintId = parseInt(sprintId);

      const userStories = await prisma.userStory.findMany({
        where,
        include: {
          epic: {
            select: {
              id: true,
              title: true
            }
          },
          sprint: {
            select: {
              id: true,
              name: true,
              status: true
            }
          },
          tasks: {
            include: {
              assignee: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          },
          _count: {
            select: {
              tasks: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return ResponseHelper.success(res, { userStories }, 'Historias de usuario obtenidas exitosamente');

    } catch (error) {
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }

  /**
   * Obtener una historia de usuario por ID
   */
  /**
   * Obtener todas las historias de usuario con filtros
   */
  static async getAllUserStories(req, res) {
    try {
      const { status, priority, epicId, sprintId } = req.query;

      const where = {};
      
      if (status) where.status = status;
      if (priority) where.priority = priority;
      if (epicId) where.epicId = parseInt(epicId);
      if (sprintId) where.sprintId = parseInt(sprintId);

      const userStories = await prisma.userStory.findMany({
        where,
        include: {
          epic: {
            select: {
              id: true,
              title: true,
              project: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          sprint: {
            select: {
              id: true,
              name: true,
              status: true
            }
          },
          _count: {
            select: {
              tasks: true
            }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ]
      });

      return ResponseHelper.success(
        res,
        { userStories, total: userStories.length },
        'Historias de usuario obtenidas exitosamente'
      );
    } catch (error) {
      logger.error('Error al obtener historias de usuario:', error);
      return ResponseHelper.error(res, 'Error al obtener historias de usuario', 500);
    }
  }

  /**
   * Obtener todas las historias de usuario de un proyecto
   */
  static async getProjectUserStories(req, res) {
    try {
      const { projectId } = req.params;
      const { status, priority, epicId, sprintId } = req.query;

      // Construir where clause - filtrar por proyecto a través de las épicas
      const where = {
        epic: {
          projectId: parseInt(projectId)
        }
      };

      if (status) where.status = status;
      if (priority) where.priority = priority;
      if (epicId) where.epicId = parseInt(epicId);
      if (sprintId) where.sprintId = parseInt(sprintId);

      const userStories = await prisma.userStory.findMany({
        where,
        include: {
          epic: {
            select: {
              id: true,
              title: true,
              project: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          sprint: {
            select: {
              id: true,
              name: true,
              status: true
            }
          },
          tasks: {
            include: {
              assignee: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          },
          _count: {
            select: {
              tasks: true
            }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ]
      });

      return ResponseHelper.success(
        res,
        { userStories, total: userStories.length },
        'Historias de usuario del proyecto obtenidas exitosamente'
      );
    } catch (error) {
      console.error('Error en getProjectUserStories:', error);
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }

  static async getUserStoryById(req, res) {
    try {
      const { id } = req.params;
      const userStoryId = parseInt(id);

      if (isNaN(userStoryId)) {
        return ResponseHelper.error(res, 'ID de historia de usuario inválido', 400);
      }

      const userStory = await prisma.userStory.findUnique({
        where: { id: userStoryId },
        include: {
          epic: {
            select: {
              id: true,
              title: true,
              project: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          sprint: {
            select: {
              id: true,
              name: true,
              status: true,
              startDate: true,
              endDate: true
            }
          },
          tasks: {
            include: {
              assignee: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          },
          _count: {
            select: {
              tasks: true
            }
          }
        }
      });

      if (!userStory) {
        return ResponseHelper.error(res, 'Historia de usuario no encontrada', 404);
      }

      return ResponseHelper.success(res, { userStory }, 'Historia de usuario obtenida exitosamente');

    } catch (error) {
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }

  /**
   * Crear una nueva historia de usuario
   */
  static async createUserStory(req, res) {
    try {
      const {
        title,
        description,
        acceptanceCriteria,
        epicId,
        sprintId,
        storyPoints,
        status = 'DRAFT',
        priority = 'MEDIUM'
      } = req.body;

      // Verificar que la épica existe
      const epic = await prisma.epic.findUnique({
        where: { id: parseInt(epicId) }
      });

      if (!epic) {
        return ResponseHelper.error(res, 'Épica no encontrada', 404);
      }

      // Verificar que el sprint existe si se proporciona
      if (sprintId) {
        const sprint = await prisma.sprint.findUnique({
          where: { id: parseInt(sprintId) }
        });

        if (!sprint) {
          return ResponseHelper.error(res, 'Sprint no encontrado', 404);
        }
      }

      const userStory = await prisma.userStory.create({
        data: {
          title,
          description,
          acceptanceCriteria,
          epicId: parseInt(epicId),
          sprintId: sprintId ? parseInt(sprintId) : null,
          storyPoints: storyPoints ? parseInt(storyPoints) : null,
          status,
          priority
        },
        include: {
          epic: {
            select: {
              id: true,
              title: true
            }
          },
          sprint: {
            select: {
              id: true,
              name: true,
              status: true
            }
          },
          _count: {
            select: {
              tasks: true
            }
          }
        }
      });

      return ResponseHelper.success(res, { userStory }, 'Historia de usuario creada exitosamente', 201);

    } catch (error) {
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }

  /**
   * Actualizar una historia de usuario
   */
  static async updateUserStory(req, res) {
    try {
      const { id } = req.params;
      const userStoryId = parseInt(id);

      if (isNaN(userStoryId)) {
        return ResponseHelper.error(res, 'ID de historia de usuario inválido', 400);
      }

      const {
        title,
        description,
        acceptanceCriteria,
        epicId,
        sprintId,
        storyPoints,
        status,
        priority
      } = req.body;

      // Verificar que la historia existe
      const existingUserStory = await prisma.userStory.findUnique({
        where: { id: userStoryId }
      });

      if (!existingUserStory) {
        return ResponseHelper.error(res, 'Historia de usuario no encontrada', 404);
      }

      // Verificar que la épica existe si se proporciona
      if (epicId) {
        const epic = await prisma.epic.findUnique({
          where: { id: parseInt(epicId) }
        });

        if (!epic) {
          return ResponseHelper.error(res, 'Épica no encontrada', 404);
        }
      }

      // Verificar que el sprint existe si se proporciona
      if (sprintId) {
        const sprint = await prisma.sprint.findUnique({
          where: { id: parseInt(sprintId) }
        });

        if (!sprint) {
          return ResponseHelper.error(res, 'Sprint no encontrado', 404);
        }
      }

      // Preparar datos de actualización
      const cleanUpdateData = {};
      if (title !== undefined) cleanUpdateData.title = title;
      if (description !== undefined) cleanUpdateData.description = description;
      if (acceptanceCriteria !== undefined) cleanUpdateData.acceptanceCriteria = acceptanceCriteria;
      if (epicId !== undefined) {
        cleanUpdateData.epicId = epicId ? parseInt(epicId) : null;
      }
      if (sprintId !== undefined) {
        cleanUpdateData.sprintId = sprintId ? parseInt(sprintId) : null;
      }
      if (storyPoints !== undefined) {
        cleanUpdateData.storyPoints = storyPoints ? parseInt(storyPoints) : null;
      }
      if (status !== undefined) cleanUpdateData.status = status;
      if (priority !== undefined) cleanUpdateData.priority = priority;

      // Actualizar la historia de usuario usando updateMany para evitar problemas con RETURNING clause
      const updateResult = await prisma.userStory.updateMany({
        where: { id: userStoryId },
        data: cleanUpdateData
      });

      if (updateResult.count === 0) {
        return ResponseHelper.error(res, 'Historia de usuario no encontrada o sin cambios', 404);
      }

      // Obtener la historia de usuario actualizada con todos los datos relacionados
      const userStory = await prisma.userStory.findUnique({
        where: { id: userStoryId },
        include: {
          epic: {
            select: {
              id: true,
              title: true
            }
          },
          sprint: {
            select: {
              id: true,
              name: true,
              status: true
            }
          },
          _count: {
            select: {
              tasks: true
            }
          }
        }
      });

      return ResponseHelper.success(res, { userStory }, 'Historia de usuario actualizada exitosamente');

    } catch (error) {
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }

  /**
   * Eliminar una historia de usuario
   */
  static async deleteUserStory(req, res) {
    try {
      const { id } = req.params;
      const userStoryId = parseInt(id);

      if (isNaN(userStoryId)) {
        return ResponseHelper.error(res, 'ID de historia de usuario inválido', 400);
      }

      // Verificar que la historia existe
      const userStory = await prisma.userStory.findUnique({
        where: { id: userStoryId },
        include: {
          _count: {
            select: {
              tasks: true
            }
          }
        }
      });

      if (!userStory) {
        return ResponseHelper.error(res, 'Historia de usuario no encontrada', 404);
      }

      // Eliminar la historia (las tareas se eliminarán en cascada)
      await prisma.userStory.delete({
        where: { id: userStoryId }
      });

      return ResponseHelper.success(res, null, 'Historia de usuario eliminada exitosamente');

    } catch (error) {
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }

  // ===== TAREAS =====

  /**
   * Obtener tareas de una historia de usuario
   */
  static async getUserStoryTasks(req, res) {
    try {
      const { userStoryId } = req.params;
      const { status, type, assigneeId } = req.query;

      const where = {
        userStoryId: parseInt(userStoryId)
      };

      if (status) where.status = status;
      if (type) where.type = type;
      if (assigneeId) where.assigneeId = parseInt(assigneeId);

      const tasks = await prisma.task.findMany({
        where,
        include: {
          userStory: {
            select: {
              id: true,
              title: true
            }
          },
          sprint: {
            select: {
              id: true,
              name: true,
              status: true
            }
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return ResponseHelper.success(res, { tasks }, 'Tareas obtenidas exitosamente');

    } catch (error) {
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }

  /**
   * Obtener una tarea por ID
   */
  static async getTaskById(req, res) {
    try {
      const { id } = req.params;
      const taskId = parseInt(id);

      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          assignee: {
            select: {
              id: true,
              username: true,
              name: true,
              email: true
            }
          },
          userStory: {
            include: {
              epic: {
                include: {
                  project: {
                    select: {
                      id: true,
                      name: true
                    }
                  }
                }
              },
              sprint: {
                select: {
                  id: true,
                  name: true,
                  status: true
                }
              }
            }
          },
          sprint: {
            select: {
              id: true,
              name: true,
              status: true
            }
          },
          externalLinks: {
            where: {
              provider: 'GITHUB'
            },
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      });

      if (!task) {
        return ResponseHelper.error(res, 'Tarea no encontrada', 404);
      }

      return ResponseHelper.success(res, { task }, 'Tarea obtenida exitosamente');

    } catch (error) {
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }

  /**
   * Crear una nueva tarea
   */
  static async createTask(req, res) {
    try {
      const {
        title,
        description,
        userStoryId,
        sprintId,
        type = 'DEVELOPMENT',
        status = 'TODO',
        priority = 'MEDIUM',
        estimatedHours,
        assigneeId
      } = req.body;

      // Verificar que la historia de usuario existe
      const userStory = await prisma.userStory.findUnique({
        where: { id: parseInt(userStoryId) }
      });

      if (!userStory) {
        return ResponseHelper.error(res, 'Historia de usuario no encontrada', 404);
      }

      // Verificar que el sprint existe si se proporciona
      if (sprintId) {
        const sprint = await prisma.sprint.findUnique({
          where: { id: parseInt(sprintId) }
        });

        if (!sprint) {
          return ResponseHelper.error(res, 'Sprint no encontrado', 404);
        }
      }

      // Verificar que el asignado existe si se proporciona
      if (assigneeId) {
        const assignee = await prisma.user.findUnique({
          where: { id: parseInt(assigneeId) }
        });

        if (!assignee) {
          return ResponseHelper.error(res, 'Usuario asignado no encontrado', 404);
        }
      }

      const task = await prisma.task.create({
        data: {
          title,
          description,
          userStoryId: parseInt(userStoryId),
          sprintId: sprintId ? parseInt(sprintId) : null,
          type,
          status,
          priority,
          estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
          assigneeId: assigneeId ? parseInt(assigneeId) : null
        },
        include: {
          userStory: {
            select: {
              id: true,
              title: true
            }
          },
          sprint: {
            select: {
              id: true,
              name: true,
              status: true
            }
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      return ResponseHelper.success(res, { task }, 'Tarea creada exitosamente', 201);

    } catch (error) {
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }

  /**
   * Actualizar una tarea
   */
  static async updateTask(req, res) {
    try {
      const { id } = req.params;
      const taskId = parseInt(id);
      const updateData = req.body;

      if (isNaN(taskId)) {
        return ResponseHelper.error(res, 'ID de tarea inválido', 400);
      }

      // Verificar que la tarea existe
      const existingTask = await prisma.task.findUnique({
        where: { id: taskId }
      });

      if (!existingTask) {
        return ResponseHelper.error(res, 'Tarea no encontrada', 404);
      }

      // Preparar datos de actualización
      const cleanUpdateData = {};
      if (updateData.title !== undefined) cleanUpdateData.title = updateData.title;
      if (updateData.description !== undefined) cleanUpdateData.description = updateData.description;
      if (updateData.type !== undefined) cleanUpdateData.type = updateData.type;
      if (updateData.status !== undefined) cleanUpdateData.status = updateData.status;
      if (updateData.priority !== undefined) cleanUpdateData.priority = updateData.priority;
      if (updateData.estimatedHours !== undefined) cleanUpdateData.estimatedHours = parseFloat(updateData.estimatedHours);
      if (updateData.actualHours !== undefined) cleanUpdateData.actualHours = parseFloat(updateData.actualHours);
      if (updateData.assigneeId !== undefined) {
        cleanUpdateData.assigneeId = updateData.assigneeId ? parseInt(updateData.assigneeId) : null;
      }
      if (updateData.userStoryId !== undefined) {
        cleanUpdateData.userStoryId = updateData.userStoryId ? parseInt(updateData.userStoryId) : null;
      }
      if (updateData.sprintId !== undefined) {
        cleanUpdateData.sprintId = updateData.sprintId ? parseInt(updateData.sprintId) : null;
      }

      // Actualizar la tarea usando updateMany para evitar problemas con RETURNING clause
      const updateResult = await prisma.task.updateMany({
        where: { id: taskId },
        data: cleanUpdateData
      });

      if (updateResult.count === 0) {
        return ResponseHelper.error(res, 'Tarea no encontrada o sin cambios', 404);
      }

      // Obtener la tarea actualizada con todos los datos relacionados
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          userStory: {
            select: {
              id: true,
              title: true
            }
          },
          sprint: {
            select: {
              id: true,
              name: true,
              status: true
            }
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      return ResponseHelper.success(res, { task }, 'Tarea actualizada exitosamente');

    } catch (error) {
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }

  /**
   * Eliminar una tarea
   */
  static async deleteTask(req, res) {
    try {
      const { id } = req.params;
      const taskId = parseInt(id);

      if (isNaN(taskId)) {
        return ResponseHelper.error(res, 'ID de tarea inválido', 400);
      }

      // Verificar que la tarea existe
      const existingTask = await prisma.task.findUnique({
        where: { id: taskId }
      });

      if (!existingTask) {
        return ResponseHelper.error(res, 'Tarea no encontrada', 404);
      }

      // Eliminar la tarea
      await prisma.task.delete({
        where: { id: taskId }
      });

      return ResponseHelper.success(res, null, 'Tarea eliminada exitosamente');

    } catch (error) {
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }

  // ===== MÉTRICAS Y REPORTES =====

  /**
   * Obtener métricas de un proyecto
   */
  static async getProjectMetrics(req, res) {
    try {
      const { projectId } = req.params;

      // Obtener estadísticas del proyecto
      const [
        project,
        epics,
        userStories,
        tasks,
        sprints,
        velocities
      ] = await Promise.all([
        prisma.project.findUnique({
          where: { id: parseInt(projectId) },
          select: {
            id: true,
            name: true,
            status: true,
            startDate: true,
            endDate: true
          }
        }),
        prisma.epic.findMany({
          where: { projectId: parseInt(projectId) },
          select: { status: true, priority: true }
        }),
        prisma.userStory.findMany({
          where: { 
            epic: { projectId: parseInt(projectId) }
          },
          select: { 
            status: true, 
            priority: true, 
            storyPoints: true,
            sprintId: true
          }
        }),
        prisma.task.findMany({
          where: { 
            userStory: { 
              epic: { projectId: parseInt(projectId) }
            }
          },
          select: { 
            status: true, 
            type: true,
            estimatedHours: true,
            actualHours: true
          }
        }),
        prisma.sprint.findMany({
          where: { projectId: parseInt(projectId) },
          select: { 
            status: true, 
            startDate: true, 
            endDate: true,
            velocity: true
          }
        }),
        prisma.velocity.findMany({
          where: { projectId: parseInt(projectId) },
          orderBy: { createdAt: 'desc' },
          take: 5
        })
      ]);

      if (!project) {
        return ResponseHelper.error(res, 'Proyecto no encontrado', 404);
      }

      // Calcular métricas
      const metrics = {
        project,
        epics: {
          total: epics.length,
          byStatus: epics.reduce((acc, epic) => {
            acc[epic.status] = (acc[epic.status] || 0) + 1;
            return acc;
          }, {}),
          byPriority: epics.reduce((acc, epic) => {
            acc[epic.priority] = (acc[epic.priority] || 0) + 1;
            return acc;
          }, {})
        },
        userStories: {
          total: userStories.length,
          totalPoints: userStories.reduce((sum, story) => sum + (story.storyPoints || 0), 0),
          byStatus: userStories.reduce((acc, story) => {
            acc[story.status] = (acc[story.status] || 0) + 1;
            return acc;
          }, {}),
          byPriority: userStories.reduce((acc, story) => {
            acc[story.priority] = (acc[story.priority] || 0) + 1;
            return acc;
          }, {}),
          inSprints: userStories.filter(story => story.sprintId).length,
          notInSprints: userStories.filter(story => !story.sprintId).length
        },
        tasks: {
          total: tasks.length,
          byStatus: tasks.reduce((acc, task) => {
            acc[task.status] = (acc[task.status] || 0) + 1;
            return acc;
          }, {}),
          byType: tasks.reduce((acc, task) => {
            acc[task.type] = (acc[task.type] || 0) + 1;
            return acc;
          }, {}),
          totalEstimatedHours: tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0),
          totalActualHours: tasks.reduce((sum, task) => sum + (task.actualHours || 0), 0)
        },
        sprints: {
          total: sprints.length,
          byStatus: sprints.reduce((acc, sprint) => {
            acc[sprint.status] = (acc[sprint.status] || 0) + 1;
            return acc;
          }, {}),
          averageVelocity: velocities.length > 0 
            ? velocities.reduce((sum, v) => sum + (v.averageVelocity || 0), 0) / velocities.length 
            : 0
        },
        velocities: velocities.map(v => ({
          id: v.id,
          storyPointsCompleted: v.storyPointsCompleted,
          averageVelocity: v.averageVelocity,
          createdAt: v.createdAt
        }))
      };

      return ResponseHelper.success(res, { metrics }, 'Métricas obtenidas exitosamente');

    } catch (error) {
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }

  /**
   * Dashboard general con estadísticas consolidadas
   */
  static async getDashboard(req, res) {
    try {
      const { projectId, sprintId, teamId, period = 'month' } = req.query;

      // Construir filtros base
      const projectFilter = projectId ? { id: parseInt(projectId) } : {};
      const sprintFilter = sprintId ? { id: parseInt(sprintId) } : {};
      const teamFilter = teamId ? { members: { some: { userId: parseInt(teamId) } } } : {};

      // Calcular rango de fechas según el período
      const now = new Date();
      let startDate;
      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'quarter':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default: // month
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // Obtener estadísticas generales
      const [
        totalProjects,
        activeProjects,
        totalSprints,
        activeSprints,
        totalEpics,
        totalUserStories,
        totalTasks,
        completedTasks,
        recentActivity
      ] = await Promise.all([
        prisma.project.count({ where: projectFilter }),
        prisma.project.count({ where: { ...projectFilter, status: 'ACTIVE' } }),
        prisma.sprint.count({ where: sprintFilter }),
        prisma.sprint.count({ where: { ...sprintFilter, status: 'ACTIVE' } }),
        prisma.epic.count(),
        prisma.userStory.count(),
        prisma.task.count(),
        prisma.task.count({ where: { status: 'DONE' } }),
        // Actividad reciente
        prisma.task.findMany({
          where: {
            updatedAt: { gte: startDate }
          },
          include: {
            assignee: { select: { name: true, username: true } },
            userStory: { select: { title: true } }
          },
          orderBy: { updatedAt: 'desc' },
          take: 10
        })
      ]);

      // Calcular velocidad promedio del equipo
      const velocities = await prisma.sprint.findMany({
        where: {
          status: 'COMPLETED',
          endDate: { gte: startDate }
        },
        select: { velocity: true }
      });

      const avgVelocity = velocities.length > 0 
        ? velocities.reduce((sum, v) => sum + (v.velocity || 0), 0) / velocities.length 
        : 0;

      const dashboardData = {
        stats: {
          totalProjects,
          activeProjects,
          totalSprints,
          activeSprints,
          totalEpics,
          totalUserStories,
          totalTasks,
          completedTasks,
          teamVelocity: Math.round(avgVelocity)
        },
        activity: recentActivity.map(activity => ({
          id: activity.id,
          type: 'task',
          action: activity.status === 'DONE' ? 'completed' : 'updated',
          title: activity.title,
          user: activity.assignee?.name || activity.assignee?.username,
          timestamp: activity.updatedAt
        }))
      };

      return ResponseHelper.success(res, dashboardData, 'Dashboard obtenido exitosamente');

    } catch (error) {
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }

  /**
   * Métricas del equipo por proyecto
   */
  static async getTeamMetrics(req, res) {
    try {
      const { projectId } = req.params;
      const { period = 'month' } = req.query;

      // Calcular rango de fechas
      const now = new Date();
      let startDate;
      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'quarter':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // Obtener miembros del equipo y sus métricas
      const projectMembers = await prisma.projectMember.findMany({
        where: { projectId: parseInt(projectId) },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true
            }
          }
        }
      });

      const teamMetrics = await Promise.all(
        projectMembers.map(async (member) => {
          const [assignedTasks, completedTasks, totalStoryPoints, completedStoryPoints] = await Promise.all([
            prisma.task.count({
              where: {
                assigneeId: member.userId,
                userStory: { epic: { projectId: parseInt(projectId) } },
                createdAt: { gte: startDate }
              }
            }),
            prisma.task.count({
              where: {
                assigneeId: member.userId,
                status: 'DONE',
                userStory: { epic: { projectId: parseInt(projectId) } },
                updatedAt: { gte: startDate }
              }
            }),
            prisma.userStory.aggregate({
              where: {
                epic: { projectId: parseInt(projectId) },
                tasks: { some: { assigneeId: member.userId } }
              },
              _sum: { storyPoints: true }
            }),
            prisma.userStory.aggregate({
              where: {
                status: 'COMPLETED',
                epic: { projectId: parseInt(projectId) },
                tasks: { some: { assigneeId: member.userId } }
              },
              _sum: { storyPoints: true }
            })
          ]);

          return {
            user: member.user,
            metrics: {
              assignedTasks,
              completedTasks,
              completionRate: assignedTasks > 0 ? (completedTasks / assignedTasks) * 100 : 0,
              totalStoryPoints: totalStoryPoints._sum.storyPoints || 0,
              completedStoryPoints: completedStoryPoints._sum.storyPoints || 0,
              productivity: completedTasks / (period === 'week' ? 7 : period === 'month' ? 30 : period === 'quarter' ? 90 : 365)
            }
          };
        })
      );

      return ResponseHelper.success(res, { teamMetrics, period }, 'Métricas del equipo obtenidas exitosamente');

    } catch (error) {
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }

  /**
   * Velocidad del equipo por proyecto
   */
  static async getTeamVelocity(req, res) {
    try {
      const { projectId } = req.params;
      const { limit = 10 } = req.query;

      // Obtener sprints completados del proyecto
      const sprints = await prisma.sprint.findMany({
        where: {
          projectId: parseInt(projectId),
          status: 'COMPLETED'
        },
        include: {
          userStories: {
            select: {
              storyPoints: true,
              status: true
            }
          }
        },
        orderBy: { endDate: 'desc' },
        take: parseInt(limit)
      });

      const velocityData = sprints.map(sprint => {
        const totalPoints = sprint.userStories.reduce((sum, story) => sum + (story.storyPoints || 0), 0);
        const completedPoints = sprint.userStories
          .filter(story => story.status === 'COMPLETED')
          .reduce((sum, story) => sum + (story.storyPoints || 0), 0);

        return {
          sprintId: sprint.id,
          sprintName: sprint.name,
          startDate: sprint.startDate,
          endDate: sprint.endDate,
          totalPoints,
          completedPoints,
          velocity: completedPoints,
          completionRate: totalPoints > 0 ? (completedPoints / totalPoints) * 100 : 0
        };
      });

      // Calcular velocidad promedio
      const avgVelocity = velocityData.length > 0 
        ? velocityData.reduce((sum, v) => sum + v.velocity, 0) / velocityData.length 
        : 0;

      return ResponseHelper.success(res, {
        velocityData: velocityData.reverse(), // Mostrar en orden cronológico
        averageVelocity: Math.round(avgVelocity),
        totalSprints: velocityData.length
      }, 'Velocidad del equipo obtenida exitosamente');

    } catch (error) {
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }

  // ===== ENDPOINTS PARA PANEL DE CONTROL GENERAL =====

  /**
   * Vista consolidada de proyectos por dirección/equipo (RF025)
   */
  static async getDashboardConsolidated(req, res) {
    try {
      const { teamId, directionId, status } = req.query;

      let projectFilter = {};
      if (status) projectFilter.status = status;
      if (teamId) {
        projectFilter.members = {
          some: { userId: parseInt(teamId) }
        };
      }

      const projects = await prisma.project.findMany({
        where: projectFilter,
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  email: true
                }
              }
            }
          },
          sprints: {
            select: {
              id: true,
              name: true,
              status: true,
              startDate: true,
              endDate: true
            }
          },
          epics: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true
            }
          },
          _count: {
            select: {
              epics: true,
              sprints: true,
              members: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' }
      });

      // Agrupar proyectos por equipo/dirección
      const consolidatedData = {};
      
      for (const project of projects) {
        const teamKey = project.members.length > 0 
          ? `team_${project.members[0].user.id}` 
          : 'unassigned';
        
        if (!consolidatedData[teamKey]) {
          consolidatedData[teamKey] = {
            teamInfo: project.members.length > 0 ? {
              id: project.members[0].user.id,
              name: project.members[0].user.name,
              members: project.members.map(m => m.user)
            } : { name: 'Sin asignar', members: [] },
            projects: [],
            stats: {
              total: 0,
              active: 0,
              completed: 0,
              onHold: 0,
              totalEpics: 0,
              totalSprints: 0
            }
          };
        }

        consolidatedData[teamKey].projects.push(project);
        consolidatedData[teamKey].stats.total++;
        consolidatedData[teamKey].stats.totalEpics += project._count.epics;
        consolidatedData[teamKey].stats.totalSprints += project._count.sprints;
        
        switch (project.status) {
          case 'ACTIVE':
            consolidatedData[teamKey].stats.active++;
            break;
          case 'COMPLETED':
            consolidatedData[teamKey].stats.completed++;
            break;
          case 'ON_HOLD':
            consolidatedData[teamKey].stats.onHold++;
            break;
        }
      }

      return ResponseHelper.success(res, {
        consolidated: Object.values(consolidatedData),
        totalTeams: Object.keys(consolidatedData).length,
        totalProjects: projects.length
      }, 'Vista consolidada obtenida exitosamente');

    } catch (error) {
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }

  /**
   * Métricas de productividad por responsable (RF027)
   */
  static async getProductivityMetrics(req, res) {
    try {
      const { period = 'month', assigneeId } = req.query;

      // Calcular rango de fechas
      const now = new Date();
      let startDate;
      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'quarter':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      let userFilter = {};
      if (assigneeId) {
        userFilter.id = parseInt(assigneeId);
      }

      // Obtener todos los usuarios con tareas asignadas
      const users = await prisma.user.findMany({
        where: {
          ...userFilter,
          assignedTasks: {
            some: {
              createdAt: { gte: startDate }
            }
          }
        },
        select: {
          id: true,
          name: true,
          username: true,
          email: true
        }
      });

      const productivityMetrics = await Promise.all(
        users.map(async (user) => {
          const [
            totalTasks,
            completedTasks,
            inProgressTasks,
            overdueTasks,
            totalHours,
            actualHours,
            avgCompletionTime
          ] = await Promise.all([
            prisma.task.count({
              where: {
                assigneeId: user.id,
                createdAt: { gte: startDate }
              }
            }),
            prisma.task.count({
              where: {
                assigneeId: user.id,
                status: 'DONE',
                updatedAt: { gte: startDate }
              }
            }),
            prisma.task.count({
              where: {
                assigneeId: user.id,
                status: 'IN_PROGRESS'
              }
            }),
            prisma.task.count({
              where: {
                assigneeId: user.id,
                status: { not: 'DONE' },
                userStory: {
                  sprint: {
                    endDate: { lt: now }
                  }
                }
              }
            }),
            prisma.task.aggregate({
              where: {
                assigneeId: user.id,
                createdAt: { gte: startDate }
              },
              _sum: { estimatedHours: true }
            }),
            prisma.task.aggregate({
              where: {
                assigneeId: user.id,
                status: 'DONE',
                updatedAt: { gte: startDate }
              },
              _sum: { actualHours: true }
            }),
            // Calcular tiempo promedio de completación
            prisma.$queryRaw`
              SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as avg_hours
              FROM "Task" 
              WHERE assignee_id = ${user.id} 
              AND status = 'DONE' 
              AND updated_at >= ${startDate}
            `
          ]);

          const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
          const efficiency = totalHours._sum.estimatedHours > 0 
            ? ((actualHours._sum.actualHours || 0) / totalHours._sum.estimatedHours) * 100 
            : 0;

          return {
            user,
            metrics: {
              totalTasks,
              completedTasks,
              inProgressTasks,
              overdueTasks,
              completionRate: Math.round(completionRate),
              estimatedHours: totalHours._sum.estimatedHours || 0,
              actualHours: actualHours._sum.actualHours || 0,
              efficiency: Math.round(efficiency),
              avgCompletionTime: avgCompletionTime[0]?.avg_hours ? Math.round(avgCompletionTime[0].avg_hours) : 0,
              productivity: completedTasks / (period === 'week' ? 7 : period === 'month' ? 30 : period === 'quarter' ? 90 : 365)
            }
          };
        })
      );

      return ResponseHelper.success(res, {
        productivityMetrics: productivityMetrics.sort((a, b) => b.metrics.completionRate - a.metrics.completionRate),
        period,
        totalUsers: productivityMetrics.length
      }, 'Métricas de productividad obtenidas exitosamente');

    } catch (error) {
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }

  /**
   * Proyectos próximos a vencer o con retrasos (RF028)
   */
  static async getDeadlineAlerts(req, res) {
    try {
      const { days = 7 } = req.query;
      const now = new Date();
      const alertDate = new Date(now.getTime() + parseInt(days) * 24 * 60 * 60 * 1000);

      // Proyectos próximos a vencer
      const upcomingDeadlines = await prisma.project.findMany({
        where: {
          endDate: {
            gte: now,
            lte: alertDate
          },
          status: { in: ['ACTIVE', 'PLANNING'] }
        },
        include: {
          sprints: {
            where: {
              status: 'ACTIVE'
            },
            select: {
              id: true,
              name: true,
              endDate: true
            }
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          },
          _count: {
            select: {
              epics: true,
              sprints: true
            }
          }
        },
        orderBy: { endDate: 'asc' }
      });

      // Proyectos con retraso
      const overdueProjects = await prisma.project.findMany({
        where: {
          endDate: {
            lt: now
          },
          status: { in: ['ACTIVE', 'PLANNING'] }
        },
        include: {
          sprints: {
            where: {
              status: 'ACTIVE'
            }
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          },
          _count: {
            select: {
              epics: true,
              sprints: true
            }
          }
        },
        orderBy: { endDate: 'asc' }
      });

      // Sprints próximos a vencer
      const upcomingSprints = await prisma.sprint.findMany({
        where: {
          endDate: {
            gte: now,
            lte: alertDate
          },
          status: 'ACTIVE'
        },
        include: {
          project: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: {
              userStories: true,
              tasks: true
            }
          }
        },
        orderBy: { endDate: 'asc' }
      });

      // Calcular días restantes
      const addDaysRemaining = (items) => {
        return items.map(item => ({
          ...item,
          daysRemaining: Math.ceil((item.endDate - now) / (1000 * 60 * 60 * 24))
        }));
      };

      return ResponseHelper.success(res, {
        upcomingDeadlines: addDaysRemaining(upcomingDeadlines),
        overdueProjects: overdueProjects.map(p => ({
          ...p,
          daysOverdue: Math.ceil((now - p.endDate) / (1000 * 60 * 60 * 24))
        })),
        upcomingSprints: addDaysRemaining(upcomingSprints),
        alertSettings: {
          days: parseInt(days),
          alertDate
        }
      }, 'Alertas de fechas límite obtenidas exitosamente');

    } catch (error) {
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }

  // ===== ENDPOINTS PARA MÉTRICAS Y KPI =====

  /**
   * Número de proyectos completados por responsable (RF029)
   */
  static async getCompletionByAssignee(req, res) {
    try {
      const { period = 'quarter', assigneeId } = req.query;

      // Calcular rango de fechas
      const now = new Date();
      let startDate;
      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default: // quarter
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      }

      let userFilter = {};
      if (assigneeId) {
        userFilter.id = parseInt(assigneeId);
      }

      // Obtener usuarios con sus métricas de completación
      const users = await prisma.user.findMany({
        where: {
          ...userFilter,
          projectMembers: {
            some: {
              project: {
                updatedAt: { gte: startDate }
              }
            }
          }
        },
        select: {
          id: true,
          name: true,
          username: true,
          email: true
        }
      });

      const completionMetrics = await Promise.all(
        users.map(async (user) => {
          const [
            projectsParticipated,
            projectsCompleted,
            tasksCompleted,
            storiesCompleted,
            totalStoryPoints
          ] = await Promise.all([
            prisma.project.count({
              where: {
                members: {
                  some: { userId: user.id }
                },
                updatedAt: { gte: startDate }
              }
            }),
            prisma.project.count({
              where: {
                members: {
                  some: { userId: user.id }
                },
                status: 'COMPLETED',
                updatedAt: { gte: startDate }
              }
            }),
            prisma.task.count({
              where: {
                assigneeId: user.id,
                status: 'DONE',
                updatedAt: { gte: startDate }
              }
            }),
            prisma.userStory.count({
              where: {
                tasks: {
                  some: { assigneeId: user.id }
                },
                status: 'COMPLETED',
                updatedAt: { gte: startDate }
              }
            }),
            prisma.userStory.aggregate({
              where: {
                tasks: {
                  some: { assigneeId: user.id }
                },
                status: 'COMPLETED',
                updatedAt: { gte: startDate }
              },
              _sum: { storyPoints: true }
            })
          ]);

          const completionRate = projectsParticipated > 0 
            ? (projectsCompleted / projectsParticipated) * 100 
            : 0;

          return {
            user,
            metrics: {
              projectsParticipated,
              projectsCompleted,
              tasksCompleted,
              storiesCompleted,
              totalStoryPoints: totalStoryPoints._sum.storyPoints || 0,
              completionRate: Math.round(completionRate),
              avgProjectsPerPeriod: projectsCompleted / (period === 'week' ? 1 : period === 'month' ? 1 : period === 'quarter' ? 3 : 12)
            }
          };
        })
      );

      return ResponseHelper.success(res, {
        completionMetrics: completionMetrics.sort((a, b) => b.metrics.projectsCompleted - a.metrics.projectsCompleted),
        period,
        summary: {
          totalUsers: completionMetrics.length,
          totalProjectsCompleted: completionMetrics.reduce((sum, m) => sum + m.metrics.projectsCompleted, 0),
          avgCompletionRate: completionMetrics.length > 0 
            ? completionMetrics.reduce((sum, m) => sum + m.metrics.completionRate, 0) / completionMetrics.length 
            : 0
        }
      }, 'Métricas de completación por responsable obtenidas exitosamente');

    } catch (error) {
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }

  /**
   * Tiempo promedio de completación de proyectos (RF030)
   */
  static async getCompletionTimeMetrics(req, res) {
    try {
      const { projectId, period = 'year' } = req.query;

      // Calcular rango de fechas
      const now = new Date();
      let startDate;
      switch (period) {
        case 'quarter':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default: // year
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      }

      let projectFilter = {
        status: 'COMPLETED',
        updatedAt: { gte: startDate }
      };

      if (projectId) {
        projectFilter.id = parseInt(projectId);
      }

      // Obtener proyectos completados con tiempos
      const completedProjects = await prisma.project.findMany({
        where: projectFilter,
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              epics: true,
              sprints: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' }
      });

      // Calcular métricas de tiempo
      const timeMetrics = completedProjects.map(project => {
        const plannedDuration = project.endDate && project.startDate 
          ? Math.ceil((project.endDate - project.startDate) / (1000 * 60 * 60 * 24))
          : null;
        
        const actualDuration = Math.ceil((project.updatedAt - project.createdAt) / (1000 * 60 * 60 * 24));
        
        const variance = plannedDuration 
          ? actualDuration - plannedDuration
          : null;

        return {
          project: {
            id: project.id,
            name: project.name,
            startDate: project.startDate,
            endDate: project.endDate,
            epicsCount: project._count.epics,
            sprintsCount: project._count.sprints
          },
          timing: {
            plannedDuration,
            actualDuration,
            variance,
            variancePercentage: plannedDuration > 0 ? (variance / plannedDuration) * 100 : null,
            onTime: variance !== null ? variance <= 0 : null
          }
        };
      });

      // Calcular estadísticas agregadas
      const validDurations = timeMetrics.filter(m => m.timing.actualDuration > 0);
      const avgActualDuration = validDurations.length > 0 
        ? validDurations.reduce((sum, m) => sum + m.timing.actualDuration, 0) / validDurations.length 
        : 0;

      const plannedProjects = timeMetrics.filter(m => m.timing.plannedDuration !== null);
      const avgPlannedDuration = plannedProjects.length > 0 
        ? plannedProjects.reduce((sum, m) => sum + m.timing.plannedDuration, 0) / plannedProjects.length 
        : 0;

      const onTimeProjects = timeMetrics.filter(m => m.timing.onTime === true).length;
      const onTimeRate = timeMetrics.length > 0 ? (onTimeProjects / timeMetrics.length) * 100 : 0;

      return ResponseHelper.success(res, {
        projects: timeMetrics,
        summary: {
          totalProjects: timeMetrics.length,
          avgActualDuration: Math.round(avgActualDuration),
          avgPlannedDuration: Math.round(avgPlannedDuration),
          onTimeProjects,
          onTimeRate: Math.round(onTimeRate),
          period
        }
      }, 'Métricas de tiempo de completación obtenidas exitosamente');

    } catch (error) {
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }

  /**
   * Distribución de carga de trabajo por equipo (RF031)
   */
  static async getWorkloadDistribution(req, res) {
    try {
      const { teamId, period = 'month' } = req.query;

      // Calcular rango de fechas
      const now = new Date();
      let startDate;
      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'quarter':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // Obtener todos los usuarios activos
      let userFilter = {
        assignedTasks: {
          some: {
            createdAt: { gte: startDate }
          }
        }
      };

      if (teamId) {
        userFilter.projectMembers = {
          some: {
            project: {
              members: {
                some: { userId: parseInt(teamId) }
              }
            }
          }
        };
      }

      const users = await prisma.user.findMany({
        where: userFilter,
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          projectMembers: {
            include: {
              project: {
                select: {
                  id: true,
                  name: true,
                  status: true
                }
              }
            }
          }
        }
      });

      const workloadData = await Promise.all(
        users.map(async (user) => {
          const [
            activeTasks,
            completedTasks,
            totalEstimatedHours,
            totalActualHours,
            overdueTasksCount,
            highPriorityTasks,
            activeProjects
          ] = await Promise.all([
            prisma.task.count({
              where: {
                assigneeId: user.id,
                status: { in: ['TODO', 'IN_PROGRESS', 'IN_REVIEW'] }
              }
            }),
            prisma.task.count({
              where: {
                assigneeId: user.id,
                status: 'DONE',
                updatedAt: { gte: startDate }
              }
            }),
            prisma.task.aggregate({
              where: {
                assigneeId: user.id,
                createdAt: { gte: startDate }
              },
              _sum: { estimatedHours: true }
            }),
            prisma.task.aggregate({
              where: {
                assigneeId: user.id,
                status: 'DONE',
                updatedAt: { gte: startDate }
              },
              _sum: { actualHours: true }
            }),
            prisma.task.count({
              where: {
                assigneeId: user.id,
                status: { not: 'DONE' },
                userStory: {
                  sprint: {
                    endDate: { lt: now }
                  }
                }
              }
            }),
            prisma.task.count({
              where: {
                assigneeId: user.id,
                priority: { in: ['HIGH', 'CRITICAL'] },
                status: { not: 'DONE' }
              }
            }),
            user.projectMembers.filter(pm => pm.project.status === 'ACTIVE').length
          ]);

          const workloadScore = (activeTasks * 1) + (highPriorityTasks * 2) + (overdueTasksCount * 3);
          const efficiency = totalEstimatedHours._sum.estimatedHours > 0 
            ? (totalActualHours._sum.actualHours || 0) / totalEstimatedHours._sum.estimatedHours 
            : 0;

          return {
            user,
            workload: {
              activeTasks,
              completedTasks,
              overdueTasksCount,
              highPriorityTasks,
              activeProjects,
              estimatedHours: totalEstimatedHours._sum.estimatedHours || 0,
              actualHours: totalActualHours._sum.actualHours || 0,
              workloadScore,
              efficiency: Math.round(efficiency * 100),
              capacity: workloadScore > 15 ? 'Sobrecargado' : workloadScore > 8 ? 'Alta carga' : workloadScore > 3 ? 'Carga normal' : 'Baja carga'
            }
          };
        })
      );

      // Calcular estadísticas del equipo
      const teamStats = {
        totalMembers: workloadData.length,
        avgWorkloadScore: workloadData.reduce((sum, w) => sum + w.workload.workloadScore, 0) / workloadData.length,
        avgEfficiency: workloadData.reduce((sum, w) => sum + w.workload.efficiency, 0) / workloadData.length,
        overloadedMembers: workloadData.filter(w => w.workload.workloadScore > 15).length,
        totalActiveTasks: workloadData.reduce((sum, w) => sum + w.workload.activeTasks, 0),
        totalOverdueTasks: workloadData.reduce((sum, w) => sum + w.workload.overdueTasksCount, 0)
      };

      return ResponseHelper.success(res, {
        workloadDistribution: workloadData.sort((a, b) => b.workload.workloadScore - a.workload.workloadScore),
        teamStats,
        period
      }, 'Distribución de carga de trabajo obtenida exitosamente');

    } catch (error) {
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }

  /**
   * Historial de rendimiento por períodos (RF032)
   */
  static async getPerformanceHistory(req, res) {
    try {
      const { assigneeId, period = 'year', intervals = 12 } = req.query;

      const now = new Date();
      let intervalDays;
      
      switch (period) {
        case 'week':
          intervalDays = 1; // días
          break;
        case 'month':
          intervalDays = 7; // semanas
          break;
        case 'quarter':
          intervalDays = 7; // semanas
          break;
        default: // year
          intervalDays = 30; // meses
      }

      const totalDays = intervalDays * parseInt(intervals);
      const startDate = new Date(now.getTime() - totalDays * 24 * 60 * 60 * 1000);

      let userFilter = {};
      if (assigneeId) {
        userFilter.id = parseInt(assigneeId);
      }

      const users = await prisma.user.findMany({
        where: {
          ...userFilter,
          assignedTasks: {
            some: {
              createdAt: { gte: startDate }
            }
          }
        },
        select: {
          id: true,
          name: true,
          username: true,
          email: true
        }
      });

      const performanceHistory = await Promise.all(
        users.map(async (user) => {
          const intervals = [];
          
          for (let i = parseInt(req.query.intervals || 12) - 1; i >= 0; i--) {
            const intervalEnd = new Date(now.getTime() - i * intervalDays * 24 * 60 * 60 * 1000);
            const intervalStart = new Date(intervalEnd.getTime() - intervalDays * 24 * 60 * 60 * 1000);

            const [tasksCompleted, tasksCreated, storyPointsCompleted, hoursWorked] = await Promise.all([
              prisma.task.count({
                where: {
                  assigneeId: user.id,
                  status: 'DONE',
                  updatedAt: { gte: intervalStart, lt: intervalEnd }
                }
              }),
              prisma.task.count({
                where: {
                  assigneeId: user.id,
                  createdAt: { gte: intervalStart, lt: intervalEnd }
                }
              }),
              prisma.task.aggregate({
                where: {
                  assigneeId: user.id,
                  status: 'DONE',
                  updatedAt: { gte: intervalStart, lt: intervalEnd },
                  userStory: { storyPoints: { not: null } }
                },
                _sum: { userStory: { storyPoints: true } }
              }),
              prisma.task.aggregate({
                where: {
                  assigneeId: user.id,
                  status: 'DONE',
                  updatedAt: { gte: intervalStart, lt: intervalEnd }
                },
                _sum: { actualHours: true }
              })
            ]);

            intervals.push({
              period: intervalStart.toISOString().split('T')[0],
              periodEnd: intervalEnd.toISOString().split('T')[0],
              tasksCompleted,
              tasksCreated,
              storyPointsCompleted: storyPointsCompleted._sum?.storyPoints || 0,
              hoursWorked: hoursWorked._sum.actualHours || 0,
              velocity: tasksCompleted / intervalDays,
              productivity: (tasksCompleted / Math.max(tasksCreated, 1)) * 100
            });
          }

          // Calcular tendencias
          const recentIntervals = intervals.slice(-3);
          const oldIntervals = intervals.slice(0, 3);
          
          const recentAvg = recentIntervals.reduce((sum, i) => sum + i.tasksCompleted, 0) / recentIntervals.length;
          const oldAvg = oldIntervals.reduce((sum, i) => sum + i.tasksCompleted, 0) / oldIntervals.length;
          
          const trend = oldAvg > 0 ? ((recentAvg - oldAvg) / oldAvg) * 100 : 0;

          return {
            user,
            history: intervals,
            summary: {
              totalTasksCompleted: intervals.reduce((sum, i) => sum + i.tasksCompleted, 0),
              totalStoryPoints: intervals.reduce((sum, i) => sum + i.storyPointsCompleted, 0),
              totalHoursWorked: intervals.reduce((sum, i) => sum + i.hoursWorked, 0),
              avgVelocity: intervals.reduce((sum, i) => sum + i.velocity, 0) / intervals.length,
              avgProductivity: intervals.reduce((sum, i) => sum + i.productivity, 0) / intervals.length,
              trend: Math.round(trend),
              trendDirection: trend > 5 ? 'up' : trend < -5 ? 'down' : 'stable'
            }
          };
        })
      );

      return ResponseHelper.success(res, {
        performanceHistory,
        period,
        intervals: parseInt(req.query.intervals || 12),
        dateRange: {
          startDate,
          endDate: now
        }
      }, 'Historial de rendimiento obtenido exitosamente');

    } catch (error) {
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }

  // ===== SPRINTS ESPECÍFICOS =====

  /**
   * Obtener un sprint por ID
   */
  static async getSprintById(req, res) {
    try {
      const { id } = req.params;
      
      const sprint = await prisma.sprint.findUnique({
        where: { id: parseInt(id) },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              status: true
            }
          },
          userStories: {
            include: {
              epic: {
                select: {
                  id: true,
                  title: true
                }
              },
              tasks: {
                include: {
                  assignee: {
                    select: {
                      id: true,
                      name: true,
                      email: true
                    }
                  }
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          },
          tasks: {
            include: {
              assignee: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              },
              userStory: {
                select: {
                  id: true,
                  title: true
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          },
          _count: {
            select: {
              userStories: true,
              tasks: true
            }
          }
        }
      });

      if (!sprint) {
        return ResponseHelper.error(res, 'Sprint no encontrado', 404);
      }

      return ResponseHelper.success(res, { sprint }, 'Sprint obtenido exitosamente');

    } catch (error) {
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }

  /**
   * Obtener tareas de un sprint
   * Las tareas se obtienen a través de las historias de usuario del sprint
   */
  static async getSprintTasks(req, res) {
    try {
      const { id } = req.params;
      const { status, priority, assigneeId } = req.query;

      // ✅ Las tareas se relacionan con el sprint a través de userStory.sprintId
      const where = {
        userStory: {
          sprintId: parseInt(id)
        }
      };

      if (status) {
        where.status = status;
      }
      if (priority) {
        where.priority = priority;
      }
      if (assigneeId) {
        where.assigneeId = parseInt(assigneeId);
      }

      const tasks = await prisma.task.findMany({
        where,
        include: {
          assignee: {
            select: {
              id: true,
              username: true,
              email: true
            }
          },
          userStory: {
            select: {
              id: true,
              title: true
            }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' }
        ]
      });

      return ResponseHelper.success(res, { tasks }, 'Tareas obtenidas exitosamente');

    } catch (error) {
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }

  /**
   * Obtener datos del burndown chart de un sprint
   */
  static async getSprintBurndown(req, res) {
    try {
      const { id } = req.params;
      const sprintId = parseInt(id);

      if (isNaN(sprintId)) {
        return ResponseHelper.error(res, 'ID de sprint inválido', 400);
      }

      const sprint = await prisma.sprint.findUnique({
        where: { id: sprintId },
        include: {
          userStories: {
            include: {
              tasks: true
            }
          }
        }
      });

      if (!sprint) {
        return ResponseHelper.error(res, 'Sprint no encontrado', 404);
      }

      if (!sprint.startDate || !sprint.endDate) {
        return ResponseHelper.error(res, 'El sprint debe tener fechas de inicio y fin definidas', 400);
      }

      const totalPoints = sprint.userStories.reduce((sum, story) => sum + (story.storyPoints || 0), 0);
      const startDate = new Date(sprint.startDate);
      const endDate = new Date(sprint.endDate);
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      // Generar datos del burndown ideal
      const idealBurndown = [];
      for (let i = 0; i <= totalDays; i++) {
        const remainingPoints = totalPoints - (totalPoints * i / totalDays);
        idealBurndown.push({
          day: i,
          remainingPoints: Math.max(0, remainingPoints),
          date: new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000).toISOString()
        });
      }

      // Generar datos del burndown real basado en el estado actual de las historias
      const realBurndown = [];
      const now = new Date();
      const currentlyCompletedPoints = sprint.userStories
        .filter(story => story.status === 'COMPLETED')
        .reduce((sum, story) => sum + (story.storyPoints || 0), 0);
      
      const inProgressPoints = sprint.userStories
        .filter(story => story.status === 'IN_PROGRESS')
        .reduce((sum, story) => {
          const storyPoints = story.storyPoints || 0;
          return sum + (storyPoints * 0.5); // Estimar 50% completado para historias en progreso
        }, 0);
      
      const currentCompleted = currentlyCompletedPoints + inProgressPoints;
      
      for (let i = 0; i <= totalDays; i++) {
        const currentDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        
        let completedPoints = 0;
        
        if (currentDate > now) {
          // Fechas futuras: proyectar basándose en el ritmo actual
          const daysElapsed = Math.max(0, Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
          if (daysElapsed > 0 && daysElapsed <= totalDays) {
            const currentRate = currentCompleted / daysElapsed;
            completedPoints = currentRate * i;
          } else {
            completedPoints = 0;
          }
        } else {
          // Fechas pasadas o actuales: usar progreso real
          const daysElapsed = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysElapsed >= 0 && daysElapsed <= totalDays) {
            if (currentDate <= now) {
              const progressRatio = totalDays > 0 ? Math.min(1, daysElapsed / totalDays) : 0;
              completedPoints = currentCompleted * progressRatio;
            } else {
              completedPoints = currentCompleted;
            }
          }
        }
        
        completedPoints = Math.min(completedPoints, totalPoints);
        
        realBurndown.push({
          day: i,
          remainingPoints: Math.max(0, totalPoints - completedPoints),
          date: currentDate.toISOString()
        });
      }

      const burndownChart = {
        sprintId: sprint.id,
        sprintName: sprint.name,
        totalPoints,
        totalDays,
        idealBurndown,
        realBurndown,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      };

      return ResponseHelper.success(res, { burndownChart }, 'Burndown chart obtenido exitosamente');

    } catch (error) {
      console.error('Error al obtener burndown chart:', error);
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }

  // ===== CONFIGURACIÓN =====

  /**
   * Obtener plantillas de proyecto
   */
  static async getProjectTemplates(req, res) {
    try {
      const templates = await prisma.projectTemplate.findMany({
        where: { isActive: true },
        include: {
          sprintTemplates: true
        },
        orderBy: { createdAt: 'desc' }
      });

      return ResponseHelper.success(res, { templates }, 'Plantillas obtenidas exitosamente');

    } catch (error) {
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }

  /**
   * Generar informe semanal en PDF con proyectos, sprints y tareas de los últimos 7 días
   */
  static async generateWeeklyReport(req, res) {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const now = new Date();

      // Obtener proyectos activos que han tenido actividad en los últimos 7 días
      const projects = await prisma.project.findMany({
        where: {
          deletedAt: null,
          status: { in: ['ACTIVE', 'PLANNING'] },
          OR: [
            { updatedAt: { gte: sevenDaysAgo } },
            {
              sprints: {
                some: {
                  OR: [
                    { updatedAt: { gte: sevenDaysAgo } },
                    { startDate: { gte: sevenDaysAgo } },
                    { endDate: { gte: sevenDaysAgo } }
                  ]
                }
              }
            }
          ]
        },
        include: {
          sprints: {
            where: {
              OR: [
                { updatedAt: { gte: sevenDaysAgo } },
                { startDate: { gte: sevenDaysAgo } },
                { endDate: { gte: sevenDaysAgo } }
              ]
            },
            include: {
              userStories: {
                include: {
                  tasks: {
                    where: {
                      OR: [
                        { updatedAt: { gte: sevenDaysAgo } },
                        { createdAt: { gte: sevenDaysAgo } }
                      ]
                    },
                    include: {
                      assignee: {
                        select: {
                          id: true,
                          name: true,
                          email: true
                        }
                      }
                    }
                  },
                  epic: {
                    select: {
                      id: true,
                      title: true
                    }
                  }
                }
              }
            },
            orderBy: { startDate: 'desc' }
          }
        },
        orderBy: { name: 'asc' }
      });

      // Filtrar proyectos que realmente tienen actividad
      const activeProjects = projects.filter(project => 
        project.sprints.length > 0 && 
        project.sprints.some(sprint => 
          sprint.userStories.some(story => story.tasks.length > 0)
        )
      );

      // Crear PDF
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'A4',
        info: {
          Title: 'Informe Semanal de Proyectos',
          Author: 'Sistema Intranet IMHPA'
        }
      });
      
      // Configurar ancho útil de la página (ancho total - márgenes)
      const pageWidth = doc.page.width;
      const pageMargin = 50;
      const usableWidth = pageWidth - (pageMargin * 2);
      
      // Configurar headers para descarga
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="informe-semanal-${new Date().toISOString().split('T')[0]}.pdf"`);
      
      // Pipe PDF a response
      doc.pipe(res);

      // Encabezado
      doc.fontSize(20).font('Helvetica-Bold').text('Informe Semanal de Proyectos', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).font('Helvetica').text(`Período: ${sevenDaysAgo.toLocaleDateString('es-PA')} - ${now.toLocaleDateString('es-PA')}`, { align: 'center' });
      doc.moveDown(2);

      // Resumen
      doc.fontSize(14).font('Helvetica-Bold').text('Resumen Ejecutivo', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
      doc.text(`Total de proyectos con actividad: ${activeProjects.length}`);
      
      let totalSprints = 0;
      let totalTasks = 0;
      let completedTasks = 0;
      
      activeProjects.forEach(project => {
        totalSprints += project.sprints.length;
        project.sprints.forEach(sprint => {
          sprint.userStories.forEach(story => {
            totalTasks += story.tasks.length;
            completedTasks += story.tasks.filter(t => t.status === 'COMPLETED').length;
          });
        });
      });
      
      doc.text(`Total de sprints: ${totalSprints}`);
      doc.text(`Total de tareas desarrolladas: ${totalTasks}`);
      doc.text(`Tareas completadas: ${completedTasks}`);
      doc.text(`Tareas en progreso: ${totalTasks - completedTasks}`);
      doc.moveDown(2);

      // Detalle por proyecto
      activeProjects.forEach((project, projectIndex) => {
        // Nueva página si no es el primer proyecto
        if (projectIndex > 0) {
          doc.addPage();
        }

        doc.fontSize(16).font('Helvetica-Bold').text(project.name, { 
          underline: true,
          width: usableWidth,
          align: 'left'
        });
        doc.moveDown(0.5);
        
        if (project.description) {
          doc.fontSize(10).font('Helvetica').text(`Descripción: ${project.description}`, {
            width: usableWidth,
            align: 'left'
          });
          doc.moveDown(0.5);
        }
        
        doc.fontSize(10).font('Helvetica').text(`Estado: ${project.status} | Fecha de inicio: ${project.startDate ? new Date(project.startDate).toLocaleDateString('es-PA') : 'N/A'}`);
        doc.moveDown(1);

        // Sprints del proyecto
        if (project.sprints.length > 0) {
          doc.fontSize(12).font('Helvetica-Bold').text('Sprints:', { underline: true });
          doc.moveDown(0.5);

          project.sprints.forEach((sprint, sprintIndex) => {
            doc.fontSize(11).font('Helvetica-Bold').text(`${sprintIndex + 1}. ${sprint.name}`, { 
              width: usableWidth - 20,
              indent: 20
            });
            doc.fontSize(10).font('Helvetica');
            doc.text(`   Estado: ${sprint.status} | Inicio: ${sprint.startDate ? new Date(sprint.startDate).toLocaleDateString('es-PA') : 'N/A'} | Fin: ${sprint.endDate ? new Date(sprint.endDate).toLocaleDateString('es-PA') : 'N/A'}`);
            
            if (sprint.description) {
              doc.text(`   Descripción: ${sprint.description}`, {
                width: usableWidth - 20,
                indent: 20
              });
            }
            doc.moveDown(0.5);

            // Tareas del sprint
            let sprintTasks = [];
            sprint.userStories.forEach(story => {
              story.tasks.forEach(task => {
                sprintTasks.push({
                  ...task,
                  userStory: story.title,
                  epic: story.epic?.title || 'Sin épica'
                });
              });
            });

            if (sprintTasks.length > 0) {
              doc.fontSize(10).font('Helvetica-Bold').text('   Tareas desarrolladas:', { indent: 20 });
              doc.moveDown(0.3);
              
              sprintTasks.forEach((task, taskIndex) => {
                const assigneeName = task.assignee ? `${task.assignee.name} (${task.assignee.email})` : 'Sin asignar';
                const statusText = task.status === 'COMPLETED' ? 'Completada' : 
                                  task.status === 'IN_PROGRESS' ? 'En Progreso' : 
                                  task.status === 'TODO' ? 'Pendiente' : task.status;
                const completedDate = task.status === 'COMPLETED' && task.updatedAt ? ` - Completada: ${new Date(task.updatedAt).toLocaleDateString('es-PA')}` : '';
                
                doc.fontSize(9).font('Helvetica');
                // Título de la tarea con wrap automático
                doc.text(`   ${taskIndex + 1}. ${task.title}`, { 
                  indent: 30, 
                  width: usableWidth - 30,
                  align: 'left'
                });
                doc.text(`      Estado: ${statusText}${completedDate}`, { indent: 30, width: usableWidth - 30 });
                doc.text(`      Asignado a: ${assigneeName}`, { indent: 30, width: usableWidth - 30 });
                
                // User Story y Épica con wrap si es necesario
                const userStoryText = `      User Story: ${task.userStory} | Épica: ${task.epic}`;
                doc.text(userStoryText, { indent: 30, width: usableWidth - 30 });
                
                // Descripción completa con wrap automático
                if (task.description) {
                  doc.text(`      Descripción: ${task.description}`, { 
                    indent: 30, 
                    width: usableWidth - 30,
                    align: 'left'
                  });
                }
                doc.moveDown(0.3);
              });
            } else {
              doc.fontSize(9).font('Helvetica').text('   No hay tareas desarrolladas en este sprint.', { indent: 20 });
            }
            
            doc.moveDown(1);
          });
        } else {
          doc.fontSize(10).font('Helvetica').text('No hay sprints con actividad en este período.');
        }
      });

      // Si no hay proyectos con actividad
      if (activeProjects.length === 0) {
        doc.fontSize(14).font('Helvetica').text('No se encontraron proyectos con actividad en los últimos 7 días.', { align: 'center' });
        doc.moveDown(2);
      }

      // Pie de página
      doc.fontSize(8).font('Helvetica').text(
        `Generado el ${now.toLocaleDateString('es-PA')} a las ${now.toLocaleTimeString('es-PA')}`,
        { align: 'center' }
      );

      // Finalizar PDF
      doc.end();

    } catch (error) {
      console.error('Error generando informe semanal:', error);
      console.error('Stack trace:', error.stack);
      return ResponseHelper.error(res, `Error al generar el informe semanal: ${error.message}`, 500);
    }
  }

  // ===== USUARIOS =====

  /**
   * Obtener todos los usuarios activos
   */
  static async getUsers(req, res) {
    try {
      const { limit = 1000, isActive = true, search } = req.query;

      const where = {
        isActive: isActive === 'true' || isActive === true
      };

      if (search) {
        where.OR = [
          { name: { contains: search } },
          { email: { contains: search } },
          { username: { contains: search } }
        ];
      }

      const users = await prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          avatar: true,
          isActive: true,
          createdAt: true
        },
        orderBy: {
          name: 'asc'
        },
        take: parseInt(limit, 10)
      });

      return ResponseHelper.success(res, { users }, 'Usuarios obtenidos exitosamente');
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      return ResponseHelper.error(res, 'Error interno del servidor', 500);
    }
  }
}

module.exports = {
  // Proyectos
  getProjects: ScrumController.getProjects,
  getAllProjects: ScrumController.getAllProjects,
  getProjectById: ScrumController.getProjectById,
  createProject: ScrumController.createProject,
  updateProject: ScrumController.updateProject,
  deleteProject: ScrumController.deleteProject,
  
  // Miembros de Proyecto
  getProjectMembers: ScrumController.getProjectMembers,
  addProjectMember: ScrumController.addProjectMember,
  updateProjectMember: ScrumController.updateProjectMember,
  removeProjectMember: ScrumController.removeProjectMember,
  
  // Tareas de Proyecto
  getProjectTasks: ScrumController.getProjectTasks,
  
  // Sprints
  getSprints: ScrumController.getSprints,
  getSprintById: ScrumController.getSprintById,
  getSprintTasks: ScrumController.getSprintTasks,
  getProjectSprints: ScrumController.getProjectSprints,
  createSprint: ScrumController.createSprint,
  updateSprint: ScrumController.updateSprint,
  deleteSprint: ScrumController.deleteSprint,
  getSprintStats: ScrumController.getSprintStats,
  getSprintBurndown: ScrumController.getSprintBurndown,
  
  // Usuarios
  getUsers: ScrumController.getUsers,
  
  // Épicas
  getEpics: ScrumController.getEpics,
  getEpicById: ScrumController.getEpicById,
  createEpic: ScrumController.createEpic,
  updateEpic: ScrumController.updateEpic,
  deleteEpic: ScrumController.deleteEpic,
  
  // User Stories
  getAllUserStories: ScrumController.getAllUserStories,
  getUserStories: ScrumController.getUserStories,
  getProjectUserStories: ScrumController.getProjectUserStories,
  getUserStoryById: ScrumController.getUserStoryById,
  createUserStory: ScrumController.createUserStory,
  updateUserStory: ScrumController.updateUserStory,
  deleteUserStory: ScrumController.deleteUserStory,
  
  // Tareas
  getTasks: ScrumController.getTasks,
  getTaskById: ScrumController.getTaskById,
  createTask: ScrumController.createTask,
  updateTask: ScrumController.updateTask,
  deleteTask: ScrumController.deleteTask,
  
  // Templates
  getTemplates: ScrumController.getTemplates,
  
  // Métricas básicas
  getProjectMetrics: ScrumController.getProjectMetrics,
  getTeamMetrics: ScrumController.getTeamMetrics,
  getTeamVelocity: ScrumController.getTeamVelocity,
  getDashboard: ScrumController.getDashboard,
  
  // Panel de Control General (RF025-RF028)
  getDashboardConsolidated: ScrumController.getDashboardConsolidated,
  getProductivityMetrics: ScrumController.getProductivityMetrics,
  getDeadlineAlerts: ScrumController.getDeadlineAlerts,
  
  // Métricas y KPI (RF029-RF032)
  getCompletionByAssignee: ScrumController.getCompletionByAssignee,
  getCompletionTimeMetrics: ScrumController.getCompletionTimeMetrics,
  getWorkloadDistribution: ScrumController.getWorkloadDistribution,
  getPerformanceHistory: ScrumController.getPerformanceHistory,
  
  // Métodos adicionales
  getProjectEpics: ScrumController.getProjectEpics,
  getEpicUserStories: ScrumController.getEpicUserStories,
  getUserStoryTasks: ScrumController.getUserStoryTasks,
  getProjectTemplates: ScrumController.getProjectTemplates,
  
  // Informes
  generateWeeklyReport: ScrumController.generateWeeklyReport
};
