import React, { useState, useEffect } from 'react';
import { useAuth, AuthProvider } from '../../hooks/useAuth';
import { Tabs } from '../ui/Tabs';
import { Card, CardBody } from '../ui/Card';
import { ErrorState } from '../ui/ErrorState';
import { Skeleton } from '../ui/Skeleton';
import UsersTab from './tabs/UsersTab';
import RolesTab from './tabs/RolesTab';
import PermissionsTab from './tabs/PermissionsTab';
import OrgDashboard from '../admin/OrgDashboard';
import AppSidebarLayout from '../layout/AppSidebarLayout';

const ConfigPage: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    // SUPER_ADMIN empieza en organizaciones, otros en usuarios
    return user?.globalRole === 'SUPER_ADMIN' ? 'organizations' : 'users';
  });
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    console.log('🔍 [ConfigPage] Estado de autenticación:', {
      authLoading,
      user: user ? { id: user.id, email: user.email, globalRole: user.globalRole } : null,
      timestamp: new Date().toISOString()
    });

    if (authLoading) {
      // Aún cargando, no hacer nada
      return;
    }

    if (!user) {
      // No hay usuario, redirigir al login
      console.log('⚠️ [ConfigPage] No hay usuario, redirigiendo al login');
      setIsAuthorized(false);
      setTimeout(() => {
        window.location.href = '/login-moderno';
      }, 1000);
      return;
    }

    // Usuario cargado, verificar acceso
    // SUPER_ADMIN, ADMIN y MANAGER tienen acceso
    const hasAccess = user.globalRole === 'SUPER_ADMIN' || user.globalRole === 'ADMIN' || user.globalRole === 'MANAGER';
    console.log('🔍 [ConfigPage] Verificando acceso:', {
      globalRole: user.globalRole,
      hasAccess
    });
    
    setIsAuthorized(hasAccess);
    
    if (!hasAccess) {
      console.log('❌ [ConfigPage] Acceso denegado, redirigiendo a /scrum');
      // Redirigir a proyectos si no tiene acceso
      setTimeout(() => {
        window.location.href = '/scrum';
      }, 2000);
    }
  }, [user, authLoading]);

  const getTabs = () => {
    const baseTabs = [
      {
        id: 'users',
        label: user?.globalRole === 'SUPER_ADMIN' 
          ? 'Todos los usuarios' 
          : user?.globalRole === 'ADMIN' 
            ? 'Usuarios de mi organización' 
            : 'Usuarios',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ),
      },
    ];

    // SUPER_ADMIN ve organizaciones
    if (user?.globalRole === 'SUPER_ADMIN') {
      baseTabs.unshift({
        id: 'organizations',
        label: 'Organizaciones',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        ),
      });
    }

    // ADMIN y MANAGER ven roles y permisos
    if (user?.globalRole === 'ADMIN' || user?.globalRole === 'MANAGER') {
      baseTabs.push(
        {
          id: 'roles',
          label: 'Roles',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          ),
        },
        {
          id: 'permissions',
          label: 'Permisos',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          ),
        }
      );
    }

    return baseTabs;
  };

  const tabs = getTabs();

  if (authLoading || isAuthorized === null) {
    return (
      <AppSidebarLayout>
        <div className="p-6">
          <Skeleton className="h-8 w-64 mb-6" />
          <Skeleton className="h-96" />
        </div>
      </AppSidebarLayout>
    );
  }

  if (isAuthorized === false) {
    // Si no hay usuario, mostrar mensaje de no autenticado
    if (!user) {
      return (
        <AppSidebarLayout>
          <div className="p-6">
            <ErrorState
              title="No Autenticado"
              message="Debes iniciar sesión para acceder a esta sección. Redirigiendo al login..."
            />
          </div>
        </AppSidebarLayout>
      );
    }
    
    // Si hay usuario pero no tiene acceso
    return (
      <AppSidebarLayout>
        <div className="p-6">
          <ErrorState
            title="Acceso Denegado"
            message={`No tienes permisos para acceder a esta sección. Tu rol actual es: ${user.globalRole || 'USER'}. Solo los administradores (ADMIN) y gerentes (MANAGER) pueden gestionar la configuración del sistema.`}
          />
        </div>
      </AppSidebarLayout>
    );
  }

  return (
    <AppSidebarLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Configuración del Sistema</h1>
          <p className="text-gray-600">Gestiona usuarios, roles y permisos del sistema</p>
        </div>

        <Card>
          <CardBody className="p-0">
            <div className="px-6">
              <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
            </div>
            
            <div className="p-6">
              {activeTab === 'organizations' && <OrgDashboard />}
              {activeTab === 'users' && <UsersTab />}
              {activeTab === 'roles' && <RolesTab />}
              {activeTab === 'permissions' && <PermissionsTab />}
            </div>
          </CardBody>
        </Card>
      </div>
    </AppSidebarLayout>
  );
};

// Wrapper con AuthProvider para asegurar que el contexto esté disponible
const ConfigPageWithAuth: React.FC = () => {
  return (
    <AuthProvider>
      <ConfigPage />
    </AuthProvider>
  );
};

export default ConfigPageWithAuth;

