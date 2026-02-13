import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from '../hooks/useAuth';

// Inyectar estilos CSS para animaciones
if (typeof document !== 'undefined') {
  const styleId = 'app-wrapper-animations';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes blob {
        0% { transform: translate(0px, 0px) scale(1); }
        33% { transform: translate(30px, -50px) scale(1.1); }
        66% { transform: translate(-20px, 20px) scale(0.9); }
        100% { transform: translate(0px, 0px) scale(1); }
      }
      .animate-blob {
        animation: blob 7s infinite alternate;
      }
      .animation-delay-2000 {
        animation-delay: 2s;
      }
      .animation-delay-4000 {
        animation-delay: 4s;
      }
    `;
    document.head.appendChild(style);
  }
}

interface AppWrapperProps {
  children?: React.ReactNode;
}

// Componente interno que usa useAuth
const AppContent: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  // Redirigir al login si no está autenticado
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = '/login-moderno';
    }
  }, [isAuthenticated, isLoading]);

  // Mostrar loading mientras se verifica la autenticación
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-blue-800 to-purple-900 flex items-center justify-center relative overflow-hidden" data-app-wrapper="loading">
        {/* Animated Background Circles */}
        <div className="absolute inset-0 z-0">
          <div className="absolute -top-40 -left-40 w-80 h-80 rounded-full bg-blue-500 opacity-10 animate-blob filter blur-3xl"></div>
          <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-purple-500 opacity-10 animate-blob animation-delay-2000 filter blur-3xl"></div>
          <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-indigo-500 opacity-10 animate-blob animation-delay-4000 filter blur-3xl"></div>
        </div>
        <div className="text-center relative z-10">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-400 border-t-transparent mx-auto mb-4 shadow-lg"></div>
          <p className="text-purple-300 text-lg font-semibold">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // Si no está autenticado, mostrar loading mientras redirige
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-blue-800 to-purple-900 flex items-center justify-center relative overflow-hidden" data-app-wrapper="redirecting">
        {/* Animated Background Circles */}
        <div className="absolute inset-0 z-0">
          <div className="absolute -top-40 -left-40 w-80 h-80 rounded-full bg-blue-500 opacity-10 animate-blob filter blur-3xl"></div>
          <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-purple-500 opacity-10 animate-blob animation-delay-2000 filter blur-3xl"></div>
          <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-indigo-500 opacity-10 animate-blob animation-delay-4000 filter blur-3xl"></div>
        </div>
        <div className="text-center relative z-10">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-400 border-t-transparent mx-auto mb-4 shadow-lg"></div>
          <p className="text-purple-300 text-lg font-semibold">Redirigiendo al login...</p>
        </div>
      </div>
    );
  }

  // Si está autenticado, renderizar los children
  return (
    <div data-app-wrapper="ready">
      {children}
    </div>
  );
};

const AppWrapper: React.FC<AppWrapperProps> = ({ children }) => {
  return (
    <AuthProvider>
      <AppContent>{children}</AppContent>
    </AuthProvider>
  );
};

export default AppWrapper;

