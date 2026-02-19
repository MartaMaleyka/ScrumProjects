import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import RateCardService, { type CreateRateCardData } from '../../../services/premium/rateCardService';
import scrumService from '../../../services/scrumService';
import type { ProjectMember } from '../../../types/scrum';

interface RateCardCreateModalProps {
  budgetId: number;
  projectId: number;
  currency?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const RateCardCreateModal: React.FC<RateCardCreateModalProps> = ({
  budgetId,
  projectId,
  currency = 'USD',
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);

  const [formData, setFormData] = useState<CreateRateCardData>({
    budgetId,
    projectId,
    hourlyCents: 0,
    currency,
    effectiveFrom: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (isOpen && projectId) {
      loadMembers();
    }
  }, [isOpen, projectId]);

  const loadMembers = async () => {
    try {
      const response = await scrumService.getProjectMembers(projectId);
      if (response.success && response.data) {
        setMembers(response.data.members || []);
      }
    } catch (err) {
      console.error('Error loading members:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validar que hourlyCents esté en centavos (debe ser un entero positivo)
      if (!formData.hourlyCents || formData.hourlyCents <= 0) {
        setError('La tarifa por hora debe ser mayor a 0');
        setLoading(false);
        return;
      }

      // formData.hourlyCents ya está en centavos (se convierte en onChange)
      // Asegurarse de que sea un entero
      const hourlyCents = Math.round(formData.hourlyCents);

      await RateCardService.createRateCard({
        ...formData,
        hourlyCents,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al crear tarifa');
    } finally {
      setLoading(false);
    }
  };

  const projectRoles = [
    'PRODUCT_OWNER',
    'SCRUM_MASTER',
    'DEVELOPER',
    'DESIGNER',
    'QA',
    'DEVOPS',
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('budgets.rates.create', 'New Rate Card')}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={loading}>
            {t('common.create', 'Create')}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-800">
            <strong>{t('budgets.rates.info', 'What are Rate Cards?')}</strong>
            <br />
            {t('budgets.rates.infoDesc', 'Rate Cards define the hourly cost for team members or roles. They are used to calculate labor costs in budget forecasts based on estimated hours from tasks.')}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('budgets.rates.user', 'User')} (Optional)
            </label>
            <select
              value={formData.userId?.toString() || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, userId: e.target.value ? parseInt(e.target.value) : undefined, projectRole: undefined }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">{t('common.select', 'Select...')}</option>
              {members.map((member) => (
                <option key={member.id} value={member.userId}>
                  {member.user?.name || member.user?.email}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {t('budgets.rates.userHint', 'Select a specific user, or leave empty and specify a role below')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('budgets.rates.role', 'Role')} (Optional)
            </label>
            <select
              value={formData.projectRole || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, projectRole: e.target.value || undefined, userId: undefined }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">{t('common.select', 'Select...')}</option>
              {projectRoles.map((role) => (
                <option key={role} value={role}>
                  {role.replace('_', ' ')}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {t('budgets.rates.roleHint', 'Select a role, or leave empty if you selected a user above')}
            </p>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-xs text-yellow-800">
            {t('budgets.rates.note', 'Note: You must select either a User OR a Role (not both).')}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('budgets.rates.rate', 'Rate/Hour')} ({currency}) *
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.hourlyCents ? (formData.hourlyCents / 100).toFixed(2) : ''}
              onChange={(e) => {
                const inputValue = e.target.value;
                // Si el input está vacío, establecer a 0
                if (inputValue === '' || inputValue === '.') {
                  setFormData((prev) => ({ ...prev, hourlyCents: 0 }));
                  return;
                }
                // Parsear el valor y convertir a centavos
                const value = parseFloat(inputValue);
                if (!isNaN(value) && value >= 0) {
                  setFormData((prev) => ({ ...prev, hourlyCents: Math.round(value * 100) }));
                }
              }}
              placeholder="0.00"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('budgets.rates.rateHint', 'Enter hourly rate in {currency}', { currency })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('budgets.rates.from', 'Effective From')} (Optional)
            </label>
            <Input
              type="date"
              value={formData.effectiveFrom || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, effectiveFrom: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('budgets.rates.to', 'Effective To')} (Optional)
            </label>
            <Input
              type="date"
              value={formData.effectiveTo || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, effectiveTo: e.target.value }))}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default RateCardCreateModal;

