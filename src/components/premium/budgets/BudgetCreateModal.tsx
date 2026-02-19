import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import BudgetService, { type CreateBudgetData } from '../../../services/premium/budgetService';
import scrumService from '../../../services/scrumService';
import type { Project, Sprint } from '../../../types/scrum';

interface BudgetCreateModalProps {
  projectId?: number;
  onClose: () => void;
  onSuccess: () => void;
}

const BudgetCreateModal: React.FC<BudgetCreateModalProps> = ({
  projectId: initialProjectId,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [releases, setReleases] = useState<any[]>([]);

  const [formData, setFormData] = useState<CreateBudgetData>({
    projectId: initialProjectId || 0,
    scope: 'PROJECT',
    name: '',
    currency: 'USD',
    lines: [],
  });

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (formData.projectId) {
      loadSprints();
      loadReleases();
    }
  }, [formData.projectId]);

  const loadProjects = async () => {
    try {
      const response = await scrumService.getProjects({ limit: 100 });
      if (response.success && response.data) {
        setProjects(response.data.projects || []);
      }
    } catch (err) {
      console.error('Error loading projects:', err);
    }
  };

  const loadSprints = async () => {
    try {
      const response = await scrumService.getProjectSprints(formData.projectId);
      if (response.success && response.data) {
        setSprints(response.data.sprints || []);
      }
    } catch (err) {
      console.error('Error loading sprints:', err);
    }
  };

  const loadReleases = async () => {
    // TODO: Cargar releases si existe el servicio
    setReleases([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await BudgetService.createBudget(formData);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al crear presupuesto');
    } finally {
      setLoading(false);
    }
  };

  const addLine = () => {
    setFormData((prev) => ({
      ...prev,
      lines: [
        ...(prev.lines || []),
        {
          category: '',
          categoryType: 'OTHER',
          plannedCents: 0,
        },
      ],
    }));
  };

  const updateLine = (index: number, field: string, value: any) => {
    setFormData((prev) => {
      const newLines = [...(prev.lines || [])];
      newLines[index] = { ...newLines[index], [field]: value };
      return { ...prev, lines: newLines };
    });
  };

  const removeLine = (index: number) => {
    setFormData((prev) => {
      const newLines = [...(prev.lines || [])];
      newLines.splice(index, 1);
      return { ...prev, lines: newLines };
    });
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={t('budgets.createModal.title', 'Nuevo Presupuesto')}
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {t('common.cancel', 'Cancelar')}
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={loading}>
            {t('common.create', 'Crear')}
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('budgets.form.project', 'Proyecto')} *
            </label>
            <select
              value={formData.projectId.toString()}
              onChange={(e) => {
                const newProjectId = parseInt(e.target.value);
                setFormData((prev) => ({
                  ...prev,
                  projectId: newProjectId,
                  sprintId: undefined,
                  releaseId: undefined,
                }));
              }}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">{t('common.select', 'Seleccionar...')}</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('budgets.form.scope', 'Alcance')} *
            </label>
            <select
              value={formData.scope}
              onChange={(e) => {
                setFormData((prev) => ({
                  ...prev,
                  scope: e.target.value as 'PROJECT' | 'SPRINT' | 'RELEASE',
                  sprintId: undefined,
                  releaseId: undefined,
                }));
              }}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="PROJECT">{t('budgets.scope.project', 'Proyecto')}</option>
              <option value="SPRINT">{t('budgets.scope.sprint', 'Sprint')}</option>
              <option value="RELEASE">{t('budgets.scope.release', 'Release')}</option>
            </select>
          </div>
        </div>

        {formData.scope === 'SPRINT' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('budgets.form.sprint', 'Sprint')} *
            </label>
            <select
              value={formData.sprintId?.toString() || ''}
              onChange={(e) => {
                setFormData((prev) => ({
                  ...prev,
                  sprintId: parseInt(e.target.value),
                }));
              }}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">{t('common.select', 'Seleccionar...')}</option>
              {sprints.map((sprint) => (
                <option key={sprint.id} value={sprint.id}>
                  {sprint.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {formData.scope === 'RELEASE' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('budgets.form.release', 'Release')} *
            </label>
            <select
              value={formData.releaseId?.toString() || ''}
              onChange={(e) => {
                setFormData((prev) => ({
                  ...prev,
                  releaseId: parseInt(e.target.value),
                }));
              }}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">{t('common.select', 'Seleccionar...')}</option>
              {releases.map((release) => (
                <option key={release.id} value={release.id}>
                  {release.version} - {release.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('budgets.form.name', 'Nombre')} *
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder={t('budgets.form.namePlaceholder', 'E.g: Q1 2026 Budget, Sprint 1 Budget, Main Release Budget')}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('budgets.form.nameHint', 'A descriptive name to identify this budget')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('budgets.form.currency', 'Moneda')}
            </label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData((prev) => ({ ...prev, currency: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="MXN">MXN</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('budgets.form.startsAt', 'Fecha de Inicio')}
            </label>
            <Input
              type="date"
              value={formData.startsAt || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, startsAt: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('budgets.form.endsAt', 'Fecha de Fin')}
            </label>
            <Input
              type="date"
              value={formData.endsAt || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, endsAt: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('budgets.form.notes', 'Notas')}
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            rows={3}
            value={formData.notes || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">
              {t('budgets.form.lines', 'Líneas de Presupuesto')}
            </label>
            <Button type="button" variant="secondary" size="sm" onClick={addLine}>
              {t('budgets.form.addLine', 'Agregar Línea')}
            </Button>
          </div>

          {formData.lines && formData.lines.length > 0 && (
            <div className="space-y-2 border border-gray-200 rounded-lg p-4">
              {formData.lines.map((line, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4">
                    <Input
                      placeholder={t('budgets.form.category', 'Categoría')}
                      value={line.category}
                      onChange={(e) => updateLine(index, 'category', e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-span-3">
                    <select
                      value={line.categoryType}
                      onChange={(e) => updateLine(index, 'categoryType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="OTHER">{t('budgets.category.other', 'Otro')}</option>
                      <option value="LABOR">{t('budgets.category.labor', 'Labor')}</option>
                      <option value="SOFTWARE">{t('budgets.category.software', 'Software')}</option>
                      <option value="SERVICES">{t('budgets.category.services', 'Servicios')}</option>
                      <option value="HARDWARE">{t('budgets.category.hardware', 'Hardware')}</option>
                      <option value="TRAVEL">{t('budgets.category.travel', 'Viajes')}</option>
                    </select>
                  </div>
                  <div className="col-span-4">
                    <label className="block text-xs text-gray-600 mb-1">
                      {t('budgets.form.amount', 'Amount')} ({formData.currency})
                    </label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={line.plannedCents ? (line.plannedCents / 100).toFixed(2) : ''}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        updateLine(index, 'plannedCents', Math.round(value * 100));
                      }}
                      required
                      min={0}
                      step="0.01"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t('budgets.form.amountHint', 'Enter amount in {currency}', { currency: formData.currency })}
                    </p>
                  </div>
                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => removeLine(index)}
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default BudgetCreateModal;

