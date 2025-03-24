<template>
  <div class="job-card" :class="{ 'expanded': isExpanded }">
    <!-- Левый индикатор статуса -->
    <div class="status-indicator" :class="statusClass"></div>
    
    <!-- Модальное окно для выбора даты интервью -->
    <div v-if="showInterviewModal" class="interview-modal-overlay">
      <div class="interview-modal">
        <div class="interview-modal-header">
          <h3>{{ t('scheduleInterview') }}</h3>
          <button @click="showInterviewModal = false" class="close-modal-btn">&times;</button>
        </div>
        <div class="interview-modal-body">
          <p>{{ t('selectDateTime') }}</p>
          <input 
            type="datetime-local"
            v-model="interviewDate"
            class="interview-date-input"
          />
        </div>
        <div class="interview-modal-footer">
          <button 
            @click="scheduleInterview" 
            class="save-btn"
            :disabled="!interviewDate"
          >
            {{ t('save') }}
          </button>
          
          <GoogleCalendarButton 
            :job="job" 
            :interview-date="interviewDate" 
          />
          
          <button @click="showInterviewModal = false" class="cancel-btn">
            {{ t('cancel') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Карточка вакансии -->
    <div class="card-header" @click="toggleExpand">
      <!-- Заменяем квадрат компании на иконку источника вакансии -->
      <div class="source-avatar">
        <!-- Если есть источник вакансии и для него есть иконка -->
        <div class="source-logo" v-if="jobSource">
          <img :src="getSourceIcon()" :alt="jobSource" :title="jobSource" />
        </div>
        <!-- Если нет иконки, показываем первую букву источника или компании -->
        <div class="source-placeholder" v-else>
          {{ getSourceInitial() }}
        </div>
      </div>
      
      <div class="job-info">
        <h3 class="job-title">{{ job.position || t('noPosition') }}</h3>
        <p class="company-name">{{ job.company || t('noCompany') }}</p>
        <div class="job-meta">
          <span class="application-date">{{ formatDate(job.createdAt) }}</span>
          <span 
            class="status-badge" 
            :class="statusClass"
          >
            {{ getStatusTranslation(job.status) }}
          </span>
        </div>
      </div>
      <div class="expand-icon">
        <span v-if="isExpanded">▲</span>
        <span v-else>▼</span>
      </div>
    </div>

    <div class="card-body" v-if="isExpanded">
      <div v-if="updateError" class="error-message">
        {{ updateError }}
        <button @click="clearError" class="clear-error-btn">×</button>
      </div>
      
      <div class="job-details">
        <div class="detail-row" v-if="job.link">
          <span class="detail-label">{{ t('jobLink') }}:</span>
          <a :href="job.link" target="_blank" class="job-link">{{ t('viewJob') }}</a>
          <!-- Информация об источнике вакансии -->
          <span v-if="jobSource" class="source-info">
            <span class="source-icon-small">
              <img :src="getSourceIcon()" :alt="jobSource" />
            </span>
            {{ jobSource }}
          </span>
        </div>
        
        <div class="detail-row" v-if="job.interviewDate">
          <span class="detail-label">{{ t('interviewDate') }}:</span>
          <span>{{ formatDate(job.interviewDate) }}</span>
          <GoogleCalendarButton 
            :job="job" 
            :interview-date="job.interviewDate" 
            class="calendar-inline-btn"
          />
        </div>

        <!-- Секция с информацией о парсинге вакансии -->
        <div class="parser-actions" v-if="job.link">
          <div v-if="job.isParsed" class="parsed-info">
            <div class="parsed-badge">{{ t('jobParsed') }}</div>
            <div class="parsed-date" v-if="job.parsedAt">
              {{ t('parsedOn') }}: {{ formatDate(job.parsedAt) }}
            </div>
            <div class="parser-buttons">
              <button @click="viewParsedJob" class="view-parsed-btn">
                {{ t('viewSavedVersion') }}
              </button>
            </div>
          </div>
          <div v-else class="parse-now">
            <button @click="parseJob" :disabled="parsingInProgress" class="parse-btn">
              {{ parsingInProgress ? t('parsingInProgress') : t('parseNow') }}
            </button>
          </div>
        </div>

        <div class="notes-section">
          <h4>{{ t('notes') }}</h4>
          <textarea 
            v-model="notesValue" 
            @blur="updateNotes"
            class="notes-input"
            :placeholder="t('addNotes')"
          ></textarea>
        </div>

        <div class="detail-row" v-if="job.resumePath">
          <span class="detail-label">{{ t('resume') }}:</span>
          <a :href="job.resumeUrl" target="_blank" class="resume-link">
            {{ getFileName(job.resumePath) }}
          </a>
        </div>

        <div class="detail-row" v-if="job.coverLetterPath">
          <span class="detail-label">{{ t('coverLetter') }}:</span>
          <a :href="job.coverLetterUrl" target="_blank" class="coverletter-link">
            {{ getFileName(job.coverLetterPath) }}
          </a>
        </div>
      </div>

      <div class="card-actions">
        <div class="status-actions">
          <button 
            v-for="status in availableStatuses" 
            :key="status"
            @click="updateStatus(status)"
            class="status-button"
            :class="[getStatusKey(status), { active: job.status === status }]"
          >
            {{ getStatusTranslation(status) }}
          </button>
          
          <!-- Кнопка для интервью теперь открывает модальное окно -->
          <button 
            @click="openInterviewModal"
            class="status-button interview"
            :class="{ active: job.status === JOB_STATUS.INTERVIEW }"
          >
            {{ t('scheduleInterview') }}
          </button>
        </div>

        <button @click="confirmRemove" class="delete-button">
          {{ t('delete') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useJobStore } from '@/stores/jobStore';
import { useRouter } from 'vue-router'; // Импортируем router для навигации
import { JOB_STATUS, normalizeStatus, getStatusKey } from "@/constants/jobStatus";
import GoogleCalendarButton from '@/components/GoogleCalendarButton.vue';

const router = useRouter(); // Инициализируем router

// Принимаем данные о вакансии из родительского компонента
const props = defineProps({
  job: {
    type: Object,
    required: true
  }
});

// События для передачи в родительский компонент
const emit = defineEmits(['remove', 'update-status']);

// Получаем доступ к i18n для работы с переводами
const { t } = useI18n();

// Доступ к хранилищу вакансий
const jobStore = useJobStore();

// Локальные состояния компонента
const isExpanded = ref(false);
const notesValue = ref(props.job.notes || '');
const interviewDate = ref('');
const showInterviewModal = ref(false);
const updateError = ref(null);
const parsingInProgress = ref(false); // Состояние процесса парсинга

// Доступные статусы вакансий
const availableStatuses = [JOB_STATUS.SENT, JOB_STATUS.REJECTED, JOB_STATUS.ACCEPTED];

// Определение источника вакансии на основе URL
const jobSource = computed(() => {
  if (!props.job.link) return null;
  
  const url = props.job.link.toLowerCase();
  
  if (url.includes('linkedin.com')) return 'LinkedIn';
  if (url.includes('indeed.com')) return 'Indeed';
  if (url.includes('glassdoor.com')) return 'Glassdoor';
  if (url.includes('monster.de')) return 'Monster';
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

// Получаем первую букву источника или компании
const getSourceInitial = () => {
  if (jobSource.value) {
    return jobSource.value.charAt(0);
  } else if (props.job.company) {
    return props.job.company.charAt(0);
  } else {
    return '?';
  }
};

// Функция для получения иконки источника
const getSourceIcon = () => {
  const iconBase = '/src/assets/icons/sources'; // Путь к папке с иконками
  
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
      return `${iconBase}/web.svg`; // Дефолтная иконка для других источников
  }
};

// Функция для получения цвета фона плейсхолдера в зависимости от источника
const getSourcePlaceholderColor = () => {
  const sourceColors = {
    'LinkedIn': '#0077B5',
    'Indeed': '#2164f3',
    'Glassdoor': '#0CAA41',
    'Monster': '#6E00FF',
    'HeadHunter': '#D6001C',
    'SuperJob': '#0CA9E3',
    'GitHub Jobs': '#24292E',
    'Stack Overflow Jobs': '#F48024',
    'Upwork': '#6FDA44',
    'Freelancer': '#29B2FE',
    'Stepstone': '#0063A3',
    'Other': '#607D8B'
  };

  if (jobSource.value && sourceColors[jobSource.value]) {
    return sourceColors[jobSource.value];
  }
  return '#607D8B'; // Дефолтный цвет
};

// Следим за изменениями в job.notes и обновляем локальное состояние
watch(() => props.job.notes, (newNotes) => {
  notesValue.value = newNotes || '';
});

// При монтировании компонента инициализируем значения
onMounted(() => {
  if (props.job.interviewDate) {
    try {
      // Преобразуем дату интервью в формат для input type="datetime-local"
      const date = new Date(props.job.interviewDate);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        interviewDate.value = `${year}-${month}-${day}T${hours}:${minutes}`;
      }
    } catch (error) {
      console.error("Ошибка при разборе даты интервью:", error);
    }
  }
});

// CSS класс в зависимости от статуса вакансии
const statusClass = computed(() => {
  return props.job.status ? getStatusKey(props.job.status) : '';
});

// Переключение развернутого/свернутого состояния карточки
const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
};

// Открытие модального окна для выбора даты интервью
const openInterviewModal = () => {
  if (props.job.interviewDate && !interviewDate.value) {
    try {
      // Если у вакансии уже есть дата интервью, используем её
      const date = new Date(props.job.interviewDate);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        interviewDate.value = `${year}-${month}-${day}T${hours}:${minutes}`;
      }
    } catch (error) {
      console.error("Ошибка при разборе даты интервью:", error);
    }
  }
  showInterviewModal.value = true;
};

// Очистка сообщения об ошибке
const clearError = () => {
  updateError.value = null;
};

// Обновление заметок
const updateNotes = async () => {
  if (notesValue.value !== props.job.notes) {
    try {
      await jobStore.updateJobNotes(props.job.id, notesValue.value);
      updateError.value = null;
    } catch (error) {
      console.error("Ошибка при обновлении заметок:", error);
      updateError.value = t('errorUpdatingNotes');
    }
  }
};

// Обновление статуса вакансии с обработкой ошибок
const updateStatus = async (status) => {
  // Если статус не изменился, ничего не делаем
  if (props.job.status === status) {
    console.log("Статус не изменился, запрос не отправляется");
    return;
  }
  
  try {
    await jobStore.updateJobStatus(props.job.id, status);
    updateError.value = null;
    emit('update-status', { id: props.job.id, status });
  } catch (error) {
    console.error("Ошибка при обновлении статуса:", error);
    updateError.value = t('errorUpdatingStatus');
  }
};

// Запланировать интервью с обработкой ошибок
const scheduleInterview = async () => {
  if (interviewDate.value) {
    try {
      showInterviewModal.value = false; // Скрываем модальное окно перед отправкой запроса
      
      // Создаем объект Date из строки
      const dateObj = new Date(interviewDate.value);
      
      // Проверяем, что дата валидна
      if (isNaN(dateObj.getTime())) {
        throw new Error("Неверный формат даты");
      }
      
      // Формируем строку в ISO формате для передачи на сервер
      const isoDate = dateObj.toISOString();
      
      await jobStore.updateJobStatus(props.job.id, JOB_STATUS.INTERVIEW, isoDate);
      updateError.value = null;
      emit('update-status', { 
        id: props.job.id, 
        status: JOB_STATUS.INTERVIEW, 
        interviewDate: isoDate 
      });
    } catch (error) {
      console.error("Ошибка при назначении интервью:", error);
      updateError.value = t('errorSchedulingInterview');
      // В случае ошибки, открываем модальное окно снова
      showInterviewModal.value = true;
    }
  }
};

// Подтверждение удаления вакансии
const confirmRemove = () => {
  if (confirm(t('confirmRemove'))) {
    emit('remove', props.job.id);
  }
};

// Метод для запуска парсинга вакансии
const parseJob = async () => {
  if (!props.job.link || parsingInProgress.value) return;
  
  parsingInProgress.value = true;
  updateError.value = null;
  
  try {
    // Здесь мы используем метод парсинга из API, а не из store, т.к. store еще не обновлен
    await fetch(`/api/jobs/${props.job.id}/parse`, { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Уведомляем пользователя об успехе
    alert(t('jobSuccessfullyParsed'));
    
    // Обновляем состояние компонента после успешного парсинга
    emit('update-status', { id: props.job.id, refresh: true });
  } catch (error) {
    console.error("Ошибка при парсинге вакансии:", error);
    updateError.value = t('errorParsingJob');
  } finally {
    parsingInProgress.value = false;
  }
};

// Метод для просмотра сохраненной версии вакансии
const viewParsedJob = () => {
  // Используем router для перехода на страницу просмотра сохраненной вакансии
  router.push(`/jobs/${props.job.id}/parsed`);
};

// Форматирование даты с обработкой ошибок
const formatDate = (dateString) => {
  if (!dateString) return t('noDate');
  
  try {
    const date = new Date(dateString);
    
    // Проверяем, является ли дата действительной
    if (isNaN(date.getTime())) return t('invalidDate');
    
    return new Intl.DateTimeFormat(
      navigator.language || 'ru-RU', 
      { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }
    ).format(date);
  } catch (error) {
    console.error("Ошибка при форматировании даты:", error);
    return t('invalidDate');
  }
};

// Получение имени файла из пути
const getFileName = (path) => {
  if (!path) return '';
  return path.split('/').pop();
};

// Получить перевод для статуса вакансии
const getStatusTranslation = (status) => {
  if (!status) return t('noStatus');
  
  // Используем ключи jobStatus.[status] для перевода
  return t(`jobStatus.${getStatusKey(status)}`);
};
</script>

<style scoped>
.job-card {
  background-color: #fff;
  border-radius: 16px;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 24px;
  overflow: hidden;
  transition: all 0.3s ease;
  position: relative;
  display: flex;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.dark .job-card {
  background-color: #2a2a2a;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.05);
}

.job-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.1);
}

.dark .job-card:hover {
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.4);
}

/* Индикатор статуса слева */
.status-indicator {
  width: 6px;
  min-height: 100%;
  background-color: #e0e0e0; /* Цвет по умолчанию */
}

/* Цвета для разных статусов */
.status-indicator.sent {
  background-color: #0288d1; /* Синий */
}

.status-indicator.interview {
  background-color: #ffa000; /* Оранжевый */
}

.status-indicator.rejected {
  background-color: #d32f2f; /* Красный */
}

.status-indicator.accepted {
  background-color: #388e3c; /* Зеленый */
}

.card-header {
  display: flex;
  padding: 16px;
  cursor: pointer;
  align-items: center;
  border-bottom: 1px solid #f0f0f0;
  flex-grow: 1;
}

.dark .card-header {
  border-bottom: 1px solid #3a3a3a;
}

/* Стиль для аватара источника вакансии */
.source-avatar {
  margin-right: 16px;
}

.source-logo,
.source-placeholder {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background-color: #f5f5f5;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s ease;
}

.source-logo:hover,
.source-placeholder:hover {
  transform: scale(1.05);
}

.source-placeholder {
  color: white;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -1px;
  text-transform: uppercase;
  background-color: v-bind('getSourcePlaceholderColor()');
}

.dark .source-placeholder {
  opacity: 0.9;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.source-logo img {
  width: 30px;
  height: 30px;
  object-fit: contain;
}

.job-info {
  flex-grow: 1;
}

.job-title {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 600;
  color: #333;
  line-height: 1.3;
}

.dark .job-title {
  color: #f0f0f0;
}

.company-name {
  margin: 0 0 6px;
  font-size: 14px;
  color: #666;
}

.dark .company-name {
  color: #aaa;
}

.job-meta {
  display: flex;
  align-items: center;
  font-size: 12px;
}

.application-date {
  color: #888;
  margin-right: 12px;
}

.dark .application-date {
  color: #bbb;
}

.status-badge {
  padding: 3px 10px;
  border-radius: 20px;
  font-weight: 500;
  font-size: 12px;
  margin-right: 10px;
}

.sent {
  background-color: #e3f2fd;
  color: #0288d1;
}

.interview {
  background-color: #fff8e1;
  color: #ffa000;
}

.rejected {
  background-color: #ffebee;
  color: #d32f2f;
}

.accepted {
  background-color: #e8f5e9;
  color: #388e3c;
}

.dark .sent {
  background-color: rgba(2, 136, 209, 0.3);
  color: #64b5f6;
}

.dark .interview {
  background-color: rgba(255, 160, 0, 0.3);
  color: #ffcc80;
}

.dark .rejected {
  background-color: rgba(211, 47, 47, 0.3);
  color: #ef9a9a;
}

.dark .accepted {
  background-color: rgba(56, 142, 60, 0.3);
  color: #81c784;
}

/* Источник вакансии в развернутом состоянии */
.source-info {
  display: inline-flex;
  align-items: center;
  margin-left: 10px;
  font-size: 12px;
  color: #777;
  background-color: #f5f5f5;
  padding: 3px 10px;
  border-radius: 15px;
  font-weight: 500;
}

.dark .source-info {
  color: #bbb;
  background-color: #333;
}

.source-icon-small {
  display: inline-flex;
  margin-right: 5px;
}

.source-icon-small img {
  width: 14px;
  height: 14px;
  object-fit: contain;
}

.expand-icon {
  margin-left: 15px;
  color: #999;
  font-size: 12px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: #f5f5f5;
  transition: transform 0.2s ease;
}

.expanded .expand-icon {
  transform: rotate(180deg);
}

.dark .expand-icon {
  color: #ccc;
  background-color: #3a3a3a;
}

.card-body {
  padding: 18px;
  background-color: #fafafa;
  animation: fadeIn 0.3s ease;
  border-top: 1px solid #f0f0f0;
  flex-grow: 1;
}

.dark .card-body {
  background-color: #333;
  border-top: 1px solid #3a3a3a;
}

.error-message {
  background-color: #fee;
  color: #c62828;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-left: 4px solid #d32f2f;
}

.dark .error-message {
  background-color: rgba(211, 47, 47, 0.2);
  border-left: 4px solid #ef5350;
  color: #ef9a9a;
}

.clear-error-btn {
  background: none;
  border: none;
  color: #c62828;
  font-size: 18px;
  cursor: pointer;
}

.dark .clear-error-btn {
  color: #ef9a9a;
}

.job-details {
  margin-bottom: 16px;
}

.detail-row {
  margin-bottom: 12px;
  font-size: 14px;
  display: flex;
  align-items: center;
}

.detail-label {
  font-weight: 600;
  color: #555;
  margin-right: 8px;
}

.dark .detail-label {
  color: #bbb;
}

.job-link, .resume-link, .coverletter-link {
  color: #0288d1;
  text-decoration: none;
  transition: color 0.2s;
  font-weight: 500;
}

.job-link:hover, .resume-link:hover, .coverletter-link:hover {
  color: #01579b;
  text-decoration: underline;
}

.dark .job-link, .dark .resume-link, .dark .coverletter-link {
  color: #4fc3f7;
}

.dark .job-link:hover, .dark .resume-link:hover, .dark .coverletter-link:hover {
  color: #81d4fa;
}

/* Стили для секции с информацией о парсинге */
.parser-actions {
  background-color: #f7f7f7;
  border-radius: 12px;
  padding: 16px;
  margin: 16px 0;
  border: 1px solid #eee;
}

.dark .parser-actions {
  background-color: #2c3e50;
  border-color: #34495e;
}

.parsed-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.parsed-badge {
  display: inline-flex;
  background-color: #4caf50;
  color: white;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  align-self: flex-start;
}

.parsed-date {
  font-size: 13px;
  color: #666;
}

.dark .parsed-date {
  color: #bbb;
}

.parser-buttons {
  margin-top: 8px;
}

.view-parsed-btn, .parse-btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.view-parsed-btn {
  background-color: #3498db;
  color: white;
}

.view-parsed-btn:hover {
  background-color: #2980b9;
  transform: translateY(-1px);
}

.parse-btn {
  background-color: #2ecc71;
  color: white;
}

.parse-btn:hover:not(:disabled) {
  background-color: #27ae60;
  transform: translateY(-1px);
}

.parse-btn:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

.dark .view-parsed-btn {
  background-color: #3498db;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.dark .view-parsed-btn:hover {
  background-color: #2980b9;
}

.dark .parse-btn {
  background-color: #2ecc71;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.dark .parse-btn:hover:not(:disabled) {
  background-color: #27ae60;
}

.dark .parse-btn:disabled {
  background-color: #7f8c8d;
}

.notes-section {
  margin: 16px 0;
}

.notes-section h4 {
  margin: 0 0 10px;
  font-size: 14px;
  color: #444;
}

.dark .notes-section h4 {
  color: #ccc;
}

.notes-input {
  width: 100%;
  min-height: 80px;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-family: inherit;
  resize: vertical;
  font-size: 14px;
  background-color: white;
  color: #333;
  transition: border-color 0.3s, box-shadow 0.3s;
}

.dark .notes-input {
  background-color: #404040;
  border-color: #555;
  color: #ddd;
}

.notes-input:focus {
  outline: none;
  border-color: #0288d1;
  box-shadow: 0 0 0 2px rgba(2, 136, 209, 0.1);
}

.dark .notes-input:focus {
  border-color: #4fc3f7;
  box-shadow: 0 0 0 2px rgba(79, 195, 247, 0.1);
}

.card-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid #eee;
  margin-top: 16px;
}

.dark .card-actions {
  border-top: 1px solid #444;
}

.status-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.status-button {
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.status-button:hover {
  opacity: 0.9;
  transform: translateY(-2px);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1);
}

.status-button.active {
  transform: scale(1.05);
  font-weight: 700;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
}

.status-button.sent {
  background-color: #e3f2fd;
  color: #0288d1;
}

.status-button.interview {
  background-color: #fff8e1;
  color: #ffa000;
}

.status-button.rejected {
  background-color: #ffebee;
  color: #d32f2f;
}

.status-button.accepted {
  background-color: #e8f5e9;
  color: #388e3c;
}

.dark .status-button.sent {
  background-color: rgba(2, 136, 209, 0.3);
  color: #64b5f6;
}

.dark .status-button.interview {
  background-color: rgba(255, 160, 0, 0.3);
  color: #ffcc80;
}

.dark .status-button.rejected {
  background-color: rgba(211, 47, 47, 0.3);
  color: #ef9a9a;
}

.dark .status-button.accepted {
  background-color: rgba(56, 142, 60, 0.3);
  color: #81c784;
}

.delete-button {
  padding: 8px 14px;
  background-color: transparent;
  color: #d32f2f;
  border: 1px solid #ffcdd2;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s ease;
}

.delete-button:hover {
  background-color: #ffebee;
  transform: translateY(-2px);
}

.dark .delete-button {
  background-color: transparent;
  color: #ef5350;
  border-color: rgba(211, 47, 47, 0.3);
}

.dark .delete-button:hover {
  background-color: rgba(211, 47, 47, 0.1);
}

/* Стили для модального окна выбора даты интервью */
.interview-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  animation: fadeIn 0.2s ease;
  backdrop-filter: blur(3px);
}

