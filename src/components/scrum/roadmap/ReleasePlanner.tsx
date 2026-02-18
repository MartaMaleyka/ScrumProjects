import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { scrumService } from '../../../services/scrumService';
import type { Release, CreateReleaseData, UpdateReleaseData } from '../../../types/roadmap';
import type { Epic } from '../../../types/scrum';
import LoadingSpinner from '../common/LoadingSpinner';
import { ErrorState } from '../../ui/ErrorState';
import { Button } from '../../ui/Button';
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { Modal } from '../../ui/Modal';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Badge } from '../../ui/Badge';

interface ReleasePlannerProps {
  projectId: number;
}

const ReleasePlanner: React.FC<ReleasePlannerProps> = ({ projectId }) => {
  const { t } = useTranslation();
  const [releases, setReleases] = useState<Release[]>([]);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState<Release | null>(null);
  const [generatingNotes, setGeneratingNotes] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [releasesResponse, epicsResponse] = await Promise.all([
        scrumService.getReleases(projectId),
        scrumService.getProjectEpics(projectId),
      ]);

      if (releasesResponse.success && releasesResponse.data) {
        setReleases(releasesResponse.data.releases);
      }

      if (epicsResponse.success && epicsResponse.data) {
        setEpics(epicsResponse.data.epics);
      }
    } catch (err: any) {
      setError(err.message || t('releases.loadError', 'Error al cargar releases'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRelease = async (data: CreateReleaseData) => {
    try {
      const response = await scrumService.createRelease(projectId, data);
      if (response.success) {
        setShowCreateModal(false);
        loadData();
      }
    } catch (err: any) {
      alert(err.message || t('releases.createError', 'Error al crear release'));
    }
  };

  const handleGenerateNotes = async (releaseId: number) => {
    try {
      setGeneratingNotes(releaseId);
      const response = await scrumService.generateReleaseNotes(releaseId);
      if (response.success) {
        // Recargar datos para mostrar las notas generadas
        await loadData();
        // Mostrar mensaje de éxito
        const generatedCount = response.data?.generated || 0;
        if (generatedCount > 0) {
          alert(t('releases.notesGenerated', 'Se generaron {{count}} notas de release', { count: generatedCount }));
        } else {
          alert(t('releases.noNotesGenerated', 'No se generaron notas. Asegúrate de que el release tenga épicas con tareas completadas.'));
        }
      } else {
        alert(response.message || t('releases.generateNotesError', 'Error al generar release notes'));
      }
    } catch (err: any) {
      console.error('Error generating release notes:', err);
      alert(err.message || t('releases.generateNotesError', 'Error al generar release notes'));
    } finally {
      setGeneratingNotes(null);
    }
  };

  const handleDownloadChangelog = async (releaseId: number) => {
    try {
      // Obtener idioma actual
      const currentLang = localStorage.getItem('i18nextLng')?.split('-')[0] || 'es';
      const changelog = await scrumService.getChangelog(releaseId, 'markdown', currentLang);
      const blob = new Blob([changelog], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `changelog-${releaseId}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || t('releases.downloadChangelogError', 'Error al descargar changelog'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  const getStatusVariant = (status: string): 'success' | 'info' | 'warning' | 'danger' | 'default' => {
    switch (status) {
      case 'RELEASED':
        return 'success';
      case 'IN_PROGRESS':
        return 'info';
      case 'PLANNING':
        return 'warning';
      case 'CANCELLED':
        return 'danger';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'RELEASED':
        return t('releases.status.released', 'Lanzado');
      case 'IN_PROGRESS':
        return t('releases.status.inProgress', 'En Progreso');
      case 'PLANNING':
        return t('releases.status.planning', 'Planificando');
      case 'CANCELLED':
        return t('releases.status.cancelled', 'Cancelado');
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('releases.title', 'Releases')}</h2>
          <p className="text-gray-600 mt-1">{t('releases.subtitle', 'Gestiona versiones y releases del proyecto')}</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          variant="primary"
        >
          {t('releases.newRelease', 'Nuevo Release')}
        </Button>
      </div>

      {/* Lista de Releases */}
      <div className="grid gap-4">
        {releases.map((release) => (
          <Card key={release.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {release.name || t('releases.releaseVersion', 'Release {{version}}', { version: release.version })}
                  </h3>
                  <Badge variant={getStatusVariant(release.status)}>
                    {getStatusLabel(release.status)}
                  </Badge>
                  <span className="text-sm text-gray-500">v{release.version}</span>
                </div>
                <div className="flex items-center gap-2">
                  {release.status !== 'RELEASED' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleGenerateNotes(release.id)}
                      disabled={generatingNotes === release.id}
                    >
                      {generatingNotes === release.id ? t('releases.generating', 'Generando...') : t('releases.generateNotes', 'Generar Notes')}
                    </Button>
                  )}
                  {release.notes && release.notes.length > 0 && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleDownloadChangelog(release.id)}
                    >
                      {t('releases.downloadChangelog', 'Descargar Changelog')}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardBody>
              {release.description && (
                <p className="text-gray-600 mb-4">{release.description}</p>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">{t('releases.plannedDate', 'Fecha Planificada')}:</span>
                  <p className="font-medium">
                    {release.plannedDate
                      ? new Date(release.plannedDate).toLocaleDateString(t('common.locale', 'es-ES') as string)
                      : t('releases.notDefined', 'No definida')}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">{t('releases.releaseDate', 'Fecha de Lanzamiento')}:</span>
                  <p className="font-medium">
                    {release.releaseDate
                      ? new Date(release.releaseDate).toLocaleDateString(t('common.locale', 'es-ES') as string)
                      : t('releases.notReleased', 'No lanzado')}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">{t('releases.epics', 'Épicas')}:</span>
                  <p className="font-medium">
                    {release.epicReleases?.length || 0}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">{t('releases.releaseNotes', 'Release Notes')}:</span>
                  <p className="font-medium">
                    {release.notes?.length || 0}
                  </p>
                </div>
              </div>

              {/* Release Notes Preview */}
              {release.notes && release.notes.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">{t('releases.releaseNotes', 'Release Notes')}:</h4>
                  <div className="space-y-2">
                    {release.notes.slice(0, 5).map((note) => (
                      <div key={note.id} className="text-sm">
                        <span className={`inline-block px-2 py-1 rounded text-xs mr-2 ${
                          note.type === 'feature' ? 'bg-green-100 text-green-800' :
                          note.type === 'bugfix' ? 'bg-red-100 text-red-800' :
                          note.type === 'improvement' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {t(`releases.noteType.${note.type}`, note.type)}
                        </span>
                        <span className="text-gray-700">{note.title}</span>
                      </div>
                    ))}
                    {release.notes.length > 5 && (
                      <p className="text-xs text-gray-500">
                        +{release.notes.length - 5} {t('releases.moreNotes', 'notas más')}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        ))}

        {releases.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>{t('releases.noReleases', 'No hay releases creados aún.')}</p>
            <p className="text-sm mt-2">{t('releases.createFirstRelease', 'Crea tu primer release para comenzar a gestionar versiones.')}</p>
          </div>
        )}
      </div>

      {/* Modal de Crear Release */}
      {showCreateModal && (
        <ReleaseFormModal
          projectId={projectId}
          epics={epics}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateRelease}
        />
      )}
    </div>
  );
};

