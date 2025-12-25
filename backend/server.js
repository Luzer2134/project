const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
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
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log('📁 Создана папка для данных:', DATA_DIR);
}

// Подключение к базе данных
const DB_PATH = path.join(DATA_DIR, 'exam-platform.db');
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Ошибка подключения к SQLite:', err.message);
    } else {
        console.log('✅ Подключено к SQLite базе данных');
        
        // Включаем foreign keys
        db.run('PRAGMA foreign_keys = ON');
        
        // Создаем таблицы если их нет
        createTables();
    }
});

// Функция создания таблиц
function createTables() {
    const tables = [
        // Таблица пользователей
        `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            yandex_id TEXT UNIQUE,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            user_type TEXT NOT NULL DEFAULT 'guest',
            avatar TEXT,
            access_token TEXT,
            refresh_token TEXT,
            is_authorized BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME
        )`,
        
        // Таблица прогресса тренажера
        `CREATE TABLE IF NOT EXISTS trainer_progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            block TEXT NOT NULL,
            question_index INTEGER DEFAULT 0,
            user_answers TEXT DEFAULT '[]',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, block),
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )`,
        
        // Таблица попыток экзамена
        `CREATE TABLE IF NOT EXISTS exam_attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            attempt_id TEXT UNIQUE NOT NULL,
            block TEXT NOT NULL,
            score INTEGER NOT NULL,
            total_questions INTEGER NOT NULL,
            correct_answers INTEGER NOT NULL,
            percentage REAL NOT NULL,
            is_passed BOOLEAN DEFAULT 0,
            time_spent INTEGER DEFAULT 0,
            user_answers TEXT DEFAULT '[]',
            questions_data TEXT DEFAULT '[]',
            attempt_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )`,
        
        // Таблица прогресса симуляции
        `CREATE TABLE IF NOT EXISTS simulation_progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            block TEXT NOT NULL,
            question_index INTEGER DEFAULT 0,
            user_answers TEXT DEFAULT '[]',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, block),
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )`
    ];
    
    tables.forEach((sql, index) => {
        db.run(sql, (err) => {
            if (err) {
                console.error(`❌ Ошибка создания таблицы ${index + 1}:`, err.message);
            }
        });
    });
    
    console.log('✅ Таблицы базы данных проверены');
}

// Вспомогательная функция для запросов к базе данных
function dbQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('❌ Ошибка SQL запроса:', err.message);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) {
                console.error('❌ Ошибка SQL выполнения:', err.message);
                reject(err);
            } else {
                resolve({ id: this.lastID, changes: this.changes });
            }
        });
    });
}

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
app.get('/callback', async (req, res) => {
    console.log('🔄 Яндекс OAuth callback получен');
    
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
                redirect_uri: process.env.YANDEX_REDIRECT_URI
            })
        });
        
        const tokenData = await tokenResponse.json();
        
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
        
        // Проверяем существует ли пользователь в базе
        let user = await dbQuery(
            'SELECT * FROM users WHERE yandex_id = ? OR email = ?',
            [userData.id, userData.default_email]
        );
        
        if (user.length === 0) {
            // Создаем нового пользователя
            const result = await dbRun(
                `INSERT INTO users 
                (yandex_id, email, name, user_type, avatar, access_token, refresh_token, is_authorized, last_login) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userData.id,
                    userData.default_email,
                    userData.real_name || userData.display_name || userData.login || 'Пользователь Яндекс',
                    'yandex',
                    userData.is_avatar_empty ? null : `https://avatars.yandex.net/get-yapic/${userData.default_avatar_id}/islands-200`,
                    tokenData.access_token,
                    tokenData.refresh_token,
                    1,
                    new Date().toISOString()
                ]
            );
            
            user = await dbQuery('SELECT * FROM users WHERE id = ?', [result.id]);
            console.log(`✅ Создан новый пользователь: ${userData.default_email}`);
        } else {
            // Обновляем существующего пользователя
            await dbRun(
                `UPDATE users SET 
                name = ?, 
                avatar = ?, 
                access_token = ?, 
                refresh_token = ?, 
                is_authorized = ?, 
                last_login = ? 
                WHERE id = ?`,
                [
                    userData.real_name || userData.display_name || userData.login || user[0].name,
                    userData.is_avatar_empty ? null : `https://avatars.yandex.net/get-yapic/${userData.default_avatar_id}/islands-200`,
                    tokenData.access_token,
                    tokenData.refresh_token,
                    1,
                    new Date().toISOString(),
                    user[0].id
                ]
            );
            
            user = await dbQuery('SELECT * FROM users WHERE id = ?', [user[0].id]);
            console.log(`✅ Обновлен существующий пользователь: ${userData.default_email}`);
        }
        
        // Подготовка данных для фронтенда
        const userForFrontend = {
            id: user[0].id,
            email: user[0].email,
            name: user[0].name,
            userType: user[0].user_type,
            isAuthorized: user[0].is_authorized,
            avatar: user[0].avatar,
            yandexId: user[0].yandex_id
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
        
        // Получаем пользователя
        const users = await dbQuery('SELECT * FROM users WHERE id = ?', [userId]);
        
        if (users.length === 0) {
            return res.json({ success: false, error: 'Пользователь не найден' });
        }
        
        const user = users[0];
        
        if (user.access_token) {
            // Пытаемся отозвать токен у Яндекс
            try {
                await fetch('https://oauth.yandex.ru/revoke_token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams({
                        access_token: user.access_token,
                        client_id: process.env.YANDEX_CLIENT_ID,
                        client_secret: process.env.YANDEX_CLIENT_SECRET
                    })
                });
                console.log(`✅ Токен Яндекс отозван для пользователя: ${user.email}`);
            } catch (revokeError) {
                console.warn('⚠️ Не удалось отозвать токен Яндекс:', revokeError);
            }
            
            // Удаляем токены у пользователя
            await dbRun(
                'UPDATE users SET access_token = NULL, refresh_token = NULL, is_authorized = 0 WHERE id = ?',
                [userId]
            );
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
        message: 'API работает с SQLite!',
        time: new Date().toISOString(),
        yandexConfigured: !!process.env.YANDEX_CLIENT_ID,
        database: 'SQLite'
    });
});

