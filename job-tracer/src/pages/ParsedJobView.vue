<template>
  <div class="parsed-job-container">
    <!-- Кнопка "Назад" -->
    <div class="back-button-container">
      <button @click="goBack" class="back-button">
        &larr; {{ t('backToList') }}
      </button>
    </div>
    
    <!-- Уведомление -->
    <div v-if="showToast" class="toast-message" :class="toastType">
      {{ toastMessage }}
    </div>
    
    <!-- Индикатор прогресса парсинга -->
    <div v-if="parseInProgress" class="parsing-progress">
      <div class="parsing-progress-bar" :style="{ width: `${parsingProgress}%` }"></div>
    </div>
    
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>{{ t('loadingJobData') }}</p>
    </div>
    
    <div v-else-if="error" class="error">
      <div class="error-content">
        <h3>{{ t('error') }}</h3>
        <p>{{ error }}</p>
        <div v-if="errorDetails" class="error-details">
          <details>
            <summary>{{ t('technicalDetails') }}</summary>
            <pre>{{ errorDetails }}</pre>
          </details>
        </div>
        <div class="error-actions">
          <button @click="loadJobData" class="retry-btn">
            <span>{{ t('retry') }}</span>
          </button>
          <button v-if="canParse" @click="parseJob" class="parse-btn">
            <span>{{ t('parseNow') }}</span>
          </button>
        </div>
      </div>
    </div>
    
    <div v-else-if="parsedJob" class="parsed-job-content">
      <div class="parsed-job-header">
        <h2>{{ parsedJob.title || jobInfo?.position || t('unknownPosition') }}</h2>
        
        <div class="company">
          {{ parsedJob.company || jobInfo?.company || t('unknownCompany') }}
          <span v-if="parsedJob.companyRating" class="company-rating">
            ({{ t('rating') }}: {{ parsedJob.companyRating }})
          </span>
        </div>
        
        <div v-if="parsedJob.location" class="location">
          <span class="location-icon">📍</span> {{ parsedJob.location }}
        </div>
        
        <div v-if="parsedJob.salary" class="salary">
          <span class="salary-icon">💰</span> {{ parsedJob.salary }}
        </div>
        
        <div v-if="parsedJob.seniority" class="seniority">
          <span class="seniority-icon">👨‍💼</span> {{ parsedJob.seniority }}
        </div>
        
        <div class="source-info">
          <span v-if="parsedJob.sourceType" class="source-label">{{ t('source') }}:</span>
          <span v-if="parsedJob.sourceType" class="source-type" :class="parsedJob.sourceType">
            {{ getSourceName(parsedJob.sourceType) }}
          </span>
          <span v-if="parsedJob.parsedAt" class="parsed-date">
            {{ t('parsedOn') }}: {{ formatDate(parsedJob.parsedAt) }}
          </span>
        </div>
        
        <div v-if="parsedJob.url" class="original-link">
          <a :href="parsedJob.url" target="_blank" rel="noopener noreferrer">
            {{ t('openOriginalPage') }}
          </a>
        </div>

        <div v-if="parsedJob.note" class="parsing-note">
          <span class="note-icon">ℹ️</span> {{ parsedJob.note }}
        </div>
      </div>
      
      <div class="view-tabs">
        <button 
          v-for="tab in availableTabs" 
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="{ active: activeTab === tab.id }"
          class="tab-btn"
        >
          {{ tab.label }}
        </button>
      </div>
      
      <div class="tab-content">
        <!-- Вкладка с описанием -->
        <div v-if="activeTab === 'description'" class="description-tab">
          <div class="search-container">
            <div class="search-input-container">
              <input
                v-model="searchQuery"
                @input="searchInDescription"
                @keydown.enter="goToNextMatch"
                type="text"
                class="search-input"
                :placeholder="t('searchInDescription')"
              />
              <div v-if="searchResults.count > 0" class="search-actions">
                <button @click="goToPrevMatch" class="search-nav-btn">
                  &#9650;
                </button>
                <span class="search-count">
                  {{ searchResults.current }} / {{ searchResults.count }}
                </span>
                <button @click="goToNextMatch" class="search-nav-btn">
                  &#9660;
                </button>
              </div>
            </div>
            <div v-if="searchQuery && searchResults.count === 0" class="search-results">
              {{ t('noResultsFound') }}
            </div>
          </div>
          
          <div class="job-text" ref="jobDescriptionRef">{{ parsedJob.description }}</div>
          
          <div v-if="jobKeywords.length > 0" class="keywords-section">
            <h4>{{ t('keywordsInJob') }}</h4>
            <div class="tags-container">
              <div 
                v-for="keyword in jobKeywords" 
                :key="keyword.word"
                class="tag"
                @click="searchQuery = keyword.word; searchInDescription()"
              >
                {{ keyword.word }}
              </div>
            </div>
          </div>
        </div>
        
        <!-- Вкладка со скриншотом -->
        <div v-else-if="activeTab === 'screenshot'" class="screenshot-tab">
          <div class="screenshot-container">
            <img 
              :src="`/api/jobs/${jobId}/screenshot`" 
              alt="Job Screenshot" 
              class="job-screenshot"
              @error="handleImageError"
              ref="screenshotImg"
            >
            <div v-if="screenshotError" class="screenshot-error">
              <p>{{ t('screenshotError') }}</p>
            </div>
          </div>
        </div>
        
        <!-- Вкладка с HTML -->
        <div v-else-if="activeTab === 'html'" class="html-tab">
          <iframe 
            :src="`/api/jobs/${jobId}/html`" 
            class="html-frame"
            @load="handleIframeLoad"
            ref="htmlIframe"
          ></iframe>
          <div v-if="htmlError" class="html-error">
            <p>{{ t('htmlError') }}</p>
          </div>
        </div>
        
        <!-- Вкладка с информацией о парсинге -->
        <div v-else-if="activeTab === 'parsing'" class="parsing-tab">
          <div class="parsing-info">
            <h3>{{ t('parsingInfo') }}</h3>
            
            <div class="info-section">
              <h4>{{ t('source') }}</h4>
              <p><strong>{{ t('sourceType') }}:</strong> {{ getSourceName(parsedJob.sourceType) }}</p>
              <p v-if="parsedJob.url"><strong>URL:</strong> <a :href="parsedJob.url" target="_blank">{{ parsedJob.url }}</a></p>
            </div>
            
            <div class="info-section">
              <h4>{{ t('parsedData') }}</h4>
              <p v-if="parsedJob.title"><strong>{{ t('title') }}:</strong> {{ parsedJob.title }}</p>
              <p v-if="parsedJob.company"><strong>{{ t('company') }}:</strong> {{ parsedJob.company }}</p>
              <p v-if="parsedJob.location"><strong>{{ t('location') }}:</strong> {{ parsedJob.location }}</p>
              <p v-if="parsedJob.salary"><strong>{{ t('salary') }}:</strong> {{ parsedJob.salary }}</p>
              <p v-if="parsedJob.seniority"><strong>{{ t('seniority') }}:</strong> {{ parsedJob.seniority }}</p>
            </div>
            
            <div class="info-section">
              <h4>{{ t('metadata') }}</h4>
              <p><strong>{{ t('parsedAt') }}:</strong> {{ formatDate(parsedJob.parsedAt) }}</p>
              <p><strong>{{ t('jobId') }}:</strong> {{ jobId }}</p>
            </div>
            
            <div v-if="parsedJob.error" class="info-section error-section">
              <h4>{{ t('parsingError') }}</h4>
              <p>{{ parsedJob.message }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div v-else class="no-data">
      <div class="no-data-content">
        <div class="no-data-icon">🔍</div>
        <h3>{{ t('noDataAvailable') }}</h3>
        <p>{{ t('noDataDescription') }}</p>
        
        <div v-if="jobInfo" class="job-info-summary">
          <p><strong>{{ t('company') }}:</strong> {{ jobInfo.company }}</p>
          <p><strong>{{ t('position') }}:</strong> {{ jobInfo.position }}</p>
          <p v-if="jobInfo.link"><strong>{{ t('link') }}:</strong> {{ jobInfo.link }}</p>
        </div>
        
        <button v-if="canParse" @click="parseJob" class="parse-btn main-action">
          <span class="parse-icon">🔄</span> {{ t('parseNow') }}
        </button>
        
        <div v-if="!canParse && !jobInfo?.link" class="no-link-warning">
          <p>{{ t('noLinkWarning') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const jobId = computed(() => route.params.id);
const loading = ref(true);
const error = ref(null);
const errorDetails = ref(null);
const parsedJob = ref(null);
const jobInfo = ref(null);
const activeTab = ref('description');
const canParse = ref(false);
const screenshotError = ref(false);
const htmlError = ref(false);
const parseInProgress = ref(false);
const searchQuery = ref('');
const searchResults = ref({ count: 0, current: 0 });
const toastMessage = ref('');
const toastType = ref('success');
const showToast = ref(false);
const parsingProgress = ref(0);
const jobKeywords = ref([]);
const jobDescriptionRef = ref(null);

// Определяем доступные вкладки в зависимости от данных
const tabs = [
  { id: 'description', label: t('description') },
  { id: 'screenshot', label: t('screenshot') },
  { id: 'html', label: t('htmlSource') },
  { id: 'parsing', label: t('parsingInfo') }
];

// Фильтруем вкладки в зависимости от доступности данных
const availableTabs = computed(() => {
  return tabs;
});

// Вспомогательная функция для получения понятного названия источника
const getSourceName = (sourceType) => {
  if (!sourceType) return t('unknown');
  
  const sourceNames = {
    'linkedin': 'LinkedIn',
    'linkedin-api': 'LinkedIn API',
    'linkedin-embed': 'LinkedIn Embed',
    'linkedin-fallback': 'LinkedIn (ограниченные данные)',
    'indeed': 'Indeed',
    'glassdoor': 'Glassdoor',
    'generic': t('genericWebsite')
  };
  
  return sourceNames[sourceType] || sourceType;
};

// Функция для показа уведомления
const showToastMessage = (message, type = 'success') => {
  toastMessage.value = message;
  toastType.value = type;
  showToast.value = true;
  
  setTimeout(() => {
    showToast.value = false;
  }, 4000);
};

// Функция для поиска текста в описании вакансии
const searchInDescription = () => {
  if (!searchQuery.value.trim() || !jobDescriptionRef.value) {
    searchResults.value = { count: 0, current: 0 };
    return;
  }
  
  const text = jobDescriptionRef.value.innerText;
  const query = searchQuery.value.trim().toLowerCase();
  const matches = [];
  
  let index = text.toLowerCase().indexOf(query);
  while (index !== -1) {
    matches.push(index);
    index = text.toLowerCase().indexOf(query, index + 1);
  }
  
  searchResults.value = { 
    count: matches.length, 
    current: matches.length > 0 ? 1 : 0,
    matches
  };
  
  if (matches.length > 0) {
    highlightSearch();
  }
};

// Функция для выделения найденных совпадений
const highlightSearch = () => {
  if (!jobDescriptionRef.value || !searchResults.value.count) return;
  
  // Сначала удаляем предыдущее выделение
  const text = jobDescriptionRef.value.innerText;
  jobDescriptionRef.value.innerHTML = text;
  
  // Выделяем текущее совпадение
  const query = searchQuery.value.trim();
  const html = jobDescriptionRef.value.innerHTML;
  const index = searchResults.value.matches[searchResults.value.current - 1];
  
  const beforeMatch = html.substring(0, index);
  const match = html.substring(index, index + query.length);
  const afterMatch = html.substring(index + query.length);
  
  jobDescriptionRef.value.innerHTML = `${beforeMatch}<span class="keyword-highlight">${match}</span>${afterMatch}`;
  
  // Прокручиваем к выделенному тексту
  const highlightedElement = jobDescriptionRef.value.querySelector('.keyword-highlight');
  if (highlightedElement) {
    highlightedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
};

// Функция для перехода к следующему совпадению
const goToNextMatch = () => {
  if (searchResults.value.count === 0) return;
  
  searchResults.value.current = (searchResults.value.current % searchResults.value.count) + 1;
  highlightSearch();
};

// Функция для перехода к предыдущему совпадению
const goToPrevMatch = () => {
  if (searchResults.value.count === 0) return;
  
  searchResults.value.current = searchResults.value.current === 1 
    ? searchResults.value.count 
    : searchResults.value.current - 1;
  
  highlightSearch();
};

// Извлечение ключевых слов из описания вакансии
const extractKeywords = (text) => {
  if (!text) return [];
  
  // Список стоп-слов (часто встречающиеся слова, которые не несут особого смысла)
  const stopWords = new Set([
    'the', 'and', 'or', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about',
    'из', 'в', 'на', 'и', 'или', 'с', 'для', 'о', 'по', 'от', 'к', 'за'
  ]);
  
  // Регулярное выражение для извлечения слов, в том числе технических терминов
  const wordRegex = /\b[A-Za-zА-Яа-я0-9][\w\+\#\.]*\b/g;
  const words = text.match(wordRegex) || [];
  
  // Подсчитываем частоту слов
  const wordFreq = {};
  words.forEach(word => {
    const normalized = word.toLowerCase();
    if (!stopWords.has(normalized) && normalized.length > 1) {
      wordFreq[normalized] = (wordFreq[normalized] || 0) + 1;
    }
  });
  
  // Сортируем слова по частоте и берем топ-15
  return Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([word, freq]) => ({ word, freq }));
};

// Загрузка данных о вакансии и распарсенной информации
const loadJobData = async () => {
  loading.value = true;
  error.value = null;
  errorDetails.value = null;
  screenshotError.value = false;
  htmlError.value = false;
  searchQuery.value = '';
  searchResults.value = { count: 0, current: 0 };
  jobKeywords.value = [];
  
  try {
    // Сначала получаем общую информацию о вакансии
    const jobResponse = await axios.get(`/api/jobs/${jobId.value}`);
    jobInfo.value = jobResponse.data;
    canParse.value = !!jobInfo.value.link;
    
    if (jobInfo.value.isParsed) {
      try {
        const parsedResponse = await axios.get(`/api/jobs/${jobId.value}/parsed`);
        if (parsedResponse.data.success) {
          parsedJob.value = parsedResponse.data.parsedData;
          
          // Установить активную вкладку по умолчанию
          activeTab.value = parsedJob.value.description ? 'description' : 'screenshot';
          
          // Извлекаем ключевые слова из описания
          if (parsedJob.value.description) {
            // Используем setTimeout, чтобы не блокировать рендеринг
            setTimeout(() => {
              jobKeywords.value = extractKeywords(parsedJob.value.description);
            }, 500);
          }
          
          // Проверяем особые форматы данных от различных источников
          if (parsedJob.value.sourceType && parsedJob.value.sourceType.includes('linkedin')) {
            // Дополнительная обработка для LinkedIn
            parsedJob.value.isLinkedIn = true;
            
            // Если есть сообщение об ограниченных данных, показываем уведомление
            if (parsedJob.value.note && parsedJob.value.note.includes('ограничен')) {
              setTimeout(() => {
                showToastMessage(t('linkedinLimitedDataWarning'), 'warning');
              }, 1000);
            }
          }
        } else {
          throw new Error(t('errorLoadingParsedData'));
        }
      } catch (parsedError) {
        console.error('Ошибка при загрузке распарсенных данных:', parsedError);
        error.value = parsedError.response?.data?.error || t('errorLoadingParsedData');
        errorDetails.value = parsedError.message;
        parsedJob.value = null;
      }
    } else {
      parsedJob.value = null;
    }
  } catch (err) {
    console.error('Ошибка при загрузке данных о вакансии:', err);
    error.value = err.response?.data?.error || t('errorLoadingData');
    errorDetails.value = err.message;
    jobInfo.value = null;
    parsedJob.value = null;
  } finally {
    loading.value = false;
  }
};

// Метод для запуска парсинга вакансии
const parseJob = async () => {
  if (parseInProgress.value) return;
  
  parseInProgress.value = true;
  loading.value = true;
  error.value = null;
  errorDetails.value = null;
  
  // Эмулируем прогресс-бар, так как реальный прогресс нам неизвестен
  parsingProgress.value = 0;
  const progressInterval = setInterval(() => {
    if (parsingProgress.value < 95) {
      parsingProgress.value += Math.random() * 5 + 2;
    }
  }, 700);
  
  try {
    showToastMessage(t('parsingInProgress'), 'info');
    
    const response = await axios.post(`/api/jobs/${jobId.value}/parse`);
    
    clearInterval(progressInterval);
    parsingProgress.value = 100;
    
    if (response.data.success) {
      showToastMessage(t('parsingSuccess'), 'success');
      
      // Небольшая задержка, чтобы пользователь увидел 100% прогресс
      setTimeout(async () => {
        await loadJobData();
      }, 500);
    } else {
      throw new Error(response.data.error || t('errorParsingJob'));
    }
  } catch (err) {
    clearInterval(progressInterval);
    parsingProgress.value = 0;
    
    console.error('Ошибка при парсинге вакансии:', err);
    error.value = err.response?.data?.error || t('errorParsingJob');
    errorDetails.value = err.response?.data?.details || err.message;
    
    showToastMessage(t('parsingError'), 'error');
  } finally {
    loading.value = false;
    parseInProgress.value = false;
  }
};

// Обработка ошибки загрузки скриншота
const handleImageError = () => {
  screenshotError.value = true;
};

// Обработка загрузки iframe
const handleIframeLoad = () => {
  try {
    const iframe = document.querySelector('.html-frame');
    if (iframe && iframe.contentDocument && iframe.contentDocument.body.innerHTML.includes('error')) {
      htmlError.value = true;
    } else {
      htmlError.value = false;
    }
  } catch (e) {
    htmlError.value = true;
  }
};

// Форматирование даты
const formatDate = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(
    navigator.language || 'ru-RU', 
    { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }
  ).format(date);
};

// Функция для возврата назад
const goBack = () => {
  router.back();
};

// Следим за изменением ID вакансии и перезагружаем данные
watch(() => route.params.id, (newId, oldId) => {
  if (newId !== oldId) {
    loadJobData();
  }
});

onMounted(() => {
  loadJobData();
});
</script>

<style scoped>
/* Стили для кнопки "Назад" */
.back-button-container {
  margin-bottom: 20px;
}

.back-button {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background-color: #f3f4f6;
  border: none;
  border-radius: 8px;
  color: #333;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.back-button:hover {
  background-color: #e5e7eb;
  transform: translateX(-3px);
}

.dark .back-button {
  background-color: #333;
  color: #eee;
}

.dark .back-button:hover {
  background-color: #444;
}

.parsed-job-container {
  max-width: 950px;
  margin: 0 auto;
  padding: 20px;
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.08);
}

.dark .parsed-job-container {
  background-color: #2d2d2d;
  color: #f1f1f1;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
}

/* Состояние загрузки */
.loading, .error, .no-data {
  text-align: center;
  padding: 40px 20px;
  border-radius: 8px;
  background-color: #f9f9f9;
  margin: 20px 0;
}

.dark .loading, .dark .error, .dark .no-data {
  background-color: #333;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left-color: #3498db;
  border-radius: 50%;
  margin: 0 auto 20px;
  animation: spin 1s linear infinite;
}

.dark .spinner {
  border-color: rgba(255, 255, 255, 0.1);
  border-left-color: #3498db;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Состояние ошибки */
.error-content {
  border-left: 4px solid #e74c3c;
  padding: 10px 20px;
  text-align: left;
  background-color: #fdf0f0;
  border-radius: 0 4px 4px 0;
}

.dark .error-content {
  background-color: #3d2a2a;
  border-left-color: #e74c3c;
}

.error-details {
  margin-top: 15px;
  background-color: #f7f7f7;
  padding: 10px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 13px;
}

.dark .error-details {
  background-color: #252525;
}

.error-actions {
  margin-top: 20px;
  display: flex;
  gap: 10px;
  justify-content: flex-start;
}

/* Секция "Нет данных" */
.no-data-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30px;
}

.no-data-icon {
  font-size: 48px;
  margin-bottom: 20px;
  opacity: 0.6;
}

.job-info-summary {
  margin: 20px 0;
  padding: 15px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #f9f9f9;
  text-align: left;
  width: 100%;
  max-width: 500px;
}

.dark .job-info-summary {
  background-color: #333;
  border-color: #444;
}

.job-info-summary p {
  margin: 5px 0;
}

.no-link-warning {
  margin-top: 20px;
  color: #e67e22;
  background-color: #fef5e9;
  padding: 10px 15px;
  border-radius: 4px;
  max-width: 500px;
}

.dark .no-link-warning {
  background-color: #3d3224;
}

/* Заголовок вакансии */
.parsed-job-header {
  margin-bottom: 30px;
  padding-bottom: 18px;
  border-bottom: 1px solid #eee;
}

.dark .parsed-job-header {
  border-bottom-color: #444;
}

.parsed-job-header h2 {
  font-size: 26px;
  margin-bottom: 12px;
  color: #333;
  line-height: 1.3;
}

.dark .parsed-job-header h2 {
  color: #f1f1f1;
}

.company {
  font-size: 18px;
  color: #555;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
}

.dark .company {
  color: #ccc;
}

.company-rating {
  margin-left: 8px;
  font-size: 14px;
  color: #f39c12;
  background-color: #fff8e1;
  padding: 2px 6px;
  border-radius: 4px;
}

.dark .company-rating {
  background-color: #3d3624;
}

.location, .salary, .seniority {
  display: flex;
  align-items: center;
  margin-top: 8px;
  color: #666;
  font-size: 15px;
}

.dark .location, .dark .salary, .dark .seniority {
  color: #bbb;
}

.location-icon, .salary-icon, .seniority-icon {
  margin-right: 8px;
}

.source-info {
  margin-top: 16px;
  font-size: 14px;
  color: #777;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.dark .source-info {
  color: #999;
}

.source-label {
  font-weight: 500;
}

.source-type {
  padding: 3px 8px;
  border-radius: 4px;
  font-weight: 500;
  background-color: #e9ecef;
}

.dark .source-type {
  background-color: #383838;
}

.source-type.linkedin {
  background-color: #e1f0fa;
  color: #0077b5;
}

.dark .source-type.linkedin {
  background-color: #1d3648;
}

.source-type.glassdoor {
  background-color: #e3f5e9;
  color: #0caa41;
}

.dark .source-type.glassdoor {
  background-color: #1c3d2a;
}

.source-type.indeed {
  background-color: #fff5e6;
  color: #003a9b;
}

.dark .source-type.indeed {
  background-color: #2a2d3d;
}

.parsed-date {
  margin-left: auto;
  color: #888;
}

.dark .parsed-date {
  color: #888;
}

.original-link {
  margin-top: 12px;
}

.original-link a {
  color: #3498db;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
}

.original-link a:hover {
  text-decoration: underline;
}

.parsing-note {
  margin-top: 12px;
  padding: 10px;
  background-color: #fff9e6;
  border-radius: 6px;
  font-size: 14px;
  color: #666;
}

.dark .parsing-note {
  background-color: #3d3624;
  color: #ccc;
}

.note-icon {
  margin-right: 6px;
}
/* Вкладки */
.view-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 10px 16px;
  background-color: #f5f7fa;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #555;
  transition: all 0.2s ease;
}

.dark .tab-btn {
  background-color: #383838;
  color: #ccc;
}

.tab-btn:hover {
  background-color: #e9ecef;
}

.dark .tab-btn:hover {
  background-color: #444;
}

.tab-btn.active {
  background-color: #3498db;
  color: white;
}

.dark .tab-btn.active {
  background-color: #2980b9;
}

/* Контент вкладок */
.tab-content {
  border: 1px solid #eee;
  border-radius: 10px;
  padding: 20px;
  min-height: 300px;
  background-color: #fff;
}

.dark .tab-content {
  border-color: #444;
  background-color: #2d2d2d;
}

/* Содержимое вакансии */
.job-text {
  line-height: 1.7;
  white-space: pre-line;
  max-height: 600px;
  overflow-y: auto;
  padding-right: 10px;
  color: #333;
}

.dark .job-text {
  color: #f1f1f1;
}

/* Стилизация скроллбара */
.job-text::-webkit-scrollbar {
  width: 8px;
}

.job-text::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.dark .job-text::-webkit-scrollbar-track {
  background: #333;
}

.job-text::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.dark .job-text::-webkit-scrollbar-thumb {
  background: #555;
}

.job-text::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.dark .job-text::-webkit-scrollbar-thumb:hover {
  background: #666;
}

/* Вкладка со скриншотом */
.screenshot-container {
  position: relative;
  min-height: 200px;
  display: flex;
  justify-content: center;
}

.job-screenshot {
  max-width: 100%;
  border: 1px solid #eee;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.dark .job-screenshot {
  border-color: #444;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.screenshot-error {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 15px 20px;
  border-radius: 6px;
  max-width: 80%;
  text-align: center;
}

/* Вкладка с HTML */
.html-tab {
  position: relative;
  min-height: 400px;
}

.html-frame {
  width: 100%;
  height: 600px;
  border: 1px solid #eee;
  border-radius: 6px;
  background-color: white;
}

.dark .html-frame {
  border-color: #444;
}

.html-error {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 15px 20px;
  border-radius: 6px;
  z-index: 10;
}

/* Вкладка с информацией о парсинге */
.parsing-tab {
  padding: 10px;
}

.parsing-info {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.parsing-info h3 {
  margin-bottom: 15px;
  color: #333;
}

.dark .parsing-info h3 {
  color: #f1f1f1;
}

.info-section {
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 15px;
  border-left: 3px solid #3498db;
}

.dark .info-section {
  background-color: #333;
  border-left-color: #3498db;
}

.info-section h4 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #3498db;
}

.dark .info-section h4 {
  color: #5dade2;
}

.info-section p {
  margin: 5px 0;
}

.error-section {
  border-left-color: #e74c3c;
}

.error-section h4 {
  color: #e74c3c;
}

.dark .error-section h4 {
  color: #e57373;
}

/* Кнопки действий */
.retry-btn, .parse-btn {
  padding: 10px 16px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.retry-btn:hover, .parse-btn:hover {
  background-color: #2980b9;
  transform: translateY(-2px);
}

.dark .retry-btn, .dark .parse-btn {
  background-color: #2980b9;
}

.dark .retry-btn:hover, .dark .parse-btn:hover {
  background-color: #3498db;
}

.main-action {
  margin-top: 20px;
  padding: 12px 24px;
  font-size: 16px;
}

.parse-icon {
  font-size: 16px;
}

/* Поиск в описании */
.search-container {
  margin-bottom: 20px;
}

.search-input-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.dark .search-input {
  background-color: #333;
  border-color: #444;
  color: #eee;
}

.search-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-nav-btn {
  background-color: #f5f7fa;
  border: none;
  border-radius: 4px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
  color: #555;
}

.dark .search-nav-btn {
  background-color: #383838;
  color: #ccc;
}

.search-count {
  font-size: 14px;
  color: #777;
}

.dark .search-count {
  color: #999;
}

.search-results {
  margin-top: 8px;
  font-size: 13px;
  color: #888;
}

.dark .search-results {
  color: #aaa;
}

.keyword-highlight {
  background-color: rgba(255, 240, 0, 0.3);
  padding: 0 2px;
  border-radius: 2px;
}

.dark .keyword-highlight {
  background-color: rgba(255, 240, 0, 0.2);
}

/* Ключевые слова */
.keywords-section {
  margin-top: 25px;
  padding-top: 15px;
  border-top: 1px solid #eee;
}

.dark .keywords-section {
  border-top-color: #444;
}

.keywords-section h4 {
  font-size: 16px;
  margin-bottom: 10px;
  color: #555;
}

.dark .keywords-section h4 {
  color: #ccc;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  padding: 5px 10px;
  background-color: #f1f8fe;
  color: #3498db;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dark .tag {
  background-color: #1d3648;
}

.tag:hover {
  background-color: #d4e9f7;
  transform: translateY(-2px);
}

.dark .tag:hover {
  background-color: #264a63;
}

/* Уведомления */
.toast-message {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background-color: #2ecc71;
  color: white;
  padding: 12px 20px;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  animation: fadeInOut 4s ease;
  font-weight: 500;
}

.toast-message.error {
  background-color: #e74c3c;
}

.toast-message.warning {
  background-color: #f39c12;
}

.toast-message.info {
  background-color: #3498db;
}

@keyframes fadeInOut {
  0% { opacity: 0; transform: translateY(20px); }
  15% { opacity: 1; transform: translateY(0); }
  85% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-20px); }
}

