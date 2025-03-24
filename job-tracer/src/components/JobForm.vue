<template>
  <div class="add-job-container">
    <h2>Добавить вакансию</h2>
    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label>Компания</label>
        <input v-model="job.company" placeholder="Название компании" required />
      </div>

      <div class="form-group">
        <label>Должность</label>
        <input v-model="job.position" placeholder="Название должности" required />
      </div>

      <div class="form-group">
        <label>Ссылка на вакансию</label>
        <input v-model="job.link" placeholder="URL вакансии" required />
      </div>

      <div class="form-group">
        <label>Сопроводительное письмо (Anschreiben)</label>
        <input
          type="file"
          ref="coverLetterInput"
          @change="handleCoverLetterUpload"
          accept=".txt,.doc,.docx,.pdf"
        />
      </div>

      <div class="form-group">
        <label>Резюме (Lebenslauf)</label>
        <input
          type="file"
          ref="resumeInput"
          @change="handleResumeUpload"
          accept=".txt,.doc,.docx,.pdf"
        />
      </div>

      <div class="form-group">
        <label>Статус</label>
        <select v-model="job.status">
          <option value="Sent">Отправлено</option>
          <option value="Interview">Интервью</option>
          <option value="Rejected">Отклонено</option>
          <option value="Accepted">Принято</option>
        </select>
      </div>

      <div class="form-group">
        <label>Заметки</label>
        <textarea v-model="job.notes" placeholder="Добавьте заметки" class="notes-input"></textarea>
      </div>

      <button type="submit" :disabled="loading">Добавить</button>
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    </form>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useJobStore } from "@/stores/jobStore";
import { useI18n } from "vue-i18n"; // добавлено для поддержки смены языка

const { t } = useI18n(); // функция перевода (пока не используется в шаблоне, но доступна для расширения)

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
  status: "Sent",
  notes: "", // Добавлено поле для заметок
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
  errorMessage.value = "";
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
    job.value = { company: "", position: "", link: "", status: "Sent", notes: "" };
    coverLetterFile.value = null;
    resumeFile.value = null;
    // Сброс значений file-инпутов: присваиваем пустую строку
    coverLetterInput.value.value = "";
    resumeInput.value.value = "";
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
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  color: #333;
  transition: background-color 0.2s, color 0.2s;
}

.dark .add-job-container {
  background-color: #333;
  color: #fff;
}

h2 {
  text-align: center;
}

.form-group {
  margin-bottom: 12px;
}

label {
  font-weight: bold;
  display: block;
  margin-bottom: 4px;
  color: inherit;
}

input[type="text"],
input[type="url"],
select,
input[type="file"],
.notes-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #fff;
  color: #333;
}

.notes-input {
  min-height: 80px;
  resize: vertical;
}

.dark input[type="text"],
.dark input[type="url"],
.dark select,
.dark input[type="file"],
.dark .notes-input {
  border-color: #555;
  background-color: #444;
  color: #fff;
}

button {
  width: 100%;
  padding: 10px;
  background: #007bff;
  color: white;
  border: none;
  cursor: pointer;
  border-radius: 4px;
}

button:disabled {
  background: #ccc;
}

.dark button {
  background: #0056b3;
}

.dark button:disabled {
  background: #777;
}

.error-message {
  color: #ff0000;
  text-align: center;
  margin-top: 10px;
}

.dark .error-message {
  color: #ff5555;
}
</style>