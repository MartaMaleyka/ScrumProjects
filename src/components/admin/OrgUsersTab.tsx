import React, { useState, useEffect } from 'react';
import { organizationService, OrganizationUser } from '../../services/organizationService';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHeaderCell } from '../ui/Table';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';

interface OrgUsersTabProps {
  organizationId: number;
  onUpdate?: () => void;
}

const OrgUsersTab: React.FC<OrgUsersTabProps> = ({ organizationId, onUpdate }) => {
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [assignAdminModal, setAssignAdminModal] = useState<{ open: boolean; user: OrganizationUser | null }>({
    open: false,
    user: null,
  });
  const [submitting, setSubmitting] = useState(false);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await organizationService.getOrganizationUsers(organizationId, {
        page,
        limit: 20,
        search: searchTerm || undefined,
        globalRole: roleFilter !== 'all' ? roleFilter : undefined,
        isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
      });
      setUsers(result.data);
      setTotalPages(result.pagination.totalPages);
    } catch (err: any) {
      console.error('Error al cargar usuarios:', err);
      setError(err.message || 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [organizationId, page, searchTerm, roleFilter, statusFilter]);

  const handleAssignAdmin = async () => {
    if (!assignAdminModal.user) return;

    try {
      setSubmitting(true);
      await organizationService.assignAdmin(organizationId, assignAdminModal.user.id);
      setAssignAdminModal({ open: false, user: null });
      loadUsers();
      onUpdate?.();
    } catch (err: any) {
      alert(err.message || 'Error al asignar ADMIN');
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'danger';
      case 'ADMIN':
        return 'warning';
      case 'MANAGER':
        return 'info';
      default:
        return 'secondary';
    }
  };

  if (loading && users.length === 0) {
    return <Skeleton className="h-96" />;
  }

  if (error && users.length === 0) {
    return <ErrorState title="Error" message={error} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Input
          type="text"
          placeholder="Buscar usuarios..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
          }}
          className="flex-1"
        />
        <Select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">Todos los roles</option>
          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
          <option value="ADMIN">ADMIN</option>
          <option value="MANAGER">MANAGER</option>
          <option value="USER">USER</option>
        </Select>
        <Select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">Todos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </Select>
      </div>

      {users.length === 0 ? (
        <EmptyState title="No hay usuarios" message="Esta organización no tiene usuarios asignados" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <tr>
                <TableHeaderCell>Nombre</TableHeaderCell>
                <TableHeaderCell>Email</TableHeaderCell>
                <TableHeaderCell>Rol</TableHeaderCell>
                <TableHeaderCell>Estado</TableHeaderCell>
                <TableHeaderCell>Último Login</TableHeaderCell>
                <TableHeaderCell>Acciones</TableHeaderCell>
              </tr>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
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
                  <TableCell>
                    {user.lastLogin
                      ? new Date(user.lastLogin).toLocaleDateString()
                      : 'Nunca'}
                  </TableCell>
                  <TableCell>
                    {user.globalRole !== 'ADMIN' && (
                      <button
                        onClick={() => setAssignAdminModal({ open: true, user })}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Asignar ADMIN
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="secondary"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <span className="px-4 py-2 self-center">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="secondary"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={assignAdminModal.open}
        onClose={() => setAssignAdminModal({ open: false, user: null })}
        title="Asignar ADMIN de Organización"
      >
        <div className="space-y-4">
          <p>
            ¿Deseas asignar a <strong>{assignAdminModal.user?.name}</strong> como ADMIN de esta
            organización?
          </p>
          <p className="text-sm text-gray-600">
            El usuario será asignado como ADMIN y se moverá a esta organización si pertenece a otra.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setAssignAdminModal({ open: false, user: null })}
            >
              Cancelar
            </Button>
            <Button onClick={handleAssignAdmin} disabled={submitting}>
              {submitting ? 'Asignando...' : 'Asignar ADMIN'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default OrgUsersTab;

