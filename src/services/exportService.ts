import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import type { Task, Project, Sprint, UserStory, Epic } from '../types/scrum';

/**
 * Servicio para exportar datos de Scrum a PDF y Excel
 */
class ExportService {
  /**
   * Exportar tareas a PDF
   */
  async exportTasksToPDF(
    tasks: Task[],
    title: string = 'Reporte de Tareas',
    context?: { projectName?: string; sprintName?: string; userStoryTitle?: string },
    t?: (key: string, defaultValue?: string) => string
  ): Promise<void> {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let yPosition = margin;

      // Función para agregar texto
      const addText = (
        text: string,
        fontSize: number = 10,
        isBold: boolean = false,
        alignment: 'left' | 'center' | 'right' = 'left',
        color: [number, number, number] = [0, 0, 0]
      ) => {
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        doc.setTextColor(color[0], color[1], color[2]);
        
        const lines = doc.splitTextToSize(text, pageWidth - 2 * margin);
        lines.forEach((line: string) => {
          if (yPosition > pageHeight - margin - 10) {
            doc.addPage();
            yPosition = margin;
          }
          
          if (alignment === 'center') {
            doc.text(line, pageWidth / 2, yPosition, { align: 'center' });
          } else if (alignment === 'right') {
            doc.text(line, pageWidth - margin, yPosition, { align: 'right' });
          } else {
            doc.text(line, margin, yPosition);
          }
          yPosition += fontSize * 0.5;
        });
      };

      // Título
      addText(title, 16, true, 'center', [59, 130, 246]); // Color azul moderno
      yPosition += 5;

      // Contexto
      if (context) {
        if (context.projectName) {
          addText(`${t ? t('export.project', 'Proyecto') : 'Proyecto'}: ${context.projectName}`, 11, true);
        }
        if (context.sprintName) {
          addText(`${t ? t('export.sprint', 'Sprint') : 'Sprint'}: ${context.sprintName}`, 11, true);
        }
        if (context.userStoryTitle) {
          addText(`${t ? t('export.userStory', 'Historia') : 'Historia'}: ${context.userStoryTitle}`, 11, true);
        }
        yPosition += 3;
      }

      // Fecha de generación
      const locale = t ? (t('common.locale', 'es-ES') as string) : 'es-ES';
      addText(`${t ? t('export.generatedOn', 'Generado el') : 'Generado el'}: ${new Date().toLocaleDateString(locale)}`, 9, false, 'right', [128, 128, 128]);
      yPosition += 5;

      // Estadísticas
      const stats = {
        total: tasks.length,
        todo: tasks.filter(t => t.status === 'TODO').length,
        inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
        inReview: tasks.filter(t => t.status === 'IN_REVIEW').length,
        completed: tasks.filter(t => t.status === 'COMPLETED').length,
        totalHours: tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0),
        actualHours: tasks.reduce((sum, t) => sum + (t.actualHours || 0), 0),
      };

      addText(t ? t('export.summary', 'Resumen') : 'Resumen', 12, true);
      addText(`${t ? t('export.totalTasks', 'Total de tareas') : 'Total de tareas'}: ${stats.total}`, 10);
      addText(`${t ? t('tasks.status.todo', 'Por hacer') : 'Por hacer'}: ${stats.todo} | ${t ? t('tasks.status.inProgress', 'En progreso') : 'En progreso'}: ${stats.inProgress} | ${t ? t('tasks.status.inReview', 'En revisión') : 'En revisión'}: ${stats.inReview} | ${t ? t('tasks.status.completed', 'Completadas') : 'Completadas'}: ${stats.completed}`, 10);
      addText(`${t ? t('export.estimatedHours', 'Horas estimadas') : 'Horas estimadas'}: ${stats.totalHours}h | ${t ? t('export.actualHours', 'Horas reales') : 'Horas reales'}: ${stats.actualHours}h`, 10);
      yPosition += 5;

      // Tabla de tareas
      if (tasks.length > 0) {
        addText(t ? t('export.taskDetails', 'Detalle de Tareas') : 'Detalle de Tareas', 12, true);
        yPosition += 3;

        const colWidths = [15, 50, 20, 20, 25, 20];
        const headers = [
          t ? t('export.id', 'ID') : 'ID',
          t ? t('export.title', 'Título') : 'Título',
          t ? t('export.status', 'Estado') : 'Estado',
          t ? t('export.priority', 'Prioridad') : 'Prioridad',
          t ? t('export.assigned', 'Asignado') : 'Asignado',
          t ? t('export.hours', 'Horas') : 'Horas'
        ];
        const startX = margin;

        // Encabezado de tabla
        doc.setFillColor(59, 130, 246); // Azul moderno
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        
        let xPos = startX;
        headers.forEach((header, index) => {
          doc.rect(xPos, yPosition, colWidths[index], 7, 'F');
          doc.text(header, xPos + 2, yPosition + 5, { maxWidth: colWidths[index] - 4 });
          xPos += colWidths[index];
        });
        yPosition += 7;

        // Filas de datos
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);

