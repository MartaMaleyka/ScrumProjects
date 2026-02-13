import React, { useState, useEffect, useRef } from 'react';

interface ScrumFloatingActionButtonProps {
  projectId?: number;
  sprintId?: number;
  userStoryId?: number;
}

interface MenuItem {
  id: string;
  label: string;
  shortLabel?: string; // Para móvil
  icon: React.ReactNode;
  href: string;
  gradient: string; // Gradiente de colores IMHPA
  iconBg: string; // Color de fondo del icono
}

const ScrumFloatingActionButton: React.FC<ScrumFloatingActionButtonProps> = ({
  projectId,
  sprintId,
  userStoryId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Debug: Log cuando el componente se monta
  useEffect(() => {
  }, [projectId, sprintId, userStoryId]);

  // Debug: Log cuando se abre/cierra el menú
  useEffect(() => {
    if (isOpen) {
    }
  }, [isOpen]);

  // Cerrar el menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Construir las URLs con los parámetros disponibles
  const buildUrl = (basePath: string) => {
    const params = new URLSearchParams();
    if (projectId) params.append('projectId', projectId.toString());
    if (sprintId) params.append('sprintId', sprintId.toString());
    if (userStoryId) params.append('userStoryId', userStoryId.toString());
    
    const queryString = params.toString();
    return queryString ? `${basePath}?${queryString}` : basePath;
  };

  // Definir los items del menú con paleta IMHPA y etiquetas claras
  const menuItems: MenuItem[] = [
    {
      id: 'epic',
      label: 'Nuevo Epic',
      shortLabel: 'Epic',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      href: buildUrl('/epics/nuevo'),
      gradient: 'from-purple-500 to-purple-600',
      iconBg: 'bg-purple-100',
    },
    {
      id: 'story',
      label: 'Nueva Historia',
      shortLabel: 'Historia',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      href: buildUrl('/user-stories/nuevo'),
      gradient: 'from-blue-deep to-blue-light',
      iconBg: 'bg-blue-100',
    },
    {
      id: 'sprint',
      label: 'Nuevo Sprint',
      shortLabel: 'Sprint',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      href: buildUrl('/sprints/nuevo'),
      gradient: 'from-yellow-sun to-yellow-soft',
      iconBg: 'bg-yellow-100',
    },
    {
      id: 'task',
      label: 'Nueva Tarea',
      shortLabel: 'Tarea',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      href: buildUrl('/tasks/nuevo'),
      gradient: 'from-green-500 to-green-600',
      iconBg: 'bg-green-100',
    },
  ];

  // Calcular posiciones para el menú (vertical hacia arriba)
  const getItemPosition = (index: number) => {
    // Espaciado vertical entre elementos (altura del botón + espacio)
    const verticalSpacing = 80; // 64px botón + 16px espacio
    return {
      y: -(verticalSpacing * (index + 1)), // Negativo porque va hacia arriba
    };
  };

  return (
    <>
      {/* Estilos de animación globales */}
      <style>{`
        @keyframes fabSlideUp {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .fab-menu-item {
          animation: fabSlideUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
      `}</style>

      <div 
        ref={menuRef} 
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999]"
      >
        {/* Menú vertical con etiquetas visibles */}
        {isOpen && (
          <div className="absolute bottom-0 right-0 mb-20 sm:mb-24 space-y-3">
            {menuItems.map((item, index) => {
              const position = getItemPosition(index);
              return (
                <a
                  key={item.id}
                  href={item.href}
                  className={`fab-menu-item group relative flex items-center gap-3 bg-white rounded-2xl shadow-xl border-2 border-gray-200 hover:border-gray-300 transition-all duration-300 hover:shadow-2xl hover:scale-105 active:scale-95 overflow-hidden`}
                  style={{
                    animationDelay: `${index * 0.05}s`,
                    minWidth: '200px',
                    padding: '12px 16px',
                  }}
                  onClick={() => setIsOpen(false)}
                >
                  {/* Gradiente de fondo sutil */}
                  <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
                  
                  {/* Icono con fondo de color */}
                  <div className={`${item.iconBg} rounded-xl p-2.5 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                    {React.cloneElement(item.icon as React.ReactElement, { 
                      className: 'w-5 h-5 text-gray-700'
                    })}
                  </div>
                  
                  {/* Etiqueta de texto */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm sm:text-base font-chatgpt-semibold text-gray-900 group-hover:text-gray-950 transition-colors">
                      <span className="hidden sm:inline">{item.label}</span>
                      <span className="sm:hidden">{item.shortLabel || item.label}</span>
                    </div>
                    <div className="text-xs text-gray-500 hidden sm:block">
                      Crear nuevo elemento
                    </div>
                  </div>
                  
                  {/* Flecha indicadora */}
                  <svg 
                    className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              );
            })}
          </div>
        )}

        {/* Botón principal mejorado */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`relative w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-deep to-blue-light text-white rounded-2xl shadow-2xl flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95 hover:shadow-3xl ${
            isOpen ? 'rotate-45 bg-gradient-to-r from-gray-600 to-gray-700' : 'rotate-0'
          }`}
          aria-label={isOpen ? "Cerrar menú" : "Abrir menú de acciones rápidas"}
          aria-expanded={isOpen}
        >
          <svg
            className="w-6 h-6 sm:w-7 sm:h-7 transition-transform duration-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            )}
          </svg>
          
          {/* Indicador de pulso cuando está cerrado */}
          {!isOpen && (
            <span className="absolute inset-0 rounded-2xl bg-white/20 animate-ping opacity-75"></span>
          )}
        </button>

        {/* Overlay mejorado para cerrar */}
        {isOpen && (
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300"
            style={{ zIndex: 9998 }}
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
        )}
      </div>
    </>
  );
};

export default ScrumFloatingActionButton;