.interview-modal {
  background-color: white;
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  animation: slideDown 0.3s ease;
}

.dark .interview-modal {
  background-color: #333;
  color: #ddd;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.interview-modal-header {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eee;
}

.dark .interview-modal-header {
  border-bottom: 1px solid #555;
}

.interview-modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.dark .interview-modal-header h3 {
  color: #fff;
}

.close-modal-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #999;
  cursor: pointer;
  transition: color 0.2s;
}

.close-modal-btn:hover {
  color: #333;
}

.dark .close-modal-btn {
  color: #aaa;
}

.dark .close-modal-btn:hover {
  color: #fff;
}

.interview-modal-body {
  padding: 16px;
}

.interview-modal-body p {
  margin-top: 0;
  margin-bottom: 10px;
  color: #666;
}

.dark .interview-modal-body p {
  color: #bbb;
}

.interview-date-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  color: #333;
}

.dark .interview-date-input {
  background-color: #444;
  border-color: #666;
  color: #ddd;
}

.interview-modal-footer {
  padding: 16px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  border-top: 1px solid #eee;
}

.dark .interview-modal-footer {
  border-top: 1px solid #555;
}

.save-btn, .cancel-btn {
  padding: 10px 18px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.save-btn {
  background-color: #0288d1;
  color: white;
  border: none;
  box-shadow: 0 2px 4px rgba(2, 136, 209, 0.2);
}

.save-btn:hover:not(:disabled) {
  background-color: #0277bd;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(2, 136, 209, 0.2);
}

.save-btn:disabled {
  background-color: #b3e5fc;
  cursor: not-allowed;
  box-shadow: none;
}

.dark .save-btn:disabled {
  background-color: #01579b;
  opacity: 0.5;
}

.cancel-btn {
  background-color: #f5f5f5;
  color: #666;
  border: 1px solid #ddd;
}

.cancel-btn:hover {
  background-color: #e0e0e0;
  transform: translateY(-2px);
}

.dark .cancel-btn {
  background-color: #424242;
  color: #ddd;
  border-color: #666;
}

.dark .cancel-btn:hover {
  background-color: #333;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideDown {
  from { transform: translateY(-30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>