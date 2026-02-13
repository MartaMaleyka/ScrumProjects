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
    context?: { projectName?: string; sprintName?: string; userStoryTitle?: string }
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
          addText(`Proyecto: ${context.projectName}`, 11, true);
        }
        if (context.sprintName) {
          addText(`Sprint: ${context.sprintName}`, 11, true);
        }
        if (context.userStoryTitle) {
          addText(`Historia: ${context.userStoryTitle}`, 11, true);
        }
        yPosition += 3;
      }

      // Fecha de generación
      addText(`Generado el: ${new Date().toLocaleDateString('es-PA')}`, 9, false, 'right', [128, 128, 128]);
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

      addText('Resumen', 12, true);
      addText(`Total de tareas: ${stats.total}`, 10);
      addText(`Por hacer: ${stats.todo} | En progreso: ${stats.inProgress} | En revisión: ${stats.inReview} | Completadas: ${stats.completed}`, 10);
      addText(`Horas estimadas: ${stats.totalHours}h | Horas reales: ${stats.actualHours}h`, 10);
      yPosition += 5;

      // Tabla de tareas
      if (tasks.length > 0) {
        addText('Detalle de Tareas', 12, true);
        yPosition += 3;

        const colWidths = [15, 50, 20, 20, 25, 20];
        const headers = ['ID', 'Título', 'Estado', 'Prioridad', 'Asignado', 'Horas'];
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
            this.getStatusLabel(task.status),
            this.getPriorityLabel(task.priority),
            task.assignee?.name || 'Sin asignar',
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
        addText('No hay tareas para mostrar', 10, false, 'center', [128, 128, 128]);
      }

      // Pie de página
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Página ${i} de ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      // Guardar PDF
      const fileName = `Reporte_Tareas_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
    } catch (error) {
      throw new Error('Error al generar el PDF');
    }
  }

  /**
   * Exportar tareas a Excel
   */
  exportTasksToExcel(
    tasks: Task[],
    title: string = 'Reporte de Tareas',
    context?: { projectName?: string; sprintName?: string; userStoryTitle?: string }
  ): void {
    try {
      // Preparar datos para Excel
      const excelData = tasks.map(task => ({
        'ID': task.id,
        'Título': task.title,
        'Descripción': task.description || '',
        'Estado': this.getStatusLabel(task.status),
        'Prioridad': this.getPriorityLabel(task.priority),
        'Tipo': this.getTaskTypeLabel(task.type),
        'Asignado': task.assignee?.name || 'Sin asignar',
        'Email Asignado': task.assignee?.email || '',
        'Horas Estimadas': task.estimatedHours || 0,
        'Horas Reales': task.actualHours || 0,
        'Historia de Usuario': task.userStory?.title || '',
        'Sprint': task.sprint?.name || '',
        'Fecha Creación': new Date(task.createdAt).toLocaleDateString('es-PA'),
        'Fecha Actualización': new Date(task.updatedAt).toLocaleDateString('es-PA'),
      }));

      // Crear workbook
      const wb = XLSX.utils.book_new();

      // Hoja de resumen
      const summaryData = [
        ['REPORTE DE TAREAS'],
        [''],
        ['Generado el:', new Date().toLocaleDateString('es-PA')],
        [''],
        ...(context?.projectName ? [['Proyecto:', context.projectName]] : []),
        ...(context?.sprintName ? [['Sprint:', context.sprintName]] : []),
        ...(context?.userStoryTitle ? [['Historia:', context.userStoryTitle]] : []),
        [''],
        ['RESUMEN'],
        ['Total de tareas:', tasks.length],
        ['Por hacer:', tasks.filter(t => t.status === 'TODO').length],
        ['En progreso:', tasks.filter(t => t.status === 'IN_PROGRESS').length],
        ['En revisión:', tasks.filter(t => t.status === 'IN_REVIEW').length],
        ['Completadas:', tasks.filter(t => t.status === 'COMPLETED').length],
        ['Horas estimadas:', tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0)],
        ['Horas reales:', tasks.reduce((sum, t) => sum + (t.actualHours || 0), 0)],
      ];
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen');

      // Hoja de tareas
      const tasksWs = XLSX.utils.json_to_sheet(excelData);
      XLSX.utils.book_append_sheet(wb, tasksWs, 'Tareas');

      // Guardar archivo
      const fileName = `Reporte_Tareas_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      throw new Error('Error al generar el Excel');
    }
  }

  // Helpers
  private getStatusLabel(status: string): string {
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

  private getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = {
      'LOW': 'Baja',
      'MEDIUM': 'Media',
      'HIGH': 'Alta',
      'CRITICAL': 'Crítica',
    };
    return labels[priority] || priority;
  }

  private getTaskTypeLabel(type: string): string {
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

