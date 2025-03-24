<template>
  <div class="add-job-page">
    <h1>{{ t('addJob') }}</h1>
    <button @click="openModal" class="open-modal-button">
      {{ t('openAddForm') }}
    </button>
    
    <div v-if="isModalOpen" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <button @click="closeModal" class="close-button">&times;</button>
        <AddJob @job-added="handleJobAdded" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";
import AddJob from "@/pages/AddJob.vue";
import { useJobStore } from "@/stores/jobStore";
import { useI18n } from "vue-i18n";
import { useLanguageStore } from "@/stores/languageStore";

const { t } = useI18n();
const languageStore = useLanguageStore();
const jobStore = useJobStore();
const isModalOpen = ref(false);

const openModal = () => {
  isModalOpen.value = true;
  // Добавляем класс к body, чтобы предотвратить скролл под модальным окном
  document.body.classList.add('modal-open');
};

const closeModal = () => {
  isModalOpen.value = false;
  // Удаляем класс с body
  document.body.classList.remove('modal-open');
};

const handleJobAdded = async () => {
  console.log("✅ Вакансия добавлена! Обновляем список...");
  await jobStore.fetchJobs();
  closeModal();
};

// Отслеживаем смену языка и обновляем данные
watch(() => languageStore.currentLanguage, (newLang, oldLang) => {
  console.log(`Язык изменился с ${oldLang} на ${newLang}`);
  // Обновляем список вакансий при смене языка
  jobStore.fetchJobs().then(() => {
    console.log("Список вакансий обновлён после смены языка");
  }).catch(err => {
    console.error("Ошибка при обновлении вакансий после смены языка:", err);
  });
});

// Обеспечение корректного закрытия модального окна при нажатии клавиши Escape
const handleEscapeKey = (event) => {
  if (event.key === 'Escape' && isModalOpen.value) {
    closeModal();
  }
};

// Добавляем и удаляем обработчик события при монтировании и размонтировании компонента
import { onMounted, onUnmounted } from 'vue';

onMounted(() => {
  window.addEventListener('keydown', handleEscapeKey);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleEscapeKey);
  // На всякий случай удаляем класс с body при размонтировании компонента
  document.body.classList.remove('modal-open');
});
</script>

<style scoped>
.add-job-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  text-align: center;
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  color: #333;
  transition: background-color 0.2s, color 0.2s;
}

.dark .add-job-page {
  background-color: #222;
  color: #fff;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}

.add-job-page h1 {
  margin-bottom: 30px;
  font-size: 28px;
  font-weight: 700;
}

.open-modal-button {
  padding: 12px 24px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  transition: background-color 0.3s, transform 0.2s;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.open-modal-button:hover {
  background-color: #0056b3;
  transform: translateY(-2px);
}

.dark .open-modal-button {
  background-color: #0056b3;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
}

.dark .open-modal-button:hover {
  background-color: #003d7a;
}

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
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

.modal-content {
  background-color: #fff;
  padding: 30px;
  border-radius: 10px;
  position: relative;
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  animation: slideIn 0.3s ease;
}

.dark .modal-content {
  background-color: #333;
  color: #ddd;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
}

.close-button {
  position: absolute;
  top: 15px;
  right: 15px;
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #666;
  transition: color 0.2s;
  z-index: 10;
}

.dark .close-button {
  color: #bbb;
}

.close-button:hover {
  color: #000;
}

.dark .close-button:hover {
  color: #fff;
}

/* Предотвращение скролла под модальным окном */
:global(body.modal-open) {
  overflow: hidden;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from { transform: translateY(-30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* Дополнительные стили для мобильных устройств */
@media (max-width: 600px) {
  .modal-content {
    width: 95%;
    padding: 20px;
  }
  
  .add-job-page {
    padding: 15px;
  }
  
  .add-job-page h1 {
    font-size: 24px;
  }
}
</style>