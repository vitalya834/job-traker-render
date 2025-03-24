<template>
  <div class="add-job-container">
    <div class="form-header">
      <h2>{{ t('addJob') }}</h2>
      <div class="header-line"></div>
    </div>
    
    <form @submit.prevent="handleSubmit">
      <div class="form-grid">
        <div class="form-group">
          <label>{{ t('company') }}</label>
          <div class="input-container">
            <input v-model="job.company" :placeholder="t('companyPlaceholder')" required />
            <span class="input-icon">🏢</span>
          </div>
        </div>

        <div class="form-group">
          <label>{{ t('position') }}</label>
          <div class="input-container">
            <input v-model="job.position" :placeholder="t('positionPlaceholder')" required />
            <span class="input-icon">👔</span>
          </div>
        </div>

        <div class="form-group">
          <label>{{ t('jobLink') }}</label>
          <div class="input-container">
            <input v-model="job.link" :placeholder="t('jobLinkPlaceholder')" required />
            <span class="input-icon">🔗</span>
          </div>
        </div>

        <div class="form-group">
          <label>{{ t('coverLetter') }}</label>
          <div class="file-upload">
            <input
              type="file"
              id="coverLetter"
              ref="coverLetterInput"
              @change="handleCoverLetterUpload"
              accept=".txt,.doc,.docx,.pdf"
              class="file-input"
            />
            <label for="coverLetter" class="file-label">
              <span class="file-icon">📄</span>
              <span>{{ coverLetterFile ? coverLetterFile.name : t('chooseFile') }}</span>
            </label>
          </div>
        </div>

        <div class="form-group">
          <label>{{ t('resume') }}</label>
          <div class="file-upload">
            <input
              type="file"
              id="resume"
              ref="resumeInput"
              @change="handleResumeUpload"
              accept=".txt,.doc,.docx,.pdf"
              class="file-input"
            />
            <label for="resume" class="file-label">
              <span class="file-icon">📝</span>
              <span>{{ resumeFile ? resumeFile.name : t('chooseFile') }}</span>
            </label>
          </div>
        </div>

        <div class="form-group">
          <label>{{ t('status') }}</label>
          <div class="select-container">
            <select v-model="job.status">
              <option value="sent">{{ t('statusSent') }}</option>
              <option value="interview">{{ t('statusInterview') }}</option>
              <option value="rejected">{{ t('statusRejected') }}</option>
              <option value="accepted">{{ t('statusAccepted') }}</option>
            </select>
            <span class="select-arrow">▼</span>
          </div>
        </div>
      </div>

      <div class="form-group notes-group">
        <label>{{ t('notes') }}</label>
        <textarea v-model="job.notes" :placeholder="t('notesPlaceholder')" class="notes-input"></textarea>
      </div>

      <button type="submit" :disabled="loading" class="submit-button">
        <span class="button-text">{{ t('add') }}</span>
        <span v-if="loading" class="loader"></span>
      </button>
      
      <div v-if="errorMessage" class="error-container">
        <p class="error-message">
          <span class="error-icon">⚠️</span>
          {{ errorMessage }}
        </p>
      </div>
    </form>
  </div>
</template>

<script setup>
import { JOB_STATUS } from "@/constants/jobStatus";
import { ref } from "vue";
import { useJobStore } from "@/stores/jobStore";
import { useI18n } from "vue-i18n"; // добавлено для поддержки смены языка

const { t } = useI18n(); // функция перевода

const emit = defineEmits(["job-added"]);
const jobStore = useJobStore();

const loading = ref(false);
const errorMessage = ref("");
const coverLetterFile = ref(null);
const resumeFile = ref(null);
const coverLetterInput = ref(null);
const resumeInput = ref(null);

const job = ref({
  company: "",
  position: "",
  link: "",
  status: JOB_STATUS.SENT, // Используем константу
  notes: "",
});

const validateJob = () => {
  if (!job.value.company.trim()) {
    errorMessage.value = "Введите название компании.";
    return false;
  }
  if (!job.value.position.trim()) {
    errorMessage.value = "Введите должность.";
    return false;
  }
  if (!job.value.link.trim() || !job.value.link.startsWith("http")) {
    errorMessage.value = "Введите корректную ссылку на вакансию.";
    return false;
  }
  return true;
};

const handleCoverLetterUpload = (event) => {
  coverLetterFile.value = event.target.files[0];
};

const handleResumeUpload = (event) => {
  resumeFile.value = event.target.files[0];
};

