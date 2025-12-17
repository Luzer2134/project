const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Логирование
app.use((req, res, next) => {
    console.log(`📨 ${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
    next();
});

// Раздаем статические файлы
app.use(express.static(path.join(__dirname, '..')));

// Папка для данных
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
    console.log('📁 Создана папка для данных:', DATA_DIR);
}

// Файлы для хранения
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Инициализация файлов
const initFiles = () => {
    const files = [
        { path: USERS_FILE, default: [] }
    ];
    
    files.forEach(file => {
        if (!fs.existsSync(file.path)) {
            fs.writeFileSync(file.path, JSON.stringify(file.default, null, 2));
            console.log(`📄 Создан файл: ${path.basename(file.path)}`);
        }
    });
};
initFiles();

// === Яндекс OAuth МАРШРУТЫ ===

// Старт авторизации через Яндекс
app.get('/auth/yandex', (req, res) => {
    const YANDEX_CLIENT_ID = process.env.YANDEX_CLIENT_ID;
    const REDIRECT_URI = encodeURIComponent(process.env.YANDEX_REDIRECT_URI);
    
    if (!YANDEX_CLIENT_ID) {
        console.error('❌ YANDEX_CLIENT_ID не настроен в .env файле');
        return res.redirect('/login.html?error=oauth_not_configured');
    }
    
    const authUrl = `https://oauth.yandex.ru/authorize?` +
        `response_type=code&` +
        `client_id=${YANDEX_CLIENT_ID}&` +
        `redirect_uri=${REDIRECT_URI}&` +
        `force_confirm=true`;
    
    console.log('🔗 Перенаправление на Яндекс OAuth:', authUrl);
    res.redirect(authUrl);
});

// Callback от Яндекс OAuth
// Callback от Яндекс OAuth - ВАЖНО: Яндекс отправляет на /callback
// Callback от Яндекс OAuth - Яндекс отправляет на /callback
app.get('/callback', async (req, res) => {
    console.log('🔄 Яндекс OAuth callback получен НА /callback');
    console.log('Query параметры:', req.query);
    
    try {
        const { code, error, error_description } = req.query;
        
        if (error) {
            console.error('❌ Ошибка от Яндекс OAuth:', error, error_description);
            return res.redirect(`/login.html?error=${encodeURIComponent(error_description || error)}`);
        }
        
        if (!code) {
            console.error('❌ Код авторизации не получен');
            return res.redirect('/login.html?error=no_auth_code');
        }
        
        const YANDEX_CLIENT_ID = process.env.YANDEX_CLIENT_ID;
        const YANDEX_CLIENT_SECRET = process.env.YANDEX_CLIENT_SECRET;
        
        if (!YANDEX_CLIENT_ID || !YANDEX_CLIENT_SECRET) {
            console.error('❌ Яндекс OAuth не настроен в .env файле');
            return res.redirect('/login.html?error=oauth_not_configured');
        }
        
        console.log('🔐 Получение токена от Яндекс...');
        
        // Получаем access token
        const tokenResponse = await fetch('https://oauth.yandex.ru/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                client_id: YANDEX_CLIENT_ID,
                client_secret: YANDEX_CLIENT_SECRET,
                redirect_uri: process.env.YANDEX_REDIRECT_URI // ВАЖНО!
            })
        });
        
        const tokenData = await tokenResponse.json();
        console.log('Ответ от Яндекс token:', tokenData);
        
        if (!tokenData.access_token) {
            console.error('❌ Не удалось получить токен:', tokenData);
            throw new Error(tokenData.error_description || 'Не удалось получить токен от Яндекс');
        }
        
        console.log('✅ Токен получен, получение данных пользователя...');
        
        // Получаем данные пользователя
        const userResponse = await fetch('https://login.yandex.ru/info?format=json', {
            headers: {
                'Authorization': `OAuth ${tokenData.access_token}`
            }
        });
        
        if (!userResponse.ok) {
            throw new Error('Не удалось получить данные пользователя: ' + userResponse.status);
        }
        
        const userData = await userResponse.json();
        console.log('👤 Данные пользователя Яндекс:', {
            id: userData.id,
            email: userData.default_email,
            name: userData.real_name || userData.display_name,
            login: userData.login
        });
        
        // Загружаем или создаем пользователя в нашей системе
        let users = [];
        if (fs.existsSync(USERS_FILE)) {
            users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        }
        
        // Ищем пользователя по Яндекс ID или email
        let user = users.find(u => u.yandexId === userData.id) || 
                   users.find(u => u.email === userData.default_email);
        
        if (!user) {
            // Создаем нового пользователя
            user = {
                id: Date.now().toString(),
                email: userData.default_email,
                name: userData.real_name || userData.display_name || userData.login || 'Пользователь Яндекс',
                yandexId: userData.id,
                userType: 'yandex',
                isAuthorized: true,
                createdAt: new Date().toISOString(),
                avatar: userData.is_avatar_empty ? null : `https://avatars.yandex.net/get-yapic/${userData.default_avatar_id}/islands-200`,
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token
            };
            
            users.push(user);
            fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
            console.log(`✅ Создан новый пользователь: ${user.email}`);
        } else {
            // Обновляем существующего пользователя
            user.name = userData.real_name || userData.display_name || userData.login || user.name;
            user.isAuthorized = true;
            user.avatar = userData.is_avatar_empty ? null : `https://avatars.yandex.net/get-yapic/${userData.default_avatar_id}/islands-200`;
            user.accessToken = tokenData.access_token;
            user.refreshToken = tokenData.refresh_token;
            user.lastLogin = new Date().toISOString();
            
            fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
            console.log(`✅ Обновлен существующий пользователь: ${user.email}`);
        }
        
        // Подготовка данных для фронтенда
        const userForFrontend = {
            id: user.id,
            email: user.email,
            name: user.name,
            userType: user.userType,
            isAuthorized: user.isAuthorized,
            avatar: user.avatar,
            yandexId: user.yandexId
        };
        
        // Генерируем URL для редиректа с данными пользователя
        const userParam = encodeURIComponent(JSON.stringify(userForFrontend));
        console.log('🔄 Перенаправление на главную страницу с данными пользователя');
        res.redirect(`/index.html?user=${userParam}`);
        
    } catch (error) {
        console.error('❌ Критическая ошибка Яндекс OAuth:', error);
        console.error(error.stack);
        res.redirect(`/login.html?error=${encodeURIComponent('Ошибка авторизации через Яндекс: ' + error.message)}`);
    }
});

