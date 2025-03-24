<template>
  <div class="jobs-list-container">
    <!-- Фильтры на одной линии -->
    <div class="filter-bar">
      <div class="filter-item">
        <label for="sort-select">{{ t('sortBy') }}:</label>
        <select id="sort-select" v-model="sortOrder">
          <option value="newest">{{ t('newest') }}</option>
          <option value="oldest">{{ t('oldest') }}</option>
          <option value="company">{{ t('companyName') }}</option>
          <option value="position">{{ t('positionName') }}</option>
        </select>
      </div>
      
      <div class="filter-item">
        <label for="source-select">{{ t('source') }}:</label>
        <select id="source-select" v-model="sourceFilter">
          <option value="all">{{ t('allSources') }}</option>
          <option value="LinkedIn">LinkedIn</option>
          <option value="Indeed">Indeed</option>
          <option value="Glassdoor">Glassdoor</option>
          <option value="HeadHunter">HeadHunter</option>
          <option value="SuperJob">SuperJob</option>
          <option value="GitHub">GitHub Jobs</option>
          <option value="Other">{{ t('otherSources') }}</option>
        </select>
      </div>
      
      <div class="filter-item search-item">
        <label for="search-input">{{ t('search') }}:</label>
        <div class="search-input-wrapper">
          <input
            id="search-input"
            v-model="searchQuery"
            :placeholder="t('searchPlaceholder')"
            class="search-input"
          />
          <button v-if="searchQuery" @click="searchQuery = ''" class="clear-search">×</button>
        </div>
      </div>
    </div>
    
    <!-- Статистика в виде кликабельных карточек -->
    <div class="stats-panel">
      <div class="stats-grid">
        <div 
          class="stat-card total" 
          :class="{ active: statusFilter === 'all' }" 
          @click="statusFilter = 'all'"
        >
          <span class="stat-value">{{ stats.total }}</span>
          <span class="stat-label">{{ t('total') }}</span>
        </div>
        <div 
          class="stat-card sent" 
          :class="{ active: statusFilter === 'sent' }" 
          @click="statusFilter = 'sent'"
        >
          <span class="stat-value">{{ stats.sent }}</span>
          <span class="stat-label">{{ t('sent') }}</span>
        </div>
        <div 
          class="stat-card interview" 
          :class="{ active: statusFilter === 'interview' }" 
          @click="statusFilter = 'interview'"
        >
          <span class="stat-value">{{ stats.interview }}</span>
          <span class="stat-label">{{ t('interview') }}</span>
        </div>
        <div 
          class="stat-card rejected" 
          :class="{ active: statusFilter === 'rejected' }" 
          @click="statusFilter = 'rejected'"
        >
          <span class="stat-value">{{ stats.rejected }}</span>
          <span class="stat-label">{{ t('rejected') }}</span>
        </div>
        <div 
          class="stat-card accepted" 
          :class="{ active: statusFilter === 'accepted' }" 
          @click="statusFilter = 'accepted'"
        >
          <span class="stat-value">{{ stats.accepted }}</span>
          <span class="stat-label">{{ t('accepted') }}</span>
        </div>
      </div>
    </div>
    
    <!-- Активные фильтры -->
    <div class="active-filters" v-if="hasActiveFilters">
      <div class="active-filters-list">
        <span v-if="statusFilter !== 'all'" class="filter-tag status">
          {{ t('status') }}: {{ t(statusFilter) }}
          <button @click="statusFilter = 'all'" class="remove-filter">×</button>
        </span>
        <span v-if="sourceFilter !== 'all'" class="filter-tag source">
          {{ t('source') }}: {{ sourceFilter }}
          <button @click="sourceFilter = 'all'" class="remove-filter">×</button>
        </span>
        <span v-if="searchQuery" class="filter-tag search">
          {{ t('search') }}: "{{ searchQuery }}"
          <button @click="searchQuery = ''" class="remove-filter">×</button>
        </span>
      </div>
      <button @click="resetAllFilters" class="reset-filters">
        {{ t('resetAllFilters') }}
      </button>
    </div>
    
    <!-- Количество найденных вакансий -->
    <div class="results-count" v-if="!isLoading">
      {{ t('foundJobs', { count: filteredAndSortedJobs.length }) }}
    </div>
    
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>{{ t('loadingJobs') }}</p>
    </div>
    
    <div v-else-if="filteredAndSortedJobs.length === 0" class="no-jobs">
      <p v-if="hasActiveFilters">{{ t('noJobsWithFilters') }}</p>
      <p v-else>{{ t('noJobsFound') }}</p>
      <button @click="goToAddJob" class="add-job-btn">
        {{ t('addYourFirstJob') }}
      </button>
    </div>
    
    <div v-else class="jobs-list">
      <JobCard
        v-for="job in filteredAndSortedJobs" 
        :key="job.id"
        :job="job"
        @remove="removeJob"
        @update-status="refreshJob"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useJobStore } from '@/stores/jobStore';
