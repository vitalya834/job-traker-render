/**
 * Модуль для парсинга страниц вакансий
 * Позволяет сохранять содержимое вакансий для последующего просмотра
 * Версия 2.0 - улучшенная поддержка LinkedIn, Indeed, Glassdoor
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const puppeteer = require('puppeteer');

// Директория для хранения данных парсинга
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o777 });
  console.log(`📁 Создана директория для данных: ${DATA_DIR}`);
}

const CACHE_DIR = path.join(DATA_DIR, 'job_cache');

// Создаем директорию, если она не существует
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true, mode: 0o777 });
  console.log(`📁 Создана директория для кэша вакансий: ${CACHE_DIR}`);
}

// User-Agent строки для разных браузеров
const USER_AGENTS = {
  chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
  firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0',
  safari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15'
};

// Возвращает случайный User-Agent для маскировки запросов
function getRandomUserAgent() {
  const agents = Object.values(USER_AGENTS);
  return agents[Math.floor(Math.random() * agents.length)];
}

/**
 * Парсит веб-страницу с вакансией и сохраняет её содержимое
 * @param {string} url - URL страницы вакансии
 * @param {string} jobId - Идентификатор вакансии
 * @param {Object} jobData - Данные о вакансии из JobTracker
 * @returns {Object} Результат парсинга
 */
async function parseJob(url, jobId, jobData = {}) {
  if (!url || !url.startsWith('http')) {
    throw new Error('Неверный URL вакансии');
  }

  console.log(`🔍 Начинаем парсинг вакансии: ${url} с ID: ${jobId}`);
  console.log(`📂 Путь к директории кэша: ${CACHE_DIR}`);

  try {
    // Создаём директорию для этой вакансии с полными правами доступа
    const jobDir = path.join(CACHE_DIR, jobId);
    if (!fs.existsSync(jobDir)) {
      fs.mkdirSync(jobDir, { recursive: true, mode: 0o777 });
      console.log(`📁 Создана директория для вакансии: ${jobDir}`);
    }

    // Сначала просто сохраним базовую информацию о вакансии в файл для отладки
    const debugInfo = {
      jobId,
      url,
      parsedAt: new Date().toISOString(),
      jobData
    };
    
    fs.writeFileSync(
      path.join(jobDir, 'debug_info.json'),
      JSON.stringify(debugInfo, null, 2)
    );
    console.log(`✅ Сохранена отладочная информация`);

    // Определяем, какую стратегию парсинга использовать
    const domain = extractDomain(url);
    const strategy = selectParsingStrategy(url, domain);
    console.log(`🔧 Выбрана стратегия парсинга: ${strategy.name}`);

    // Выполняем парсинг с выбранной стратегией
    return await strategy.parse(url, jobId, jobData, jobDir);
  } catch (error) {
    console.error(`❌ Ошибка при парсинге вакансии ${jobId}:`);
    console.error(error);
    throw error;
  }
}

/**
 * Извлекает домен из URL
 * @param {string} url - URL для обработки
 * @returns {string} - Извлеченный домен
 */
function extractDomain(url) {
  try {
    const urlObject = new URL(url);
    return urlObject.hostname.toLowerCase();
  } catch (error) {
    console.error(`❌ Ошибка при извлечении домена: ${error.message}`);
    return '';
  }
}

/**
 * Выбирает подходящую стратегию парсинга в зависимости от URL и домена
 * @param {string} url - URL вакансии
 * @param {string} domain - Домен сайта
 * @returns {Object} - Стратегия парсинга
 */
function selectParsingStrategy(url, domain) {
  // LinkedIn требует особого подхода
  if (domain.includes('linkedin.com')) {
    if (url.includes('/jobs/view/')) {
      return {
        name: 'LinkedIn API',
        sourceType: 'linkedin',
        parse: parseLinkedInJob
      };
    } else {
      return {
        name: 'LinkedIn Fallback',
        sourceType: 'linkedin-fallback',
        parse: parseWithBrowser
      };
    }
  }
  
  // Indeed имеет свои особенности
  if (domain.includes('indeed.com')) {
    return {
      name: 'Indeed Browser',
      sourceType: 'indeed',
      parse: parseWithBrowser
    };
  }
  
  // Glassdoor требует обхода защиты
  if (domain.includes('glassdoor.com')) {
    return {
      name: 'Glassdoor Stealth',
      sourceType: 'glassdoor',
      parse: parseWithBrowser
    };
  }
  
  // Стандартная стратегия для всех остальных сайтов
  return {
    name: 'Standard Browser',
    sourceType: 'generic',
    parse: parseWithBrowser
  };
}
/**
 * Специализированный парсер для LinkedIn
 * @param {string} url - URL страницы вакансии LinkedIn
 * @param {string} jobId - Идентификатор вакансии
 * @param {Object} jobData - Данные о вакансии
 * @param {string} jobDir - Путь к директории для сохранения данных
 * @returns {Object} Результат парсинга
 */
