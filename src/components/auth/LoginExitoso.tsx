import React from 'react';
import { useAuth } from '../../hooks/useAuth';

const LoginExitoso: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  const handleGoToHome = () => {
    window.location.href = '/scrum';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-500 via-green-600 to-green-700 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse bg-green-400"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse bg-green-300" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-40 left-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse bg-green-200" style={{animationDelay: '4s'}}></div>
      </div>

      {/* Success Card */}
      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/30 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg ring-4 ring-green-300/30">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">¡Login Exitoso!</h1>
            <p className="text-green-200">Has sido autenticado correctamente</p>
          </div>

          {/* User Info */}
          {user && (
            <div className="bg-white/10 border border-white/30 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Información del Usuario</h3>
              <div className="space-y-2 text-green-100">
                <p><span className="font-medium">Nombre:</span> {user.name || 'Usuario'}</p>
                <p><span className="font-medium">Email:</span> {user.email || 'email@ejemplo.com'}</p>
                <p><span className="font-medium">Username:</span> {user.username || 'username'}</p>
                <p><span className="font-medium">Rol:</span> {user.role?.name || user.globalRole || 'Usuario'}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-4">
            <button
              onClick={handleGoToHome}
              className="w-full py-3 px-4 bg-gradient-to-r from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
            >
              Ir al Inicio
            </button>
            
            <button
              onClick={handleLogout}
              className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-all duration-200 border border-white/30 hover:border-white/50"
            >
              Cerrar Sesión
            </button>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-green-200 text-sm">
              Autenticado el: {new Date().toLocaleString('es-ES')}
            </p>
          </div>
        </div>

        {/* Company Info */}
        <div className="text-center mt-6">
          <p className="text-green-200 text-sm">© 2025 Sprintiva</p>
        </div>
      </div>
    </div>
  );
};

export default LoginExitoso;
