const express = require('express');
const fs = require('fs/promises');
const fsSync = require('fs');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const mime = require('mime-types'); // Для определения MIME-типов

// Импортируем модуль парсера вакансий
const jobParser = require('./jobparser');

const app = express();
const PORT = process.env.PORT || 5000;

// Создаем директорию data для хранения всех данных приложения
const DATA_DIR = path.join(__dirname, 'data');
if (!fsSync.existsSync(DATA_DIR)) {
    fsSync.mkdirSync(DATA_DIR, { recursive: true, mode: 0o777 });
    console.log(`📁 Создана директория для данных: ${DATA_DIR}`);
}

// Директория для вакансий внутри data
const JOBS_DIR = path.join(DATA_DIR, 'jobs');
if (!fsSync.existsSync(JOBS_DIR)) {
    fsSync.mkdirSync(JOBS_DIR, { recursive: true, mode: 0o777 });
    console.log(`📁 Создана директория для вакансий: ${JOBS_DIR}`);
}

// Обращаемся к CACHE_DIR из модуля парсера
const JOB_CACHE_DIR = jobParser.CACHE_DIR;
console.log(`📁 Директория кэша вакансий: ${JOB_CACHE_DIR}`);

// Настройка хранилища для загрузки файлов
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        try {
            // Безопасное получение имени компании
            const companyName = req.body.company || 'unnamed';
            const companyDir = path.join(JOBS_DIR, sanitizeFileName(companyName));
            
            console.log(`📁 Сохранение файла в компанию: ${companyName}`);
            console.log(`📁 Путь к директории компании: ${companyDir}`);
            
            if (!fsSync.existsSync(companyDir)) {
                await fs.mkdir(companyDir, { recursive: true, mode: 0o777 });
                console.log(`✅ Создана директория для компании: ${companyDir}`);
            }
            cb(null, companyDir);
        } catch (error) {
            console.error(`❌ Ошибка при создании директории компании:`, error);
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const jobId = req.body.jobId || uuidv4();
        
        // Получаем расширение файла и проверяем его допустимость
        const originalExt = path.extname(file.originalname).toLowerCase();
        const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt'];
        const safeExt = allowedExtensions.includes(originalExt) ? originalExt : '.txt';
        
        let fileName;
        if (file.fieldname === 'coverLetter') {
            fileName = `${jobId}_coverLetter${safeExt}`;
        } else if (file.fieldname === 'resume') {
            fileName = `${jobId}_resume${safeExt}`;
        } else {
            fileName = `${jobId}_${file.fieldname}${safeExt}`;
        }
        
        console.log(`📄 Сохранение файла с именем: ${fileName}`);
        cb(null, fileName);
    }
});

// Настройка загрузки файлов с ограничениями и валидацией типов
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        // Проверяем допустимые типы файлов
        const allowedMimeTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            // Добавляем любые другие типы, которые могут быть загружены пользователями
            'application/octet-stream' // для общих двоичных файлов
        ];
        
        // Для тестирования принимаем все типы файлов
        cb(null, true);
        
        /* Раскомментируйте для строгой проверки типов
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            console.log(`❌ Отклонен файл типа: ${file.mimetype}`);
            cb(new Error(`Недопустимый формат файла ${file.mimetype}. Разрешены только PDF, DOC, DOCX и TXT.`));
        }
        */
    }
});

// Очистка имени файла для безопасного использования в путях
function sanitizeFileName(fileName) {
    if (!fileName) return 'unnamed';
    return fileName.replace(/[^a-zA-Z0-9_-]/g, '_');
}