// Выход из Яндекс (отзыв токена)
app.get('/auth/yandex/logout', async (req, res) => {
    try {
        const userId = req.query.userId;
        
        if (!userId) {
            return res.json({ success: false, error: 'Не указан userId' });
        }
        
        // Загружаем пользователей
        let users = [];
        if (fs.existsSync(USERS_FILE)) {
            users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        }
        
        const user = users.find(u => u.id === userId);
        
        if (user && user.accessToken) {
            // Пытаемся отозвать токен у Яндекс
            try {
                await fetch('https://oauth.yandex.ru/revoke_token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams({
                        access_token: user.accessToken,
                        client_id: process.env.YANDEX_CLIENT_ID,
                        client_secret: process.env.YANDEX_CLIENT_SECRET
                    })
                });
                console.log(`✅ Токен Яндекс отозван для пользователя: ${user.email}`);
            } catch (revokeError) {
                console.warn('⚠️ Не удалось отозвать токен Яндекс:', revokeError);
            }
            
            // Удаляем токены у пользователя
            delete user.accessToken;
            delete user.refreshToken;
            user.isAuthorized = false;
            
            fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        }
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('❌ Ошибка выхода из Яндекс:', error);
        res.json({ success: false, error: error.message });
    }
});

// === API МАРШРУТЫ ===

// Тестовый маршрут
app.get('/api/test', (req, res) => {
    res.json({ 
        success: true,
        message: 'API работает!', 
        time: new Date().toISOString(),
        yandexConfigured: !!process.env.YANDEX_CLIENT_ID
    });
});

// Гостевой вход
app.post('/api/guest', (req, res) => {
    try {
        const guestUser = {
            id: 'guest_' + Date.now(),
            email: 'guest_' + Date.now() + '@temp.com',
            name: 'Гость',
            userType: 'guest',
            isAuthorized: false,
            createdAt: new Date().toISOString()
        };
        
        console.log(`👤 Гостевой вход: ${guestUser.id}`);
        
        res.json({
            success: true,
            user: guestUser
        });
        
    } catch (error) {
        console.error('❌ Ошибка гостевого входа:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка гостевого входа' 
        });
    }
});

