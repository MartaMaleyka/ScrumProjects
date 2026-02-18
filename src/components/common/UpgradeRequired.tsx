import React from 'react';
import { useTranslation } from 'react-i18next';

interface UpgradeRequiredProps {
  featureName?: string;
  message?: string;
}

const UpgradeRequired: React.FC<UpgradeRequiredProps> = ({ 
  featureName,
  message 
}) => {
  const { t } = useTranslation();

  const defaultMessage = featureName 
    ? t('features.upgradeRequired', `Esta funcionalidad (${featureName}) requiere una edición Premium.`)
    : t('features.upgradeRequiredGeneric', 'Esta funcionalidad requiere una edición Premium.');

  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <svg 
            className="w-24 h-24 mx-auto text-indigo-500" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
            />
          </svg>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {t('features.upgradeTitle', 'Funcionalidad Premium')}
        </h2>
        
        <p className="text-gray-600 mb-6">
          {message || defaultMessage}
        </p>
        
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <p className="text-sm text-indigo-800">
            {t('features.contactAdmin', 'Contacta con tu administrador para obtener acceso a la edición Premium.')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default UpgradeRequired;

