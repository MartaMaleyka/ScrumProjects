import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Importar traducciones
import esTranslations from './locales/es.json';
import enTranslations from './locales/en.json';

// Configuración base
const config = {
  resources: {
    es: {
      translation: esTranslations
    },
    en: {
      translation: enTranslations
    }
  },
  fallbackLng: 'es',
  supportedLngs: ['es', 'en'],
  interpolation: {
    escapeValue: false
  },
  react: {
    useSuspense: false
  }
};

// Solo inicializar en el cliente para evitar problemas con SSR
if (typeof window !== 'undefined') {
  if (!i18n.isInitialized) {
    i18n
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
        ...config,
        detection: {
          order: ['localStorage', 'navigator'],
          caches: ['localStorage'],
          lookupLocalStorage: 'i18nextLng'
        }
      });
  }
} else {
  // Para SSR, inicializar sin detector
  if (!i18n.isInitialized) {
    i18n
      .use(initReactI18next)
      .init({
        ...config,
        lng: 'es' // Default language for SSR
      });
  }
}

export default i18n;
