const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

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
const PROGRESS_FILE = path.join(DATA_DIR, 'progress.json');

// Инициализация файлов
const initFiles = () => {
    const files = [
        { path: USERS_FILE, default: [] },
        { path: PROGRESS_FILE, default: [] }
    ];
    
    files.forEach(file => {
        if (!fs.existsSync(file.path)) {
            fs.writeFileSync(file.path, JSON.stringify(file.default, null, 2));
            console.log(`📄 Создан файл: ${path.basename(file.path)}`);
        }
    });
};
initFiles();

// === API МАРШРУТЫ ===

// Тестовый маршрут
app.get('/api/test', (req, res) => {
    res.json({ 
        success: true,
        message: 'API работает!', 
        time: new Date().toISOString() 
    });
});

// Регистрация
app.post('/api/register', (req, res) => {
    try {
        const { email, password, name } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false,
                error: 'Email и пароль обязательны' 
            });
        }
        
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ 
                success: false,
                error: 'Некорректный email' 
            });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ 
                success: false,
                error: 'Пароль должен быть не менее 6 символов' 
            });
        }
        
        let users = [];
        if (fs.existsSync(USERS_FILE)) {
            users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        }
        
        // Проверяем, есть ли уже пользователь
        if (users.find(u => u.email === email)) {
            return res.status(400).json({ 
                success: false,
                error: 'Пользователь с таким email уже существует' 
            });
        }
        
        // Создаем нового пользователя
        const newUser = {
            id: Date.now().toString(),
            email,
            password, // ВНИМАНИЕ: в продакшене нужно хэшировать!
            name: name || email.split('@')[0],
            userType: 'registered',
            isAuthorized: true,
            createdAt: new Date().toISOString()
        };
        
        users.push(newUser);
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        
        console.log(`✅ Зарегистрирован новый пользователь: ${email}`);
        
        res.json({
            success: true,
            user: {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name,
                userType: newUser.userType,
                isAuthorized: newUser.isAuthorized
            }
        });
        
    } catch (error) {
        console.error('❌ Ошибка регистрации:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при регистрации' 
        });
    }
});

// Вход
app.post('/api/login', (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false,
                error: 'Email и пароль обязательны' 
            });
        }
        
        let users = [];
        if (fs.existsSync(USERS_FILE)) {
            users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        }
        
        const user = users.find(u => u.email === email && u.password === password);
        
        if (!user) {
            return res.status(401).json({ 
                success: false,
                error: 'Неверный email или пароль' 
            });
        }
        
        console.log(`✅ Успешный вход: ${email}`);
        
        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                userType: user.userType,
                isAuthorized: user.isAuthorized
            }
        });
        
    } catch (error) {
        console.error('❌ Ошибка входа:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при входе' 
        });
    }
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
    console.log(`\n📄 Главная страница: http://localhost:${PORT}/`);
    console.log(`🔑 Страница входа: http://localhost:${PORT}/login.html`);
    console.log(`🧪 API тест: http://localhost:${PORT}/api/test`);
    console.log(`======================================\n`);
});