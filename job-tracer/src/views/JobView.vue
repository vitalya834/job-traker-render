<template>
  <div class="job-view">
    <div class="job-header">
      <h2>{{ job.position }}</h2>
      <div class="company">{{ job.company }}</div>
    </div>
    
    <div class="job-details">
      <!-- Основная информация о вакансии -->
      <div class="detail-section">
        <div class="detail-item">
          <span class="detail-label">{{ $t('jobLink') }}:</span>
          <a v-if="job.link" :href="job.link" target="_blank" class="job-link">{{ $t('viewJob') }}</a>
          <span v-else class="no-data">{{ $t('noLink') }}</span>
          
          <!-- Индикатор источника вакансии -->
          <div v-if="jobSource" class="source-info">
            <span class="source-icon">
              <img :src="getSourceIcon()" :alt="jobSource" :title="jobSource" />
            </span>
            {{ jobSource }}
          </div>
        </div>
        
        <div class="detail-item">
          <span class="detail-label">{{ $t('interviewDate') }}:</span>
          <span>{{ formatDate(job.interviewDate) || $t('noDate') }}</span>
        </div>
        
        <div class="detail-item">
          <span class="detail-label">{{ $t('status') }}:</span>
          <span class="status-badge" :class="job.status">
            {{ $t(`jobStatus.${job.status}`) }}
          </span>
        </div>
      </div>
      
      <!-- Файлы резюме и сопроводительного письма -->
      <div class="files-section" v-if="job.resumeUrl || job.coverLetterUrl">
        <h3>{{ $t('documents') }}</h3>
        <div class="files-list">
          <a v-if="job.resumeUrl" :href="job.resumeUrl" target="_blank" class="file-link">
            <span class="file-icon">📄</span>
            {{ $t('resume') }}
          </a>
          <a v-if="job.coverLetterUrl" :href="job.coverLetterUrl" target="_blank" class="file-link">
            <span class="file-icon">📝</span>
            {{ $t('coverLetter') }}
          </a>
        </div>
      </div>
      
      <!-- Раздел для парсинга и просмотра закешированных данных -->
      <div class="parse-section">
        <div v-if="job.isParsed" class="parsed-info">
          <div class="parsed-badge">
            <span class="parsed-icon">✓</span>
            {{ $t('jobParsed') }}
          </div>
          <div class="parsed-date" v-if="job.parsedAt">
            {{ $t('parsedOn') }}: {{ formatDate(job.parsedAt) }}
          </div>
        </div>
        
        <div class="parse-actions">
          <!-- Кнопка для парсинга вакансии -->
          <button 
            v-if="job.link && !job.isParsed && !parsingInProgress" 
            @click="parseJob" 
            class="parse-button"
          >
            {{ $t('parseNow') }}
          </button>
          
          <div v-if="parsingInProgress" class="parsing-progress">
            <span class="loading-spinner"></span>
            {{ $t('parsingInProgress') }}
          </div>
          
          <!-- Кнопки для просмотра закешированных данных -->
          <div v-if="job.isParsed" class="cached-actions">
            <button @click="viewCachedData" class="view-cached-button">
              {{ $t('viewSavedVersion') }}
            </button>
            
            <div class="dropdown">
              <button class="dropdown-toggle">
                {{ $t('viewDetails') }} ▼
              </button>
              <div class="dropdown-menu">
                <a :href="job.parsedLinks?.html" target="_blank">{{ $t('htmlSource') }}</a>
                <a :href="job.parsedLinks?.text" target="_blank">{{ $t('description') }}</a>
                <a :href="job.parsedLinks?.screenshot" target="_blank">{{ $t('screenshot') }}</a>
                <a :href="job.link" target="_blank">{{ $t('openOriginalPage') }}</a>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Раздел для просмотра закешированных данных -->
      <div v-if="showCachedData" class="cached-data-section">
        <div class="section-header">
          <h3>{{ $t('description') }}</h3>
          <button @click="showCachedData = false" class="close-button">×</button>
        </div>
        
        <div v-if="cachedDataLoading" class="loading">
          <span class="loading-spinner"></span>
          {{ $t('loadingJobData') }}
        </div>
        
        <div v-else-if="cachedDataError" class="error-message">
          {{ $t('errorLoadingParsedData') }}: {{ cachedDataError }}
        </div>
        
        <div v-else-if="!cachedData" class="no-data-message">
          {{ $t('noDataAvailable') }}
        </div>
        
        <div v-else class="cached-content">
          <!-- Вкладки для разных типов содержимого -->
          <div class="tabs">
            <button 
              @click="activeTab = 'description'" 
              :class="{ active: activeTab === 'description' }"
            >
              {{ $t('description') }}
            </button>
            <button 
              @click="activeTab = 'screenshot'" 
              :class="{ active: activeTab === 'screenshot' }"
            >
              {{ $t('screenshot') }}
            </button>
            <button 
              @click="activeTab = 'html'" 
              :class="{ active: activeTab === 'html' }"
            >
              {{ $t('htmlSource') }}
            </button>
          </div>
          
          <!-- Содержимое вкладок -->
          <div class="tab-content">
            <div v-if="activeTab === 'description'" class="tab-pane description">
              <pre>{{ cachedData.description }}</pre>
            </div>
            
            <div v-if="activeTab === 'screenshot'" class="tab-pane screenshot">
              <img :src="job.parsedLinks?.screenshot" alt="Job Screenshot" />
            </div>
            
            <div v-if="activeTab === 'html'" class="tab-pane html">
              <iframe :src="job.parsedLinks?.html" width="100%" height="500"></iframe>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Заметки -->
      <div class="notes-section">
        <h3>{{ $t('notes') }}</h3>
        <textarea 
          v-model="notes" 
          :placeholder="$t('addNotes')"
          @blur="saveNotes"
          class="notes-input"
        ></textarea>
      </div>
    </div>
    
    <!-- Кнопки статусов -->
    <div class="job-status-buttons">
      <button 
        v-for="status in ['sent', 'interview', 'rejected', 'accepted']" 
        :key="status"
        @click="updateStatus(status)" 
        :class="['status-button', status, { active: job.status === status }]"
      >
        {{ $t(`jobStatus.${status}`) }}
      </button>
      
      <button @click="scheduleInterview" class="action-button schedule">
        {{ $t('scheduleInterview') }}
      </button>
      
      <button @click="confirmDelete" class="action-button delete">
        {{ $t('delete') }}
      </button>
    </div>
    
    <!-- Модальное окно для подтверждения удаления -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
      <div class="modal-content">
        <h3>{{ $t('confirmDelete') }}</h3>
        <p>{{ $t('confirmRemove') }}</p>
        <div class="modal-buttons">
          <button @click="showDeleteConfirm = false" class="cancel-button">
            {{ $t('cancel') }}
          </button>
          <button @click="deleteJob" class="confirm-button">
            {{ $t('delete') }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- Модальное окно для планирования интервью -->
    <div v-if="showInterviewModal" class="modal-overlay" @click.self="showInterviewModal = false">
      <div class="modal-content">
        <h3>{{ $t('scheduleInterview') }}</h3>
        <div class="interview-form">
          <label>{{ $t('selectDateTime') }}</label>
          <input type="datetime-local" v-model="interviewDate" />
        </div>
        <div class="modal-buttons">
          <button @click="showInterviewModal = false" class="cancel-button">
            {{ $t('cancel') }}
          </button>
          <button @click="saveInterview" class="confirm-button">
            {{ $t('save') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useJobStore } from '@/stores/jobStore'; // Добавлен импорт jobStore

export default {
  name: 'JobView',
  props: {
    job: {
      type: Object,
      required: true
    }
  },
  setup(props, { emit }) {
    const { t } = useI18n();
    const jobStore = useJobStore(); // Инициализация хранилища
    
    // Состояния
    const notes = ref(props.job.notes || '');
    const showDeleteConfirm = ref(false);
    const showInterviewModal = ref(false);
    const interviewDate = ref('');
    const parsingInProgress = ref(false);
    const showCachedData = ref(false);
    const cachedData = ref(null);
    const cachedDataLoading = ref(false);
    const cachedDataError = ref(null);
    const activeTab = ref('description');
    
    // Отслеживаем изменения заметок из пропсов
    watch(() => props.job.notes, (newVal) => {
      notes.value = newVal || '';
    });
    
    // Определение источника вакансии на основе URL
    const jobSource = computed(() => {
      if (!props.job.link) return null;
      
      const url = props.job.link.toLowerCase();
      
      if (url.includes('linkedin.com')) return 'LinkedIn';
      if (url.includes('indeed.com')) return 'Indeed';
      if (url.includes('glassdoor.com')) return 'Glassdoor';
      if (url.includes('monster.com')) return 'Monster';
      if (url.includes('hh.ru') || url.includes('headhunter')) return 'HeadHunter';
      if (url.includes('superjob.ru')) return 'SuperJob';
      if (url.includes('rabota.ru')) return 'Rabota.ru';
      if (url.includes('github.com/jobs')) return 'GitHub Jobs';
      if (url.includes('stackoverflow.com/jobs')) return 'Stack Overflow Jobs';
      if (url.includes('upwork.com')) return 'Upwork';
      if (url.includes('freelancer.com')) return 'Freelancer';
      if (url.includes('stepstone.de')) return 'Stepstone';
      
      return 'Other';
    });
    
    // Функция для получения иконки источника
    const getSourceIcon = () => {
      const iconBase = '/src/assets/icons/sources';
      
      switch (jobSource.value) {
        case 'LinkedIn':
          return `${iconBase}/linkedin.svg`;
        case 'Indeed':
          return `${iconBase}/indeed.svg`;
        case 'Glassdoor':
          return `${iconBase}/glassdoor.svg`;
        case 'Monster':
          return `${iconBase}/monster.svg`;
        case 'HeadHunter':
          return `${iconBase}/hh.svg`;
        case 'SuperJob':
          return `${iconBase}/superjob.svg`;
        case 'Rabota.ru':
          return `${iconBase}/rabota.svg`;
        case 'GitHub Jobs':
          return `${iconBase}/github.svg`;
        case 'Stack Overflow Jobs':
          return `${iconBase}/stackoverflow.svg`;
        case 'Upwork':
          return `${iconBase}/upwork.svg`;
        case 'Freelancer':
          return `${iconBase}/freelancer.svg`;
        case 'Stepstone':
          return `${iconBase}/stepstone.svg`;
        default:
          return `${iconBase}/web.svg`;
      }
    };
    
    // Функция для обновления статуса
    const updateStatus = async (status) => {
      try {
        // Используем jobStore вместо прямого axios-запроса
        await jobStore.updateJobStatus(props.job.id, status);
        emit('update', { ...props.job, status });
      } catch (error) {
        console.error('Ошибка при обновлении статуса:', error);
        alert(t('errorUpdatingStatus'));
      }
    };
    
    // Функция для сохранения заметок
    const saveNotes = async () => {
      if (notes.value === props.job.notes) return;
      
      try {
        // Используем jobStore вместо прямого axios-запроса
        await jobStore.updateJobNotes(props.job.id, notes.value);
        emit('update', { ...props.job, notes: notes.value });
      } catch (error) {
        console.error('Ошибка при сохранении заметок:', error);
        alert(t('errorUpdatingNotes'));
      }
    };
    
    // Функция для подтверждения удаления
    const confirmDelete = () => {
      showDeleteConfirm.value = true;
    };
    
    // Функция для удаления вакансии
    const deleteJob = async () => {
      try {
        // Используем jobStore вместо прямого axios-запроса
        await jobStore.removeJob(props.job.id);
        emit('delete', props.job.id);
        showDeleteConfirm.value = false;
      } catch (error) {
        console.error('Ошибка при удалении вакансии:', error);
        alert(t('errorDeleting'));
      }
    };
    
    // Функция для открытия модального окна планирования интервью
    const scheduleInterview = () => {
      if (props.job.interviewDate) {
        // Преобразуем дату в формат для input datetime-local
        const date = new Date(props.job.interviewDate);
        interviewDate.value = date.toISOString().slice(0, 16);
      } else {
        interviewDate.value = '';
      }
      
      showInterviewModal.value = true;
    };
    
    // Функция для сохранения даты интервью
    const saveInterview = async () => {
      try {
        const isoDate = interviewDate.value ? new Date(interviewDate.value).toISOString() : null;
        // Используем jobStore вместо прямого axios-запроса
        await jobStore.updateJobStatus(props.job.id, 'Interview', isoDate);
        
        emit('update', { 
          ...props.job, 
          status: 'Interview',
          interviewDate: isoDate 
        });
        
        showInterviewModal.value = false;
      } catch (error) {
        console.error('Ошибка при планировании интервью:', error);
        alert(t('errorSchedulingInterview'));
      }
    };
    
    // Функция для форматирования даты
    const formatDate = (dateString) => {
      if (!dateString) return '';
      
      try {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('ru-RU', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }).format(date);
      } catch (e) {
        return t('invalidDate');
      }
    };
    
    // Функция для парсинга вакансии
    const parseJob = async () => {
      if (!props.job.link) {
        alert(t('noLink'));
        return;
      }
      
      parsingInProgress.value = true;
      
      try {
        // Используем jobStore вместо прямого axios-запроса
        const result = await jobStore.parseJob(props.job.id);
        
        // Обновляем статус и получаем данные о парсинге
        emit('update', { 
          ...props.job, 
          isParsed: true,
          parsedAt: new Date().toISOString(),
          parsedLinks: {
            data: `/api/jobs/${props.job.id}/parsed`,
            screenshot: `/api/jobs/${props.job.id}/screenshot`,
            html: `/api/jobs/${props.job.id}/html`,
            text: `/api/jobs/${props.job.id}/text`
          }
        });
        
        // Показываем модальное окно с данными парсинга
        showCachedData.value = true;
        cachedData.value = result?.parsedData;
        
        // Уведомляем пользователя
        alert(t('jobSuccessfullyParsed'));
      } catch (error) {
        console.error('Ошибка при парсинге вакансии:', error);
        alert(t('errorParsingJob') + ': ' + (error.message || ''));
      } finally {
        parsingInProgress.value = false;
      }
    };
    
    // Функция для просмотра закешированных данных
    const viewCachedData = async () => {
      if (!props.job.isParsed) {
        alert(t('noDataAvailable'));
        return;
      }
      
      showCachedData.value = true;
      cachedDataLoading.value = true;
      cachedDataError.value = null;
      
      try {
        // Используем jobStore вместо прямого axios-запроса
        const parsedData = await jobStore.getParsedJob(props.job.id);
        cachedData.value = parsedData;
      } catch (error) {
        console.error('Ошибка при загрузке закешированных данных:', error);
        cachedDataError.value = error.message || '';
      } finally {
        cachedDataLoading.value = false;
      }
    };
    
    return {
      notes,
      showDeleteConfirm,
      showInterviewModal,
      interviewDate,
      parsingInProgress,
      showCachedData,
      cachedData,
      cachedDataLoading,
      cachedDataError,
      activeTab,
      jobSource,
      updateStatus,
      saveNotes,
      confirmDelete,
      deleteJob,
      scheduleInterview,
      saveInterview,
      formatDate,
      parseJob,
      viewCachedData,
      getSourceIcon
    };
  }
}
</script>

<style scoped>
.job-view {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: relative;
}

.dark .job-view {
  background-color: #2a2a2a;
  color: #eee;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.job-header {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}

.dark .job-header {
  border-bottom-color: #444;
}

.job-header h2 {
  margin: 0 0 5px;
  font-size: 1.8rem;
  color: #333;
}

.dark .job-header h2 {
  color: #eee;
}

.company {
  color: #666;
  font-size: 1.2rem;
}

.dark .company {
  color: #aaa;
}

.job-details {
  margin-bottom: 20px;
}

.detail-section {
  margin-bottom: 25px;
}

.detail-item {
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.detail-label {
  font-weight: 600;
  margin-right: 10px;
  min-width: 120px;
}

.dark .detail-label {
  color: #ddd;
}

.job-link {
  color: #007bff;
  text-decoration: none;
}

.job-link:hover {
  text-decoration: underline;
}

.dark .job-link {
  color: #5cbbff;
}

/* Стили для индикатора источника */
.source-info {
  display: inline-flex;
  align-items: center;
  margin-left: 10px;
  font-size: 12px;
  color: #777;
  background-color: #f5f5f5;
  padding: 3px 8px;
  border-radius: 12px;
}

.dark .source-info {
  color: #bbb;
  background-color: #333;
}

.source-icon {
  display: inline-flex;
  margin-right: 5px;
}

.source-icon img {
  width: 14px;
  height: 14px;
  object-fit: contain;
}

.status-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 12px;
  color: #fff;
  font-size: 0.9rem;
}

.status-badge.sent {
  background-color: #17a2b8;
}

.status-badge.interview {
  background-color: #ffc107;
  color: #333;
}

.status-badge.rejected {
  background-color: #dc3545;
}

.status-badge.accepted {
  background-color: #28a745;
}

.files-section {
  margin-bottom: 25px;
}

.files-section h3 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 1.2rem;
  color: #444;
}

.dark .files-section h3 {
  color: #ddd;
}

.files-list {
  display: flex;
  gap: 15px;
}

.file-link {
  display: flex;
  align-items: center;
  padding: 8px 15px;
  background-color: #f8f9fa;
  border-radius: 4px;
  color: #333;
  text-decoration: none;
  transition: background-color 0.2s;
}

.file-link:hover {
  background-color: #e9ecef;
}

.dark .file-link {
  background-color: #333;
  color: #ddd;
}

.dark .file-link:hover {
  background-color: #444;
}

.file-icon {
  margin-right: 8px;
  font-size: 1.1rem;
}


.parse-section {
  margin-bottom: 25px;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 6px;
}

.dark .parse-section {
  background-color: #333;
}

.parsed-info {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 10px;
}

.parsed-badge {
  display: flex;
  align-items: center;
  color: #28a745;
  font-weight: 600;
}

.dark .parsed-badge {
  color: #4caf50;
}

.parsed-icon {
  margin-right: 5px;
}

.parsed-date {
  color: #6c757d;
  font-size: 0.9rem;
}

.dark .parsed-date {
  color: #bbb;
}

.parse-actions {
  display: flex;
  gap: 15px;
  align-items: center;
  flex-wrap: wrap;
}

.parse-button {
  padding: 8px 15px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.parse-button:hover {
  background-color: #218838;
}

.parsing-progress {
  display: flex;
  align-items: center;
  color: #6c757d;
}

.dark .parsing-progress {
  color: #bbb;
}

.loading-spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  margin-right: 8px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-top-color: #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.dark .loading-spinner {
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-top-color: #5cbbff;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.cached-actions {
  display: flex;
  gap: 10px;
}

.view-cached-button {
  padding: 8px 15px;
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.view-cached-button:hover {
  background-color: #5a6268;
}

.dropdown {
  position: relative;
}

.dropdown-toggle {
  padding: 8px 15px;
  background-color: #17a2b8;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.dropdown-toggle:hover {
  background-color: #138496;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 10;
  min-width: 180px;
  padding: 8px 0;
  margin-top: 5px;
  background-color: white;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  display: none;
}

.dark .dropdown-menu {
  background-color: #333;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.dropdown:hover .dropdown-menu {
  display: block;
}

.dropdown-menu a {
  display: block;
  padding: 8px 15px;
  color: #333;
  text-decoration: none;
  transition: background-color 0.2s;
}

.dropdown-menu a:hover {
  background-color: #f8f9fa;
}

.dark .dropdown-menu a {
  color: #ddd;
}

.dark .dropdown-menu a:hover {
  background-color: #444;
}

.cached-data-section {
  margin-top: 20px;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 6px;
  position: relative;
}

.dark .cached-data-section {
  background-color: #333;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.section-header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #444;
}

.dark .section-header h3 {
  color: #ddd;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6c757d;
  cursor: pointer;
}

.dark .close-button {
  color: #bbb;
}

.loading, .error-message, .no-data-message {
  padding: 20px;
  text-align: center;
  color: #6c757d;
}

.dark .loading, .dark .no-data-message {
  color: #bbb;
}

.error-message {
  color: #dc3545;
}

.dark .error-message {
  color: #ff6b6b;
}

.tabs {
  display: flex;
  gap: 5px;
  margin-bottom: 15px;
  border-bottom: 1px solid #dee2e6;
}

.dark .tabs {
  border-bottom-color: #555;
}

.tabs button {
  padding: 8px 15px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  color: #6c757d;
  transition: color 0.2s, border-color 0.2s;
}

.tabs button.active {
  color: #007bff;
  border-bottom-color: #007bff;
}

.dark .tabs button {
  color: #bbb;
}

.dark .tabs button.active {
  color: #5cbbff;
  border-bottom-color: #5cbbff;
}

.tab-content {
  padding: 15px;
  background-color: #fff;
  border-radius: 4px;
}

.dark .tab-content {
  background-color: #222;
}

.tab-pane.description pre {
  white-space: pre-wrap;
  font-family: inherit;
  margin: 0;
}

.tab-pane.screenshot img {
  max-width: 100%;
  border-radius: 4px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.dark .tab-pane.screenshot img {
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
}

.tab-pane.html iframe {
  border: 1px solid #dee2e6;
  border-radius: 4px;
}

.dark .tab-pane.html iframe {
  border-color: #555;
}

.notes-section {
  margin-top: 25px;
}

.notes-section h3 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 1.2rem;
  color: #444;
}

.dark .notes-section h3 {
  color: #ddd;
}

.notes-input {
  width: 100%;
  min-height: 150px;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: vertical;
  font-family: inherit;
  font-size: 0.95rem;
  background-color: #fff;
  color: #333;
}

.dark .notes-input {
  background-color: #333;
  color: #ddd;
  border-color: #555;
}

.job-status-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 25px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.dark .job-status-buttons {
  border-top-color: #444;
}

.status-button {
  padding: 8px 15px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.95rem;
  transition: all 0.2s;
}

.status-button:hover {
  background-color: #e9ecef;
}

.dark .status-button {
  background-color: #333;
  border-color: #555;
  color: #ddd;
}

.dark .status-button:hover {
  background-color: #444;
}

.status-button.active {
  font-weight: bold;
}

.status-button.sent.active {
  background-color: #17a2b8;
  border-color: #17a2b8;
  color: white;
}

.status-button.interview.active {
  background-color: #ffc107;
  border-color: #ffc107;
  color: #333;
}

.status-button.rejected.active {
  background-color: #dc3545;
  border-color: #dc3545;
  color: white;
}

.status-button.accepted.active {
  background-color: #28a745;
  border-color: #28a745;
  color: white;
}

.action-button {
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.95rem;
  transition: background-color 0.2s;
}

.action-button.schedule {
  background-color: #6f42c1;
  border: 1px solid #6f42c1;
  color: white;
}

.action-button.schedule:hover {
  background-color: #6610f2;
}

.action-button.delete {
  background-color: #dc3545;
  border: 1px solid #dc3545;
  color: white;
  margin-left: auto;
}

.action-button.delete:hover {
  background-color: #c82333;
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
}

.modal-content {
  width: 90%;
  max-width: 500px;
  padding: 25px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
}

.dark .modal-content {
  background-color: #2a2a2a;
  color: #ddd;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

.modal-content h3 {
  margin-top: 0;
  margin-bottom: 15px;
}

.interview-form {
  margin-bottom: 20px;
}

.interview-form label {
  display: block;
  margin-bottom: 10px;
  font-weight: 600;
}

.interview-form input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.dark .interview-form input {
  background-color: #333;
  color: #ddd;
  border-color: #555;
}

.modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.cancel-button {
  padding: 8px 15px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  cursor: pointer;
}

.dark .cancel-button {
  background-color: #444;
  border-color: #555;
  color: #ddd;
}

.confirm-button {
  padding: 8px 15px;
  background-color: #007bff;
  border: 1px solid #007bff;
  color: white;
  border-radius: 4px;
  cursor: pointer;
}

.confirm-button:hover {
  background-color: #0069d9;
}

.dark .confirm-button {
  background-color: #0d6efd;
}

.dark .confirm-button:hover {
  background-color: #0b5ed7;
}
</style>