        tasks.forEach((task, index) => {
          if (yPosition > pageHeight - margin - 15) {
            doc.addPage();
            yPosition = margin;
          }

          // Color alternado para filas
          if (index % 2 === 0) {
            doc.setFillColor(245, 245, 245);
            doc.rect(startX, yPosition, pageWidth - 2 * margin, 6, 'F');
          }

          xPos = startX;
          const rowData = [
            task.id.toString(),
            task.title.substring(0, 30),
            this.getStatusLabel(task.status, t),
            this.getPriorityLabel(task.priority, t),
            task.assignee?.name || (t ? t('export.unassigned', 'Sin asignar') : 'Sin asignar'),
            `${task.estimatedHours || 0}h${task.actualHours ? `/${task.actualHours}h` : ''}`
          ];

          rowData.forEach((cell, cellIndex) => {
            doc.rect(xPos, yPosition, colWidths[cellIndex], 6);
            doc.text(cell, xPos + 1, yPosition + 4, { maxWidth: colWidths[cellIndex] - 2 });
            xPos += colWidths[cellIndex];
          });

          yPosition += 6;
        });
      } else {
        addText(t ? t('export.noTasks', 'No hay tareas para mostrar') : 'No hay tareas para mostrar', 10, false, 'center', [128, 128, 128]);
      }

      // Pie de página
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          t ? t('export.page', 'Página {{current}} de {{total}}', { current: i, total: totalPages }) : `Página ${i} de ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      // Guardar PDF
      const fileName = `${t ? t('export.tasksReport', 'Reporte_Tareas') : 'Reporte_Tareas'}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
    } catch (error) {
      throw new Error(t ? t('export.pdfError', 'Error al generar el PDF') : 'Error al generar el PDF');
    }
  }

  /**
   * Exportar tareas a Excel
   */
  exportTasksToExcel(
    tasks: Task[],
    title: string = 'Reporte de Tareas',
    context?: { projectName?: string; sprintName?: string; userStoryTitle?: string },
    t?: (key: string, defaultValue?: string) => string
  ): void {
    try {
      const locale = t ? (t('common.locale', 'es-ES') as string) : 'es-ES';
      
      // Preparar datos para Excel
      const excelData = tasks.map(task => ({
        [t ? t('export.id', 'ID') : 'ID']: task.id,
        [t ? t('export.title', 'Título') : 'Título']: task.title,
        [t ? t('export.description', 'Descripción') : 'Descripción']: task.description || '',
        [t ? t('export.status', 'Estado') : 'Estado']: this.getStatusLabel(task.status, t),
        [t ? t('export.priority', 'Prioridad') : 'Prioridad']: this.getPriorityLabel(task.priority, t),
        [t ? t('export.type', 'Tipo') : 'Tipo']: this.getTaskTypeLabel(task.type, t),
        [t ? t('export.assigned', 'Asignado') : 'Asignado']: task.assignee?.name || (t ? t('export.unassigned', 'Sin asignar') : 'Sin asignar'),
        [t ? t('export.assignedEmail', 'Email Asignado') : 'Email Asignado']: task.assignee?.email || '',
        [t ? t('export.estimatedHours', 'Horas Estimadas') : 'Horas Estimadas']: task.estimatedHours || 0,
        [t ? t('export.actualHours', 'Horas Reales') : 'Horas Reales']: task.actualHours || 0,
        [t ? t('export.userStory', 'Historia de Usuario') : 'Historia de Usuario']: task.userStory?.title || '',
        [t ? t('export.sprint', 'Sprint') : 'Sprint']: task.sprint?.name || '',
        [t ? t('export.createdDate', 'Fecha Creación') : 'Fecha Creación']: new Date(task.createdAt).toLocaleDateString(locale),
        [t ? t('export.updatedDate', 'Fecha Actualización') : 'Fecha Actualización']: new Date(task.updatedAt).toLocaleDateString(locale),
      }));

      // Crear workbook
      const wb = XLSX.utils.book_new();

      // Hoja de resumen
      const summaryData = [
        [t ? t('export.tasksReport', 'REPORTE DE TAREAS') : 'REPORTE DE TAREAS'],
        [''],
        [t ? t('export.generatedOn', 'Generado el') : 'Generado el:', new Date().toLocaleDateString(locale)],
        [''],
        ...(context?.projectName ? [[t ? t('export.project', 'Proyecto') : 'Proyecto:', context.projectName]] : []),
        ...(context?.sprintName ? [[t ? t('export.sprint', 'Sprint') : 'Sprint:', context.sprintName]] : []),
        ...(context?.userStoryTitle ? [[t ? t('export.userStory', 'Historia') : 'Historia:', context.userStoryTitle]] : []),
        [''],
        [t ? t('export.summary', 'RESUMEN') : 'RESUMEN'],
        [t ? t('export.totalTasks', 'Total de tareas') : 'Total de tareas:', tasks.length],
        [t ? t('tasks.status.todo', 'Por hacer') : 'Por hacer:', tasks.filter(t => t.status === 'TODO').length],
        [t ? t('tasks.status.inProgress', 'En progreso') : 'En progreso:', tasks.filter(t => t.status === 'IN_PROGRESS').length],
        [t ? t('tasks.status.inReview', 'En revisión') : 'En revisión:', tasks.filter(t => t.status === 'IN_REVIEW').length],
        [t ? t('tasks.status.completed', 'Completadas') : 'Completadas:', tasks.filter(t => t.status === 'COMPLETED').length],
        [t ? t('export.estimatedHours', 'Horas estimadas') : 'Horas estimadas:', tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0)],
        [t ? t('export.actualHours', 'Horas reales') : 'Horas reales:', tasks.reduce((sum, t) => sum + (t.actualHours || 0), 0)],
      ];
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, t ? t('export.summary', 'Resumen') : 'Resumen');

      // Hoja de tareas
      const tasksWs = XLSX.utils.json_to_sheet(excelData);
      XLSX.utils.book_append_sheet(wb, tasksWs, t ? t('tasks.title', 'Tareas') : 'Tareas');

      // Guardar archivo
      const fileName = `${t ? t('export.tasksReport', 'Reporte_Tareas') : 'Reporte_Tareas'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      throw new Error(t ? t('export.excelError', 'Error al generar el Excel') : 'Error al generar el Excel');
    }
  }

  // Helpers
  private getStatusLabel(status: string, t?: (key: string, defaultValue?: string) => string): string {
    if (t) {
      const statusMap: Record<string, string> = {
        'TODO': t('tasks.status.todo', 'Por Hacer'),
        'IN_PROGRESS': t('tasks.status.inProgress', 'En Progreso'),
        'IN_REVIEW': t('tasks.status.inReview', 'En Revisión'),
        'COMPLETED': t('tasks.status.completed', 'Completado'),
        'CANCELLED': t('common.statusCancelled', 'Cancelado'),
        'PLANNING': t('common.statusPlanning', 'Planificación'),
        'ACTIVE': t('common.statusActive', 'Activo'),
        'ON_HOLD': t('common.statusOnHold', 'En Espera'),
      };
      return statusMap[status] || status;
    }
    const labels: Record<string, string> = {
      'TODO': 'Por Hacer',
      'IN_PROGRESS': 'En Progreso',
      'IN_REVIEW': 'En Revisión',
      'COMPLETED': 'Completado',
      'CANCELLED': 'Cancelado',
      'PLANNING': 'Planificación',
      'ACTIVE': 'Activo',
      'ON_HOLD': 'En Espera',
    };
    return labels[status] || status;
  }

  private getPriorityLabel(priority: string, t?: (key: string, defaultValue?: string) => string): string {
    if (t) {
      const priorityMap: Record<string, string> = {
        'LOW': t('common.priority.low', 'Baja'),
        'MEDIUM': t('common.priority.medium', 'Media'),
        'HIGH': t('common.priority.high', 'Alta'),
        'CRITICAL': t('common.priority.critical', 'Crítica'),
      };
      return priorityMap[priority] || priority;
    }
    const labels: Record<string, string> = {
      'LOW': 'Baja',
      'MEDIUM': 'Media',
      'HIGH': 'Alta',
      'CRITICAL': 'Crítica',
    };
    return labels[priority] || priority;
  }

  private getTaskTypeLabel(type: string, t?: (key: string, defaultValue?: string) => string): string {
    if (t) {
      const typeMap: Record<string, string> = {
        'DEVELOPMENT': t('tasks.types.development', 'Desarrollo'),
        'TESTING': t('tasks.types.testing', 'Testing'),
        'DESIGN': t('tasks.types.design', 'Diseño'),
        'DOCUMENTATION': t('tasks.types.documentation', 'Documentación'),
        'BUG_FIX': t('tasks.types.bugFix', 'Corrección'),
        'RESEARCH': t('tasks.types.research', 'Investigación'),
        'REFACTORING': t('tasks.types.refactoring', 'Refactorización'),
      };
      return typeMap[type] || type;
    }
    const labels: Record<string, string> = {
      'DEVELOPMENT': 'Desarrollo',
      'TESTING': 'Testing',
      'DESIGN': 'Diseño',
      'DOCUMENTATION': 'Documentación',
      'BUG_FIX': 'Corrección',
      'RESEARCH': 'Investigación',
      'REFACTORING': 'Refactorización',
    };
    return labels[type] || type;
  }
}

export const exportService = new ExportService();

