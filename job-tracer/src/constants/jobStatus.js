// Константы для статусов вакансий
export const JOB_STATUS = {
    SENT: "Sent",
    INTERVIEW: "Interview",
    REJECTED: "Rejected", 
    ACCEPTED: "Accepted"
  };
  
  // Функция для нормализации статуса
  export function normalizeStatus(status) {
    if (!status) return "";
    
    // Преобразуем в нижний регистр для сравнения
    const lowerStatus = status.toLowerCase();
    
    if (lowerStatus === "sent") return JOB_STATUS.SENT;
    if (lowerStatus === "interview") return JOB_STATUS.INTERVIEW;
    if (lowerStatus === "rejected") return JOB_STATUS.REJECTED;
    if (lowerStatus === "accepted") return JOB_STATUS.ACCEPTED;
    
    // Если не найдено соответствие, возвращаем исходный статус
    return status;
  }
  
  // Функция для получения статуса для отображения (можно использовать с i18n)
  export function getStatusKey(status) {
    if (!status) return "";
    
    // Преобразуем в нижний регистр для сравнения
    const lowerStatus = status.toLowerCase();
    
    if (lowerStatus === "sent") return "sent";
    if (lowerStatus === "interview") return "interview";
    if (lowerStatus === "rejected") return "rejected";
    if (lowerStatus === "accepted") return "accepted";
    
    return status.toLowerCase();
  }