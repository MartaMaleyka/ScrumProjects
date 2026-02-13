import React from 'react';
import type { Task } from '../../../types/scrum';

interface TaskCardProps {
  task: Task;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  onUpdate?: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  onDragStart, 
  onDragEnd, 
  isDragging = false
}) => {
  const getPriorityColor = (priority?: string) => {
    if (!priority) return 'border-l-gray-300 bg-white';
    switch (priority) {
      case 'CRITICAL': return 'border-l-red-500 bg-red-50';
      case 'HIGH': return 'border-l-orange-500 bg-orange-50';
      case 'MEDIUM': return 'border-l-blue-500 bg-blue-50';
      case 'LOW': return 'border-l-gray-500 bg-gray-50';
      default: return 'border-l-gray-300 bg-white';
    }
  };

  const getPriorityLabel = (priority?: string) => {
    if (!priority) return '⚪';
    const labels: Record<string, string> = {
      'LOW': '🟢',
      'MEDIUM': '🟡',
      'HIGH': '🟠',
      'CRITICAL': '🔴'
    };
    return labels[priority] || '⚪';
  };

  const getTaskTypeEmoji = (type?: string) => {
    if (!type) return '📋';
    const emojis: Record<string, string> = {
      'DEVELOPMENT': '💻',
      'TESTING': '🧪',
      'DESIGN': '🎨',
      'DOCUMENTATION': '📝',
      'BUG_FIX': '🐛',
      'RESEARCH': '🔍',
      'REFACTORING': '♻️'
    };
    return emojis[type] || '📋';
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`bg-white border-l-4 ${getPriorityColor(task.priority || 'LOW')} rounded-lg p-3 shadow-sm hover:shadow-lg cursor-grab active:cursor-grabbing transition-all duration-300 transform hover:scale-[1.02] ${
        isDragging 
          ? 'opacity-40 scale-95 rotate-2 shadow-xl border-l-4 border-[#0264C5]' 
          : 'hover:border-l-[5px]'
      }`}
      style={{
        ...(isDragging && {
          transform: 'scale(0.95) rotate(2deg)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        })
      }}
    >
      {/* Título y Tipo */}
      <div className="mb-2">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 flex-1">
            {getTaskTypeEmoji(task.type || '')} {task.title || 'Tarea sin título'}
          </h4>
          <span className="text-lg flex-shrink-0">
            {getPriorityLabel(task.priority || 'LOW')}
          </span>
        </div>
        {task.description && (
          <p className="text-xs text-gray-600 line-clamp-2">
            {task.description}
          </p>
        )}
      </div>

      {/* Información Contextual */}
      {(task.userStory || task.assignee || task.estimatedHours) && (
        <div className="space-y-2 text-xs mb-2">
          {/* User Story / Epic / Sprint */}
          {task.userStory && (
            <div className="space-y-1">
              {/* User Story */}
              <div className="flex items-center gap-1 text-gray-600">
                <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="truncate font-medium">Historia de Usuario: {task.userStory.title}</span>
              </div>
              
              {/* Epic */}
              {task.userStory.epic && (
                <div className="flex items-center gap-1 text-purple-600 ml-4">
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span className="truncate text-[10px]">Epic: {task.userStory.epic.title}</span>
                </div>
              )}
              
              {/* Sprint */}
              {task.userStory.sprint && (
                <div className="flex items-center gap-1 text-blue-600 ml-4">
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="truncate text-[10px]">Sprint: {task.userStory.sprint?.name || 'Sin nombre'}</span>
                </div>
              )}
            </div>
          )}

          {/* Asignado */}
          {task.assignee && task.assignee.name && (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#0264C5] to-[#11C0F1] flex items-center justify-center text-white text-[10px] font-bold">
                {task.assignee.name && task.assignee.name.length > 0 
                  ? task.assignee.name.charAt(0).toUpperCase() 
                  : '?'}
              </div>
              <span className="text-gray-700 truncate">{task.assignee.name || 'Sin nombre'}</span>
            </div>
          )}

          {/* Horas */}
          {task.estimatedHours && (
            <div className="flex items-center gap-1 text-gray-600">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{task.estimatedHours}h</span>
              {task.actualHours && (
                <span className="text-[#11C0F1]">/ {task.actualHours}h</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Botones de Acción */}
      <div className="mt-3 pt-2 border-t border-gray-200 flex gap-1">
        <a
          href={`/tasks/detalle?id=${task.id}`}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 text-center px-2 py-1.5 text-xs text-[#0264C5] hover:text-white hover:bg-[#0264C5] border border-[#0264C5] rounded-lg font-medium transition-colors flex items-center justify-center gap-1"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Ver
        </a>
        <a
          href={`/tasks/editar?id=${task.id}`}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 text-center px-2 py-1.5 text-xs text-white bg-[#0264C5] hover:bg-[#11C0F1] rounded-lg font-medium transition-colors flex items-center justify-center gap-1"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Editar
        </a>
      </div>
    </div>
  );
};

export default TaskCard;
