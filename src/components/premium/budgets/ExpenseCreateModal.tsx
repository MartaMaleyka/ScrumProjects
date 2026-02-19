import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import ExpenseService, { type CreateExpenseData } from '../../../services/premium/expenseService';
import scrumService from '../../../services/scrumService';
import type { Project, Sprint, Task } from '../../../types/scrum';

interface ExpenseCreateModalProps {
  budgetId: number;
  projectId: number;
  currency?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ExpenseCreateModal: React.FC<ExpenseCreateModalProps> = ({
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
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [formData, setFormData] = useState<CreateExpenseData>({
    budgetId,
    projectId,
    category: '',
    amountCents: 0,
    currency,
    incurredAt: new Date().toISOString().split('T')[0],
    vendor: '',
    description: '',
  });

  useEffect(() => {
    if (isOpen && projectId) {
      loadSprints();
      loadTasks();
    }
  }, [isOpen, projectId]);

  const loadSprints = async () => {
    try {
      const response = await scrumService.getProjectSprints(projectId);
      if (response.success && response.data) {
        setSprints(response.data.sprints || []);
      }
    } catch (err) {
      console.error('Error loading sprints:', err);
    }
  };

  const loadTasks = async () => {
    try {
      // Cargar tareas del proyecto (simplificado - podrías filtrar por sprint si es necesario)
      const response = await scrumService.getProjectTasks(projectId);
      if (response.success && response.data) {
        setTasks(response.data.tasks || []);
      }
    } catch (err) {
      console.error('Error loading tasks:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validar que amountCents esté en centavos (debe ser un entero positivo)
      if (!formData.amountCents || formData.amountCents <= 0) {
        setError('El monto debe ser mayor a 0');
        setLoading(false);
        return;
      }

      // formData.amountCents ya está en centavos (se convierte en onChange)
      // Asegurarse de que sea un entero
      const amountCents = Math.round(formData.amountCents);

      await ExpenseService.createExpense({
        ...formData,
        amountCents,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al crear gasto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('budgets.expenses.create', 'New Expense')}
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('budgets.expenses.category', 'Category')} *
            </label>
            <Input
              value={formData.category}
              onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
              placeholder={t('budgets.expenses.categoryPlaceholder', 'E.g: Software License, Travel, Equipment')}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('budgets.expenses.amount', 'Amount')} ({currency}) *
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.amountCents ? (formData.amountCents / 100).toFixed(2) : ''}
              onChange={(e) => {
                const inputValue = e.target.value;
                // Si el input está vacío, establecer a 0
                if (inputValue === '' || inputValue === '.') {
                  setFormData((prev) => ({ ...prev, amountCents: 0 }));
                  return;
                }
                // Parsear el valor y convertir a centavos
                const value = parseFloat(inputValue);
                if (!isNaN(value) && value >= 0) {
                  setFormData((prev) => ({ ...prev, amountCents: Math.round(value * 100) }));
                }
              }}
              placeholder="0.00"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('budgets.form.amountHint', 'Enter amount in {currency}', { currency })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('budgets.expenses.date', 'Date')} *
            </label>
            <Input
              type="date"
              value={formData.incurredAt || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, incurredAt: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('budgets.expenses.vendor', 'Vendor')}
            </label>
            <Input
              value={formData.vendor || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, vendor: e.target.value }))}
              placeholder={t('budgets.expenses.vendorPlaceholder', 'Vendor name')}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('budgets.expenses.sprint', 'Sprint')} (Optional)
          </label>
          <select
            value={formData.sprintId?.toString() || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, sprintId: e.target.value ? parseInt(e.target.value) : undefined }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">{t('common.select', 'Select...')}</option>
            {sprints.map((sprint) => (
              <option key={sprint.id} value={sprint.id}>
                {sprint.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('budgets.expenses.task', 'Task')} (Optional)
          </label>
          <select
            value={formData.taskId?.toString() || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, taskId: e.target.value ? parseInt(e.target.value) : undefined }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">{t('common.select', 'Select...')}</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('budgets.expenses.description', 'Description')}
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            rows={3}
            value={formData.description || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            placeholder={t('budgets.expenses.descriptionPlaceholder', 'Expense description...')}
          />
        </div>
      </form>
    </Modal>
  );
};

export default ExpenseCreateModal;

