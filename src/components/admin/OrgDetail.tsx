import React, { useState } from 'react';
import { Organization } from '../../services/organizationService';
import { Card, CardBody } from '../ui/Card';
import { Tabs } from '../ui/Tabs';
import { Badge } from '../ui/Badge';
import OrgUsersTab from './OrgUsersTab';
import OrgProjectsTab from './OrgProjectsTab';
import { Button } from '../ui/Button';

interface OrgDetailProps {
  organization: Organization;
  onBack: () => void;
  onUpdate: () => void;
}

const OrgDetail: React.FC<OrgDetailProps> = ({ organization, onBack, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('users');

  const tabs = [
    {
      id: 'users',
      label: 'Usuarios',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      id: 'projects',
      label: 'Proyectos',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: 'settings',
      label: 'Ajustes',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="secondary" onClick={onBack}>
            ← Volver
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{organization.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-gray-600">{organization.slug}</span>
              <Badge variant={organization.isActive ? 'success' : 'danger'}>
                {organization.isActive ? 'Activa' : 'Inactiva'}
              </Badge>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600">
            <div>{organization.usersCount || 0} usuarios</div>
            <div>{organization.projectsCount || 0} proyectos</div>
          </div>
        </div>
      </div>

      <Card>
        <CardBody className="p-0">
          <div className="px-6">
            <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
          </div>

          <div className="p-6">
            {activeTab === 'users' && (
              <OrgUsersTab organizationId={organization.id} onUpdate={onUpdate} />
            )}
            {activeTab === 'projects' && (
              <OrgProjectsTab organizationId={organization.id} />
            )}
            {activeTab === 'settings' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de la organización
                  </label>
                  <input
                    type="text"
                    value={organization.name}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                  <input
                    type="text"
                    value={organization.slug}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <Badge variant={organization.isActive ? 'success' : 'danger'}>
                    {organization.isActive ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  <div>Fecha de creación: {new Date(organization.createdAt).toLocaleDateString()}</div>
                  <div>Última actualización: {new Date(organization.updatedAt).toLocaleDateString()}</div>
                </div>
                <p className="text-sm text-gray-500">
                  Para editar la organización, usa el botón "Editar" en la lista de organizaciones.
                </p>
              </div>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default OrgDetail;

