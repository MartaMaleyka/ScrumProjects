import React, { useState, useEffect } from 'react';
import { adminService, RoleInfo } from '../../../services/adminService';
import { Card, CardBody } from '../../ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHeaderCell } from '../../ui/Table';
import { Skeleton } from '../../ui/Skeleton';
import { ErrorState } from '../../ui/ErrorState';

const PermissionsTab: React.FC = () => {
  const [rolesInfo, setRolesInfo] = useState<RoleInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRoles = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await adminService.getRoles();
        setRolesInfo(data);
      } catch (err: any) {
        setError(err.message || 'Error al cargar permisos');
      } finally {
        setLoading(false);
      }
    };

    loadRoles();
  }, []);

  if (loading) {
    return <Skeleton className="h-96" />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!rolesInfo) {
    return null;
  }

  // Obtener módulos únicos
  const modules = Array.from(new Set(rolesInfo.permissions.map((p) => p.module))).sort();
  
  // Obtener roles únicos
  const allRoles = [
    ...rolesInfo.globalRoles.map((r) => r.value),
    ...rolesInfo.projectRoles.map((r) => r.value),
  ];

  // Crear matriz de permisos
  const getPermission = (role: string, module: string) => {
    return rolesInfo.permissions.find((p) => p.role === role && p.module === module);
  };

  const getPermissionIcon = (hasPermission: boolean) => {
    if (hasPermission) {
      return (
        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      );
    }
    return (
      <span className="text-gray-400">—</span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Matriz de permisos del sistema. Esta es una vista informativa de las reglas de acceso.
        </p>
      </div>

      <Card>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <tr>
                  <TableHeaderCell className="sticky left-0 bg-gray-50 z-20">Rol</TableHeaderCell>
                  {modules.map((module) => (
                    <TableHeaderCell key={module} className="text-center min-w-[120px]">
                      {module}
                    </TableHeaderCell>
                  ))}
                </tr>
              </TableHeader>
              <TableBody>
                {allRoles.map((role) => {
                  const permission = getPermission(role, modules[0]);
                  const isGlobalRole = rolesInfo.globalRoles.some((r) => r.value === role);
                  
                  return (
                    <TableRow key={role}>
                      <TableCell className="sticky left-0 bg-white z-10 font-medium">
                        <div className="flex items-center space-x-2">
                          {isGlobalRole ? (
                            <span className="text-xs text-gray-500">🌐</span>
                          ) : (
                            <span className="text-xs text-gray-500">📁</span>
                          )}
                          <span>{role}</span>
                        </div>
                      </TableCell>
                      {modules.map((module) => {
                        const perm = getPermission(role, module);
                        return (
                          <TableCell key={module} className="text-center">
                            <div className="flex items-center justify-center space-x-4">
                              <div className="flex flex-col items-center">
                                <span className="text-xs text-gray-500 mb-1">Read</span>
                                {getPermissionIcon(perm?.read || false)}
                              </div>
                              <div className="flex flex-col items-center">
                                <span className="text-xs text-gray-500 mb-1">Write</span>
                                {getPermissionIcon(perm?.write || false)}
                              </div>
                              <div className="flex flex-col items-center">
                                <span className="text-xs text-gray-500 mb-1">Manage</span>
                                {getPermissionIcon(perm?.manage || false)}
                              </div>
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardBody>
      </Card>

      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start space-x-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Leyenda:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Read:</strong> Puede ver/leer el recurso</li>
              <li><strong>Write:</strong> Puede crear y editar el recurso</li>
              <li><strong>Manage:</strong> Puede gestionar (eliminar, cambiar permisos, etc.)</li>
              <li><strong>🌐</strong> = Rol Global | <strong>📁</strong> = Rol de Proyecto</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermissionsTab;