// Гостевой вход
app.post('/api/guest', async (req, res) => {
    try {
        const guestUser = {
            email: 'guest_' + Date.now() + '@temp.com',
            name: 'Гость',
            user_type: 'guest',
            is_authorized: 0
        };
        
        console.log(`👤 Гостевой вход: ${guestUser.email}`);
        
        // Создаем запись гостя в базе
        const result = await dbRun(
            `INSERT INTO users (email, name, user_type, is_authorized) VALUES (?, ?, ?, ?)`,
            [guestUser.email, guestUser.name, guestUser.user_type, guestUser.is_authorized]
        );
        
        const user = await dbQuery('SELECT * FROM users WHERE id = ?', [result.id]);
        
        res.json({
            success: true,
            user: {
                id: user[0].id,
                email: user[0].email,
                name: user[0].name,
                userType: user[0].user_type,
                isAuthorized: user[0].is_authorized
            }
        });
        
    } catch (error) {
        console.error('❌ Ошибка гостевого входа:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка гостевого входа'
        });
    }
});

// Получение пользователя по ID
app.get('/api/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const users = await dbQuery('SELECT * FROM users WHERE id = ?', [userId]);
        
        if (users.length > 0) {
            const user = users[0];
            res.json({
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    userType: user.user_type,
                    isAuthorized: user.is_authorized,
                    avatar: user.avatar,
                    yandexId: user.yandex_id
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
app.post('/api/trainer-progress', async (req, res) => {
    try {
        const { userId, block, userAnswers, currentQuestionIndex } = req.body;
        
        if (!userId || !block) {
            return res.status(400).json({
                success: false,
                error: 'Неверные данные'
            });
        }
        
        // Проверяем существующую запись
        const existing = await dbQuery(
            'SELECT * FROM trainer_progress WHERE user_id = ? AND block = ?',
            [userId, block]
        );
        
        if (existing.length > 0) {
            // Обновляем существующую запись
            await dbRun(
                `UPDATE trainer_progress SET 
                question_index = ?, 
                user_answers = ?, 
                updated_at = ? 
                WHERE user_id = ? AND block = ?`,
                [
                    currentQuestionIndex || 0,
                    JSON.stringify(userAnswers || []),
                    new Date().toISOString(),
                    userId,
                    block
                ]
            );
        } else {
            // Создаем новую запись
            await dbRun(
                `INSERT INTO trainer_progress 
                (user_id, block, question_index, user_answers) 
                VALUES (?, ?, ?, ?)`,
                [
                    userId,
                    block,
                    currentQuestionIndex || 0,
                    JSON.stringify(userAnswers || [])
                ]
            );
        }
        
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

// Получение прогресса тренажера для блока
app.get('/api/trainer-progress/:userId/:block', async (req, res) => {
    try {
        const { userId, block } = req.params;
        
        const progress = await dbQuery(
            'SELECT * FROM trainer_progress WHERE user_id = ? AND block = ?',
            [userId, block]
        );
        
        if (progress.length > 0) {
            const data = progress[0];
            res.json({
                success: true,
                progress: {
                    userAnswers: JSON.parse(data.user_answers || '[]'),
                    currentQuestionIndex: data.question_index
                }
            });
        } else {
            res.json({
                success: true,
                progress: {
                    userAnswers: [],
                    currentQuestionIndex: 0
                }
            });
        }
        
    } catch (error) {
        console.error('❌ Ошибка получения прогресса тренажера:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка получения прогресса тренажера'
        });
    }
});

// Получение всего прогресса пользователя
app.get('/api/trainer-progress/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const progress = await dbQuery(
            'SELECT * FROM trainer_progress WHERE user_id = ?',
            [userId]
        );
        
        const result = {};
        progress.forEach(item => {
            result[item.block] = {
                userAnswers: JSON.parse(item.user_answers || '[]'),
                currentQuestionIndex: item.question_index,
                updatedAt: item.updated_at
            };
        });
        
        res.json({
            success: true,
            progress: result
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
app.post('/api/exam-attempts', async (req, res) => {
    try {
        const { userId, attempt } = req.body;
        
        if (!userId || !attempt) {
            return res.status(400).json({
                success: false,
                error: 'Неверные данные'
            });
        }
        
        const attemptId = 'attempt_' + Date.now();
        
        await dbRun(
            `INSERT INTO exam_attempts 
            (user_id, attempt_id, block, score, total_questions, correct_answers, 
            percentage, is_passed, time_spent, user_answers, questions_data) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                attemptId,
                attempt.block || 'Неизвестный блок',
                attempt.score || 0,
                attempt.totalQuestions || 0,
                attempt.correctAnswers || 0,
                attempt.percentage || 0,
                attempt.isPassed ? 1 : 0,
                attempt.timeSpent || 0,
                JSON.stringify(attempt.userAnswers || []),
                JSON.stringify(attempt.questions || [])
            ]
        );
        
        console.log(`💾 Сохранена попытка: ${userId}, ID: ${attemptId}`);
        
        res.json({
            success: true,
            attemptId: attemptId
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
app.get('/api/exam-attempts/:userId', async (req, res) => {
    console.log('📥 ЗАПРОС ПОПЫТОК ЭКЗАМЕНА для пользователя:', req.params.userId);
    
    try {
        const { userId } = req.params;
        
        const attempts = await dbQuery(
            'SELECT * FROM exam_attempts WHERE user_id = ? ORDER BY attempt_date DESC',
            [userId]
        );
        
        const formattedAttempts = attempts.map(attempt => ({
            id: attempt.attempt_id,
            userId: attempt.user_id,
            block: attempt.block,
            score: attempt.score,
            totalQuestions: attempt.total_questions,
            correctAnswers: attempt.correct_answers,
            percentage: attempt.percentage,
            isPassed: Boolean(attempt.is_passed),
            timeSpent: attempt.time_spent,
            userAnswers: JSON.parse(attempt.user_answers || '[]'),
            questions: JSON.parse(attempt.questions_data || '[]'),
            date: attempt.attempt_date
        }));
        
        console.log(`📊 Найдено попыток: ${formattedAttempts.length}`);
        
        res.json({
            success: true,
            attempts: formattedAttempts
        });
        
    } catch (error) {
        console.error('❌ Ошибка получения попыток:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка получения попыток',
            details: error.message
        });
    }
});

// Удалить попытку
app.delete('/api/exam-attempts/:userId/:attemptId', async (req, res) => {
    try {
        const { userId, attemptId } = req.params;
        
        const result = await dbRun(
            'DELETE FROM exam_attempts WHERE user_id = ? AND attempt_id = ?',
            [userId, attemptId]
        );
        
        if (result.changes > 0) {
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

// === ПРОГРЕСС СИМУЛЯЦИИ ===

// Сохранить прогресс симуляции
app.post('/api/simulation-progress', async (req, res) => {
    try {
        const { userId, block, userAnswers, currentQuestionIndex } = req.body;
        
        if (!userId || !block) {
            return res.status(400).json({
                success: false,
                error: 'Неверные данные'
            });
        }
        
        // Проверяем существующую запись
        const existing = await dbQuery(
            'SELECT * FROM simulation_progress WHERE user_id = ? AND block = ?',
            [userId, block]
        );
        
        if (existing.length > 0) {
            // Обновляем существующую запись
            await dbRun(
                `UPDATE simulation_progress SET 
                question_index = ?, 
                user_answers = ?, 
                updated_at = ? 
                WHERE user_id = ? AND block = ?`,
                [
                    currentQuestionIndex || 0,
                    JSON.stringify(userAnswers || []),
                    new Date().toISOString(),
                    userId,
                    block
                ]
            );
        } else {
            // Создаем новую запись
            await dbRun(
                `INSERT INTO simulation_progress 
                (user_id, block, question_index, user_answers) 
                VALUES (?, ?, ?, ?)`,
                [
                    userId,
                    block,
                    currentQuestionIndex || 0,
                    JSON.stringify(userAnswers || [])
                ]
            );
        }
        
        console.log(`💾 Сохранен прогресс симуляции: ${userId}, блок ${block}`);
        
        res.json({
            success: true
        });
        
    } catch (error) {
        console.error('❌ Ошибка сохранения прогресса симуляции:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка сохранения прогресса симуляции'
        });
    }
});

// Получить прогресс симуляции
app.get('/api/simulation-progress/:userId/:block', async (req, res) => {
    try {
        const { userId, block } = req.params;
        
        const progress = await dbQuery(
            'SELECT * FROM simulation_progress WHERE user_id = ? AND block = ?',
            [userId, block]
        );
        
        if (progress.length > 0) {
            const data = progress[0];
            res.json({
                success: true,
                progress: {
                    userAnswers: JSON.parse(data.user_answers || '[]'),
                    currentQuestionIndex: data.question_index
                }
            });
        } else {
            res.json({
                success: true,
                progress: null
            });
        }
        
    } catch (error) {
        console.error('❌ Ошибка получения прогресса симуляции:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка получения прогресса симуляции'
        });
    }
});

// Удалить прогресс симуляции
app.delete('/api/simulation-progress/:userId/:block', async (req, res) => {
    try {
        const { userId, block } = req.params;
        
        const result = await dbRun(
            'DELETE FROM simulation_progress WHERE user_id = ? AND block = ?',
            [userId, block]
        );
        
        if (result.changes > 0) {
            console.log(`🗑️ Удален прогресс симуляции: ${userId}, блок ${block}`);
        }
        
        res.json({
            success: true
        });
        
    } catch (error) {
        console.error('❌ Ошибка удаления прогресса симуляции:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка удаления прогресса симуляции'
        });
    }
});

// === СТАТИСТИКА ===

// Получить статистику пользователя
app.get('/api/stats/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Общая статистика
        const user = await dbQuery('SELECT * FROM users WHERE id = ?', [userId]);
        const trainerProgress = await dbQuery('SELECT * FROM trainer_progress WHERE user_id = ?', [userId]);
        const examAttempts = await dbQuery('SELECT * FROM exam_attempts WHERE user_id = ?', [userId]);
        
        let totalTrainerQuestions = 0;
        let completedTrainerQuestions = 0;
        let correctTrainerAnswers = 0;
        
        trainerProgress.forEach(progress => {
            const userAnswers = JSON.parse(progress.user_answers || '[]');
            const completed = userAnswers.filter(a => a !== null && a !== undefined).length;
            completedTrainerQuestions += completed;
            // Здесь можно добавить логику подсчета правильных ответов
        });
        
        const totalExamAttempts = examAttempts.length;
        const passedExamAttempts = examAttempts.filter(a => a.is_passed).length;
        const averagePercentage = examAttempts.length > 0 
            ? examAttempts.reduce((sum, a) => sum + a.percentage, 0) / examAttempts.length
            : 0;
        
        res.json({
            success: true,
            stats: {
                user: user[0] ? {
                    id: user[0].id,
                    name: user[0].name,
                    email: user[0].email,
                    type: user[0].user_type
                } : null,
                trainer: {
                    completedQuestions: completedTrainerQuestions,
                    totalQuestions: totalTrainerQuestions,
                    correctAnswers: correctTrainerAnswers
                },
                exams: {
                    totalAttempts: totalExamAttempts,
                    passedAttempts: passedExamAttempts,
                    successRate: totalExamAttempts > 0 ? (passedExamAttempts / totalExamAttempts) * 100 : 0,
                    averagePercentage: averagePercentage
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Ошибка получения статистики:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка получения статистики'
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
    console.log(`📁 База данных: ${DB_PATH}`);
    console.log(`💾 SQLite версия: ${sqlite3.VERSION}`);
    console.log(`🔑 Яндекс OAuth: ${process.env.YANDEX_CLIENT_ID ? 'Настроен' : 'Не настроен'}`);
    console.log(`\n📄 Главная страница: http://localhost:${PORT}/`);
    console.log(`🔑 Страница входа: http://localhost:${PORT}/login.html`);
    console.log(`🧪 API тест: http://localhost:${PORT}/api/test`);
    console.log(`🔐 Яндекс вход: http://localhost:${PORT}/auth/yandex`);
    console.log(`📊 Инициализация БД: npm run init-db`);
    console.log(`======================================\n`);
});

// Закрытие соединения с БД при завершении
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('❌ Ошибка закрытия базы данных:', err.message);
        } else {
            console.log('👋 Соединение с SQLite закрыто');
        }
        process.exit(0);
    });
});