import JobCard from '@/pages/JobCard.vue';
import { JOB_STATUS, normalizeStatus, getStatusKey } from "@/constants/jobStatus";

const router = useRouter();
const { t } = useI18n();
const jobStore = useJobStore();

const isLoading = ref(true);
const jobs = ref([]);
const sortOrder = ref('newest'); // По умолчанию сортируем от новых к старым
const statusFilter = ref('all'); // Фильтр по статусу
const sourceFilter = ref('all'); // Фильтр по источнику
const searchQuery = ref(''); // Поисковый запрос

// Проверка активных фильтров
const hasActiveFilters = computed(() => {
  return statusFilter.value !== 'all' || sourceFilter.value !== 'all' || searchQuery.value !== '';
});

// Определение источника вакансии на основе URL
const getJobSource = (job) => {
  if (!job.link) return 'Other';
  
  const url = job.link.toLowerCase();
  
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
};

// Получаем отфильтрованный и отсортированный список вакансий
const filteredAndSortedJobs = computed(() => {
  if (!jobs.value || jobs.value.length === 0) return [];
  
  // Сначала фильтруем
  let filtered = jobs.value.filter(job => {
    // Фильтр по статусу
    if (statusFilter.value !== 'all') {
  // Используем getStatusKey для нормализации статуса при сравнении
  if (getStatusKey(job.status) !== statusFilter.value) {
    return false;
  }
}
    
    // Фильтр по источнику
    if (sourceFilter.value !== 'all') {
      const jobSource = getJobSource(job);
      if (jobSource !== sourceFilter.value) {
        return false;
      }
    }
    
    // Поисковый запрос
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      return (
        (job.company && job.company.toLowerCase().includes(query)) ||
        (job.position && job.position.toLowerCase().includes(query)) ||
        (job.notes && job.notes.toLowerCase().includes(query))
      );
    }
    
    return true;
  });
  
  // Затем сортируем
  return filtered.sort((a, b) => {
    switch (sortOrder.value) {
      case 'oldest':
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      case 'company':
        return (a.company || '').localeCompare(b.company || '');
      case 'position':
        return (a.position || '').localeCompare(b.position || '');
      case 'newest':
      default:
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    }
  });
});

// Вычисляем статистику
const stats = computed(() => {
  if (!jobs.value || !Array.isArray(jobs.value)) {
    return { total: 0, sent: 0, interview: 0, rejected: 0, accepted: 0 };
  }
  return {
    total: jobs.value.length,
    sent: jobs.value.filter((job) => getStatusKey(job.status) === "sent").length,
    interview: jobs.value.filter((job) => getStatusKey(job.status) === "interview").length,
    rejected: jobs.value.filter((job) => getStatusKey(job.status) === "rejected").length,
    accepted: jobs.value.filter((job) => getStatusKey(job.status) === "accepted").length,
  };
});