// Получение пользователя по ID (для проверки сессии)
app.get('/api/user/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        
        let users = [];
        if (fs.existsSync(USERS_FILE)) {
            users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        }
        
        const user = users.find(u => u.id === userId);
        
        if (user) {
            res.json({
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    userType: user.userType,
                    isAuthorized: user.isAuthorized,
                    avatar: user.avatar,
                    yandexId: user.yandexId
                }
            });
        } else {
            res.status(404).json({ 
                success: false,
                error: 'Пользователь не найден' 
            });
        }
        
    } catch (error) {
        console.error('❌ Ошибка получения пользователя:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка получения пользователя' 
        });
    }
});

// === ПРОГРЕСС ТРЕНАЖЕРА ===

// Сохранение прогресса тренажера
app.post('/api/trainer-progress', (req, res) => {
    try {
        const { userId, block, userAnswers, currentQuestionIndex } = req.body;
        
        if (!userId || !block) {
            return res.status(400).json({ 
                success: false,
                error: 'Неверные данные' 
            });
        }
        
        // Создаем файл для конкретного пользователя
        const userProgressFile = path.join(DATA_DIR, `trainer_progress_${userId}.json`);
        
        let userProgress = {};
        if (fs.existsSync(userProgressFile)) {
            userProgress = JSON.parse(fs.readFileSync(userProgressFile, 'utf8'));
        }
        
        // Обновляем прогресс для блока
        userProgress[block] = {
            userAnswers: userAnswers || [],
            currentQuestionIndex: currentQuestionIndex || 0,
            updatedAt: new Date().toISOString()
        };
        
        fs.writeFileSync(userProgressFile, JSON.stringify(userProgress, null, 2));
        
        console.log(`💾 Сохранен прогресс тренажера: ${userId}, блок ${block}`);
        
        res.json({ 
            success: true 
        });
        
    } catch (error) {
        console.error('❌ Ошибка сохранения прогресса тренажера:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка сохранения прогресса тренажера' 
        });
    }
});

// Получение прогресса тренажера
app.get('/api/trainer-progress/:userId/:block', (req, res) => {
    try {
        const { userId, block } = req.params;
        const userProgressFile = path.join(DATA_DIR, `trainer_progress_${userId}.json`);
        
        console.log(`📥 Запрос прогресса тренажера: ${userId}, блок ${block}`);
        
        if (!fs.existsSync(userProgressFile)) {
            console.log('📭 Файл прогресса не найден');
            return res.json({
                success: true,
                progress: {
                    userAnswers: [],
                    currentQuestionIndex: 0
                }
            });
        }
        
        const userProgress = JSON.parse(fs.readFileSync(userProgressFile, 'utf8'));
        const blockProgress = userProgress[block] || {
            userAnswers: [],
            currentQuestionIndex: 0
        };
        
        console.log(`✅ Прогресс найден: блок ${block}`);
        
        res.json({
            success: true,
            progress: blockProgress
        });
        
    } catch (error) {
        console.error('❌ Ошибка получения прогресса тренажера:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка получения прогресса тренажера' 
        });
    }
});

// Получение всего прогресса пользователя
app.get('/api/trainer-progress/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const userProgressFile = path.join(DATA_DIR, `trainer_progress_${userId}.json`);
        
        console.log(`📥 Запрос всего прогресса: ${userId}`);
        
        if (!fs.existsSync(userProgressFile)) {
            console.log('📭 Файл прогресса не найден');
            return res.json({
                success: true,
                progress: {}
            });
        }
        
        const userProgress = JSON.parse(fs.readFileSync(userProgressFile, 'utf8'));
        
        console.log(`✅ Найден прогресс по ${Object.keys(userProgress).length} блокам`);
        
        res.json({
            success: true,
            progress: userProgress
        });
        
    } catch (error) {
        console.error('❌ Ошибка получения прогресса:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка получения прогресса' 
        });
    }
});

// === ПОПЫТКИ ЭКЗАМЕНА ===

