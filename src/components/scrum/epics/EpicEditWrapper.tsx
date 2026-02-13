import React, { useState, useEffect, useRef } from 'react';
import EpicFormImproved from './EpicFormImproved';
import AppSidebarLayout from '../../layout/AppSidebarLayout';
import { API_BASE_URL, authenticatedRequest, getAuthToken } from '../../../config/api';
import { useAuth } from '../../../hooks/useAuth';

const EpicEditWrapper: React.FC = () => {
  const [epicData, setEpicData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const hasAttemptedLoad = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getEpicId = (): string => {
    if (typeof window === 'undefined') return '';
    
    const urlParams = new URLSearchParams(window.location.search);
    let id = urlParams.get('id');
    
    if (!id) {
      const pathParts = window.location.pathname.split('/');
      id = pathParts[pathParts.length - 1];
    }
    return id || '';
  };

  useEffect(() => {
    // Limpiar timeout si existe
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Si ya intentamos cargar, no hacerlo de nuevo
    if (hasAttemptedLoad.current) {
      return;
    }

    // Verificar si hay token en localStorage directamente
    const token = getAuthToken();
    
    // Si hay token, proceder inmediatamente sin esperar al AuthProvider
    if (token) {
      const id = getEpicId();
      
      if (!id) {
        setError('ID de épica no válido');
        setLoading(false);
        hasAttemptedLoad.current = true;
        return;
      }
      
      hasAttemptedLoad.current = true;
      
      const loadEpic = async () => {
        try {
          setLoading(true);
          const response = await authenticatedRequest(`${API_BASE_URL}/scrum/epics/${id}`);
          const epic = response.epic || response.data?.epic || response;
          
          setEpicData({
            title: epic.title,
            description: epic.description || '',
            projectId: epic.projectId,
            status: epic.status,
            priority: epic.priority,
            businessValue: epic.businessValue || '',
          });
        } catch (err: any) {
          
          if (err.message && err.message.includes('404')) {
            setError('Épica no encontrada. Es posible que no exista o haya sido eliminada.');
          } else if (err.message && err.message.includes('403')) {
            setError('No tienes permisos para editar esta épica.');
          } else if (err.message && (err.message.includes('401') || err.message.includes('No hay token'))) {
            setError('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
          } else {
            setError(err.message || 'Error al cargar la épica');
          }
        } finally {
          setLoading(false);
        }
      };

      loadEpic();
      return;
    }

    // Si no hay token, esperar un máximo de 2 segundos a que el AuthProvider termine
    // Si después de 2 segundos no hay token, mostrar error
    if (!token) {
      timeoutRef.current = setTimeout(() => {
        const tokenAfterWait = getAuthToken();
        if (!tokenAfterWait) {
          setError('No estás autenticado. Por favor, inicia sesión.');
          setLoading(false);
          hasAttemptedLoad.current = true;
        } else {
          // Si apareció el token durante la espera, intentar cargar
          const id = getEpicId();
          if (id) {
            hasAttemptedLoad.current = true;
            authenticatedRequest(`${API_BASE_URL}/scrum/epics/${id}`)
              .then((response) => {
                const epic = response.epic || response.data?.epic || response;
                setEpicData({
                  title: epic.title,
                  description: epic.description || '',
                  projectId: epic.projectId,
                  status: epic.status,
                  priority: epic.priority,
                  businessValue: epic.businessValue || '',
                });
                setLoading(false);
              })
              .catch((err: any) => {
                setError(err.message || 'Error al cargar la épica');
                setLoading(false);
              });
          }
        }
      }, 2000);
    }

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []); // Remover dependencias para que solo se ejecute una vez

  if (loading) {
    return (
      <AppSidebarLayout>
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#0264C5] mx-auto mb-4"></div>
            <p className="text-gray-600">
              Cargando épica...
            </p>
          </div>
        </div>
      </AppSidebarLayout>
    );
  }

  if (error) {
    return (
      <AppSidebarLayout>
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <a href="/proyectos" className="bg-[#0264C5] text-white px-4 py-2 rounded-xl">
              Volver a Proyectos
            </a>
          </div>
        </div>
      </AppSidebarLayout>
    );
  }

  return <EpicFormImproved initialData={epicData} epicId={getEpicId()} mode="edit" />;
};

export default EpicEditWrapper;