// Сброс всех фильтров
const resetAllFilters = () => {
  statusFilter.value = 'all';
  sourceFilter.value = 'all';
  searchQuery.value = '';
  sortOrder.value = 'newest';
};

// Получаем список вакансий при монтировании компонента
onMounted(async () => {
  try {
    isLoading.value = true;
    jobs.value = await jobStore.fetchJobs();
  } catch (error) {
    console.error('Ошибка при загрузке вакансий:', error);
  } finally {
    isLoading.value = false;
  }
});

// Отслеживаем изменения в фильтрах для дебага
watch([statusFilter, sourceFilter, searchQuery, sortOrder], () => {
  console.log("Фильтры изменены:", 
    { статус: statusFilter.value, источник: sourceFilter.value, поиск: searchQuery.value, сортировка: sortOrder.value });
});

// Удаление вакансии
const removeJob = async (jobId) => {
  try {
    await jobStore.removeJob(jobId);
    jobs.value = jobs.value.filter(job => job.id !== jobId);
  } catch (error) {
    console.error('Ошибка при удалении вакансии:', error);
  }
};

// Обновление информации о вакансии
const refreshJob = async ({ id, status, interviewDate, refresh }) => {
  try {
    if (refresh) {
      // Если нужно полное обновление, получаем вакансии заново
      jobs.value = await jobStore.fetchJobs();
    } else {
      // Иначе обновляем только конкретную вакансию в массиве
      const jobIndex = jobs.value.findIndex(job => job.id === id);
      if (jobIndex !== -1) {
        if (status) {
          jobs.value[jobIndex].status = normalizeStatus(status);
        }
        if (interviewDate) {
          jobs.value[jobIndex].interviewDate = interviewDate;
        }
      }
    }
  } catch (error) {
    console.error('Ошибка при обновлении вакансии:', error);
  }
};

// Переход на страницу добавления вакансии
const goToAddJob = () => {
  router.push('/jobs/add');
};
</script>

<style scoped>
.jobs-list-container {
  max-width: 960px;
  margin: 0 auto;
  padding: 20px;
}

/* Стили для фильтров в одну строку */
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: flex-end;
  margin-bottom: 24px;
  background-color: #f7f7f7;
  padding: 16px;
  border-radius: 10px;
}

.dark .filter-bar {
  background-color: #2a2a2a;
}

.filter-item {
  display: flex;
  flex-direction: column;
  min-width: 160px;
}

.search-item {
  flex-grow: 1;
}

.filter-item label {
  margin-bottom: 8px;
  font-size: 13px;
  color: #666;
  font-weight: 500;
}

.dark .filter-item label {
  color: #aaa;
}

.search-input-wrapper {
  position: relative;
  width: 100%;
}

select,
.search-input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  background-color: white;
  color: #333;
  transition: all 0.2s;
}

.search-input {
  width: 100%;
  padding-right: 32px;
}

.dark select,
.dark .search-input {
  background-color: #333;
  border-color: #555;
  color: #eee;
}

select:focus,
.search-input:focus {
  border-color: #0288d1;
  outline: none;
  box-shadow: 0 0 0 2px rgba(2, 136, 209, 0.1);
}

.dark select:focus,
.dark .search-input:focus {
  border-color: #4fc3f7;
  box-shadow: 0 0 0 2px rgba(79, 195, 247, 0.2);
}

.clear-search {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 18px;
  color: #999;
  cursor: pointer;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-search:hover {
  color: #333;
}

.dark .clear-search:hover {
  color: #fff;
}

/* Статистика */
.stats-panel {
  margin-bottom: 24px;
  animation: fadeIn 0.5s ease-in-out;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  text-align: center;
}

.stat-card {
  padding: 15px;
  border-radius: 8px;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1);
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 12px rgba(0, 0, 0, 0.15);
}

.stat-card::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 0;
  background-color: rgba(255, 255, 255, 0.15);
  transition: height 0.3s ease;
  z-index: 1;
}

.stat-card:hover::after {
  height: 100%;
}

