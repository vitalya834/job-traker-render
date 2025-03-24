<script setup>
import { RouterLink, RouterView } from 'vue-router';
import { useThemeStore } from '@/stores/themeStore.js';
import { useLanguageStore } from '@/stores/languageStore.js';
import { computed, onMounted, watch, ref, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import AddJob from '@/pages/AddJob.vue'; // Импортируем компонент AddJob
import { useJobStore } from '@/stores/jobStore'; // Импортируем хранилище вакансий

const themeStore = useThemeStore();
const languageStore = useLanguageStore();
const jobStore = useJobStore(); // Получаем доступ к хранилищу вакансий
const darkMode = computed(() => themeStore.darkMode);
const { t, locale } = useI18n();

// Состояние для модального окна добавления вакансии
const showAddJobModal = ref(false);

// Синхронизируем выбранный язык с i18n
const selectedLanguage = computed({
  get: () => languageStore.currentLanguage,
  set: (value) => {
    languageStore.setLanguage(value);
  }
});

// Следим за изменениями языка в store и обновляем i18n
watch(() => languageStore.currentLanguage, (newLang) => {
  locale.value = newLang;
});

onMounted(() => {
  languageStore.initLanguage();
  themeStore.applyTheme();
  window.addEventListener('keydown', handleKeyDown);
});

// Удаляем обработчик события при размонтировании компонента
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  document.body.classList.remove('modal-open');
});

// Открыть модальное окно добавления вакансии
const openAddJobModal = (event) => {
  // Предотвращаем переход по маршруту при клике на RouterLink
  event?.preventDefault();
  showAddJobModal.value = true;
  // Добавляем класс для блокировки скролла
  document.body.classList.add('modal-open');
};

// Закрыть модальное окно добавления вакансии
const closeAddJobModal = () => {
  showAddJobModal.value = false;
  // Удаляем класс для разблокировки скролла
  document.body.classList.remove('modal-open');
};

// Обработка добавления вакансии
const handleJobAdded = async () => {
  console.log("✅ Вакансия добавлена! Обновляем список...");
  await jobStore.fetchJobs();
  closeAddJobModal();
};

// Обработка нажатия клавиши Escape для закрытия модального окна
const handleKeyDown = (event) => {
  if (event.key === 'Escape' && showAddJobModal.value) {
    closeAddJobModal();
  }
};
</script>

<template>
  <header :class="{ dark: darkMode }">
    <div class="wrapper">
      <div class="logo">
        <span class="logo-icon">📋</span>
        <span class="logo-text">{{ t('title') }}</span>
      </div>
      
      <nav>
        <RouterLink to="/">{{ t('home') }}</RouterLink>
        
        <!-- Используем кастомный слот для RouterLink страницы About -->
        <RouterLink to="/about" custom v-slot="{ navigate, href, isActive }">
          <a 
            :href="href" 
            @click="navigate" 
            :class="[isActive ? 'router-link-active' : '']"
          >
            {{ t('about') }}
          </a>
        </RouterLink>
        
        <!-- Используем обычную ссылку вместо RouterLink для открытия модального окна -->
        <a href="#" @click="openAddJobModal" class="add-job-link">{{ t('addJob') }}</a>
      </nav>
      
      <div class="controls">
        <select v-model="selectedLanguage">
          <option value="ru">🇷🇺 Русский</option>
          <option value="en">🇬🇧 English</option>
          <option value="de">🇩🇪 Deutsch</option>
        </select>
        
        <button @click="themeStore.toggleTheme" class="theme-button">
          <span v-if="darkMode">🌞</span>
          <span v-else>🌙</span>
        </button>
      </div>
    </div>
  </header>
  
  <main :class="{ dark: darkMode }">
    <RouterView />
  </main>
  
  <!-- Модальное окно добавления вакансии -->
  <div v-if="showAddJobModal" class="modal-overlay" @click.self="closeAddJobModal">
    <div class="modal-content" :class="{ dark: darkMode }">
      <button @click="closeAddJobModal" class="close-button">&times;</button>
      <AddJob @job-added="handleJobAdded" @cancel="closeAddJobModal" :showCancelButton="true" />
    </div>
  </div>
</template>

<style scoped>
header {
  padding: 15px 0;
  background-color: #f8f9fa;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
  transition: background-color 0.3s;
}

header.dark {
  background-color: #1a1a1a;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
}

.wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  font-size: 24px;
}

.logo-text {
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.dark .logo-text {
  color: #fff;
}

nav {
  display: flex;
  gap: 25px;
}

nav a {
  text-decoration: none;
  color: #333;
  font-weight: 600;
  font-size: 16px;
  padding: 8px 12px;
  border-radius: 5px;
  transition: color 0.2s, background-color 0.2s;
}

nav a.router-link-active, 
nav a.add-job-link:hover {
  color: #fff;
  background-color: #007bff;
}

header.dark nav a {
  color: #ddd;
}

header.dark nav a.router-link-active,
header.dark nav a.add-job-link:hover {
  color: #fff;
  background-color: #ffcc00;
}

.controls {
  display: flex;
  gap: 15px;
  align-items: center;
}

.controls select {
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 5px;
  background-color: #fff;
  color: #333;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s, border-color 0.3s;
}

header.dark .controls select {
  background-color: #333;
  color: #ddd;
  border-color: #555;
}

.controls select:hover {
  border-color: #007bff;
}

header.dark .controls select:hover {
  border-color: #ffcc00;
}

.theme-button {
  padding: 8px 12px;
  font-size: 16px;
  cursor: pointer;
  background-color: #fff;
  border: 1px solid #ccc;
  border-radius: 5px;
  transition: background-color 0.3s, border-color 0.3s;
}

header.dark .theme-button {
  background-color: #333;
  border-color: #555;
  color: #ddd;
}

.theme-button:hover {
  background-color: #f0f0f0;
  border-color: #007bff;
}

header.dark .theme-button:hover {
  background-color: #444;
  border-color: #ffcc00;
}

main {
  min-height: calc(100vh - 100px);
  padding: 20px;
  background-color: #f5f5f5;
  transition: background-color 0.3s;
}

main.dark {
  background-color: #121212;
  color: #fff;
}

/* Стили для модального окна */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  animation: fadeIn 0.3s ease;
}

.modal-content {
  position: relative;
  background-color: #fff;
  border-radius: 10px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  animation: slideDown 0.3s ease;
  padding: 0;
}

.modal-content.dark {
  background-color: #2a2a2a;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.close-button {
  position: absolute;
  top: 15px;
  right: 15px;
  background: none;
  border: none;
  font-size: 26px;
  cursor: pointer;
  color: #555;
  z-index: 10;
  transition: color 0.2s;
}

.close-button:hover {
  color: #000;
}

.dark .close-button {
  color: #aaa;
}

.dark .close-button:hover {
  color: #fff;
}

/* Стили для блокировки скролла при открытом модальном окне */
:global(body.modal-open) {
  overflow: hidden;
}

/* Анимации */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideDown {
  from { transform: translateY(-50px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* Стили для мобильных устройств */
@media (max-width: 768px) {
  .wrapper {
    flex-direction: column;
    gap: 15px;
  }
  
  nav {
    width: 100%;
    justify-content: center;
  }
  
  .controls {
    width: 100%;
    justify-content: center;
  }
}
</style>