import React, { useState, useEffect } from 'react';
import { organizationService, OrganizationProject } from '../../services/organizationService';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHeaderCell } from '../ui/Table';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { Button } from '../ui/Button';

interface OrgProjectsTabProps {
  organizationId: number;
}

const OrgProjectsTab: React.FC<OrgProjectsTabProps> = ({ organizationId }) => {
  const [projects, setProjects] = useState<OrganizationProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await organizationService.getOrganizationProjects(organizationId, {
        page,
        limit: 20,
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setProjects(result.data);
      setTotalPages(result.pagination.totalPages);
    } catch (err: any) {
      console.error('Error al cargar proyectos:', err);
      setError(err.message || 'Error al cargar proyectos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [organizationId, page, searchTerm, statusFilter]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'PLANNING':
        return 'info';
      case 'ON_HOLD':
        return 'warning';
      case 'COMPLETED':
        return 'default';
      case 'CANCELLED':
        return 'danger';
      default:
        return 'default';
    }
  };

  if (loading && projects.length === 0) {
    return <Skeleton className="h-96" />;
  }

  if (error && projects.length === 0) {
    return <ErrorState title="Error" message={error} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Input
          type="text"
          placeholder="Buscar proyectos..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
          }}
          className="flex-1"
        />
        <Select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          options={[
            { value: 'all', label: 'Todos los estados' },
            { value: 'PLANNING', label: 'Planificación' },
            { value: 'ACTIVE', label: 'Activo' },
            { value: 'ON_HOLD', label: 'En Pausa' },
            { value: 'COMPLETED', label: 'Completado' },
            { value: 'CANCELLED', label: 'Cancelado' },
          ]}
        />
      </div>

      {projects.length === 0 ? (
        <EmptyState
          title="No hay proyectos"
          description="Esta organización no tiene proyectos (solo lectura para SUPER_ADMIN)"
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <tr>
                <TableHeaderCell>Nombre</TableHeaderCell>
                <TableHeaderCell>Estado</TableHeaderCell>
                <TableHeaderCell>Creado por</TableHeaderCell>
                <TableHeaderCell>Fecha de inicio</TableHeaderCell>
                <TableHeaderCell>Fecha de fin</TableHeaderCell>
              </tr>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(project.status)}>
                      {project.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{project.createdBy.name}</TableCell>
                  <TableCell>
                    {project.startDate
                      ? new Date(project.startDate).toLocaleDateString()
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {project.endDate ? new Date(project.endDate).toLocaleDateString() : '-'}
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
    </div>
  );
};

export default OrgProjectsTab;