.stat-card.active {
  transform: translateY(-5px);
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.2);
}

.stat-card.active::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background-color: rgba(255, 255, 255, 0.5);
}

.stat-value {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  position: relative;
  z-index: 2;
}

.stat-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  position: relative;
  z-index: 2;
  font-weight: 500;
}

.total { 
  background-color: #607d8b; 
}

.sent { 
  background-color: #1e88e5; 
}

.interview { 
  background-color: #ff9800; 
}

.rejected { 
  background-color: #e53935; 
}

.accepted { 
  background-color: #43a047; 
}

.dark .total { 
  background-color: #455a64; 
}

.dark .sent { 
  background-color: #1565c0; 
}

.dark .interview { 
  background-color: #ef6c00; 
}

.dark .rejected { 
  background-color: #c62828; 
}

.dark .accepted { 
  background-color: #2e7d32; 
}

/* Активные фильтры */
.active-filters {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px 16px;
  background-color: #f0f5ff;
  border-radius: 8px;
  border-left: 4px solid #3498db;
}

.dark .active-filters {
  background-color: #2c3e50;
  border-left-color: #3498db;
}

.active-filters-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background-color: #e1e9ff;
  border-radius: 16px;
  font-size: 13px;
  color: #333;
}

.dark .filter-tag {
  background-color: #34495e;
  color: #eee;
}

.filter-tag.status {
  background-color: #e3f2fd;
  color: #0288d1;
}

.filter-tag.source {
  background-color: #e8f5e9;
  color: #388e3c;
}

.filter-tag.search {
  background-color: #fff8e1;
  color: #ffa000;
}

.dark .filter-tag.status {
  background-color: rgba(2, 136, 209, 0.3);
  color: #90caf9;
}

.dark .filter-tag.source {
  background-color: rgba(56, 142, 60, 0.3);
  color: #a5d6a7;
}

.dark .filter-tag.search {
  background-color: rgba(255, 160, 0, 0.3);
  color: #ffcc80;
}

.remove-filter {
  background: none;
  border: none;
  width: 16px;
  height: 16px;
  font-size: 14px;
  cursor: pointer;
  margin-left: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
}

.remove-filter:hover {
  opacity: 1;
}

.reset-filters {
  background: none;
  border: none;
  color: #3498db;
  font-size: 13px;
  cursor: pointer;
  padding: 4px 8px;
  transition: color 0.2s;
}

.reset-filters:hover {
  text-decoration: underline;
  color: #2980b9;
}

.dark .reset-filters {
  color: #3498db;
}

.dark .reset-filters:hover {
  color: #5dade2;
}

.results-count {
  margin-bottom: 16px;
  font-size: 14px;
  color: #666;
}

.dark .results-count {
  color: #aaa;
}

.jobs-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #0288d1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.dark .loading-spinner {
  border-color: #444;
  border-top-color: #4fc3f7;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.loading-container p {
  color: #666;
  font-size: 16px;
}

.dark .loading-container p {
  color: #bbb;
}

.no-jobs {
  text-align: center;
  padding: 60px 0;
  background-color: #f9f9f9;
  border-radius: 16px;
  border: 1px dashed #ddd;
}

.dark .no-jobs {
  background-color: #2a2a2a;
  border-color: #444;
}

.no-jobs p {
  color: #666;
  font-size: 18px;
  margin-bottom: 20px;
}

.dark .no-jobs p {
  color: #bbb;
}

.add-job-btn {
  padding: 12px 24px;
  background-color: #0288d1;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-job-btn:hover {
  background-color: #0277bd;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.dark .add-job-btn {
  background-color: #0288d1;
}

.dark .add-job-btn:hover {
  background-color: #0277bd;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

@media (max-width: 768px) {
  .filter-bar {
    flex-direction: column;
    gap: 12px;
  }
  
  .filter-item {
    width: 100%;
  }
  
  .active-filters {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .reset-filters {
    align-self: flex-end;
  }
}
</style>