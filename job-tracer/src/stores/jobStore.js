import { defineStore } from "pinia";
import { ref } from "vue";
import axios from "axios";
import { normalizeStatus } from "@/constants/jobStatus";
const API_URL = "http://localhost:5000/api";

export const useJobStore = defineStore("job", () => {
  const jobs = ref([]);
  const loading = ref(false);
  const errorMessage = ref(null);

  // Улучшенная функция обработки ошибок с логированием и повторением запросов
  const handleError = (err, defaultMessage) => {
    console.error("❌ Ошибка:", defaultMessage, err);
    
    // Получаем сообщение об ошибке из ответа сервера или используем дефолтное
    const serverMessage = err.response?.data?.error || err.response?.data?.message;
    const finalMessage = serverMessage || defaultMessage || "Произошла ошибка";
    
    // Сохраняем сообщение об ошибке в состоянии
    errorMessage.value = finalMessage;
    
    // Перебрасываем ошибку дальше для обработки в компонентах
    throw new Error(finalMessage);
  };

  // Получение вакансий с сервера с обработкой ошибок и механизмом повторных попыток
  const fetchJobs = async (retryCount = 0) => {
    loading.value = true;
    errorMessage.value = null;
    
    try {
      console.log("🚀 Запрос вакансий с сервера:", `${API_URL}/jobs`);
      
      const response = await axios.get(`${API_URL}/jobs`, {
        timeout: 10000 // 10 секунд таймаут
      });
      
      console.log("✅ Ответ сервера:", response.data);

      if (!Array.isArray(response.data)) {
        throw new Error("Ожидался массив вакансий, получен некорректный формат");
      }

      // Добавляем уникальный id, если его нет
      jobs.value = response.data.map(job => ({
        ...job,
        id: job.id || `job_${Date.now()}_${Math.random()}`,
      }));
      
      console.log("✅ Вакансии успешно загружены в jobs.value:", jobs.value);
      return response.data;
    } catch (err) {
      // Если ошибка связана с сетью и у нас есть еще попытки, пробуем снова
      if ((err.code === 'ECONNABORTED' || err.message.includes('Network Error')) && retryCount < 3) {
        console.log(`⚠️ Сетевая ошибка, повторная попытка ${retryCount + 1}/3`);
        setTimeout(() => fetchJobs(retryCount + 1), 1000); // Повторяем через 1 секунду
        return;
      }
      
      handleError(err, "Не удалось загрузить вакансии. Проверьте сервер.");
      jobs.value = [];
    } finally {
      loading.value = false;
    }
  };

  // Получение одной вакансии по ID
  const getJob = async (jobId) => {
    loading.value = true;
    errorMessage.value = null;
    
    try {
      console.log(`🔍 Получение вакансии с ID: ${jobId}`);
      
      const response = await axios.get(`${API_URL}/jobs/${jobId}`, {
        timeout: 10000 // 10 секунд таймаут
      });
      
      console.log("✅ Получена вакансия:", response.data);
      return response.data;
    } catch (err) {
      handleError(err, `Не удалось получить вакансию с ID ${jobId}.`);
      return null;
    } finally {
      loading.value = false;
    }
  };

  // Добавление вакансии через POST-запрос
  const addJob = async (formData) => {
    loading.value = true;
    errorMessage.value = null;
    
    try {
      console.log("📝 Добавление вакансии...");
      
      // Устанавливаем таймаут для запроса
      const response = await axios.post(`${API_URL}/jobs`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 30000 // 30 секунд таймаут
      });
      
      console.log("✅ Вакансия добавлена на сервер:", response.data);
      await fetchJobs(); // Обновляем список вакансий после добавления
      return response.data;
    } catch (err) {
      handleError(err, "Не удалось добавить вакансию.");
    } finally {
      loading.value = false;
    }
  };

  // Обновление статуса вакансии с поддержкой параметра interviewDate и обновлением заметок
  // Здесь добавлен параметр notes, который передается вместе со статусом
  const updateJobStatus = async (jobId, status, notes = "", interviewDate = null) => {
    loading.value = true;
    errorMessage.value = null;
    
    try {
      // Нормализуем статус перед отправкой на сервер
      const normalizedStatus = normalizeStatus(status);
      
      console.log(
        `🔄 Обновление статуса вакансии ${jobId} на ${normalizedStatus}` +
        (interviewDate ? ` с датой интервью ${interviewDate}` : "")
      );
      
      // Подготовка данных для отправки - отправляем как строку в JSON, добавляем notes
      const updateData = { status: normalizedStatus, notes };
      
      // Добавляем дату интервью, если она есть
      if (interviewDate) {
        updateData.interviewDate = interviewDate; // интервью как ISO строка
      }

      console.log("📤 Отправляемые данные:", JSON.stringify(updateData));
      
      // Отправляем запрос с таймаутом
      const response = await axios.put(`${API_URL}/jobs/${jobId}`, updateData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 15000 // 15 секунд таймаут
      });
      
      console.log("✅ Статус успешно обновлен:", response.data);
      
      // Обновляем список вакансий после обновления статуса
      await fetchJobs();
      return response.data;
    } catch (err) {
      console.error("❌ Ошибка при обновлении статуса:", err);
      console.error("Детали ошибки:", err.response?.data);
      
      // Специальная обработка ошибки 400 Bad Request
      if (err.response?.status === 400) {
        const errorDetails = err.response.data?.error || JSON.stringify(err.response.data);
        handleError(err, `Ошибка формата данных: ${errorDetails}`);
      } else {
        handleError(err, "Не удалось обновить статус вакансии.");
      }
    } finally {
      loading.value = false;
    }
  };

  // Обновление заметок вакансии
  const updateJobNotes = async (jobId, notes) => {
    loading.value = true;
    errorMessage.value = null;
    
    try {
      console.log(`📝 Обновление заметок вакансии ${jobId}`);
      
      const response = await axios.put(`${API_URL}/jobs/${jobId}`, { notes }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });
      
      console.log("✅ Заметки успешно обновлены:", response.data);
      
      // Обновляем весь список вакансий после обновления заметок
      await fetchJobs();
      
      return response.data;
    } catch (err) {
      handleError(err, "Не удалось обновить заметки.");
    } finally {
      loading.value = false;
    }
  };

  // Удаление вакансии
  const removeJob = async (jobId) => {
    loading.value = true;
    errorMessage.value = null;
    
    try {
      console.log(`🗑 Удаление вакансии ${jobId}`);
      
      const response = await axios.delete(`${API_URL}/jobs/${jobId}`, {
        timeout: 15000 // 15 секунд таймаут
      });
      
      console.log("✅ Вакансия успешно удалена");
      
      // Обновляем список вакансий после удаления
      await fetchJobs();
      return response.data;
    } catch (err) {
      handleError(err, "Не удалось удалить вакансию.");
    } finally {
      loading.value = false;
    }
  };

  // Запуск парсинга вакансии
  const parseJob = async (jobId) => {
    loading.value = true;
    errorMessage.value = null;
    
    try {
      console.log(`🤖 Запуск парсинга вакансии ${jobId}`);
      
      const response = await axios.post(`${API_URL}/jobs/${jobId}/parse`, {}, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 60000 // 60 секунд таймаут, т.к. парсинг может занять время
      });
      
      console.log("✅ Вакансия успешно распарсена:", response.data);
      
      // Обновляем список вакансий, чтобы получить обновленный флаг парсинга
      await fetchJobs();
      return response.data;
    } catch (err) {
      handleError(err, "Не удалось распарсить вакансию.");
      return null;
    } finally {
      loading.value = false;
    }
  };

  // Получение распарсенных данных о вакансии
  const getParsedJob = async (jobId) => {
    loading.value = true;
    errorMessage.value = null;
    
    try {
      console.log(`🔍 Получение распарсенных данных вакансии ${jobId}`);
      
      const response = await axios.get(`${API_URL}/jobs/${jobId}/parsed`, {
        timeout: 15000 // 15 секунд таймаут
      });
      
      console.log("✅ Получены распарсенные данные:", response.data);
      return response.data.parsedData;
    } catch (err) {
      handleError(err, "Не удалось получить распарсенные данные вакансии.");
      return null;
    } finally {
      loading.value = false;
    }
  };

  // Получение URL для просмотра скриншота вакансии
  const getJobScreenshotUrl = (jobId) => {
    return `${API_URL}/jobs/${jobId}/screenshot`;
  };

  // Получение URL для просмотра HTML вакансии
  const getJobHtmlUrl = (jobId) => {
    return `${API_URL}/jobs/${jobId}/html`;
  };

  // Получение URL для просмотра текстового содержимого вакансии
  const getJobTextUrl = (jobId) => {
    return `${API_URL}/jobs/${jobId}/text`;
  };

  // Запуск парсинга всех вакансий
  const parseAllJobs = async () => {
    loading.value = true;
    errorMessage.value = null;
    
    try {
      console.log(`🤖 Запуск парсинга всех вакансий`);
      
      const response = await axios.post(`${API_URL}/parse-all-jobs`, {}, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 секунд таймаут, т.к. парсинг идет асинхронно на сервере
      });
      
      console.log("✅ Запущен парсинг всех вакансий:", response.data);
      return true;
    } catch (err) {
      handleError(err, "Не удалось запустить парсинг всех вакансий.");
      return false;
    } finally {
      loading.value = false;
    }
  };

  // Метод для преобразования даты в ISO формат
  const formatDateForAPI = (dateString) => {
    if (!dateString) return null;
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.error("⚠️ Некорректная дата:", dateString);
        return null;
      }
      return date.toISOString();
    } catch (error) {
      console.error("⚠️ Ошибка при форматировании даты:", error);
      return null;
    }
  };

  // Очистить сообщение об ошибке
  const clearError = () => {
    errorMessage.value = null;
  };

  return {
    jobs,
    loading,
    errorMessage,
    fetchJobs,
    getJob,
    addJob,
    updateJobStatus,
    updateJobNotes,
    removeJob,
    parseJob,
    getParsedJob,
    getJobScreenshotUrl,
    getJobHtmlUrl,
    getJobTextUrl,
    parseAllJobs,
    formatDateForAPI,
    clearError
  };
});