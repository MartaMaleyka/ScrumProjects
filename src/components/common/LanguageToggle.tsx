import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageToggle: React.FC<LanguageToggleProps> = ({ variant = 'light' }) => {
  const { i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState(i18n.language || 'es');

  useEffect(() => {
    // Sincronizar con el idioma actual de i18n
    setCurrentLang(i18n.language);
  }, [i18n.language]);

  const handleLanguageChange = (lang: 'es' | 'en') => {
    i18n.changeLanguage(lang);
    setCurrentLang(lang);
    // Guardar en localStorage (i18next lo hace automáticamente, pero lo hacemos explícito)
    localStorage.setItem('i18nextLng', lang);
  };

  const isLightContext = variant === 'light';

  return (
    <div className={`flex items-center rounded-lg p-1 ${
      isLightContext 
        ? 'bg-gray-100 border border-gray-200' 
        : 'bg-white/10 backdrop-blur-sm border border-white/20'
    }`}>
      <button
        onClick={() => handleLanguageChange('es')}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
          currentLang === 'es'
            ? 'bg-indigo-600 text-white shadow-sm'
            : isLightContext
              ? 'text-gray-700 hover:bg-gray-200'
              : 'text-white hover:bg-white/20'
        }`}
        aria-label="Cambiar a Español"
      >
        ES
      </button>
      <button
        onClick={() => handleLanguageChange('en')}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
          currentLang === 'en'
            ? 'bg-indigo-600 text-white shadow-sm'
            : isLightContext
              ? 'text-gray-700 hover:bg-gray-200'
              : 'text-white hover:bg-white/20'
        }`}
        aria-label="Switch to English"
      >
        EN
      </button>
    </div>
  );
};

export default LanguageToggle;

