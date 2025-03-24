import { defineStore } from "pinia";
import { ref, watch } from "vue";

export const useThemeStore = defineStore("theme", () => {
  const getStoredDarkMode = () => {
    try {
      const stored = localStorage.getItem("darkMode");
      return stored === "true";
    } catch (e) {
      console.warn("localStorage недоступен, используется светлая тема по умолчанию:", e);
      return false;
    }
  };

  const darkMode = ref(getStoredDarkMode());
  console.log("🖌️ Начальное значение darkMode:", darkMode.value);

  const toggleTheme = () => {
    darkMode.value = !darkMode.value;
    try {
      localStorage.setItem("darkMode", darkMode.value.toString());
      console.log("💾 darkMode сохранено в localStorage:", darkMode.value);
    } catch (e) {
      console.warn("Не удалось сохранить darkMode в localStorage:", e);
    }
  };

  const applyTheme = () => {
    if (typeof window !== "undefined" && document.body) {
      document.body.classList.toggle("dark", darkMode.value);
      console.log("🎨 Тема применена:", darkMode.value ? "Темная" : "Светлая");
    } else {
      console.warn("document.body недоступен, применение темы отложено");
    }
  };

  watch(darkMode, () => {
    applyTheme();
  }, { immediate: true });

  return {
    darkMode,
    toggleTheme,
    applyTheme,
  };
});