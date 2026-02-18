/**
 * Una sola isla React: AuthProvider + verificación de sesión + ScrumDashboard.
 * Así el header (AppSidebarLayout) siempre recibe el contexto de auth.
 */
import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import { ToastProvider } from './ui/Toast';
import ScrumDashboard from './scrum/ScrumDashboard';
import QuickSearch from './ui/QuickSearch';
import '../i18n'; // Inicializar i18n

const AppContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const [showQuickSearch, setShowQuickSearch] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = '/login-moderno';
    }
  }, [isAuthenticated, isLoading]);

  // Atajo de teclado Ctrl+K para búsqueda rápida
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowQuickSearch(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-blue-800 to-purple-900 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute -top-40 -left-40 w-80 h-80 rounded-full bg-blue-500 opacity-10 animate-pulse filter blur-3xl" />
          <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-purple-500 opacity-10 animate-pulse filter blur-3xl" style={{ animationDelay: '2s' }} />
        </div>
        <div className="text-center relative z-10">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-400 border-t-transparent mx-auto mb-4" />
          <p className="text-purple-300 text-lg font-semibold">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-blue-800 to-purple-900 flex items-center justify-center relative overflow-hidden">
        <div className="text-center relative z-10">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-400 border-t-transparent mx-auto mb-4" />
          <p className="text-purple-300 text-lg font-semibold">Redirigiendo al login...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      <QuickSearch isOpen={showQuickSearch} onClose={() => setShowQuickSearch(false)} />
    </>
  );
};

const ScrumApp: React.FC = () => (
  <AuthProvider>
    <ToastProvider>
      <AppContent>
        <ScrumDashboard />
      </AppContent>
    </ToastProvider>
  </AuthProvider>
);

export default ScrumApp;