/* Индикатор прогресса */
.parsing-progress {
  position: relative;
  height: 4px;
  width: 100%;
  background-color: #f1f1f1;
  border-radius: 2px;
  overflow: hidden;
  margin-top: 5px;
  margin-bottom: 15px;
}

.dark .parsing-progress {
  background-color: #333;
}

.parsing-progress-bar {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background-color: #3498db;
  transition: width 0.3s ease;
}

.dark .parsing-progress-bar {
  background-color: #2980b9;
}

/* Адаптивная верстка */
@media (max-width: 768px) {
  .parsed-job-container {
    padding: 15px;
    margin: 0 10px;
  }
  
  .parsed-job-header h2 {
    font-size: 22px;
  }
  
  .company {
    font-size: 16px;
  }
  
  .view-tabs {
    overflow-x: auto;
    padding-bottom: 5px;
    margin-bottom: 12px;
  }
  
  .tab-btn {
    flex: 0 0 auto;
    white-space: nowrap;
  }
  
  .tab-content {
    padding: 15px;
  }
  
  .html-frame {
    height: 450px;
  }
  
  .info-section {
    padding: 12px;
  }
}

@media (max-width: 480px) {
  .parsed-job-container {
    padding: 10px;
  }
  
  .back-button-container {
    margin-bottom: 15px;
  }
  
  .parsed-job-header {
    padding-bottom: 12px;
    margin-bottom: 20px;
  }
  
  .source-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
  
  .parsed-date {
    margin-left: 0;
  }
  
  .tab-content {
    padding: 10px;
  }
  
  .job-text {
    max-height: 400px;
  }
  
  .html-frame {
    height: 350px;
  }
}
</style>