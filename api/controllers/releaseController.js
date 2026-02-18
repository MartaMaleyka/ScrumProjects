const { prisma } = require('../config/database');
const { success, error } = require('../utils/responseHelper');

class ReleaseController {
  /**
   * Listar releases de un proyecto
   * GET /api/scrum/projects/:projectId/releases
   */
  static async getReleases(req, res) {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      console.log('🔍 [getReleases] Obteniendo releases para proyecto:', projectId);

      const releases = await prisma.release.findMany({
        where: { projectId },
        include: {
          notes: {
            orderBy: { createdAt: 'desc' },
          },
          epicReleases: {
            include: {
              epic: {
                select: {
                  id: true,
                  title: true,
                  status: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return success(res, { releases }, 'Releases obtenidos exitosamente');
    } catch (err) {
      console.error('Error en getReleases:', err);
      console.error('Stack:', err.stack);
      return error(res, err.message || 'Error al obtener releases', 500);
    }
  }

  /**
   * Crear release
   * POST /api/scrum/projects/:projectId/releases
   */
  static async createRelease(req, res) {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const { version, name, description, plannedDate, epicIds = [] } = req.body;

      if (!version) {
        return error(res, 'La versión es requerida', 400);
      }

      // Verificar que la versión no exista
      const existing = await prisma.release.findUnique({
        where: {
          projectId_version: {
            projectId,
            version,
          },
        },
      });

      if (existing) {
        return error(res, 'Esta versión ya existe para este proyecto', 400);
      }

      const release = await prisma.release.create({
        data: {
          projectId,
          version,
          name,
          description,
          plannedDate: plannedDate ? new Date(plannedDate) : null,
          epicReleases: {
            create: epicIds.map((epicId) => ({
              epicId: parseInt(epicId, 10),
            })),
          },
        },
        include: {
          epicReleases: {
            include: {
              epic: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
      });

      return success(res, { release }, 'Release creado exitosamente');
    } catch (err) {
      console.error('Error en createRelease:', err);
      return error(res, err.message || 'Error al crear release', 500);
    }
  }

  /**
   * Obtener release
   * GET /api/scrum/releases/:id
   */
  static async getRelease(req, res) {
    try {
      const id = parseInt(req.params.id, 10);

      const release = await prisma.release.findUnique({
        where: { id },
        include: {
          notes: {
            orderBy: { createdAt: 'desc' },
            include: {
              task: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
          epicReleases: {
            include: {
              epic: {
                select: {
                  id: true,
                  title: true,
                  status: true,
                },
              },
            },
          },
        },
      });

      if (!release) {
        return error(res, 'Release no encontrado', 404);
      }

      return success(res, { release }, 'Release obtenido exitosamente');
    } catch (err) {
      console.error('Error en getRelease:', err);
      return error(res, err.message || 'Error al obtener release', 500);
    }
  }

  /**
   * Actualizar release
   * PUT /api/scrum/releases/:id
   */
  static async updateRelease(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const { version, name, description, status, releaseDate, plannedDate, epicIds } = req.body;

      const release = await prisma.release.findUnique({
        where: { id },
      });

      if (!release) {
        return error(res, 'Release no encontrado', 404);
      }

      const updateData = {};
      if (version !== undefined) updateData.version = version;
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (status !== undefined) updateData.status = status;
      if (releaseDate !== undefined) updateData.releaseDate = releaseDate ? new Date(releaseDate) : null;
      if (plannedDate !== undefined) updateData.plannedDate = plannedDate ? new Date(plannedDate) : null;

      // Actualizar épicas asociadas si se proporcionan
      if (epicIds !== undefined) {
        // Eliminar asociaciones existentes
        await prisma.epicRelease.deleteMany({
          where: { releaseId: id },
        });

        // Crear nuevas asociaciones
        if (epicIds.length > 0) {
          await prisma.epicRelease.createMany({
            data: epicIds.map((epicId) => ({
              releaseId: id,
              epicId: parseInt(epicId, 10),
            })),
          });
        }
      }

      const updatedRelease = await prisma.release.update({
        where: { id },
        data: updateData,
        include: {
          notes: true,
          epicReleases: {
            include: {
              epic: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
      });

      return success(res, { release: updatedRelease }, 'Release actualizado exitosamente');
    } catch (err) {
      console.error('Error en updateRelease:', err);
      return error(res, err.message || 'Error al actualizar release', 500);
    }
  }

  /**
   * Eliminar release
   * DELETE /api/scrum/releases/:id
   */
  static async deleteRelease(req, res) {
    try {
      const id = parseInt(req.params.id, 10);

      await prisma.release.delete({
        where: { id },
      });

      return success(res, null, 'Release eliminado exitosamente');
    } catch (err) {
      console.error('Error en deleteRelease:', err);
      return error(res, err.message || 'Error al eliminar release', 500);
    }
  }

  /**
   * Generar release notes automáticamente
   * POST /api/scrum/releases/:id/generate-notes
   */
  static async generateReleaseNotes(req, res) {
    try {
      const releaseId = parseInt(req.params.id, 10);

      const release = await prisma.release.findUnique({
        where: { id: releaseId },
        include: {
          epicReleases: {
            include: {
              epic: {
                include: {
                  userStories: {
                    include: {
                      tasks: {
                        where: {
                          status: 'COMPLETED',
                          completedAt: {
                            not: null,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!release) {
        return error(res, 'Release no encontrado', 404);
      }

      // Eliminar notas existentes generadas automáticamente
      await prisma.releaseNote.deleteMany({
        where: {
          releaseId,
          taskId: { not: null }, // Solo las generadas automáticamente tienen taskId
        },
      });

      const notes = [];

      // Generar notas desde épicas completadas
      for (const epicRelease of release.epicReleases) {
        const epic = epicRelease.epic;
        if (epic.status === 'COMPLETED') {
          notes.push({
            releaseId,
            type: 'feature',
            title: `Épica: ${epic.title}`,
            description: epic.description || `Completada la épica ${epic.title}`,
          });
        }

        // Generar notas desde tareas completadas
        for (const story of epic.userStories || []) {
          for (const task of story.tasks || []) {
            if (task.status === 'COMPLETED' && task.completedAt) {
              // Determinar tipo según el tipo de tarea
              let noteType = 'improvement';
              if (task.type === 'BUG_FIX') {
                noteType = 'bugfix';
              } else if (task.type === 'DEVELOPMENT') {
                noteType = 'feature';
              }

              notes.push({
                releaseId,
                taskId: task.id,
                type: noteType,
                title: task.title,
                description: task.description,
              });
            }
          }
        }
      }

      // Crear las notas
      if (notes.length > 0) {
        await prisma.releaseNote.createMany({
          data: notes,
        });
      }

      // Obtener todas las notas actualizadas
      const updatedNotes = await prisma.releaseNote.findMany({
        where: { releaseId },
        orderBy: [
          { type: 'asc' },
          { createdAt: 'desc' },
        ],
        include: {
          task: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      return success(
        res,
        { notes: updatedNotes, generated: notes.length },
        `Se generaron ${notes.length} release notes exitosamente`
      );
    } catch (err) {
      console.error('Error en generateReleaseNotes:', err);
      return error(res, err.message || 'Error al generar release notes', 500);
    }
  }

  /**
   * Obtener changelog de un release
   * GET /api/scrum/releases/:id/changelog
   */
  static async getChangelog(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const format = req.query.format || 'json'; // json o markdown
      const lang = req.query.lang || req.headers['accept-language']?.split(',')[0]?.split('-')[0] || 'es'; // Idioma: es o en

      const release = await prisma.release.findUnique({
        where: { id },
        include: {
          notes: {
            orderBy: [
              { type: 'asc' },
              { createdAt: 'desc' },
            ],
            include: {
              task: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
      });

      if (!release) {
        return error(res, 'Release no encontrado', 404);
      }

      if (format === 'markdown') {
        // Generar changelog en formato Markdown
        try {
          const changelog = ReleaseController.generateMarkdownChangelog(release, lang);
          res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
          return res.send(changelog);
        } catch (markdownError) {
          console.error('Error generating markdown changelog:', markdownError);
          return error(res, 'Error al generar changelog en formato markdown', 500);
        }
      }

      return success(res, { changelog: release.notes }, 'Changelog obtenido exitosamente');
    } catch (err) {
      console.error('Error en getChangelog:', err);
      return error(res, err.message || 'Error al obtener changelog', 500);
    }
  }

  /**
   * Generar changelog en formato Markdown
   */
  static generateMarkdownChangelog(release, lang = 'es') {
    if (!release) {
      throw new Error('Release no proporcionado');
    }

    // Traducciones
    const translations = {
      es: {
        version: 'Versión',
        releaseDate: 'Fecha de lanzamiento',
        plannedDate: 'Fecha planificada',
        noNotes: 'No hay notas de release disponibles.',
        features: '✨ Nuevas Funcionalidades',
        bugfixes: '🐛 Correcciones de Errores',
        improvements: '⚡ Mejoras',
        breaking: '💥 Cambios Importantes',
      },
      en: {
        version: 'Version',
        releaseDate: 'Release date',
        plannedDate: 'Planned date',
        noNotes: 'No release notes available.',
        features: '✨ New Features',
        bugfixes: '🐛 Bug Fixes',
        improvements: '⚡ Improvements',
        breaking: '💥 Breaking Changes',
      },
    };

    const t = translations[lang] || translations.es;
    const locale = lang === 'en' ? 'en-US' : 'es-ES';

    const lines = [];
    
    lines.push(`# ${release.name || `Release ${release.version}`}`);
    lines.push('');
    lines.push(`**${t.version}:** ${release.version}`);
    if (release.releaseDate) {
      try {
        const releaseDate = new Date(release.releaseDate);
        if (!isNaN(releaseDate.getTime())) {
          lines.push(`**${t.releaseDate}:** ${releaseDate.toLocaleDateString(locale)}`);
        }
      } catch (dateError) {
        console.error('Error formatting release date:', dateError);
      }
    }
    if (release.plannedDate) {
      try {
        const plannedDate = new Date(release.plannedDate);
        if (!isNaN(plannedDate.getTime())) {
          lines.push(`**${t.plannedDate}:** ${plannedDate.toLocaleDateString(locale)}`);
        }
      } catch (dateError) {
        console.error('Error formatting planned date:', dateError);
      }
    }
    if (release.description) {
      lines.push('');
      lines.push(release.description);
    }
    lines.push('');
    lines.push('---');
    lines.push('');

    // Verificar que notes existe y es un array
    if (!release.notes || !Array.isArray(release.notes)) {
      lines.push(`_${t.noNotes}_`);
      return lines.join('\n');
    }

    // Si no hay notas, mostrar mensaje
    if (release.notes.length === 0) {
      lines.push(`_${t.noNotes}_`);
      return lines.join('\n');
    }

    // Agrupar notas por tipo
    const notesByType = {
      feature: [],
      bugfix: [],
      improvement: [],
      breaking: [],
    };

    release.notes.forEach((note) => {
      if (note && note.type) {
        if (notesByType[note.type]) {
          notesByType[note.type].push(note);
        } else {
          notesByType.improvement.push(note);
        }
      }
    });

    // Agregar secciones por tipo
    const typeLabels = {
      feature: t.features,
      bugfix: t.bugfixes,
      improvement: t.improvements,
      breaking: t.breaking,
    };

    Object.entries(typeLabels).forEach(([type, label]) => {
      if (notesByType[type] && notesByType[type].length > 0) {
        lines.push(`## ${label}`);
        lines.push('');
        notesByType[type].forEach((note) => {
          if (note && note.title) {
            lines.push(`- **${note.title}**`);
            if (note.description) {
              // Escapar caracteres especiales de markdown
              const description = note.description.replace(/\n/g, ' ').trim();
              if (description) {
                lines.push(`  ${description}`);
              }
            }
          }
        });
        lines.push('');
      }
    });

    return lines.join('\n');
  }
}

module.exports = ReleaseController;