async function parseLinkedInJob(url, jobId, jobData, jobDir) {
  console.log(`🔷 Используем специализированный парсер для LinkedIn`);
  
  try {
    // Извлекаем ID вакансии LinkedIn из URL
    const matches = url.match(/\/jobs\/view\/([0-9]+)/);
    if (!matches || !matches[1]) {
      console.log(`⚠️ Не удалось извлечь ID вакансии LinkedIn, переключаемся на стандартный парсинг`);
      return await parseWithBrowser(url, jobId, jobData, jobDir);
    }
    
    const linkedInJobId = matches[1];
    console.log(`🔑 Извлечен ID вакансии LinkedIn: ${linkedInJobId}`);
    
    // Пробуем получить данные через LinkedIn API для неавторизованных пользователей
    try {
      const apiUrl = `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${linkedInJobId}`;
      console.log(`🌐 Запрос к LinkedIn API: ${apiUrl}`);
      
      const response = await axios.get(apiUrl, {
        headers: {
          'User-Agent': USER_AGENTS.chrome,
          'Accept': 'text/html,application/xhtml+xml,application/xml'
        },
        timeout: 10000
      });
      
      // Сохраняем полученный HTML
      const html = response.data;
      const htmlPath = path.join(jobDir, 'page.html');
      fs.writeFileSync(htmlPath, html);
      
      // Парсим данные с помощью cheerio
      const $ = cheerio.load(html);
      
      // Извлекаем основную информацию
      const title = $('.top-card-layout__title').text().trim() || jobData.position || 'Unknown Position';
      const company = $('.topcard__org-name-link').text().trim() || jobData.company || 'Unknown Company';
      const location = $('.topcard__flavor--bullet').text().trim() || 'Unknown Location';
      const description = $('.description__text').text().trim() || 'No description available';
      
      // Извлекаем дополнительную информацию
      let seniority = '';
      $('.description__job-criteria-item').each((i, el) => {
        const label = $(el).find('.description__job-criteria-subheader').text().trim();
        const value = $(el).find('.description__job-criteria-text').text().trim();
        
        if (label.includes('Seniority')) {
          seniority = value;
        }
      });
      
      // Сохраняем текстовую версию
      const textPath = path.join(jobDir, 'content.txt');
      fs.writeFileSync(textPath, description);
      
      // Создаем скриншот страницы через Puppeteer
      let screenshotPath = null;
      try {
        const browser = await puppeteer.launch({
          headless: "new",
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        screenshotPath = path.join(jobDir, 'screenshot.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        await browser.close();
      } catch (screenshotError) {
        console.error(`⚠️ Не удалось создать скриншот: ${screenshotError.message}`);
      }
      
      // Формируем результат
      return {
        jobId,
        url,
        title,
        company,
        location,
        seniority,
        description,
        parsedAt: new Date().toISOString(),
        sourceType: 'linkedin',
        files: {
          html: htmlPath,
          text: textPath,
          screenshot: screenshotPath
        }
      };
    } catch (apiError) {
      console.log(`⚠️ Ошибка при использовании LinkedIn API: ${apiError.message}`);
      console.log(`🔄 Переключаемся на парсинг с помощью браузера`);
      return await parseWithBrowser(url, jobId, jobData, jobDir);
    }
  } catch (error) {
    console.error(`❌ Ошибка при парсинге LinkedIn: ${error.message}`);
    
    // Создаем заглушку с базовой информацией
    const textPath = path.join(jobDir, 'content.txt');
    fs.writeFileSync(textPath, 
      `Не удалось получить данные о вакансии LinkedIn.
      Для просмотра полного описания откройте ссылку в браузере: ${url}`
    );
    
    return {
      jobId,
      url,
      title: jobData.position || 'Unknown Position',
      company: jobData.company || 'Unknown Company',
      description: 'Не удалось получить данные о вакансии LinkedIn. Для просмотра полного описания требуется авторизация.',
      parsedAt: new Date().toISOString(),
      sourceType: 'linkedin-fallback',
      note: 'Ограниченный доступ к данным LinkedIn. Попробуйте открыть ссылку напрямую в браузере.',
      files: {
        text: textPath
      }
    };
  }
}

/**
 * Стандартный парсер с использованием Puppeteer
 * @param {string} url - URL страницы вакансии
 * @param {string} jobId - Идентификатор вакансии
 * @param {Object} jobData - Данные о вакансии
 * @param {string} jobDir - Путь к директории для сохранения данных
 * @returns {Object} Результат парсинга
 */
async function parseWithBrowser(url, jobId, jobData, jobDir) {
  // Для корректного парсинга JavaScript-сайтов используем puppeteer
  console.log(`🤖 Запускаем Puppeteer...`);
  const browser = await puppeteer.launch({
    headless: "new", // Используем новый режим headless для Puppeteer
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080'
    ],
    defaultViewport: {
      width: 1920,
      height: 1080
    }
  });

  try {
    console.log(`✅ Puppeteer запущен`);
    const page = await browser.newPage();
    
    // Устанавливаем User-Agent как у реального браузера
    await page.setUserAgent(getRandomUserAgent());
    
    // Настраиваем отклонение ненужных ресурсов для ускорения
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      if (['image', 'font', 'media'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });
    
    // Логируем все консольные ошибки для отладки
    page.on('console', msg => console.log(`🌐 Консоль браузера: ${msg.text()}`));
    page.on('pageerror', error => console.log(`🔴 Ошибка в браузере: ${error.message}`));
    
    // Устанавливаем таймаут и ждем загрузки сетевых ресурсов
    console.log(`🌐 Загрузка страницы: ${url}`);
    try {
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      console.log(`✅ Страница загружена`);
    } catch (navError) {
      console.error(`⚠️ Ошибка при навигации на страницу: ${navError.message}`);
      // Если не удалось загрузить с ожиданием сети, пробуем хотя бы дождаться загрузки DOM
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      console.log(`⚠️ Страница загружена частично (только DOM)`);
    }

    // Скролим страницу, чтобы загрузить все динамическое содержимое
    console.log(`📜 Прокручиваем страницу...`);
    await autoScroll(page);
    console.log(`✅ Прокрутка завершена`);

    // Делаем скриншот страницы
    const screenshotPath = path.join(jobDir, 'screenshot.png');
    try {
      console.log(`📸 Делаем скриншот страницы...`);
      await page.screenshot({
        path: screenshotPath,
        fullPage: true
      });
      console.log(`✅ Скриншот сохранен по пути: ${screenshotPath}`);
      
      // Проверяем, что файл действительно создан
      if (fs.existsSync(screenshotPath)) {
        const stats = fs.statSync(screenshotPath);
        console.log(`📊 Размер скриншота: ${stats.size} байт`);
      } else {
        console.error(`❌ Файл скриншота не создан!`);
      }
    } catch (screenshotError) {
      console.error(`❌ Ошибка при создании скриншота: ${screenshotError.message}`);
    }

    // Получаем HTML страницы
    console.log(`📄 Получаем HTML страницы...`);
    const html = await page.content();
    const htmlPath = path.join(jobDir, 'page.html');
    fs.writeFileSync(htmlPath, html);
    console.log(`✅ HTML страницы сохранен по пути: ${htmlPath}`);
    
    // Проверяем, что файл HTML действительно создан
    if (fs.existsSync(htmlPath)) {
      const stats = fs.statSync(htmlPath);
      console.log(`📊 Размер HTML: ${stats.size} байт`);
    } else {
      console.error(`❌ Файл HTML не создан!`);
    }

    // Закрываем браузер
    await browser.close();
    console.log(`🔒 Браузер закрыт`);

    // Парсим содержимое с помощью cheerio
    const $ = cheerio.load(html);
    
    // Извлекаем основную информацию
    const title = extractTitle($, page.url()) || jobData.position || '';
    const h1 = $('h1').first().text().trim();
    console.log(`📝 Заголовок страницы: ${title}`);
    console.log(`📝 Заголовок H1: ${h1}`);
    
    // Получаем текст страницы
    let text = '';
    $('body').find('p, h1, h2, h3, h4, h5, h6, li').each((i, el) => {
      const content = $(el).text().trim();
      if (content) {
        text += content + '\n\n';
      }
    });

    // Пытаемся найти зарплату
    const salaryPattern = /(?:\$|£|€|\¥|RUB|USD|EUR|руб|от|до|\d+\s*\-\s*\d+|\d+\s*к|\d+[,.\s]\d+)[^.]*?(?:\d[\d\s,.]*\d|\d+)(?:\s*[\-–]\s*(?:\d[\d\s,.]*\d|\d+))?/gi;
    const salaryMatches = html.match(salaryPattern);
    const salary = salaryMatches ? salaryMatches[0] : null;
    console.log(`💰 Найденная зарплата: ${salary || 'не найдена'}`);

    // Пытаемся найти местоположение
    let location = '';
    $('[class*="location"], [data-test="location"], [class*="LocationMetaTag"]').each((i, el) => {
      const text = $(el).text().trim();
      if (text && text.length < 100) {
        location = text;
        return false; // прекращаем поиск
      }
    });
    console.log(`📍 Найденное местоположение: ${location || 'не найдено'}`);

    // Пытаемся найти компанию
    let company = '';
    $('meta[property="og:site_name"]').each((i, el) => {
      company = $(el).attr('content');
    });

    if (!company) {
      $('[class*="company"], [class*="employer"], [id*="company"], [id*="employer"]').each((i, el) => {
        const text = $(el).text().trim();
        if (text && text.length < 100) {  // Предотвращаем захват больших блоков
          company = text;
          return false; // прекращаем поиск
        }
      });
    }
    console.log(`🏢 Найденная компания: ${company || 'не найдена'}`);

    // Определяем, является ли содержимое описанием вакансии
    let description = '';
    $('[class*="description"], [class*="job-details"], [id*="job-description"], [class*="content"]').each((i, el) => {
      const content = $(el).text().trim();
      if (content && content.length > description.length) {
        description = content;
      }
    });

    // Если описание не найдено, берем весь текст
    if (!description) {
      description = text;
    }
    console.log(`📝 Длина описания: ${description.length} символов`);

    // Сохраняем текстовую версию
    const textPath = path.join(jobDir, 'content.txt');
    fs.writeFileSync(textPath, description);
    console.log(`✅ Текстовое содержимое сохранено по пути: ${textPath}`);
    // Проверяем, что файл текста действительно создан
    if (fs.existsSync(textPath)) {
      const stats = fs.statSync(textPath);
      console.log(`📊 Размер текстового файла: ${stats.size} байт`);
    } else {
      console.error(`❌ Файл текста не создан!`);
    }

    // Дополняем информацию из существующих данных о вакансии
    if (!title && jobData.position) {
      title = jobData.position;
    }
    
    if (!company && jobData.company) {
      company = jobData.company;
    }

    // Определяем тип источника на основе URL
    const domain = extractDomain(url);
    let sourceType = 'generic';
    
    if (domain.includes('linkedin.com')) sourceType = 'linkedin';
    else if (domain.includes('indeed.com')) sourceType = 'indeed';
    else if (domain.includes('glassdoor.com')) sourceType = 'glassdoor';

    // Формируем результат
    const result = {
      jobId,
      url,
      title: title || h1,
      h1,
      company,
      salary,
      location,
      description,
      sourceType,
      parsedAt: new Date().toISOString(),
      files: {
        html: htmlPath,
        screenshot: screenshotPath,
        text: textPath
      }
    };

    // Сохраняем результат в JSON
    const dataPath = path.join(jobDir, 'data.json');
    fs.writeFileSync(
      dataPath,
      JSON.stringify(result, null, 2)
    );
    console.log(`✅ Данные о вакансии сохранены по пути: ${dataPath}`);

    // Проверяем, что файл с данными действительно создан
    if (fs.existsSync(dataPath)) {
      const stats = fs.statSync(dataPath);
      console.log(`📊 Размер файла данных: ${stats.size} байт`);
    } else {
      console.error(`❌ Файл данных не создан!`);
    }

    console.log(`🎉 Вакансия успешно распарсена и сохранена с ID: ${jobId}`);
    return result;
  } catch (error) {
    // Убедимся, что браузер закрыт при ошибке
    if (browser) {
      await browser.close().catch(e => console.error(`Ошибка при закрытии браузера: ${e.message}`));
    }
    throw error;
  }
}

/**
 * Извлекает заголовок страницы с учетом специфики сайта
 * @param {Object} $ - Объект cheerio
 * @param {string} url - URL страницы
 * @returns {string} - Извлеченный заголовок
 */
function extractTitle($, url) {
  // Попробуем разные селекторы в зависимости от сайта
  if (url.includes('linkedin.com')) {
    // LinkedIn селекторы
    const linkedinSelectors = [
      '.top-card-layout__title', 
      '.jobs-unified-top-card__job-title',
      '.jobs-details-top-card__job-title'
    ];
    
    for (const selector of linkedinSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        return element.text().trim();
      }
    }
  } else if (url.includes('indeed.com')) {
    // Indeed селекторы
    const indeedSelectors = [
      '.jobsearch-JobInfoHeader-title',
      '[data-testid="jobsearch-JobInfoHeader-title"]',
      '#jobsearch-ViewjobPaneWrapper h1'
    ];
    
    for (const selector of indeedSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        return element.text().trim();
      }
    }
  } else if (url.includes('glassdoor.com')) {
    // Glassdoor селекторы
    const glassdoorSelectors = [
      '.job-title',
      '.e1tk4kwz5',
      '[data-test="job-title"]'
    ];
    
    for (const selector of glassdoorSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        return element.text().trim();
      }
    }
  }
  
  // Общие селекторы, если специфические не сработали
  const generalSelectors = [
    'h1.job-title',
    'h1.position-title',
    '.job-title h1',
    '.position-title h1',
    'h1[class*="title"]',
    'h1'
  ];
  
  for (const selector of generalSelectors) {
    const element = $(selector);
    if (element.length > 0) {
      return element.text().trim();
    }
  }
  
  // Если ничего не найдено, возвращаем заголовок страницы
  return $('title').text().trim();
}

