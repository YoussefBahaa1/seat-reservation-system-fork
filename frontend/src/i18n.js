import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslation from './locales/en.json';
import deTranslation from './locales/de.json';

// Pick a language stored for the current user (if logged in), otherwise fall back
const userId = localStorage.getItem('userId');
const storedLanguage =
  (userId && localStorage.getItem(`language_${userId}`)) ||
  navigator.language.split('-')[0];

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslation },
      de: { translation: deTranslation }
    },
    lng: storedLanguage, // Use user-specific language if set
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