const handleSubmit = async () => {
  // Сброс сообщения об ошибке перенесён в блок успешного выполнения
  if (!validateJob()) return;

  loading.value = true;
  try {
    const formData = new FormData();
    formData.append("company", job.value.company);
    formData.append("position", job.value.position);
    formData.append("link", job.value.link);
    formData.append("status", job.value.status);
    formData.append("notes", job.value.notes); // Добавлено сохранение заметок
    if (coverLetterFile.value) {
      formData.append("coverLetter", coverLetterFile.value);
    }
    if (resumeFile.value) {
      formData.append("resume", resumeFile.value);
    }

    await jobStore.addJob(formData);
    // Сброс полей формы после успешного добавления
    job.value = { company: "", position: "", link: "", status: "sent", notes: "" };
    coverLetterFile.value = null;
    resumeFile.value = null;
    // Сброс значений file-инпутов: присваиваем пустую строку
    coverLetterInput.value.value = "";
    resumeInput.value.value = "";
    errorMessage.value = ""; // Сброс ошибки только при успехе
    emit("job-added");
  } catch (error) {
    errorMessage.value = "Ошибка при добавлении вакансии.";
    console.error("Ошибка при добавлении:", error);
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.add-job-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 30px;
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
  color: #333;
  transition: all 0.3s ease;
}

.dark .add-job-container {
  background-color: #272733;
  color: #f0f0f0;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
}

.form-header {
  margin-bottom: 30px;
  text-align: center;
  position: relative;
}

h2 {
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 15px;
  color: #2c3e50;
}

.dark h2 {
  color: #e6e6e6;
}

.header-line {
  width: 60px;
  height: 4px;
  background: linear-gradient(90deg, #007bff, #00c6ff);
  margin: 0 auto;
  border-radius: 2px;
}

.dark .header-line {
  background: linear-gradient(90deg, #3a7bd5, #00d2ff);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  grid-gap: 20px;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.notes-group {
  grid-column: 1 / -1;
}

label {
  font-weight: 500;
  display: block;
  margin-bottom: 8px;
  color: inherit;
  font-size: 14px;
  letter-spacing: 0.3px;
}

.input-container {
  position: relative;
}

.input-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.7;
}

input, select, .notes-input {
  width: 100%;
  padding: 12px 40px 12px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #fff;
  color: #333;
  font-size: 15px;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

input:focus, select:focus, .notes-input:focus {
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
  outline: none;
}

.dark input, 
.dark select, 
.dark .notes-input {
  border-color: #444;
  background-color: #333;
  color: #f0f0f0;
}

.dark input:focus, 
.dark select:focus, 
.dark .notes-input:focus {
  border-color: #3a7bd5;
  box-shadow: 0 0 0 3px rgba(58, 123, 213, 0.2);
}

.notes-input {
  min-height: 120px;
  resize: vertical;
  padding: 12px;
}

/* Стилизация select */
.select-container {
  position: relative;
}

.select-arrow {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  font-size: 10px;
  color: #666;
}

.dark .select-arrow {
  color: #ccc;
}

select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  cursor: pointer;
}

/* Стилизация file input */
.file-upload {
  position: relative;
  width: 100%;
}

.file-input {
  position: absolute;
  width: 0.1px;
  height: 0.1px;
  opacity: 0;
  overflow: hidden;
  z-index: -1;
}

.file-label {
  display: flex;
  align-items: center;
  padding: 12px;
  background-color: #f8f9fa;
  border: 1px dashed #ddd;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.file-label:hover {
  background-color: #e9ecef;
  border-color: #ccc;
}

.dark .file-label {
  background-color: #333;
  border-color: #555;
}

.dark .file-label:hover {
  background-color: #3a3a3a;
  border-color: #666;
}

.file-icon {
  margin-right: 8px;
}

/* Кнопка */
.submit-button {
  width: 100%;
  padding: 14px;
  background: linear-gradient(90deg, #007bff, #00c6ff);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 0.5px;
  position: relative;
  transition: all 0.3s ease;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 10px;
}

.submit-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 123, 255, 0.3);
}

.submit-button:active {
  transform: translateY(0);
}

.submit-button:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.dark .submit-button {
  background: linear-gradient(90deg, #3a7bd5, #00d2ff);
}

.dark .submit-button:disabled {
  background: #555;
}

.button-text {
  position: relative;
  z-index: 1;
}

/* Loader */
.loader {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-left: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Сообщение об ошибке */
.error-container {
  margin-top: 15px;
  padding: 10px;
  background-color: rgba(255, 0, 0, 0.05);
  border-radius: 8px;
  border-left: 4px solid #ff5555;
}

.error-message {
  color: #d32f2f;
  margin: 0;
  display: flex;
  align-items: center;
}

.error-icon {
  margin-right: 10px;
}

.dark .error-container {
  background-color: rgba(255, 85, 85, 0.1);
}

.dark .error-message {
  color: #ff7777;
}

/* Анимации */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

input, select, .file-label, .notes-input, .submit-button {
  animation: fadeIn 0.3s ease;
}

/* Адаптивность */
@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .add-job-container {
    padding: 20px;
    border-radius: 8px;
  }
}
</style>