// Настройка Express
app.use(cors({
    origin: '*', // Для разработки разрешаем все источники
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Промежуточное ПО для логирования запросов
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});

// Обслуживание статических файлов из директории data
app.use('/data', (req, res, next) => {
    console.log(`📂 Запрос статического файла из data: ${req.path}`);
    next();
}, express.static(DATA_DIR, {
    setHeaders: (res, filePath) => {
        // Устанавливаем правильные заголовки на основе расширения файла
        const mimeType = mime.lookup(filePath) || 'application/octet-stream';
        res.setHeader('Content-Type', mimeType);
        console.log(`📄 Отправка файла ${filePath} с типом ${mimeType}`);
        
        // Предотвращаем кэширование
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
}));

// Получение всех вакансий
app.get('/api/jobs', async (req, res) => {
    try {
        const jobs = await getAllJobs();
        
        // Добавляем информацию о парсинге для каждой вакансии
        for (const job of jobs) {
            job.isParsed = jobParser.isJobParsed(job.id);
            
            // Если вакансия распарсена, добавляем ссылки на парсинг
            if (job.isParsed) {
                job.parsedLinks = {
                    data: `/api/jobs/${job.id}/parsed`,
                    screenshot: `/api/jobs/${job.id}/screenshot`,
                    html: `/api/jobs/${job.id}/html`,
                    text: `/api/jobs/${job.id}/text`
                };
            }
            
            // Обновляем ссылки на файлы для использования нового API
            if (job.coverLetterPath) {
                job.coverLetterUrl = `/api/files/${sanitizeFileName(job.company)}/${job.coverLetterPath}`;
            }
            if (job.resumePath) {
                job.resumeUrl = `/api/files/${sanitizeFileName(job.company)}/${job.resumePath}`;
            }
        }
        
        console.log(`📦 Возвращаем ${jobs.length} вакансий`);
        res.json(jobs);
    } catch (error) {
        console.error('❌ Ошибка при получении вакансий:', error);
        res.status(500).json({ error: 'Не удалось получить вакансии', details: error.message });
    }
});

// Создаем эндпоинт для получения доступа к файлам
app.get('/api/files/:companyName/:fileName', async (req, res) => {
    try {
        const { companyName, fileName } = req.params;
        const filePath = path.join(JOBS_DIR, sanitizeFileName(companyName), fileName);
        
        console.log(`📄 Запрос файла: ${filePath}`);
        
        // Проверяем существование файла
        try {
            await fs.access(filePath);
        } catch (error) {
            console.error(`❌ Файл не найден: ${filePath}`);
            return res.status(404).json({ error: 'Файл не найден' });
        }

        // Определяем MIME-тип файла
        const extension = path.extname(filePath).toLowerCase();
        let mimeType;
        
        switch (extension) {
            case '.pdf':
                mimeType = 'application/pdf';
                break;
            case '.doc':
                mimeType = 'application/msword';
                break;
            case '.docx':
                mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                break;
            case '.txt':
                mimeType = 'text/plain';
                break;
            default:
                mimeType = 'application/octet-stream';
        }
        
        // Устанавливаем правильные заголовки
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
        
        // Предотвращаем кэширование
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        // Отправляем файл
        console.log(`📄 Отправка файла ${filePath} с типом ${mimeType}`);
        res.sendFile(filePath);
    } catch (error) {
        console.error('❌ Ошибка при получении файла:', error);
        res.status(500).json({ error: 'Не удалось получить файл', details: error.message });
    }
});

// Получение одной вакансии по ID
app.get('/api/jobs/:id', async (req, res) => {
    try {
        const jobId = req.params.id;
        const job = await findJobById(jobId);
        
        if (!job) {
            return res.status(404).json({ error: 'Вакансия не найдена' });
        }
        
        // Добавляем информацию о парсинге
        job.isParsed = jobParser.isJobParsed(job.id);
        if (job.isParsed) {
            job.parsedLinks = {
                data: `/api/jobs/${job.id}/parsed`,
                screenshot: `/api/jobs/${job.id}/screenshot`,
                html: `/api/jobs/${job.id}/html`,
                text: `/api/jobs/${job.id}/text`
            };
        }
        
        // Обновляем URL для файлов
        if (job.coverLetterPath) {
            job.coverLetterUrl = `/api/files/${sanitizeFileName(job.company)}/${job.coverLetterPath}`;
        }
        if (job.resumePath) {
            job.resumeUrl = `/api/files/${sanitizeFileName(job.company)}/${job.resumePath}`;
        }
        
        res.json(job);
    } catch (error) {
        console.error(`❌ Ошибка при получении вакансии ${req.params.id}:`, error);
        res.status(500).json({ error: 'Не удалось получить вакансию', details: error.message });
    }
});

// Добавление новой вакансии
app.post('/api/jobs', upload.fields([
    { name: 'coverLetter', maxCount: 1 }, 
    { name: 'resume', maxCount: 1 }
]), async (req, res) => {
    try {
        // Валидация входных данных
        if (!req.body.company || !req.body.position) {
            return res.status(400).json({ error: 'Компания и должность обязательны' });
        }

        console.log(`📝 Создание новой вакансии: ${req.body.position} в ${req.body.company}`);

        const job = {
            id: uuidv4(),
            company: req.body.company,
            position: req.body.position,
            link: req.body.link || "",
            status: req.body.status || "sent",
            createdAt: new Date().toISOString(),
            notes: req.body.notes || "",
            interviewDate: req.body.interviewDate || null
        };

        const companyDir = path.join(JOBS_DIR, sanitizeFileName(job.company));
        if (!fsSync.existsSync(companyDir)) {
            await fs.mkdir(companyDir, { recursive: true, mode: 0o777 });
            console.log(`✅ Создана директория для компании: ${companyDir}`);
        }

        // Обработка загруженных файлов
        console.log(`📁 Файлы в запросе:`, req.files);
        
        // ---- ВАЖНОЕ ИЗМЕНЕНИЕ ЗДЕСЬ ----
        // Вместо ручной склейки расширения берём имя, которое присвоил multer
        const coverLetterPath = req.files && req.files.coverLetter && req.files.coverLetter.length > 0
            ? req.files.coverLetter[0].filename
            : null;
        
        const resumePath = req.files && req.files.resume && req.files.resume.length > 0
            ? req.files.resume[0].filename
            : null;
        // --------------------------------

        // Добавляем пути к файлам в объект вакансии
        job.coverLetterPath = coverLetterPath;
        job.resumePath = resumePath;

        console.log(`📄 Путь к сопроводительному письму: ${coverLetterPath || 'не загружено'}`);
        console.log(`📄 Путь к резюме: ${resumePath || 'не загружено'}`);

        // Добавляем URL для доступа к файлам
        if (coverLetterPath) {
            job.coverLetterUrl = `/api/files/${sanitizeFileName(job.company)}/${coverLetterPath}`;
        }
        if (resumePath) {
            job.resumeUrl = `/api/files/${sanitizeFileName(job.company)}/${resumePath}`;
        }

        // Сохраняем вакансию в файл
        const jobFile = path.join(companyDir, `${job.id}.json`);
        await fs.writeFile(jobFile, JSON.stringify(job, null, 2));
        console.log(`✅ Вакансия сохранена в файл: ${jobFile}`);
        
        // Если есть ссылка, запускаем парсинг вакансии асинхронно
        if (job.link) {
            console.log(`🔄 Запуск автоматического парсинга для вакансии ${job.id} с URL ${job.link}`);
            
            // Запускаем парсинг асинхронно, не блокируя ответ
            jobParser.parseJob(job.link, job.id, job)
                .then(parsedData => {
                    console.log(`✅ Вакансия ${job.id} успешно распарсена автоматически`);
                    
                    // Обновляем файл вакансии с флагом, что она распарсена
                    fs.readFile(jobFile, 'utf8')
                        .then(data => {
                            try {
                                const updatedJob = JSON.parse(data);
                                updatedJob.parsed = true;
                                updatedJob.parsedAt = parsedData.parsedAt;
                                
                                fs.writeFile(jobFile, JSON.stringify(updatedJob, null, 2))
                                    .then(() => console.log(`✅ Файл вакансии ${job.id} обновлен данными парсинга`))
                                    .catch(err => console.error(`❌ Ошибка при обновлении файла вакансии:`, err));
                            } catch (parseErr) {
                                console.error(`❌ Ошибка при парсинге JSON вакансии:`, parseErr);
                            }
                        })
                        .catch(err => console.error(`❌ Ошибка при чтении файла вакансии:`, err));
                })
                .catch(error => {
                    console.error(`❌ Ошибка при автоматическом парсинге вакансии ${job.id}:`, error);
                });
        }

        res.status(201).json(job);
    } catch (error) {
        console.error('❌ Ошибка при добавлении вакансии:', error);
        res.status(500).json({ error: 'Не удалось добавить вакансию', details: error.message });
    }
});

// Обновление вакансии
app.put('/api/jobs/:id', express.json(), async (req, res) => {
    try {
        const jobId = req.params.id;
        const updatedData = req.body;
        
        console.log(`📝 Обновление вакансии: ${jobId}`);
        console.log(`📝 Данные для обновления:`, updatedData);
        
        // Поиск вакансии
        const job = await findJobById(jobId);
        if (!job) {
            return res.status(404).json({ error: 'Вакансия не найдена' });
        }
        
        // Обновление данных вакансии
        const updatedJob = { ...job };
        
        // Обновляем только разрешенные поля
        const allowedFields = ['status', 'notes', 'interviewDate'];
        for (const field of allowedFields) {
            if (field in updatedData) {
                updatedJob[field] = updatedData[field];
            }
        }
        
        // Добавляем дату обновления
        updatedJob.updatedAt = new Date().toISOString();
        
        // Сохраняем обновленный файл
        const companyDir = path.join(JOBS_DIR, sanitizeFileName(updatedJob.company));
        const jobFile = path.join(companyDir, `${jobId}.json`);
        
        await fs.writeFile(jobFile, JSON.stringify(updatedJob, null, 2));
        console.log(`✅ Вакансия обновлена и сохранена в файл: ${jobFile}`);
        
        res.json(updatedJob);
    } catch (error) {
        console.error(`❌ Ошибка при обновлении вакансии ${req.params.id}:`, error);
        res.status(500).json({ error: 'Не удалось обновить вакансию', details: error.message });
    }
});

// Удаление вакансии
app.delete('/api/jobs/:id', async (req, res) => {
    try {
        const jobId = req.params.id;
        console.log(`🗑️ Удаление вакансии: ${jobId}`);
        
        // Поиск вакансии
        const job = await findJobById(jobId);
        if (!job) {
            return res.status(404).json({ error: 'Вакансия не найдена' });
        }
        
        // Путь к файлу вакансии
        const companyDir = path.join(JOBS_DIR, sanitizeFileName(job.company));
        const jobFile = path.join(companyDir, `${jobId}.json`);
        
        // Удаляем файл вакансии
        await fs.unlink(jobFile);
        console.log(`✅ Файл вакансии удален: ${jobFile}`);
        
        // Удаляем прикрепленные файлы, если они есть
        if (job.coverLetterPath) {
            const coverLetterFile = path.join(companyDir, job.coverLetterPath);
            if (fsSync.existsSync(coverLetterFile)) {
                await fs.unlink(coverLetterFile);
                console.log(`✅ Файл сопроводительного письма удален: ${coverLetterFile}`);
            }
        }
        
        if (job.resumePath) {
            const resumeFile = path.join(companyDir, job.resumePath);
            if (fsSync.existsSync(resumeFile)) {
                await fs.unlink(resumeFile);
                console.log(`✅ Файл резюме удален: ${resumeFile}`);
            }
        }
        
        // Удаляем папку с кэшем парсинга, если она есть
        const jobCacheDir = path.join(JOB_CACHE_DIR, jobId);
        if (fsSync.existsSync(jobCacheDir)) {
            try {
                // Рекурсивное удаление директории
                const deleteDir = async (dirPath) => {
                    const entries = await fs.readdir(dirPath, { withFileTypes: true });
                    
                    for (const entry of entries) {
                        const fullPath = path.join(dirPath, entry.name);
                        
                        if (entry.isDirectory()) {
                            await deleteDir(fullPath);
                        } else {
                            await fs.unlink(fullPath);
                        }
                    }
                    
                    await fs.rmdir(dirPath);
                };
                
                await deleteDir(jobCacheDir);
                console.log(`✅ Директория кэша вакансии удалена: ${jobCacheDir}`);
            } catch (dirError) {
                console.error(`❌ Ошибка при удалении директории кэша: ${dirError.message}`);
            }
        }
        
        res.json({ success: true, message: 'Вакансия успешно удалена' });
    } catch (error) {
        console.error(`❌ Ошибка при удалении вакансии ${req.params.id}:`, error);
        res.status(500).json({ error: 'Не удалось удалить вакансию', details: error.message });
    }
});

// Маршрут для ручного парсинга вакансии
app.post('/api/jobs/:id/parse', async (req, res) => {
    try {
        const jobId = req.params.id;
        console.log(`🔄 Запуск ручного парсинга вакансии: ${jobId}`);
        
        // Поиск вакансии
        const job = await findJobById(jobId);
        if (!job) {
            return res.status(404).json({ error: 'Вакансия не найдена' });
        }
        
        // Проверяем, что у вакансии есть URL
        if (!job.link) {
            return res.status(400).json({ error: 'У вакансии нет ссылки для парсинга' });
        }
        
        // Запускаем парсинг
        console.log(`🔄 Начинаем парсинг вакансии ${jobId} с URL ${job.link}`);
        const parsedData = await jobParser.parseJob(job.link, jobId, job);
        
        // Обновляем вакансию, добавляя флаг, что она распарсена
        const companyDir = path.join(JOBS_DIR, sanitizeFileName(job.company));
        const jobFile = path.join(companyDir, `${jobId}.json`);
        
        // Обновляем JSON файл с информацией о вакансии
        const updatedJob = { ...job, parsed: true, parsedAt: parsedData.parsedAt };
        await fs.writeFile(jobFile, JSON.stringify(updatedJob, null, 2));
        console.log(`✅ Вакансия обновлена с данными парсинга и сохранена в файл: ${jobFile}`);
        
        res.json({
            success: true,
            parsedData,
            message: 'Вакансия успешно распарсена'
        });
    } catch (error) {
        console.error(`❌ Ошибка при парсинге вакансии ${req.params.id}:`, error);
        res.status(500).json({ 
            error: 'Не удалось распарсить вакансию', 
            details: error.message 
        });
    }
});

// Маршрут для получения распарсенных данных о вакансии
app.get('/api/jobs/:id/parsed', (req, res) => {
    try {
        const jobId = req.params.id;
        console.log(`📄 Запрос распарсенных данных вакансии: ${jobId}`);
        
        // Проверяем, распарсена ли вакансия
        if (!jobParser.isJobParsed(jobId)) {
            return res.status(404).json({ error: 'Вакансия не была распарсена' });
        }
        
        // Получаем данные о вакансии
        const parsedData = jobParser.getJobData(jobId);
        
        if (!parsedData) {
            return res.status(404).json({ error: 'Данные о распарсенной вакансии не найдены' });
        }
        
        res.json({
            success: true,
            parsedData
        });
    } catch (error) {
        console.error(`❌ Ошибка при получении данных о вакансии ${req.params.id}:`, error);
        res.status(500).json({ 
            error: 'Не удалось получить данные о вакансии', 
            details: error.message 
        });
    }
});

// Маршрут для получения скриншота вакансии
app.get('/api/jobs/:id/screenshot', (req, res) => {
    try {
        const jobId = req.params.id;
        console.log(`📷 Запрос скриншота вакансии: ${jobId}`);
        
        // Получаем путь к скриншоту
        const screenshotPath = jobParser.getJobScreenshotPath(jobId);
        
        if (!screenshotPath) {
            return res.status(404).json({ error: 'Скриншот вакансии не найден' });
        }
        
        // Проверяем существование файла
        if (!fsSync.existsSync(screenshotPath)) {
            return res.status(404).json({ error: 'Файл скриншота не найден' });
        }
        
        // Устанавливаем заголовки для изображения
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Disposition', `inline; filename="screenshot_${jobId}.png"`);
        
        // Предотвращаем кэширование
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        // Отправляем файл
        console.log(`📷 Отправка скриншота: ${screenshotPath}`);
        res.sendFile(screenshotPath);
    } catch (error) {
        console.error(`❌ Ошибка при получении скриншота вакансии ${req.params.id}:`, error);
        res.status(500).json({ 
            error: 'Не удалось получить скриншот вакансии', 
            details: error.message 
        });
    }
});

// Маршрут для получения HTML вакансии
app.get('/api/jobs/:id/html', (req, res) => {
    try {
        const jobId = req.params.id;
        console.log(`📄 Запрос HTML вакансии: ${jobId}`);
        
        // Получаем HTML
        const html = jobParser.getJobHtml(jobId);
        
        if (!html) {
            return res.status(404).json({ error: 'HTML вакансии не найден' });
        }
        
        // Устанавливаем Content-Type для HTML
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', `inline; filename="job_${jobId}.html"`);
        
        // Предотвращаем кэширование
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        // Отправляем HTML
        res.send(html);
    } catch (error) {
        console.error(`❌ Ошибка при получении HTML вакансии ${req.params.id}:`, error);
        res.status(500).json({ 
            error: 'Не удалось получить HTML вакансии', 
            details: error.message 
        });
    }
});

// Маршрут для получения текстового содержимого вакансии
app.get('/api/jobs/:id/text', (req, res) => {
    try {
        const jobId = req.params.id;
        console.log(`📄 Запрос текстового содержимого вакансии: ${jobId}`);
        
        // Получаем текст
        const text = jobParser.getJobText(jobId);
        
        if (!text) {
            return res.status(404).json({ error: 'Текстовое содержимое вакансии не найдено' });
        }
        
        // Устанавливаем Content-Type для текста
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `inline; filename="job_content_${jobId}.txt"`);
        
        // Предотвращаем кэширование
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        // Отправляем текст
        res.send(text);
    } catch (error) {
        console.error(`❌ Ошибка при получении текста вакансии ${req.params.id}:`, error);
        res.status(500).json({ 
            error: 'Не удалось получить текст вакансии', 
            details: error.message 
        });
    }
});

// Маршрут для парсинга всех вакансий
app.post('/api/parse-all-jobs', async (req, res) => {
    try {
        console.log(`🔄 Запуск парсинга всех вакансий...`);
        
        // Запускаем парсинг всех вакансий асинхронно
        parseAllJobs().then(() => {
            console.log("🎉 Парсинг всех вакансий завершен");
        });
        
        res.json({ success: true, message: "Парсинг всех вакансий запущен" });
    } catch (error) {
        console.error("❌ Ошибка при запуске парсинга всех вакансий:", error);
        res.status(500).json({ error: "Не удалось запустить парсинг всех вакансий" });
    }
});

// Вспомогательная функция для получения всех вакансий
async function getAllJobs() {
    const jobs = [];
    
    try {
        // Проверяем существование директории
        try {
            await fs.access(JOBS_DIR);
        } catch (error) {
            console.log('📁 Директория jobs не существует, создаем...');
            await fs.mkdir(JOBS_DIR, { recursive: true, mode: 0o777 });
            return jobs;
        }
        
        const companies = await fs.readdir(JOBS_DIR, { withFileTypes: true });
        const companyDirs = companies.filter(dirent => dirent.isDirectory());
        
        // Если папок компаний нет, возвращаем пустой массив
        if (companyDirs.length === 0) {
            console.log('📁 Нет компаний, возвращаем пустой массив');
            return jobs;
        }
        
        // Получаем вакансии по всем компаниям параллельно
        const jobPromises = companyDirs.map(async (companyDir) => {
            const companyPath = path.join(JOBS_DIR, companyDir.name);
            try {
                const files = await fs.readdir(companyPath);
                const jsonFiles = files.filter(file => file.endsWith('.json'));
                
                // Читаем каждый JSON-файл вакансии
                const companyJobPromises = jsonFiles.map(async (file) => {
                    try {
                        const filePath = path.join(companyPath, file);
                        const data = await fs.readFile(filePath, 'utf8');
                        const job = JSON.parse(data);
                        
                        // Исправляем URL для файлов на новый формат API
                        if (job.coverLetterPath) {
                            job.coverLetterUrl = `/api/files/${companyDir.name}/${job.coverLetterPath}`;
                        }
                        if (job.resumePath) {
                            job.resumeUrl = `/api/files/${companyDir.name}/${job.resumePath}`;
                        }
                        
                        return job;
                    } catch (error) {
                        console.error(`❌ Ошибка при чтении файла ${file}:`, error);
                        return null;
                    }
                });
                
                // Возвращаем массив вакансий этой компании
                return (await Promise.all(companyJobPromises)).filter(job => job !== null);
            } catch (error) {
                console.error(`❌ Ошибка при чтении папки компании ${companyDir.name}:`, error);
                return [];
            }
        });
        
        // Собираем все вакансии из всех компаний
        const allCompanyJobs = await Promise.all(jobPromises);
        return allCompanyJobs.flat();
    } catch (error) {
        console.error('❌ Ошибка при получении вакансий:', error);
        throw error;
    }
}

// Вспомогательная функция для поиска вакансии по ID
async function findJobById(jobId) {
    try {
        const allJobs = await getAllJobs();
        return allJobs.find(job => job.id === jobId) || null;
    } catch (error) {
        console.error(`❌ Ошибка при поиске вакансии ${jobId}:`, error);
        throw error;
    }
}

// Вспомогательная функция для парсинга всех вакансий с ссылками
async function parseAllJobs() {
    const jobs = await getAllJobs();
    
    let parsedCount = 0;
    let errorCount = 0;
    
    console.log(`📊 Начинаем парсинг ${jobs.length} вакансий...`);
    
    for (const job of jobs) {
        if (job.link && !jobParser.isJobParsed(job.id)) {
            try {
                console.log(`🔄 Парсинг вакансии ${job.id}: ${job.position} в ${job.company}`);
                await jobParser.parseJob(job.link, job.id, job);
                console.log(`✅ Вакансия ${job.id} успешно распарсена`);
                
                // Обновляем файл вакансии с флагом, что она распарсена
                const companyDir = path.join(JOBS_DIR, sanitizeFileName(job.company));
                const jobFile = path.join(companyDir, `${job.id}.json`);
                
                // Читаем текущие данные
                const data = await fs.readFile(jobFile, 'utf8');
                const updatedJob = JSON.parse(data);
                updatedJob.parsed = true;
                updatedJob.parsedAt = new Date().toISOString();
                
                // Обновляем файл
                await fs.writeFile(jobFile, JSON.stringify(updatedJob, null, 2));
                
                parsedCount++;
            } catch (error) {
                console.error(`❌ Ошибка при парсинге вакансии ${job.id}:`, error);
                errorCount++;
            }
        } else if (!job.link) {
            console.log(`⚠️ Пропускаем вакансию ${job.id}: отсутствует ссылка`);
        } else if (jobParser.isJobParsed(job.id)) {
            console.log(`⚠️ Пропускаем вакансию ${job.id}: уже распарсена`);
        }
    }
    
    console.log(`📊 Итоги парсинга: успешно - ${parsedCount}, с ошибками - ${errorCount}, всего - ${jobs.length}`);
    return { parsedCount, errorCount, totalJobs: jobs.length };
}

// Обработка ошибок multer
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        console.error('❌ Ошибка Multer:', err);
        return res.status(400).json({ 
            error: 'Ошибка при загрузке файла', 
            details: err.message 
        });
    } else if (err) {
        console.error('❌ Ошибка сервера:', err);
        return res.status(500).json({ 
            error: 'Ошибка сервера', 
            details: err.message 
        });
    }
    next();
});

// Добавляем маршрут для проверки состояния сервера
app.get('/api/status', (req, res) => {
    res.json({
        status: 'ok',
        version: '1.0.0',
        jobsDir: JOBS_DIR,
        jobCacheDir: JOB_CACHE_DIR,
        dataDir: DATA_DIR,
        timestamp: new Date().toISOString()
    });
});

// ==== Дополнение для обслуживания Vue фронтенда ====
// Предполагается, что сборка фронтенда (папка dist) находится в корне папки с сервером
const FRONTEND_DIST_DIR = path.join(__dirname, 'dist');
app.use(express.static(FRONTEND_DIST_DIR));
app.get('*', (req, res) => {
    res.sendFile(path.join(FRONTEND_DIST_DIR, 'index.html'));
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`✅ Сервер запущен на http://localhost:${PORT}`);
    console.log(`📁 Директория для данных: ${DATA_DIR}`);
    console.log(`📁 Директория для вакансий: ${JOBS_DIR}`);
    console.log(`📁 Директория для кэша вакансий: ${JOB_CACHE_DIR}`);
});
