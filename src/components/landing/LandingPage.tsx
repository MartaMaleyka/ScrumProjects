import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageToggle from '../common/LanguageToggle';
import i18n from '../../i18n';

const LandingPage: React.FC = () => {
  const { t } = useTranslation();
  const [isReady, setIsReady] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  useEffect(() => {
    // Asegurarse de que i18n esté inicializado
    const checkReady = () => {
      if (i18n.isInitialized && i18n.hasResourceBundle(i18n.language || 'es', 'translation')) {
        setIsReady(true);
        return true;
      }
      return false;
    };

    // Verificar inmediatamente
    if (checkReady()) {
      return;
    }

    // Si no está listo, esperar al evento de inicialización
    const handleInitialized = () => {
      if (checkReady()) {
        setIsReady(true);
      }
    };

    i18n.on('initialized', handleInitialized);
    i18n.on('loaded', handleInitialized);

    // Timeout de seguridad
    const timeout = setTimeout(() => {
      if (!isReady) {
        console.warn('⚠️ [LandingPage] i18n no se inicializó en 2 segundos, forzando ready');
        setIsReady(true);
      }
    }, 2000);

    return () => {
      i18n.off('initialized', handleInitialized);
      i18n.off('loaded', handleInitialized);
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Mostrar loading mientras i18n se inicializa
  if (!isReady) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 relative overflow-hidden">
      {/* Language Toggle - Top Right */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageToggle variant="light" />
      </div>

      {/* Subtle animated background gradient */}
      <div 
        className="absolute inset-0 opacity-30 transition-opacity duration-1000"
        style={{
          background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(99, 102, 241, 0.1) 0%, transparent 50%)`,
        }}
      />

      {/* Content */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-16">
            {/* Logo/Icon */}
            <div className="mb-6 flex justify-center">
              <div 
                className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-indigo-500/50 cursor-pointer group"
                style={{
                  transform: `translate(${(mousePosition.x - 50) * 0.02}px, ${(mousePosition.y - 50) * 0.02}px)`,
                }}
              >
                <svg className="w-9 h-9 text-white transition-transform duration-300 group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
            </div>

            {/* Title */}
            <h1 
              className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight transition-transform duration-300"
              style={{
                transform: `translateY(${(mousePosition.y - 50) * 0.01}px)`,
              }}
            >
              {t('landing.title', 'Sprintiva')}
            </h1>
            <p 
              className="text-lg md:text-xl text-gray-600 mb-6 transition-transform duration-300"
              style={{
                transform: `translateY(${(mousePosition.y - 50) * 0.008}px)`,
              }}
            >
              {t('landing.tagline', 'Donde la estrategia se convierte en ejecución')}
            </p>
            <p 
              className="text-base text-gray-500 mb-10 max-w-xl mx-auto transition-transform duration-300"
              style={{
                transform: `translateY(${(mousePosition.y - 50) * 0.006}px)`,
              }}
            >
              {t('landing.description', 'Planifica estratégicamente. Ejecuta con precisión. Mide resultados en tiempo real.')}
            </p>

            {/* CTA Button */}
            <a
              href="/login-moderno"
              className="inline-block px-8 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/50 active:scale-95"
            >
              {t('landing.viewDemo', 'Ver Demo')}
              <svg className="inline-block w-4 h-4 ml-2 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            {/* Feature 1 */}
            <div 
              className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/20 hover:-translate-y-1 hover:border-indigo-300 cursor-pointer group"
              onMouseEnter={() => setHoveredFeature(0)}
              onMouseLeave={() => setHoveredFeature(null)}
              style={{
                transform: hoveredFeature === 0 
                  ? 'translateY(-4px) scale(1.02)' 
                  : hoveredFeature !== null 
                    ? 'scale(0.98)' 
                    : `translateY(${(mousePosition.y - 50) * 0.003}px)`,
              }}
            >
              <div 
                className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4 mx-auto transition-all duration-300 group-hover:bg-indigo-600 group-hover:scale-110"
                style={{
                  transform: hoveredFeature === 0 ? 'rotate(5deg) scale(1.1)' : 'rotate(0deg)',
                }}
              >
                <svg className="w-6 h-6 text-indigo-600 transition-colors duration-300 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center transition-colors duration-300 group-hover:text-indigo-600">
                {t('landing.scrumProjects', 'Proyectos Scrum')}
              </h3>
              <p className="text-sm text-gray-600 text-center">
                {t('landing.scrumProjectsDesc', 'Gestiona múltiples proyectos con metodología ágil Scrum')}
              </p>
            </div>

            {/* Feature 2 */}
            <div 
              className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 hover:-translate-y-1 hover:border-purple-300 cursor-pointer group"
              onMouseEnter={() => setHoveredFeature(1)}
              onMouseLeave={() => setHoveredFeature(null)}
              style={{
                transform: hoveredFeature === 1 
                  ? 'translateY(-4px) scale(1.02)' 
                  : hoveredFeature !== null 
                    ? 'scale(0.98)' 
                    : `translateY(${(mousePosition.y - 50) * 0.003}px)`,
              }}
            >
              <div 
                className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 mx-auto transition-all duration-300 group-hover:bg-purple-600 group-hover:scale-110"
                style={{
                  transform: hoveredFeature === 1 ? 'rotate(-5deg) scale(1.1)' : 'rotate(0deg)',
                }}
              >
                <svg className="w-6 h-6 text-purple-600 transition-colors duration-300 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center transition-colors duration-300 group-hover:text-purple-600">
                {t('landing.sprintsEpics', 'Sprints y Epics')}
              </h3>
              <p className="text-sm text-gray-600 text-center">
                {t('landing.sprintsEpicsDesc', 'Organiza tu trabajo en sprints y agrupa funcionalidades en epics')}
              </p>
            </div>

            {/* Feature 3 */}
            <div 
              className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-1 hover:border-blue-300 cursor-pointer group"
              onMouseEnter={() => setHoveredFeature(2)}
              onMouseLeave={() => setHoveredFeature(null)}
              style={{
                transform: hoveredFeature === 2 
                  ? 'translateY(-4px) scale(1.02)' 
                  : hoveredFeature !== null 
                    ? 'scale(0.98)' 
                    : `translateY(${(mousePosition.y - 50) * 0.003}px)`,
              }}
            >
              <div 
                className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 mx-auto transition-all duration-300 group-hover:bg-blue-600 group-hover:scale-110"
                style={{
                  transform: hoveredFeature === 2 ? 'rotate(5deg) scale(1.1)' : 'rotate(0deg)',
                }}
              >
                <svg className="w-6 h-6 text-blue-600 transition-colors duration-300 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center transition-colors duration-300 group-hover:text-blue-600">
                {t('landing.userStories', 'User Stories')}
              </h3>
              <p className="text-sm text-gray-600 text-center">
                {t('landing.userStoriesDesc', 'Crea y gestiona user stories con sus tareas asociadas')}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-12 text-gray-500">
            <p className="text-xs">{t('landing.copyright', '© 2025 Sprintiva - Donde la estrategia se convierte en ejecución')}</p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default LandingPage;

