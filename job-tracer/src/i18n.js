import { createI18n } from 'vue-i18n';

const messages = {
  ru: {
    title: "Трекер вакансий",
    home: "Главная",
    about: "О нас", // Строковый ключ для навигации
    addJob: "Добавить вакансию",
    allStatuses: "Все статусы",
    sent: "Отправлено",
    interview: "Интервью",
    rejected: "Отклонено",
    accepted: "Принято",
    searchPlaceholder: "Поиск...",
    noJobsWithFilters: "Нет вакансий с такими фильтрами",
    noJobs: "Нет вакансий",
    stats: "Статистика",
    total: "Всего",
    confirmRemove: "Вы действительно хотите удалить эту вакансию?",
    loading: "Загрузка...",
    retry: "Повторить",
    viewDetails: "Подробнее",
    confirmDelete: "Подтверждение удаления",
    documents: "Документы",
    noLink: "Нет ссылки на вакансию",
    backToList: "Назад к списку",
    
    // Google Calendar
    addToGoogleCalendar: "Добавить в Google Календарь",
    calendarAddSuccess: "Событие успешно добавлено в Google Календарь",
    calendarAddError: "Ошибка при добавлении в календарь",
    
    // Новые ключи для сортировки и фильтрации
    sortBy: "Сортировать по",
    source: "Источник",
    myJobs: "Мои вакансии",
    newest: "Сначала новые",
    oldest: "Сначала старые",
    companyName: "Названию компании",
    positionName: "Названию должности",
    allSources: "Все источники",
    foundJobs: "Найдено вакансий: {count}",
    otherSources: "Другие источники",
    resetAllFilters: "Сбросить все фильтры",
    search: "Поиск",
    
    // Вложенная структура для корректных переводов статусов
    jobStatus: {
      sent: "Отправлено",
      interview: "Интервью",
      rejected: "Отклонено",
      accepted: "Принято"
    },
    
    // Добавляем отдельные ключи для статусов
    statusSent: "Отправлено",
    statusInterview: "Интервью",
    statusRejected: "Отклонено",
    statusAccepted: "Принято",
    
    // Ключи валидации форм
    validation: {
      companyRequired: "Введите название компании",
      positionRequired: "Введите должность",
      validLinkRequired: "Введите корректную ссылку на вакансию (начиная с http:// или https://)",
      resumeRequired: "Прикрепите резюме",
      coverLetterRequired: "Прикрепите сопроводительное письмо"
    },
    
    // Плейсхолдеры для полей формы
    companyPlaceholder: "Название компании",
    positionPlaceholder: "Название должности",
    jobLinkPlaceholder: "URL вакансии (начиная с http:// или https://)", // Переименовано из linkPlaceholder
    coverLetterPlaceholder: "Файл не выбран", // Добавлено
    resumePlaceholder: "Файл не выбран", // Добавлено
    notesPlaceholder: "Добавьте заметки здесь...", // Переименовано из addNotes
    
    // Ключи для страницы About - изменено с about на aboutPage
    aboutPage: {
      title: "О проекте",
      description: {
        title: "Что такое Job Tracker?",
        text1: "Job Tracker — это простое приложение, разработанное для помощи пользователям в отслеживании их заявок на вакансии. Вы можете добавлять, редактировать и удалять заявки, а также вести заметки по каждой вакансии.",
        text2: "Цель этого проекта — предоставить удобный способ организации и эффективного управления заявками на вакансии. Отслеживайте статусы своих заявок, планируйте интервью и храните резюме и сопроводительные письма в одном месте."
      },
      features: {
        title: "Возможности",
        tracking: "Отслеживание статусов заявок",
        search: "Поиск и фильтрация вакансий",
        stats: "Статистика и аналитика",
        schedule: "Планирование интервью",
        documents: "Хранение документов (резюме, сопроводительное письмо)"
      },
      technologies: {
        title: "Технологии"
      },
      contact: {
        title: "Контакты",
        text: "Есть вопросы или предложения? Свяжитесь с нами:"
      }
    },
    
    // Дополнительные ключи
    delete: "Удалить",
    noDate: "Дата не указана",
    invalidDate: "Неверная дата",
    noStatus: "Статус не указан",
    noPosition: "Должность не указана",
    noCompany: "Компания не указана",
    notes: "Заметки",
    jobLink: "Ссылка на вакансию",
    interviewDate: "Дата интервью",
    viewJob: "Просмотреть вакансию",
    resume: "Резюме",
    coverLetter: "Сопроводительное письмо",
    scheduleInterview: "Назначить интервью",
    selectDateTime: "Выберите дату и время",
    save: "Сохранить",
    cancel: "Отмена",
    company: "Компания",
    position: "Должность",
    status: "Статус",
    link: "Ссылка на вакансию",
    attachResume: "Прикрепить резюме",
    attachCoverLetter: "Прикрепить сопроводительное письмо",
    submit: "Отправить",
    add: "Добавить", // Добавлено
    settings: "Настройки",
    darkMode: "Темная тема",
    language: "Язык",
    openAddForm: "Открыть форму добавления",
    closeError: "Закрыть",
    tryAgain: "Попробовать снова",
    
    // Сообщения об ошибках
    errorLoading: "Не удалось загрузить вакансии. Проверьте сервер.",
    errorAdding: "Не удалось добавить вакансию.",
    errorUpdating: "Не удалось обновить вакансию.",
    errorDeleting: "Не удалось удалить вакансию.",
    errorUpdatingStatus: "Не удалось обновить статус вакансии. Попробуйте еще раз.",
    errorUpdatingNotes: "Не удалось обновить заметки. Попробуйте еще раз.",
    errorSchedulingInterview: "Не удалось назначить интервью. Попробуйте еще раз.",
    errorFormat: "Ошибка формата данных. Пожалуйста, проверьте введенные данные.",
    error400: "Ошибка запроса. Проверьте данные и попробуйте снова.",
    error404: "Ресурс не найден. Возможно, вакансия была удалена.",
    error500: "Внутренняя ошибка сервера. Попробуйте позже.",
    
    // Новые ключи для парсинга вакансий
    jobParsed: "Вакансия сохранена",
    parsedOn: "Сохранено",
    parseNow: "Сохранить страницу",
    parsingInProgress: "Сохраняется...",
    viewSavedVersion: "Просмотреть сохраненную версию",
    jobSuccessfullyParsed: "Страница вакансии успешно сохранена",
    errorParsingJob: "Ошибка при сохранении страницы вакансии",
    description: "Описание",
    screenshot: "Скриншот",
    htmlSource: "HTML код",
    openOriginalPage: "Открыть оригинальную страницу",
    loadingJobData: "Загрузка данных...",
    errorLoadingData: "Ошибка загрузки данных",
    errorLoadingParsedData: "Ошибка загрузки сохраненных данных",
    noDataAvailable: "Данные не найдены"
  },
  
  en: {
    title: "Job Tracker",
    home: "Home",
    about: "About", // Строковый ключ для навигации
    addJob: "Add Job",
    allStatuses: "All statuses",
    sent: "Sent",
    interview: "Interview",
    rejected: "Rejected",
    accepted: "Accepted",
    searchPlaceholder: "Search...",
    noJobsWithFilters: "No jobs match these filters",
    noJobs: "No jobs found",
    stats: "Stats",
    total: "Total",
    confirmRemove: "Are you sure you want to delete this job?",
    loading: "Loading...",
    retry: "Retry",
    viewDetails: "View Details",
    confirmDelete: "Confirm Deletion",
    documents: "Documents",
    noLink: "No job link",
    backToList: "Back to list",
    
    // Google Calendar
    addToGoogleCalendar: "Add to Google Calendar",
    calendarAddSuccess: "Event successfully added to Google Calendar",
    calendarAddError: "Error adding to calendar",
    
    // New keys for sorting and filtering
    sortBy: "Sort by",
    source: "Source",
    myJobs: "My Jobs",
    newest: "Newest first",
    oldest: "Oldest first",
    companyName: "Company name",
    positionName: "Position name",
    allSources: "All sources",
    foundJobs: "Found jobs: {count}",
    otherSources: "Other sources",
    resetAllFilters: "Reset all filters",
    search: "Search",
    
    // Nested structure for status translations
    jobStatus: {
      sent: "Sent",
      interview: "Interview",
      rejected: "Rejected",
      accepted: "Accepted"
    },
    
    // Добавляем отдельные ключи для статусов
    statusSent: "Sent",
    statusInterview: "Interview",
    statusRejected: "Rejected",
    statusAccepted: "Accepted",
    
    // Form validation keys
    validation: {
      companyRequired: "Please enter company name",
      positionRequired: "Please enter position",
      validLinkRequired: "Please enter a valid job link (starting with http:// or https://)",
      resumeRequired: "Please attach your resume",
      coverLetterRequired: "Please attach your cover letter"
    },
    
    // Form field placeholders
    companyPlaceholder: "Company name",
    positionPlaceholder: "Position title",
    jobLinkPlaceholder: "Job URL (starting with http:// or https://)", // Переименовано из linkPlaceholder
    coverLetterPlaceholder: "No file selected", // Добавлено
    resumePlaceholder: "No file selected", // Добавлено
    notesPlaceholder: "Add notes here...", // Переименовано из addNotes
    
    // About page keys
    aboutPage: {
      title: "About The Project",
      description: {
        title: "What is Job Tracker?",
        text1: "Job Tracker is a simple application designed to help users track their job applications. You can add, edit, and remove job entries, as well as keep notes on each application.",
        text2: "The goal of this project is to provide an easy way to organize and manage job applications efficiently. Track your application statuses, schedule interviews, and store resumes and cover letters all in one place."
      },
      features: {
        title: "Features",
        tracking: "Track application statuses",
        search: "Search and filter jobs",
        stats: "Statistics and analytics",
        schedule: "Interview scheduling",
        documents: "Document storage (resumes, cover letters)"
      },
      technologies: {
        title: "Technologies"
      },
      contact: {
        title: "Contact",
        text: "Have questions or suggestions? Get in touch:"
      }
    },
    
    // Additional keys
    delete: "Delete",
    noDate: "No date specified",
    invalidDate: "Invalid date",
    noStatus: "No status",
    noPosition: "No position specified",
    noCompany: "No company specified",
    notes: "Notes",
    jobLink: "Job Link",
    interviewDate: "Interview Date",
    viewJob: "View Job",
    resume: "Resume",
    coverLetter: "Cover Letter",
    scheduleInterview: "Schedule Interview",
    selectDateTime: "Select date and time",
    save: "Save",
    cancel: "Cancel",
    company: "Company",
    position: "Position",
    status: "Status",
    link: "Link",
    attachResume: "Attach Resume",
    attachCoverLetter: "Attach Cover Letter",
    submit: "Submit",
    add: "Add", // Добавлено
    settings: "Settings",
    darkMode: "Dark Mode",
    language: "Language",
    openAddForm: "Open Add Form",
    closeError: "Close",
    tryAgain: "Try Again",
    
    // Error messages
    errorLoading: "Failed to load jobs. Check the server.",
    errorAdding: "Failed to add job.",
    errorUpdating: "Failed to update job.",
    errorDeleting: "Failed to delete job.",
    errorUpdatingStatus: "Failed to update job status. Please try again.",
    errorUpdatingNotes: "Failed to update notes. Please try again.",
    errorSchedulingInterview: "Failed to schedule interview. Please try again.",
    errorFormat: "Data format error. Please check your input.",
    error400: "Bad request. Please check your data and try again.",
    error404: "Resource not found. The job may have been deleted.",
    error500: "Internal server error. Please try again later.",
    
    // New keys for job parsing
    jobParsed: "Job saved",
    parsedOn: "Saved",
    parseNow: "Save page",
    parsingInProgress: "Saving...",
    viewSavedVersion: "View saved version",
    jobSuccessfullyParsed: "Job page saved successfully",
    errorParsingJob: "Error saving job page",
    description: "Description",
    screenshot: "Screenshot",
    htmlSource: "HTML source",
    openOriginalPage: "Open original page",
    loadingJobData: "Loading job data...",
    errorLoadingData: "Error loading data",
    errorLoadingParsedData: "Error loading saved data",
    noDataAvailable: "No data available"
  },
  
  de: {
    title: "Job-Tracker",
    home: "Startseite",
    about: "Über uns", // Строковый ключ для навигации
    addJob: "Job hinzufügen",
    allStatuses: "Alle Status",
    sent: "Gesendet",
    interview: "Vorstellungsgespräch",
    rejected: "Abgelehnt",
    accepted: "Angenommen",
    searchPlaceholder: "Suche...",
    noJobsWithFilters: "Keine Jobs mit diesen Filtern",
    noJobs: "Keine Jobs gefunden",
    stats: "Statistiken",
    total: "Insgesamt",
    confirmRemove: "Möchten Sie diesen Job wirklich löschen?",
    loading: "Laden...",
    retry: "Wiederholen",
    viewDetails: "Details anzeigen",
    confirmDelete: "Löschen bestätigen",
    documents: "Dokumente",
    noLink: "Kein Job-Link",
    backToList: "Zurück zur Liste",
    
    // Google Calendar
    addToGoogleCalendar: "Zu Google Kalender hinzufügen",
    calendarAddSuccess: "Ereignis erfolgreich zum Google Kalender hinzugefügt",
    calendarAddError: "Fehler beim Hinzufügen zum Kalender",
    
    // Neue Schlüssel für Sortierung und Filterung
    sortBy: "Sortieren nach",
    source: "Quelle",
    myJobs: "Meine Jobs",
    newest: "Neueste zuerst",
    oldest: "Älteste zuerst",
    companyName: "Firmenname",
    positionName: "Positionsname",
    allSources: "Alle Quellen",
    foundJobs: "Gefundene Jobs: {count}",
    otherSources: "Andere Quellen",
    resetAllFilters: "Alle Filter zurücksetzen",
    search: "Suche",
    
    // Verschachtelte Struktur für Status-Übersetzungen
    jobStatus: {
      sent: "Gesendet",
      interview: "Vorstellungsgespräch",
      rejected: "Abgelehnt",
      accepted: "Angenommen"
    },
    
    // Добавляем отдельные ключи для статусов
    statusSent: "Gesendet",
    statusInterview: "Vorstellungsgespräch",
    statusRejected: "Abgelehnt",
    statusAccepted: "Angenommen",
    
    // Validierungsschlüssel für Formulare
    validation: {
      companyRequired: "Bitte Firmenname eingeben",
      positionRequired: "Bitte Position eingeben",
      validLinkRequired: "Bitte geben Sie einen gültigen Job-Link ein (beginnend mit http:// oder https://)",
      resumeRequired: "Bitte Lebenslauf anhängen",
      coverLetterRequired: "Bitte Anschreiben anhängen"
    },
    
    // Formularfeld-Platzhalter
    companyPlaceholder: "Firmenname",
    positionPlaceholder: "Positionstitel",
    jobLinkPlaceholder: "Job-URL (beginnend mit http:// oder https://)", // Переименовано из linkPlaceholder
    coverLetterPlaceholder: "Keine Datei ausgewählt", // Добавлено
    resumePlaceholder: "Keine Datei ausgewählt", // Добавлено
    notesPlaceholder: "Notizen hier hinzufügen...", // Переименовано из addNotes
    
    // Schlüssel für die About-Seite
    aboutPage: {
      title: "Über das Projekt",
      description: {
        title: "Was ist Job Tracker?",
        text1: "Job Tracker ist eine einfache Anwendung, die Benutzern hilft, ihre Bewerbungen zu verfolgen. Sie können Bewerbungseinträge hinzufügen, bearbeiten und entfernen sowie Notizen zu jeder Bewerbung führen.",
        text2: "Das Ziel dieses Projekts ist es, eine einfache Möglichkeit zu bieten, Bewerbungen effizient zu organisieren und zu verwalten. Verfolgen Sie Ihre Bewerbungsstatus, planen Sie Vorstellungsgespräche und speichern Sie Lebensläufe und Anschreiben an einem Ort."
      },
      features: {
        title: "Funktionen",
        tracking: "Verfolgung von Bewerbungsstatus",
        search: "Suche und Filterung von Jobs",
        stats: "Statistiken und Analysen",
        schedule: "Terminplanung für Vorstellungsgespräche",
        documents: "Dokumentenspeicherung (Lebensläufe, Anschreiben)"
      },
      technologies: {
        title: "Technologien"
      },
      contact: {
        title: "Kontakt",
        text: "Haben Sie Fragen oder Anregungen? Kontaktieren Sie uns:"
      }
    },
    
    // Zusätzliche Schlüssel
    delete: "Löschen",
    noDate: "Kein Datum angegeben",
    invalidDate: "Ungültiges Datum",
    noStatus: "Kein Status",
    noPosition: "Keine Position angegeben",
    noCompany: "Kein Unternehmen angegeben",
    notes: "Notizen",
    jobLink: "Job-Link",
    interviewDate: "Vorstellungsgespräch Datum",
    viewJob: "Job ansehen",
    resume: "Lebenslauf",
    coverLetter: "Anschreiben",
    scheduleInterview: "Vorstellungsgespräch planen",
    selectDateTime: "Datum und Uhrzeit auswählen",
    save: "Speichern",
    cancel: "Abbrechen",
    company: "Unternehmen",
    position: "Position",
    status: "Status",
    link: "Link",
    attachResume: "Lebenslauf anhängen",
    attachCoverLetter: "Anschreiben anhängen",
    submit: "Absenden",
    add: "Hinzufügen", // Добавлено
    settings: "Einstellungen",
    darkMode: "Dunkler Modus",
    language: "Sprache",
    openAddForm: "Hinzufügeformular öffnen",
    closeError: "Schließen",
    tryAgain: "Erneut versuchen",
    
    // Fehlermeldungen
    errorLoading: "Fehler beim Laden der Jobs. Überprüfen Sie den Server.",
    errorAdding: "Fehler beim Hinzufügen des Jobs.",
    errorUpdating: "Fehler beim Aktualisieren des Jobs.",
    errorDeleting: "Fehler beim Löschen des Jobs.",
    errorUpdatingStatus: "Fehler beim Aktualisieren des Job-Status. Bitte versuchen Sie es erneut.",
    errorUpdatingNotes: "Fehler beim Aktualisieren der Notizen. Bitte versuchen Sie es erneut.",
    errorSchedulingInterview: "Fehler beim Planen des Vorstellungsgesprächs. Bitte versuchen Sie es erneut.",
    errorFormat: "Datenformatfehler. Bitte überprüfen Sie Ihre Eingabe.",
    error400: "Fehlerhafte Anfrage. Bitte überprüfen Sie Ihre Daten und versuchen Sie es erneut.",
    error404: "Ressource nicht gefunden. Der Job wurde möglicherweise gelöscht.",
    error500: "Interner Serverfehler. Bitte versuchen Sie es später erneut.",
    
    // Neue Schlüssel für Job-Parsierung
    jobParsed: "Job gespeichert",
    parsedOn: "Gespeichert",
    parseNow: "Seite speichern",
    parsingInProgress: "Wird gespeichert...",
    viewSavedVersion: "Gespeicherte Version anzeigen",
    jobSuccessfullyParsed: "Jobseite erfolgreich gespeichert",
    errorParsingJob: "Fehler beim Speichern der Jobseite",
    description: "Beschreibung",
    screenshot: "Screenshot",
    htmlSource: "HTML-Code",
    openOriginalPage: "Originalseite öffnen",
    loadingJobData: "Lade Jobdaten...",
    errorLoadingData: "Fehler beim Laden der Daten",
    errorLoadingParsedData: "Fehler beim Laden der gespeicherten Daten",
    noDataAvailable: "Keine Daten gefunden"
  },
};

const i18n = createI18n({
  legacy: false, // Используем новый режим Composition API
  locale: 'ru',
  fallbackLocale: 'en',
  messages,
});

export default i18n;