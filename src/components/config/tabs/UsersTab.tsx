import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { adminService, AdminUser } from '../../../services/adminService';
import { organizationService, Organization } from '../../../services/organizationService';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHeaderCell } from '../../ui/Table';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Modal } from '../../ui/Modal';
import { Card, CardBody } from '../../ui/Card';
import { SkeletonTable } from '../../ui/Skeleton';
import { EmptyState } from '../../ui/EmptyState';
import { ErrorState } from '../../ui/ErrorState';

const UsersTab: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Modales
  const [changeRoleModal, setChangeRoleModal] = useState<{ open: boolean; user: AdminUser | null }>({ open: false, user: null });
  const [newRole, setNewRole] = useState<'ADMIN' | 'MANAGER' | 'USER'>('USER');
  const [changeStatusModal, setChangeStatusModal] = useState<{ open: boolean; user: AdminUser | null }>({ open: false, user: null });
  const [assignAdminModal, setAssignAdminModal] = useState<{ open: boolean; user: AdminUser | null }>({ open: false, user: null });
  const [createUserModal, setCreateUserModal] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [createUserData, setCreateUserData] = useState({
    email: '',
    name: '',
    username: '',
    password: '',
    globalRole: 'USER' as 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'USER',
    organizationId: 0,
    isActive: true,
    assignAsAdmin: false
  });

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 [UsersTab] Cargando usuarios...');
      const data = await adminService.getUsers();
      console.log('✅ [UsersTab] Usuarios cargados:', data.length);
      setUsers(data);
    } catch (err: any) {
      console.error('❌ [UsersTab] Error al cargar usuarios:', err);
      const errorMessage = err.message || 'Error al cargar usuarios';
      setError(errorMessage);
      // Si es error 403, mostrar mensaje más específico
      if (errorMessage.includes('403') || errorMessage.includes('permisos')) {
        setError('No tienes permisos para ver usuarios. Se requiere rol SUPER_ADMIN, ADMIN o MANAGER.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Cargar organizaciones si es SUPER_ADMIN
  useEffect(() => {
    const role = currentUser?.globalRole as string | undefined;
    if (role === 'SUPER_ADMIN') {
      loadOrganizations();
    }
  }, [currentUser?.globalRole]);

  const loadOrganizations = async () => {
    try {
      setLoadingOrgs(true);
      const result = await organizationService.getOrganizations({ limit: 100 });
      setOrganizations(result.data || []);
    } catch (err) {
      console.error('Error al cargar organizaciones:', err);
    } finally {
      setLoadingOrgs(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = roleFilter === 'all' || user.globalRole === roleFilter;
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' && user.isActive) || (statusFilter === 'inactive' && !user.isActive);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleChangeRole = async () => {
    if (!changeRoleModal.user) return;
    
    try {
      setUpdating(true);
      await adminService.updateUserRole(changeRoleModal.user.id, newRole);
      await loadUsers();
      setChangeRoleModal({ open: false, user: null });
    } catch (err: any) {
      alert(err.message || 'Error al actualizar rol');
    } finally {
      setUpdating(false);
    }
  };

  const handleChangeStatus = async () => {
    if (!changeStatusModal.user) return;
    
    try {
      setUpdating(true);
      const newStatus = !changeStatusModal.user.isActive;
      await adminService.updateUserStatus(changeStatusModal.user.id, newStatus);
      await loadUsers();
      setChangeStatusModal({ open: false, user: null });
    } catch (err: any) {
      alert(err.message || 'Error al actualizar estado');
    } finally {
      setUpdating(false);
    }
  };

  const handleAssignAdmin = async () => {
    if (!assignAdminModal.user || !selectedOrgId) {
      alert('Por favor selecciona una organización');
      return;
    }

    try {
      setUpdating(true);
      await organizationService.assignAdmin(selectedOrgId, assignAdminModal.user.id);
      await loadUsers();
      setAssignAdminModal({ open: false, user: null });
      setSelectedOrgId(null);
      alert('Usuario asignado como ADMIN de la organización exitosamente');
    } catch (err: any) {
      alert(err.message || 'Error al asignar ADMIN');
    } finally {
      setUpdating(false);
    }
  };

  const handleCreateUser = async () => {
    if (!createUserData.email || !createUserData.name || !createUserData.password || !createUserData.organizationId) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      setUpdating(true);
      const userData = {
        email: createUserData.email,
        name: createUserData.name,
        username: createUserData.username || undefined,
        password: createUserData.password,
        globalRole: createUserData.assignAsAdmin ? 'ADMIN' : createUserData.globalRole,
        organizationId: createUserData.organizationId,
        isActive: createUserData.isActive
      };

      await organizationService.createUser(userData);
      await loadUsers();
      setCreateUserModal(false);
      setCreateUserData({
        email: '',
        name: '',
        username: '',
        password: '',
        globalRole: 'USER',
        organizationId: 0,
        isActive: true,
        assignAsAdmin: false
      });
      alert('Usuario creado exitosamente');
    } catch (err: any) {
      alert(err.message || 'Error al crear usuario');
    } finally {
      setUpdating(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'danger';
      case 'ADMIN':
        return 'warning';
      case 'MANAGER':
        return 'indigo';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Nunca';
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Fecha inválida';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div>
        <SkeletonTable rows={5} cols={6} />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadUsers} />;
  }

  return (
    <div className="space-y-4">
      {/* Header con botón crear */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">
          {(currentUser?.globalRole as string) === 'SUPER_ADMIN' ? 'Todos los usuarios' : 'Usuarios de mi organización'}
        </h3>
        {(currentUser?.globalRole as string) === 'SUPER_ADMIN' && (
          <Button
            onClick={() => setCreateUserModal(true)}
            className="flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Crear Usuario
          </Button>
        )}
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          placeholder="Buscar por nombre, email o username..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="all">Todos los roles</option>
          {(currentUser?.globalRole as string) === 'SUPER_ADMIN' && <option value="SUPER_ADMIN">Super Admin</option>}
          <option value="ADMIN">Administrador</option>
          <option value="MANAGER">Gerente</option>
          <option value="USER">Usuario</option>
        </select>
        <select
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
      </div>

      {/* Tabla */}
      {filteredUsers.length === 0 ? (
        <EmptyState
          title="No se encontraron usuarios"
          description="No hay usuarios que coincidan con los filtros seleccionados."
        />
      ) : (
        <Card>
          <CardBody>
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <tr>
                  <TableHeaderCell>Usuario</TableHeaderCell>
                  <TableHeaderCell>Email</TableHeaderCell>
                  <TableHeaderCell>Rol Global</TableHeaderCell>
                  <TableHeaderCell>Estado</TableHeaderCell>
                  <TableHeaderCell>Último Login</TableHeaderCell>
                  <TableHeaderCell>Acciones</TableHeaderCell>
                </tr>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span className="text-indigo-600 font-medium text-sm">
                              {getInitials(user.name)}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{user.name}</div>
                          {user.username && (
                            <div className="text-sm text-gray-500">@{user.username}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.globalRole)}>
                        {user.globalRole}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? 'success' : 'danger'}>
                        {user.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {formatDate(user.lastLogin)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2 flex-wrap gap-1">
                        {(currentUser?.globalRole as string) === 'SUPER_ADMIN' && user.globalRole !== 'ADMIN' && user.globalRole !== 'SUPER_ADMIN' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setAssignAdminModal({ open: true, user });
                              setSelectedOrgId(user.organizationId || null);
                            }}
                            className="text-xs"
                          >
                            Asignar ADMIN
                          </Button>
                        )}
                        {currentUser?.globalRole === 'ADMIN' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setChangeRoleModal({ open: true, user });
                              setNewRole(user.globalRole as 'ADMIN' | 'MANAGER' | 'USER');
                            }}
                            className="text-xs"
                          >
                            Cambiar Rol
                          </Button>
                        )}
                        {(currentUser?.globalRole === 'ADMIN' || currentUser?.globalRole === 'MANAGER') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setChangeStatusModal({ open: true, user })}
                            className="text-xs"
                          >
                            {user.isActive ? 'Desactivar' : 'Activar'}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Modal Cambiar Rol */}
      <Modal
        isOpen={changeRoleModal.open}
        onClose={() => setChangeRoleModal({ open: false, user: null })}
        title="Cambiar Rol de Usuario"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setChangeRoleModal({ open: false, user: null })}
              disabled={updating}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleChangeRole}
              isLoading={updating}
            >
              Guardar
            </Button>
          </>
        }
      >
        {changeRoleModal.user && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Cambiar el rol de <strong>{changeRoleModal.user.name}</strong> ({changeRoleModal.user.email})
            </p>
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nuevo Rol
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as 'ADMIN' | 'MANAGER' | 'USER')}
                disabled={changeRoleModal.user?.globalRole === 'SUPER_ADMIN'}
              >
                <option value="ADMIN">Administrador</option>
                <option value="MANAGER">Gerente</option>
                <option value="USER">Usuario</option>
              </select>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Cambiar Estado */}
      <Modal
        isOpen={changeStatusModal.open}
        onClose={() => setChangeStatusModal({ open: false, user: null })}
        title={changeStatusModal.user?.isActive ? 'Desactivar Usuario' : 'Activar Usuario'}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setChangeStatusModal({ open: false, user: null })}
              disabled={updating}
            >
              Cancelar
            </Button>
            <Button
              variant={changeStatusModal.user?.isActive ? 'danger' : 'primary'}
              onClick={handleChangeStatus}
              isLoading={updating}
            >
              {changeStatusModal.user?.isActive ? 'Desactivar' : 'Activar'}
            </Button>
          </>
        }
      >
        {changeStatusModal.user && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              ¿Estás seguro de que deseas {changeStatusModal.user.isActive ? 'desactivar' : 'activar'} el usuario{' '}
              <strong>{changeStatusModal.user.name}</strong> ({changeStatusModal.user.email})?
            </p>
            {changeStatusModal.user.isActive && (
              <p className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg">
                ⚠️ Un usuario desactivado no podrá iniciar sesión en el sistema.
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* Modal Asignar ADMIN de Organización (SUPER_ADMIN) */}
      <Modal
        isOpen={assignAdminModal.open}
        onClose={() => {
          setAssignAdminModal({ open: false, user: null });
          setSelectedOrgId(null);
        }}
        title="Asignar ADMIN de Organización"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setAssignAdminModal({ open: false, user: null });
                setSelectedOrgId(null);
              }}
              disabled={updating}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleAssignAdmin}
              disabled={updating || !selectedOrgId}
              isLoading={updating}
            >
              Asignar ADMIN
            </Button>
          </>
        }
      >
        {assignAdminModal.user && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Asignar a <strong>{assignAdminModal.user.name}</strong> ({assignAdminModal.user.email}) como ADMIN de una organización.
            </p>
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organización
              </label>
              {loadingOrgs ? (
                <div className="text-sm text-gray-500">Cargando organizaciones...</div>
              ) : (
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={selectedOrgId || ''}
                  onChange={(e) => setSelectedOrgId(parseInt(e.target.value) || null)}
                >
                  <option value="">Selecciona una organización</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.slug})
                    </option>
                  ))}
                </select>
              )}
            </div>
            <p className="text-xs text-gray-500">
              El usuario será asignado como ADMIN y se moverá a la organización seleccionada si pertenece a otra.
            </p>
          </div>
        )}
      </Modal>

      {/* Modal Crear Usuario (SUPER_ADMIN) */}
      <Modal
        isOpen={createUserModal}
        onClose={() => {
          setCreateUserModal(false);
          setCreateUserData({
            email: '',
            name: '',
            username: '',
            password: '',
            globalRole: 'USER',
            organizationId: 0,
            isActive: true,
            assignAsAdmin: false
          });
        }}
        title="Crear Nuevo Usuario"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setCreateUserModal(false);
                setCreateUserData({
                  email: '',
                  name: '',
                  username: '',
                  password: '',
                  globalRole: 'USER',
                  organizationId: 0,
                  isActive: true,
                  assignAsAdmin: false
                });
              }}
              disabled={updating}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateUser}
              disabled={updating || !createUserData.email || !createUserData.name || !createUserData.password || !createUserData.organizationId}
              isLoading={updating}
            >
              Crear Usuario
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <Input
              type="email"
              value={createUserData.email}
              onChange={(e) => setCreateUserData((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="usuario@ejemplo.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <Input
              value={createUserData.name}
              onChange={(e) => setCreateUserData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Nombre completo"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username (opcional)
            </label>
            <Input
              value={createUserData.username}
              onChange={(e) => setCreateUserData((prev) => ({ ...prev, username: e.target.value }))}
              placeholder="username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña <span className="text-red-500">*</span>
            </label>
            <Input
              type="password"
              value={createUserData.password}
              onChange={(e) => setCreateUserData((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organización <span className="text-red-500">*</span>
            </label>
            {loadingOrgs ? (
              <div className="text-sm text-gray-500">Cargando organizaciones...</div>
            ) : (
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={createUserData.organizationId || ''}
                onChange={(e) => setCreateUserData((prev) => ({ ...prev, organizationId: parseInt(e.target.value) || 0 }))}
              >
                <option value="">Selecciona una organización</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.slug})
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rol Global
            </label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={createUserData.globalRole}
              onChange={(e) => setCreateUserData((prev) => ({ ...prev, globalRole: e.target.value as any, assignAsAdmin: false }))}
              disabled={createUserData.assignAsAdmin}
            >
              <option value="USER">Usuario</option>
              <option value="MANAGER">Gerente</option>
              <option value="ADMIN">Administrador</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="assignAsAdmin"
              checked={createUserData.assignAsAdmin}
              onChange={(e) => {
                setCreateUserData((prev) => ({
                  ...prev,
                  assignAsAdmin: e.target.checked,
                  globalRole: e.target.checked ? 'ADMIN' : 'USER'
                }));
              }}
              className="mr-2"
            />
            <label htmlFor="assignAsAdmin" className="text-sm text-gray-700">
              Asignar como ADMIN de la organización
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={createUserData.isActive}
              onChange={(e) => setCreateUserData((prev) => ({ ...prev, isActive: e.target.checked }))}
              className="mr-2"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">
              Usuario activo
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UsersTab;

