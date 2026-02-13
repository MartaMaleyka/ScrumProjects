/**
 * Modal de advertencia de sesión por inactividad
 * Muestra advertencia cuando la sesión está por expirar
 */

import React from 'react';

interface SessionWarningModalProps {
  isOpen: boolean;
  onExtend: () => void;
  onDismiss: () => void;
  timeRemaining: number | null;
  formatTimeRemaining: (ms: number | null) => string;
}

const SessionWarningModal: React.FC<SessionWarningModalProps> = ({ isOpen, onExtend, onDismiss, timeRemaining, formatTimeRemaining }) => {

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Sesión por expirar</h3>
              <p className="text-white/90 text-sm">Tu sesión está por expirar por inactividad</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <p className="text-gray-700 mb-2">
              Tu sesión expirará en <strong className="text-orange-600">{formatTimeRemaining(timeRemaining)}</strong> debido a inactividad.
            </p>
            <p className="text-gray-600 text-sm">
              Si no realizas ninguna acción, serás redirigido al login automáticamente.
            </p>
          </div>

          {/* Progress bar */}
          {timeRemaining && timeRemaining > 0 && (
            <div className="mb-6">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full transition-all duration-1000"
                  style={{ 
                    width: `${Math.min(100, (timeRemaining / (5 * 60 * 1000)) * 100)}%` 
                  }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={onExtend}
              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Continuar sesión
            </button>
            <button
              onClick={onDismiss}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionWarningModal;

