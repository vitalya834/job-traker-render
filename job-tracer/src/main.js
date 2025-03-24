import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import i18n from './i18n.js';

const app = createApp(App);

app.use(createPinia()); // Регистрируем Pinia
app.use(router);        // Подключаем маршрутизатор
app.use(i18n);          // Подключаем vue-i18n

app.mount('#app');
