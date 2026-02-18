import React, { useState, useEffect } from 'react';
import { Organization } from '../../services/organizationService';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHeaderCell } from '../ui/Table';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { organizationService } from '../../services/organizationService';

interface OrgTableProps {
  organizations: Organization[];
  onSelect: (org: Organization) => void;
  onCreate: () => void;
  onUpdate: () => void;
  loading?: boolean;
  forceCreateModalOpen?: boolean;
  onCreateModalClose?: () => void;
}

const OrgTable: React.FC<OrgTableProps> = ({
  organizations,
  onSelect,
  onCreate,
  onUpdate,
  loading = false,
  forceCreateModalOpen = false,
  onCreateModalClose,
}) => {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [formData, setFormData] = useState({ name: '', slug: '', isActive: true });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateClick = () => {
    setFormData({ name: '', slug: '', isActive: true });
    setError(null);
    setCreateModalOpen(true);
  };

  // Sincronizar el estado del modal con la prop externa
  useEffect(() => {
    if (forceCreateModalOpen) {
      setFormData({ name: '', slug: '', isActive: true });
      setError(null);
      setCreateModalOpen(true);
    }
  }, [forceCreateModalOpen]);

  const handleEditClick = (org: Organization, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedOrg(org);
    setFormData({ name: org.name, slug: org.slug, isActive: org.isActive });
    setError(null);
    setEditModalOpen(true);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: prev.slug || generateSlug(name),
    }));
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.slug) {
      setError('El nombre y el slug son requeridos');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await organizationService.createOrganization(formData);
      setCreateModalOpen(false);
      onCreateModalClose?.(); // Cerrar también desde el padre si existe
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Error al crear organización');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedOrg || !formData.name || !formData.slug) {
      setError('El nombre y el slug son requeridos');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await organizationService.updateOrganization(selectedOrg.id, formData);
      setEditModalOpen(false);
      setSelectedOrg(null);
      setFormData({ name: '', slug: '', isActive: true });
      setError(null);
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar organización');
    } finally {
      setSubmitting(false);
    }
  };

  // Validación defensiva: asegurar que organizations sea un array
  const safeOrganizations = organizations || [];

  if (loading && safeOrganizations.length === 0) {
    return <div className="text-center py-8 text-gray-500">Cargando organizaciones...</div>;
  }

  if (safeOrganizations.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 mb-4">No hay organizaciones</p>
        <Button onClick={handleCreateClick}>Crear Primera Organización</Button>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <tr>
            <TableHeaderCell>Nombre</TableHeaderCell>
            <TableHeaderCell>Slug</TableHeaderCell>
            <TableHeaderCell>Estado</TableHeaderCell>
            <TableHeaderCell>Usuarios</TableHeaderCell>
            <TableHeaderCell>Proyectos</TableHeaderCell>
            <TableHeaderCell>Acciones</TableHeaderCell>
          </tr>
        </TableHeader>
        <TableBody>
          {safeOrganizations.map((org) => (
            <TableRow
              key={org.id}
              onClick={() => onSelect(org)}
              className="cursor-pointer hover:bg-gray-50"
            >
              <TableCell className="font-medium">{org.name}</TableCell>
              <TableCell className="text-gray-600">{org.slug}</TableCell>
              <TableCell>
                <Badge variant={org.isActive ? 'success' : 'danger'}>
                  {org.isActive ? 'Activa' : 'Inactiva'}
                </Badge>
              </TableCell>
              <TableCell>{org.usersCount || 0}</TableCell>
              <TableCell>{org.projectsCount || 0}</TableCell>
              <TableCell>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditClick(org, e);
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Editar
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Modal de Creación */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          onCreateModalClose?.(); // Cerrar también desde el padre si existe
        }}
        title="Crear Organización"
      >
        <div className="space-y-4">
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <Input
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Nombre de la organización"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
            <Input
              value={formData.slug}
              onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
              placeholder="slug-de-la-organizacion"
            />
            <p className="text-xs text-gray-500 mt-1">
              Solo letras minúsculas, números y guiones
            </p>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
              className="mr-2"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">
              Organización activa
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => {
              setCreateModalOpen(false);
              onCreateModalClose?.();
            }}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? 'Creando...' : 'Crear'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Edición */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedOrg(null);
          setError(null);
        }}
        title="Editar Organización"
      >
        <div className="space-y-4">
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <Input
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Nombre de la organización"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
            <Input
              value={formData.slug}
              onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
              placeholder="slug-de-la-organizacion"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="editIsActive"
              checked={formData.isActive}
              onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
              className="mr-2"
            />
            <label htmlFor="editIsActive" className="text-sm text-gray-700">
              Organización activa
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => {
              setEditModalOpen(false);
              setSelectedOrg(null);
              setError(null);
            }}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={submitting}>
              {submitting ? 'Actualizando...' : 'Actualizar'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default OrgTable;