/**
 * Прокручивает страницу вниз для загрузки динамического контента
 * @param {Page} page - объект страницы puppeteer
 */
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}
/**
 * Получает HTML страницы вакансии
 * @param {string} jobId - Идентификатор вакансии
 * @returns {string|null} HTML страницы или null, если файл не найден
 */
function getJobHtml(jobId) {
  try {
    const jobDir = path.join(CACHE_DIR, jobId);
    const htmlPath = path.join(jobDir, 'page.html');
    
    if (fs.existsSync(htmlPath)) {
      return fs.readFileSync(htmlPath, 'utf8');
    }
    
    return null;
  } catch (error) {
    console.error(`❌ Ошибка при получении HTML вакансии ${jobId}: ${error.message}`);
    return null;
  }
}

/**
 * Получает путь к скриншоту страницы вакансии
 * @param {string} jobId - Идентификатор вакансии
 * @returns {string|null} Путь к файлу скриншота или null, если файл не найден
 */
function getJobScreenshotPath(jobId) {
  try {
    const jobDir = path.join(CACHE_DIR, jobId);
    const screenshotPath = path.join(jobDir, 'screenshot.png');
    
    if (fs.existsSync(screenshotPath)) {
      return screenshotPath;
    }
    
    return null;
  } catch (error) {
    console.error(`❌ Ошибка при получении скриншота вакансии ${jobId}: ${error.message}`);
    return null;
  }
}