interface ReleaseFormModalProps {
  projectId: number;
  epics: Epic[];
  onClose: () => void;
  onSubmit: (data: CreateReleaseData) => void;
}

const ReleaseFormModal: React.FC<ReleaseFormModalProps> = ({
  epics,
  onClose,
  onSubmit,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<CreateReleaseData>({
    version: '',
    name: '',
    description: '',
    plannedDate: '',
    epicIds: [],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.version) {
      alert(t('releases.versionRequired', 'La versión es requerida'));
      return;
    }
    onSubmit(formData);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={t('releases.newRelease', 'Nuevo Release')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('releases.version', 'Versión')} *
          </label>
          <Input
            type="text"
            value={formData.version}
            onChange={(e) => setFormData({ ...formData, version: e.target.value })}
            placeholder="1.0.0"
            required
          />
          <p className="text-xs text-gray-500 mt-1">{t('releases.versionFormat', 'Formato: X.Y.Z (ej: 1.0.0, 2.1.3)')}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('releases.name', 'Nombre')}
          </label>
          <Input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={t('releases.namePlaceholder', 'Release Principal')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('releases.description', 'Descripción')}
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={3}
            placeholder={t('releases.descriptionPlaceholder', 'Descripción del release...')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('releases.plannedDate', 'Fecha Planificada')}
          </label>
          <Input
            type="date"
            value={formData.plannedDate}
            onChange={(e) => setFormData({ ...formData, plannedDate: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('releases.epics', 'Épicas')} ({t('releases.optional', 'opcional')})
          </label>
          <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2 space-y-2">
            {epics.map((epic) => (
              <label key={epic.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.epicIds?.includes(epic.id)}
                  onChange={(e) => {
                    const epicIds = formData.epicIds || [];
                    if (e.target.checked) {
                      setFormData({ ...formData, epicIds: [...epicIds, epic.id] });
                    } else {
                      setFormData({ ...formData, epicIds: epicIds.filter((id) => id !== epic.id) });
                    }
                  }}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">{epic.title}</span>
              </label>
            ))}
            {epics.length === 0 && (
              <p className="text-sm text-gray-500">{t('releases.noEpicsAvailable', 'No hay épicas disponibles')}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel', 'Cancelar')}
          </Button>
          <Button type="submit" variant="primary">
            {t('releases.createRelease', 'Crear Release')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ReleasePlanner;

