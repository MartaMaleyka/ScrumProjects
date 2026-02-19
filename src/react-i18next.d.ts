declare module 'react-i18next' {
  export function useTranslation(ns?: string | string[]): {
    t: (key: string) => string;
    i18n: { language: string; changeLanguage: (lng: string) => Promise<void> };
    ready: boolean;
  };
}
