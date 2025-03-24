import { createRouter, createWebHistory } from "vue-router";
import Home from "@/pages/Home.vue";
import AddJobPage from "@/pages/AddJobPage.vue";
import About from "@/pages/About.vue";

const routes = [
  { path: "/", component: Home },
  { path: "/add", component: AddJobPage },
  { path: "/about", component: About },
  
  // Новый маршрут для просмотра сохраненной версии вакансии
  { 
    path: "/jobs/:id/parsed", 
    name: "parsedJob",
    // Используем динамический импорт для lazy-loading
    component: () => import("@/pages/ParsedJobView.vue")
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;