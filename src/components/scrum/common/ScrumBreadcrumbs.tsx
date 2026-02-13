import React, { useEffect } from 'react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
}

interface ScrumBreadcrumbsProps {
  items: BreadcrumbItem[];
  showBackButton?: boolean;
  onBack?: () => void;
}

const ScrumBreadcrumbs: React.FC<ScrumBreadcrumbsProps> = ({ 
  items, 
  showBackButton = true,
  onBack 
}) => {
  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Alt + Flecha izquierda = Volver
      if (event.altKey && event.key === 'ArrowLeft') {
        event.preventDefault();
        if (onBack) {
          onBack();
        } else if (items.length > 1 && items[items.length - 2]?.href) {
          window.location.href = items[items.length - 2].href!;
        } else {
          window.history.back();
        }
      }
      
      // Alt + Home = Ir a Proyectos
      if (event.altKey && event.key === 'Home') {
        event.preventDefault();
        window.location.href = '/proyectos';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [items, onBack]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (items.length > 1 && items[items.length - 2]?.href) {
      window.location.href = items[items.length - 2].href;
    } else {
      window.history.back();
    }
  };

  return (
    <div className="bg-gradient-to-r from-[#F2ECDF] to-gray-50 border-b border-gray-200 px-3 sm:px-4 md:px-6 py-2 sm:py-3">
      <div className="flex justify-center">
        <div className="max-w-7xl w-full">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Breadcrumbs mejorados */}
            <nav className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm flex-1 min-w-0 overflow-x-auto scrollbar-hide" aria-label="Breadcrumb">
              {items.map((item, index) => {
                const isLast = index === items.length - 1;
                const isClickable = !isLast && (item.href || item.onClick);

                return (
                  <React.Fragment key={index}>
                    {isClickable ? (
                      <a
                        href={item.href}
                        onClick={(e) => {
                          if (item.onClick) {
                            e.preventDefault();
                            item.onClick();
                          }
                        }}
                        className="flex items-center space-x-1 text-[#777777] hover:text-[#0264C5] transition-colors duration-200 group flex-shrink-0"
                        title={item.label}
                      >
                        {item.icon && <span className="flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">{item.icon}</span>}
                        <span className="truncate max-w-[120px] sm:max-w-[200px] md:max-w-none">{item.label}</span>
                      </a>
                    ) : (
                      <span 
                        className="flex items-center space-x-1 text-[#0264C5] font-chatgpt-medium truncate max-w-[120px] sm:max-w-[200px] md:max-w-none flex-shrink-0"
                        title={item.label}
                      >
                        {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                        <span className="truncate">{item.label}</span>
                      </span>
                    )}
                    {!isLast && (
                      <svg 
                        className="w-3 h-3 sm:w-4 sm:h-4 text-[#777777] flex-shrink-0 mx-0.5 sm:mx-1" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </React.Fragment>
                );
              })}
            </nav>

            {/* Botón Volver mejorado */}
            {showBackButton && items.length > 1 && (
              <button
                onClick={handleBack}
                className="ml-2 sm:ml-4 flex items-center space-x-1 px-2 sm:px-3 py-1.5 text-xs sm:text-sm text-[#777777] hover:text-[#0264C5] hover:bg-white/50 rounded-lg transition-all duration-200 flex-shrink-0"
                title="Volver (Alt + ←)"
              >
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="hidden sm:inline">Volver</span>
              </button>
            )}
          </div>
        </div>
      </div>
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default ScrumBreadcrumbs;

