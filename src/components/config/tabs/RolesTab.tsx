import React, { useState, useEffect } from 'react';
import { adminService, RoleInfo } from '../../../services/adminService';
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Skeleton } from '../../ui/Skeleton';
import { ErrorState } from '../../ui/ErrorState';

const RolesTab: React.FC = () => {
  const [rolesInfo, setRolesInfo] = useState<RoleInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRoles = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('🔄 [RolesTab] Cargando roles...');
        const data = await adminService.getRoles();
        console.log('✅ [RolesTab] Roles cargados:', data);
        setRolesInfo(data);
      } catch (err: any) {
        console.error('❌ [RolesTab] Error al cargar roles:', err);
        const errorMessage = err.message || 'Error al cargar roles';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadRoles();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!rolesInfo) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Roles Globales */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Roles Globales</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rolesInfo.globalRoles.map((role) => (
            <Card key={role.value}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">{role.label}</h3>
                  <Badge
                    variant={
                      role.value === 'ADMIN'
                        ? 'danger'
                        : role.value === 'MANAGER'
                        ? 'indigo'
                        : 'default'
                    }
                  >
                    {role.value}
                  </Badge>
                </div>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-gray-600">{role.description}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>

      {/* Roles de Proyecto */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Roles de Proyecto</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rolesInfo.projectRoles.map((role) => (
            <Card key={role.value}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">{role.label}</h3>
                  <Badge variant="info">{role.value}</Badge>
                </div>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-gray-600">{role.description}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RolesTab;

