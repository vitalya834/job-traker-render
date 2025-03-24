import { defineStore } from 'pinia';
import { ref } from 'vue';
import i18n from '../i18n.js';

// Поддерживаемые языки
const SUPPORTED_LANGUAGES = ['ru', 'en', 'de'];

export const useLanguageStore = defineStore('language', () => {
  // Начальное значение - русский
  const currentLanguage = ref('ru');
  
  /**
   * Устанавливает язык приложения
   * @param {string} lang - Код языка ('ru', 'en', 'de')
   */
  const setLanguage = (lang) => {
    if (SUPPORTED_LANGUAGES.includes(lang)) {
      currentLanguage.value = lang;
      
      // Обновляем значение в Vue I18n
      i18n.global.locale.value = lang;
      
      // Сохраняем в localStorage
      try {
        localStorage.setItem('language', lang);
        console.log(`🌐 Язык успешно изменен на: ${lang}`);
        console.log(`About перевод: "${i18n.global.t('about')}"`);
        
        // Отправляем событие смены языка для компонентов, которые могут его слушать
        document.dispatchEvent(new CustomEvent('languageChanged', { detail: lang }));
        
        // Принудительное обновление интерфейса через небольшую задержку
        setTimeout(() => {
          window.dispatchEvent(new Event('resize'));
        }, 50);
      } catch (e) {
        console.warn('Не удалось сохранить язык в localStorage:', e);
      }
    } else {
      console.warn(`⚠️ Язык ${lang} не поддерживается. Поддерживаемые языки: ${SUPPORTED_LANGUAGES.join(', ')}`);
    }
  };
  
  /**
   * Инициализирует язык из localStorage или использует русский по умолчанию
   */
  const initLanguage = () => {
    try {
      const savedLanguage = localStorage.getItem('language');
      
      if (savedLanguage && SUPPORTED_LANGUAGES.includes(savedLanguage)) {
        setLanguage(savedLanguage);
        console.log(`🌐 Загружен сохраненный язык: ${savedLanguage}`);
      } else {
        // Если язык не найден в localStorage или не поддерживается, 
        // определяем язык браузера
        detectBrowserLanguage();
      }
    } catch (e) {
      console.warn('Не удалось загрузить язык из localStorage:', e);
      detectBrowserLanguage();
    }
  };
  
  /**
   * Определяет предпочтительный язык браузера и устанавливает его, если поддерживается
   */
  const detectBrowserLanguage = () => {
    try {
      // Получаем язык браузера
      const browserLang = navigator.language.split('-')[0]; // 'ru-RU' -> 'ru'
      
      // Проверяем, поддерживается ли этот язык
      if (SUPPORTED_LANGUAGES.includes(browserLang)) {
        setLanguage(browserLang);
        console.log(`🌐 Определен язык браузера: ${browserLang}`);
      } else {
        setLanguage('ru'); // Русский по умолчанию
        console.log(`Язык браузера ${browserLang} не поддерживается, используем русский по умолчанию`);
      }
    } catch (e) {
      console.warn('Не удалось определить язык браузера:', e);
      setLanguage('ru'); // Гарантированно устанавливаем русский в случае ошибки
    }
  };
  
  /**
   * Возвращает список поддерживаемых языков
   * @returns {Array} Массив кодов поддерживаемых языков
   */
  const getSupportedLanguages = () => {
    return SUPPORTED_LANGUAGES;
  };

  return { 
    currentLanguage, 
    setLanguage, 
    initLanguage,
    getSupportedLanguages 
  };
});