<script setup>
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <div class="about-page">
    <h1 class="page-title">{{ t('aboutPage.title') }}</h1>
    
    <div class="divider"></div>
    
    <section class="description-section">
      <h2>{{ t('aboutPage.description.title') }}</h2>
      <p>{{ t('aboutPage.description.text1') }}</p>
      <p>{{ t('aboutPage.description.text2') }}</p>
    </section>
    
    <div class="divider"></div>
    
    <section class="features-section">
      <h2>{{ t('aboutPage.features.title') }}</h2>
      <div class="features-grid">
        <div class="feature-item">
          <span class="feature-icon">📊</span>
          <p>{{ t('aboutPage.features.tracking') }}</p>
        </div>
        <div class="feature-item">
          <span class="feature-icon">🔍</span>
          <p>{{ t('aboutPage.features.search') }}</p>
        </div>
        <div class="feature-item">
          <span class="feature-icon">📈</span>
          <p>{{ t('aboutPage.features.stats') }}</p>
        </div>
        <div class="feature-item">
          <span class="feature-icon">📅</span>
          <p>{{ t('aboutPage.features.schedule') }}</p>
        </div>
        <div class="feature-item">
          <span class="feature-icon">📁</span>
          <p>{{ t('aboutPage.features.documents') }}</p>
        </div>
      </div>
    </section>
    
    <div class="divider"></div>
    
    <section class="technologies-section">
      <h2>{{ t('aboutPage.technologies.title') }}</h2>
      <div class="tech-logos">
        <div class="tech-logo">
          <span class="tech-icon">⚡</span>
          <p>Vue.js</p>
        </div>
        <div class="tech-logo">
          <span class="tech-icon">🌐</span>
          <p>Express</p>
        </div>
        <div class="tech-logo">
          <span class="tech-icon">📱</span>
          <p>Node.js</p>
        </div>
        <div class="tech-logo">
          <span class="tech-icon">💾</span>
          <p>Pinia</p>
        </div>
        <div class="tech-logo">
          <span class="tech-icon">🌍</span>
          <p>i18n</p>
        </div>
      </div>
    </section>
    
    <div class="divider"></div>
    
    <section class="contact-section">
      <h2>{{ t('aboutPage.contact.title') }}</h2>
      <p>{{ t('aboutPage.contact.text') }}</p>
      <div class="contact-email">
        <a href="mailto:support@jobtracker.example.com">support@jobtracker.example.com</a>
      </div>
    </section>
    
    <div class="version">v1.0.0</div>
  </div>
</template>

<style scoped>
.about-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.page-title {
  font-size: 2.5rem;
  margin-bottom: 20px;
  text-align: center;
}

.divider {
  height: 1px;
  background-color: #e0e0e0;
  margin: 30px 0;
}

section {
  margin-bottom: 40px;
}

h2 {
  color: #007bff;
  margin-bottom: 20px;
  font-size: 1.8rem;
}

p {
  line-height: 1.6;
  margin-bottom: 16px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 30px;
}

.feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  transition: transform 0.3s, box-shadow 0.3s;
}

.feature-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.feature-icon {
  font-size: 2.5rem;
  margin-bottom: 15px;
}

.tech-logos {
  display: flex;
  justify-content: space-around;
  flex-wrap: wrap;
  margin-top: 30px;
}

.tech-logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 0 20px 20px;
  width: 100px;
}

.tech-icon {
  font-size: 3rem;
  margin-bottom: 10px;
}

.contact-section {
  text-align: center;
}

.contact-email {
  margin-top: 20px;
}

.contact-email a {
  color: #007bff;
  text-decoration: none;
  font-weight: bold;
  font-size: 1.2rem;
}

.contact-email a:hover {
  text-decoration: underline;
}

.version {
  text-align: right;
  color: #888;
  font-size: 0.8rem;
  margin-top: 50px;
}

/* Адаптивность для мобильных устройств */
@media (max-width: 768px) {
  .features-grid {
    grid-template-columns: 1fr;
  }
  
  .tech-logos {
    justify-content: center;
  }
  
  .tech-logo {
    margin: 0 10px 20px;
  }
}
</style>