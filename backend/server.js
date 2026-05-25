const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

// ====== ПРОВЕРКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ ======
console.log('\n🔍 ====== ПРОВЕРКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ ======');
console.log('- YANDEX_CLIENT_ID:', process.env.YANDEX_CLIENT_ID ? '✓ Установлен' : '✗ Отсутствует');
console.log('- YANDEX_CLIENT_SECRET:', process.env.YANDEX_CLIENT_SECRET ? '✓ Установлен' : '✗ Отсутствует');
console.log('- YANDEX_REDIRECT_URI:', process.env.YANDEX_REDIRECT_URI || '✗ Отсутствует');
console.log('- PORT:', process.env.PORT || 3000);


const requiredVars = ['YANDEX_CLIENT_ID', 'YANDEX_CLIENT_SECRET', 'YANDEX_REDIRECT_URI'];
const missingVars = requiredVars.filter((v) => !process.env[v]);

if (missingVars.length > 0) {
    console.error('\n❌ ВНИМАНИЕ: Отсутствуют необходимые переменные окружения:');
    missingVars.forEach((v) => console.error(`   - ${v}`));
} else {
    console.log('✅ Все необходимые переменные окружения установлены');
}
console.log('========================================\n');

// ====== ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ======
const app = express();
const PORT = process.env.PORT || 3000;

// ====== MIDDLEWARE ======
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use((req, res, next) => {
    console.log(`📨 ${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
    next();
});


// ====== СТАТИЧЕСКИЕ ФАЙЛЫ ======
// Раздаём фронт из родительской папки (проект лежит на уровень выше backend/)
app.use(express.static(path.join(__dirname, '..')));

// ====== ПОДКЛЮЧЕНИЕ БД (инициализирует таблицы при старте) ======
const { DB_PATH } = require('./config/database');

// ====== РОУТЕРЫ ======
const authRoutes        = require('./routes/auth.routes');
const userRoutes        = require('./routes/user.routes');
const trainerRoutes     = require('./routes/trainer.routes');
const examRoutes        = require('./routes/exam.routes');
const simulationRoutes  = require('./routes/simulation.routes');
const favouritesRoutes  = require('./routes/favourites.routes');
const statsRoutes       = require('./routes/stats.routes');

// OAuth — без префикса /api, так как фронт обращается к /auth/yandex и /callback напрямую
app.use('/auth', authRoutes);

// Callback от Яндекс (отдельный маршрут, не через роутер /auth, потому что URL /callback)
const { yandexCallback } = require('./controllers/auth.controller');
app.get('/callback', yandexCallback);

// API маршруты
app.use('/api', userRoutes);
app.use('/api/trainer-progress', trainerRoutes);
app.use('/api/exam-attempts', examRoutes);
app.use('/api/simulation-progress', simulationRoutes);
app.use('/api/favourites', favouritesRoutes);
app.use('/api/stats', statsRoutes);

// ====== DEBUG МАРШРУТЫ ======
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'API работает с SQLite!',
        time: new Date().toISOString(),
        yandexConfigured: !!process.env.YANDEX_CLIENT_ID,

        database: 'SQLite',
    });
});

app.get('/api/debug/env', (req, res) => {
    const secret = process.env.YANDEX_CLIENT_SECRET;
    const maskedSecret = secret
        ? secret.substring(0, 4) + '...' + secret.substring(secret.length - 4)
        : 'не установлен';

    res.json({
        YANDEX_CLIENT_ID: process.env.YANDEX_CLIENT_ID || 'не установлен',
        YANDEX_CLIENT_SECRET: maskedSecret,
        YANDEX_REDIRECT_URI: process.env.YANDEX_REDIRECT_URI || 'не установлен',
        PORT: process.env.PORT || 3000,
        NODE_ENV: process.env.NODE_ENV || 'development',
    });
});

app.get('/api/debug/oauth', (req, res) => {
    const authUrl =
        `https://oauth.yandex.ru/authorize?response_type=code` +
        `&client_id=${process.env.YANDEX_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(process.env.YANDEX_REDIRECT_URI)}` +
        `&force_confirm=true`;

    res.json({
        success: true,
        client_id: process.env.YANDEX_CLIENT_ID,
        redirect_uri: process.env.YANDEX_REDIRECT_URI,
        auth_url: authUrl,
        message: 'Скопируйте auth_url и откройте в браузере для тестирования Яндекс OAuth',
    });
});

// ====== СТАТИЧЕСКИЕ HTML СТРАНИЦЫ ======
app.get('*.html', (req, res) => {
    const filePath = path.join(__dirname, '..', req.path);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('Страница не найдена');
    }
});


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// 404 для неизвестных API маршрутов
app.use('/api/*', (req, res) => {
    res.status(404).json({ success: false, error: 'API маршрут не найден' });
});

// Для всего остального — index.html (SPA fallback)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});


// ====== ЗАПУСК ======
app.listen(PORT, () => {
    const sqlite3 = require('sqlite3');
    console.log(`\n🚀 ======================================`);
    console.log(`✅ Сервер запущен: http://localhost:${PORT}`);
    console.log(`📁 База данных: ${DB_PATH}`);
    console.log(`💾 SQLite версия: ${sqlite3.VERSION}`);
    console.log(`🔑 Яндекс OAuth: ${process.env.YANDEX_CLIENT_ID ? 'Настроен' : 'Не настроен'}`);
    console.log(`\n📄 Главная страница: http://localhost:${PORT}/`);
    console.log(`🔑 Страница входа: http://localhost:${PORT}/login.html`);
    console.log(`🧪 API тест: http://localhost:${PORT}/api/test`);
    console.log(`🔐 Яндекс вход: http://localhost:${PORT}/auth/yandex`);
    console.log(`======================================\n`);
});

// ====== GRACEFUL SHUTDOWN ======
process.on('SIGINT', () => {
    const { db } = require('./config/database');
    db.close((err) => {
        if (err) {
            console.error('❌ Ошибка закрытия базы данных:', err.message);
        } else {
            console.log('👋 Соединение с SQLite закрыто');
        }
        process.exit(0);
    });
});

