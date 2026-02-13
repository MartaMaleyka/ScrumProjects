import React, { useState } from 'react';

export interface ContextItem {
  type: 'project' | 'epic' | 'sprint' | 'userStory' | 'task';
  id: number;
  name: string;
  href: string;
  status?: string;
  count?: {
    epics?: number;
    stories?: number;
    tasks?: number;
    sprints?: number;
  };
}

interface ScrumContextPanelProps {
  context: ContextItem[];
  onNavigate?: (href: string) => void;
  collapsed?: boolean;
  onToggle?: () => void;
}

const ScrumContextPanel: React.FC<ScrumContextPanelProps> = ({ 
  context, 
  onNavigate,
  collapsed = false,
  onToggle 
}) => {
  const [isExpanded, setIsExpanded] = useState(!collapsed);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    if (onToggle) onToggle();
  };

  const handleNavigate = (href: string) => {
    if (onNavigate) {
      onNavigate(href);
    } else {
      window.location.href = href;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'project':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        );
      case 'epic':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'sprint':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'userStory':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'task':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'project': return 'Proyecto';
      case 'epic': return 'Épica';
      case 'sprint': return 'Sprint';
      case 'userStory': return 'Historia';
      case 'task': return 'Tarea';
      default: return type;
    }
  };

  const getStatusColor = (status?: string) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    switch (status.toUpperCase()) {
      case 'ACTIVE':
      case 'IN_PROGRESS':
        return 'bg-green-100 text-green-800';
      case 'PLANNING':
      case 'READY':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
      case 'DONE':
        return 'bg-gray-100 text-gray-800';
      case 'ON_HOLD':
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (context.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      {/* Header colapsable */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-4 py-2 bg-gradient-to-r from-blue-deep/5 to-blue-light/5 hover:from-blue-deep/10 hover:to-blue-light/10 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <svg className="w-4 h-4 text-blue-deep" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <span className="text-sm font-semibold text-gray-900">Contexto</span>
        </div>
        <svg 
          className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Contenido */}
      {isExpanded && (
        <div className="p-3 space-y-2">
          {context.map((item, index) => (
            <div key={index} className="space-y-1">
              {/* Item principal */}
              <a
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavigate(item.href);
                }}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-blue-deep/5 transition-colors group"
              >
                <span className="text-blue-deep group-hover:text-blue-light transition-colors">
                  {getTypeIcon(item.type)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">{getTypeLabel(item.type)}</span>
                    {item.status && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                </div>
                <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>

              {/* Contadores */}
              {item.count && (
                <div className="flex items-center space-x-3 px-3 text-xs text-gray-500">
                  {item.count.epics !== undefined && (
                    <span className="flex items-center space-x-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>{item.count.epics} épicas</span>
                    </span>
                  )}
                  {item.count.stories !== undefined && (
                    <span className="flex items-center space-x-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>{item.count.stories} historias</span>
                    </span>
                  )}
                  {item.count.tasks !== undefined && (
                    <span className="flex items-center space-x-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span>{item.count.tasks} tareas</span>
                    </span>
                  )}
                  {item.count.sprints !== undefined && (
                    <span className="flex items-center space-x-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{item.count.sprints} sprints</span>
                    </span>
                  )}
                </div>
              )}

              {/* Separador */}
              {index < context.length - 1 && (
                <div className="flex items-center space-x-2 px-3 py-1">
                  <div className="flex-1 h-px bg-gray-200"></div>
                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  <div className="flex-1 h-px bg-gray-200"></div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScrumContextPanel;