// Сохранить попытку экзамена
app.post('/api/exam-attempts', (req, res) => {
    try {
        const { userId, attempt } = req.body;
        
        if (!userId || !attempt) {
            return res.status(400).json({ 
                success: false,
                error: 'Неверные данные' 
            });
        }
        
        const attemptsFile = path.join(DATA_DIR, `exam_attempts_${userId}.json`);
        
        let attempts = [];
        if (fs.existsSync(attemptsFile)) {
            attempts = JSON.parse(fs.readFileSync(attemptsFile, 'utf8'));
        }
        
        // Добавляем ID и дату
        const attemptWithId = {
            ...attempt,
            id: Date.now().toString(),
            userId: userId,
            date: new Date().toISOString()
        };
        
        attempts.push(attemptWithId);
        fs.writeFileSync(attemptsFile, JSON.stringify(attempts, null, 2));
        
        console.log(`💾 Сохранена попытка: ${userId}, ID: ${attemptWithId.id}`);
        
        res.json({ 
            success: true, 
            attemptId: attemptWithId.id 
        });
        
    } catch (error) {
        console.error('❌ Ошибка сохранения попытки:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка сохранения попытки' 
        });
    }
});

// Получить все попытки пользователя
app.get('/api/exam-attempts/:userId', (req, res) => {
    console.log('=== 📥 ЗАПРОС ПОПЫТОК ЭКЗАМЕНА ===');
    console.log('Пользователь:', req.params.userId);
    
    try {
        const { userId } = req.params;
        const attemptsFile = path.join(DATA_DIR, `exam_attempts_${userId}.json`);
        
        console.log(`📁 Ищем файл: ${path.basename(attemptsFile)}`);
        
        let attempts = [];
        if (fs.existsSync(attemptsFile)) {
            const content = fs.readFileSync(attemptsFile, 'utf8');
            attempts = JSON.parse(content || '[]');
            console.log(`📊 Найдено попыток: ${attempts.length}`);
        } else {
            console.log('📭 Файл не найден, возвращаем пустой массив');
        }
        
        res.json({
            success: true,
            attempts
        });
        
    } catch (error) {
        console.error('❌ Ошибка получения попыток:', error);
        console.error('Детали ошибки:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка получения попыток',
            details: error.message
        });
    }
});

// Удалить попытку
app.delete('/api/exam-attempts/:userId/:attemptId', (req, res) => {
    try {
        const { userId, attemptId } = req.params;
        const attemptsFile = path.join(DATA_DIR, `exam_attempts_${userId}.json`);
        
        if (!fs.existsSync(attemptsFile)) {
            return res.json({ 
                success: true 
            });
        }
        
        let attempts = JSON.parse(fs.readFileSync(attemptsFile, 'utf8'));
        const initialCount = attempts.length;
        attempts = attempts.filter(a => a.id !== attemptId);
        
        if (attempts.length < initialCount) {
            fs.writeFileSync(attemptsFile, JSON.stringify(attempts, null, 2));
            console.log(`🗑️ Удалена попытка: ${userId}, ID: ${attemptId}`);
        }
        
        res.json({ 
            success: true 
        });
        
    } catch (error) {
        console.error('❌ Ошибка удаления попытки:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка удаления попытки' 
        });
    }
});

// === СТАТИЧЕСКИЕ ФАЙЛЫ ===

// Для всех HTML страниц
app.get('*.html', (req, res) => {
    const filePath = path.join(__dirname, '..', req.path);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('Страница не найдена');
    }
});

// Для корня
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Для API маршрутов - 404
app.use('/api/*', (req, res) => {
    res.status(404).json({ 
        success: false,
        error: 'API маршрут не найден' 
    });
});

// Для остального - index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`\n🚀 ======================================`);
    console.log(`✅ Сервер запущен: http://localhost:${PORT}`);
    console.log(`📁 Статические файлы из: ${path.join(__dirname, '..')}`);
    console.log(`💾 Данные сохраняются в: ${DATA_DIR}`);
    console.log(`🔑 Яндекс OAuth: ${process.env.YANDEX_CLIENT_ID ? 'Настроен' : 'Не настроен'}`);
    console.log(`\n📄 Главная страница: http://localhost:${PORT}/`);
    console.log(`🔑 Страница входа: http://localhost:${PORT}/login.html`);
    console.log(`🧪 API тест: http://localhost:${PORT}/api/test`);
    console.log(`🔐 Яндекс вход: http://localhost:${PORT}/auth/yandex`);
    console.log(`======================================\n`);
});