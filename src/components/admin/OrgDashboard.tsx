import React, { useState, useEffect } from 'react';
import { organizationService, Organization } from '../../services/organizationService';
import { Card, CardBody } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { ErrorState } from '../ui/ErrorState';
import OrgTable from './OrgTable';
import OrgDetail from './OrgDetail';
import { isFeatureEnabled } from '../../config/features';
import UpgradeRequired from '../common/UpgradeRequired';

const OrgDashboard: React.FC = () => {
  // Verificar si multi-tenant dashboard está habilitado
  if (!isFeatureEnabled('multitenant_dashboard')) {
    return <UpgradeRequired featureName="Dashboard Multi-tenant" />;
  }
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await organizationService.getOrganizations({
        page,
        limit: 20,
        search: searchTerm || undefined,
        isActive: activeFilter === 'all' ? undefined : activeFilter === 'active',
      });
      setOrganizations(result.data || []);
      setTotalPages(result.pagination?.totalPages || 1);
      setTotal(result.pagination?.total || 0);
    } catch (err: any) {
      console.error('Error al cargar organizaciones:', err);
      setError(err.message || 'Error al cargar organizaciones');
      setOrganizations([]); // Asegurar que siempre sea un array
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizations();
  }, [page, searchTerm, activeFilter]);

  const handleCreateOrg = () => {
    setShowCreateModal(true); // Abrir modal de creación
  };

  const handleOrgSelect = (org: Organization) => {
    setSelectedOrg(org);
  };

  const handleOrgUpdated = () => {
    loadOrganizations();
    if (selectedOrg) {
      // Recargar la organización seleccionada
      organizationService
        .getOrganizationById(selectedOrg.id)
        .then((updated) => {
          setSelectedOrg(updated as any);
        })
        .catch(console.error);
    }
  };

  const handleBackToList = () => {
    setSelectedOrg(null);
  };

  if (loading && organizations.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error && organizations.length === 0) {
    return <ErrorState title="Error" message={error} />;
  }

  if (selectedOrg) {
    return (
      <OrgDetail
        organization={selectedOrg}
        onBack={handleBackToList}
        onUpdate={handleOrgUpdated}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Organizaciones</h2>
          <p className="text-gray-600 mt-1">
            Gestiona las organizaciones del sistema ({total} total)
          </p>
        </div>
        <button
          onClick={handleCreateOrg}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Crear Organización
        </button>
      </div>

      <Card>
        <CardBody>
          <div className="mb-4 flex gap-4">
            <input
              type="text"
              placeholder="Buscar organizaciones..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <select
              value={activeFilter}
              onChange={(e) => {
                setActiveFilter(e.target.value as 'all' | 'active' | 'inactive');
                setPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">Todas</option>
              <option value="active">Activas</option>
              <option value="inactive">Inactivas</option>
            </select>
          </div>

          <OrgTable
            organizations={organizations}
            onSelect={handleOrgSelect}
            onCreate={handleCreateOrg}
            onUpdate={handleOrgUpdated}
            loading={loading}
            forceCreateModalOpen={showCreateModal}
            onCreateModalClose={() => setShowCreateModal(false)}
          />

          {totalPages > 1 && (
            <div className="mt-4 flex justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Anterior
              </button>
              <span className="px-4 py-2">
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Siguiente
              </button>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default OrgDashboard;

