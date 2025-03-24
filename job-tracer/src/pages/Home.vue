<template>
  <div class="job-tracker-home">
    <!-- Показываем детальный просмотр вакансии, если она выбрана -->
    <div v-if="selectedJob" class="job-view-container">
      <div class="back-button-container">
        <button @click="selectedJob = null" class="back-button">
          &larr; {{ t('backToList') }}
        </button>
      </div>
      <JobView 
        :job="selectedJob" 
        @update="updateJob"
        @delete="handleRemoveJob"
      />
    </div>
    
    <!-- Показываем список вакансий, если ничего не выбрано -->
    <div v-else>
      <div class="header-section">
        <h1>{{ t('title') }}</h1>
      </div>
      
      <!-- Используем обновленный компонент списка вакансий -->
      <JobsList 
        @job-selected="selectJob"
      />
    </div>
  </div>
</template>

<script setup>
import { useJobStore } from "@/stores/jobStore";
import JobView from "@/views/JobView.vue";
import JobsList from "@/pages/JobsList.vue"; // Импортируем обновленный компонент списка вакансий
import { ref, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useLanguageStore } from "@/stores/languageStore"; 
import { storeToRefs } from "pinia";

// Инициализация i18n
const { t } = useI18n();

// Получаем доступ к вакансиям и языковому стору
const jobStore = useJobStore();
const languageStore = useLanguageStore();

// Используем storeToRefs для сохранения реактивности
const { jobs } = storeToRefs(jobStore);
// Методы можно использовать напрямую
const { fetchJobs, removeJob, updateJobStatus, updateJobNotes } = jobStore;

// Локальные переменные
const selectedJob = ref(null);

// При монтировании компонента загружаем вакансии
onMounted(async () => {
  console.log("🚀 Компонент Home.vue смонтирован");
  
  // Вакансии загружаются в компоненте JobsList,
  // но мы можем сделать предварительную подготовку здесь
  await fetchJobs();
});

// Выбор вакансии для подробного просмотра
const selectJob = (job) => {
  console.log("📄 Выбрана вакансия:", job);
  
  // Если вакансия распарсена, но нет ссылок на данные парсинга, добавляем их
  if (job.isParsed && !job.parsedLinks) {
    job.parsedLinks = {
      data: `/api/jobs/${job.id}/parsed`,
      screenshot: `/api/jobs/${job.id}/screenshot`,
      html: `/api/jobs/${job.id}/html`,
      text: `/api/jobs/${job.id}/text`
    };
  }
  
  selectedJob.value = job;
};

// Обновление информации о вакансии (включая парсинг)
const updateJob = async (updatedJob) => {
  console.log("🔄 Обновление вакансии:", updatedJob);
  
  // Находим индекс вакансии в массиве
  const index = jobs.value.findIndex(j => j.id === updatedJob.id);
  
  if (index !== -1) {
    // Обновляем вакансию в массиве
    jobs.value[index] = updatedJob;
    
    // Если эта вакансия выбрана в данный момент, обновляем и ее
    if (selectedJob.value && selectedJob.value.id === updatedJob.id) {
      selectedJob.value = updatedJob;
    }
    
    // Обновляем все вакансии через store
    await fetchJobs();
  }
};

// Удаление вакансии с подтверждением
const handleRemoveJob = async (jobId) => {
  if (confirm(t("confirmRemove"))) {
    console.log(`🗑️ Удаление вакансии с ID ${jobId}`);
    await removeJob(jobId);
    
    // Если была удалена выбранная вакансия, закрываем просмотр
    if (selectedJob.value && selectedJob.value.id === jobId) {
      selectedJob.value = null;
    }
    
    // Обновляем данные
    await fetchJobs();
  }
};

// Отслеживание смены языка
watch(
  () => languageStore.currentLanguage,
  (newLang, oldLang) => {
    console.log(`🌐 Язык поменялся с ${oldLang} на ${newLang}`);
    // При необходимости можно обновить вакансии
    // fetchJobs();
  }
);
</script>

<style scoped>
.job-tracker-home {
  max-width: 960px;
  margin: 0 auto;
  padding: 20px;
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  transition: background-color 0.3s, color 0.3s;
}

.dark .job-tracker-home {
  background-color: #1e1e1e;
  color: #ddd;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}

.header-section {
  margin-bottom: 30px;
}

.header-section h1 {
  margin-bottom: 20px;
  color: #333;
  font-size: 28px;
  font-weight: 700;
  text-align: center;
}

.dark .header-section h1 {
  color: #fff;
}

/* Стили для JobView и кнопки "Назад" */
.job-view-container {
  animation: fadeIn 0.5s ease-in-out;
}

.back-button-container {
  margin-bottom: 20px;
}

.back-button {
  padding: 8px 15px;
  background-color: #f1f1f1;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.back-button:hover {
  background-color: #e0e0e0;
}

.dark .back-button {
  background-color: #333;
  color: #ddd;
}

.dark .back-button:hover {
  background-color: #444;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>