/**
 * Получает текстовое содержимое вакансии
 * @param {string} jobId - Идентификатор вакансии
 * @returns {string|null} Текст страницы или null, если файл не найден
 */
function getJobText(jobId) {
  try {
    const jobDir = path.join(CACHE_DIR, jobId);
    const textPath = path.join(jobDir, 'content.txt');
    
    if (fs.existsSync(textPath)) {
      return fs.readFileSync(textPath, 'utf8');
    }
    
    return null;
  } catch (error) {
    console.error(`❌ Ошибка при получении текста вакансии ${jobId}: ${error.message}`);
    return null;
  }
}

/**
 * Проверяет, была ли вакансия распарсена
 * @param {string} jobId - Идентификатор вакансии
 * @returns {boolean} true, если вакансия распарсена
 */
function isJobParsed(jobId) {
  try {
    const jobDir = path.join(CACHE_DIR, jobId);
    const dataPath = path.join(jobDir, 'data.json');
    return fs.existsSync(dataPath);
  } catch (error) {
    console.error(`❌ Ошибка при проверке наличия парсинга вакансии ${jobId}: ${error.message}`);
    return false;
  }
}
function getJobData(jobId) {
  try {
    const jobDir = path.join(CACHE_DIR, jobId);
    const dataPath = path.join(jobDir, 'data.json');
    
    if (fs.existsSync(dataPath)) {
      const data = fs.readFileSync(dataPath, 'utf8');
      return JSON.parse(data);
    }
    
    return null;
  } catch (error) {
    console.error(`❌ Ошибка при получении данных о вакансии ${jobId}: ${error.message}`);
    return null;
  }
}

// Экспортируем функции модуля
module.exports = {
  parseJob,
  getJobData,
  getJobHtml,
  getJobScreenshotPath,
  getJobText,
  isJobParsed,
  CACHE_DIR
};