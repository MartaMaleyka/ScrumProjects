import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from '../../hooks/useAuth';
import Login from './Login';

// Componente interno que maneja la redirección después del login exitoso
const LoginContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // Redirigir a /scrum después del login exitoso
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      window.location.href = '/scrum';
    }
  }, [isAuthenticated, isLoading]);

  // Mostrar loading mientras se verifica la autenticación inicial
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-blue-800 to-purple-900 flex items-center justify-center relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>
        <div className="text-center relative z-10">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-400 border-t-transparent mx-auto mb-4 shadow-lg"></div>
          <p className="text-purple-300 text-lg font-semibold">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // Si ya está autenticado, mostrar loading mientras redirige
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-blue-800 to-purple-900 flex items-center justify-center relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>
        <div className="text-center relative z-10">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-400 border-t-transparent mx-auto mb-4 shadow-lg"></div>
          <p className="text-green-300 text-lg font-semibold">Redirigiendo al dashboard...</p>
        </div>
      </div>
    );
  }

  // Mostrar el formulario de login
  return <Login />;
};

// Componente wrapper que proporciona el AuthProvider
const LoginWrapper: React.FC = () => {
  return (
    <AuthProvider>
      <LoginContent />
    </AuthProvider>
  );
};

export default LoginWrapper;