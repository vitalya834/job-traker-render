<template>
  <div class="calendar-container">
    <button 
      v-if="interviewDate"
      @click="addToGoogleCalendar" 
      class="calendar-btn"
      :disabled="!isValidDate"
    >
      <span class="calendar-btn-icon">📅</span>
      {{ t('addToGoogleCalendar') }}
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps({
  job: {
    type: Object,
    required: true
  },
  interviewDate: {
    type: String,
    default: ''
  }
});

const isValidDate = computed(() => {
  if (!props.interviewDate) return false;
  const date = new Date(props.interviewDate);
  return !isNaN(date.getTime());
});

/**
 * Создает ссылку для добавления события в Google Calendar
 */
const createGoogleCalendarLink = (params) => {
  const { title, startTime, endTime, description, location } = params;

  // Форматируем даты в формат, требуемый Google Calendar
  const formatDate = (date) => {
    if (typeof date === 'string') {
      date = new Date(date);
    }
    return date.toISOString().replace(/-|:|\.\d+/g, '');
  };
  
  // По умолчанию длительность события - 1 час
  const end = endTime || new Date(new Date(startTime).getTime() + 60 * 60 * 1000);
  
  const urlParams = new URLSearchParams({
    action: 'TEMPLATE',
    text: title || 'Событие',
    dates: `${formatDate(new Date(startTime))}/${formatDate(new Date(end))}`,
    details: description || '',
    location: location || '',
  });
  
  return `https://calendar.google.com/calendar/render?${urlParams}`;
};

/**
 * Форматирует данные о собеседовании для Google Calendar
 */
const formatJobInterviewForCalendar = (job, interviewDate) => {
  const dateObj = new Date(interviewDate);
  if (isNaN(dateObj.getTime())) {
    throw new Error("Некорректная дата собеседования");
  }
  
  // Создаем дату окончания (по умолчанию +1 час)
  const endTime = new Date(dateObj.getTime() + 60 * 60 * 1000);
  
  return {
    title: `Собеседование: ${job.position} в ${job.company}`,
    startTime: dateObj,
    endTime: endTime,
    description: `Собеседование на позицию ${job.position} в компании ${job.company}.

Ссылка на вакансию: ${job.link || 'Не указана'}
Примечания: ${job.notes || '-'}`,
    location: job.location || ''
  };
};

/**
 * Добавляет собеседование в Google Calendar
 */
const addToGoogleCalendar = () => {
  if (!isValidDate.value) return;
  
  try {
    const calendarParams = formatJobInterviewForCalendar(props.job, props.interviewDate);
    const calendarUrl = createGoogleCalendarLink(calendarParams);
    window.open(calendarUrl, '_blank');
    return true;
  } catch (error) {
    console.error("Ошибка при добавлении в Google Calendar:", error);
    return false;
  }
};

// Экспортируем функцию для использования в других компонентах
defineExpose({
  addToGoogleCalendar
});
</script>

<style scoped>
/* Стили для кнопок календаря */
.calendar-btn {
  padding: 10px 18px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: #4285F4; /* Google Blue */
  color: white;
  border: none;
  box-shadow: 0 2px 4px rgba(66, 133, 244, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.calendar-btn:hover {
  background-color: #3367D6;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(66, 133, 244, 0.2);
}

.calendar-btn:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(66, 133, 244, 0.2);
}

.calendar-btn:disabled {
  background-color: #A4C2F4;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.calendar-btn-icon {
  margin-right: 8px;
  width: 16px;
  height: 16px;
}

/* Анимации */
@keyframes calendarFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes calendarSlideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.calendar-fade-enter-active {
  animation: calendarFadeIn 0.3s ease;
}

.calendar-slide-enter-active {
  animation: calendarSlideUp 0.3s ease;
}
</style>