const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Создаем папку для базы данных
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log('📁 Создана папка для данных:', DATA_DIR);
}

const DB_PATH = path.join(DATA_DIR, 'exam-platform.db');

// Создаем подключение к базе данных
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Ошибка подключения к базе данных:', err.message);
    } else {
        console.log('✅ Подключение к SQLite установлено');
        initDatabase();
    }
});

// Инициализация базы данных
function initDatabase() {
    console.log('📊 Инициализация таблиц базы данных...');

    // Таблица пользователей
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
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
            last_login DATETIME,
            UNIQUE(email, yandex_id)
        )
    `);

    // Таблица прогресса тренажера
    db.run(`
        CREATE TABLE IF NOT EXISTS trainer_progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            block TEXT NOT NULL,
            question_index INTEGER DEFAULT 0,
            user_answers TEXT DEFAULT '[]',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, block),
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    `);

    // Таблица попыток экзамена
    db.run(`
        CREATE TABLE IF NOT EXISTS exam_attempts (
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
        )
    `);

    // Таблица прогресса симуляции
    db.run(`
        CREATE TABLE IF NOT EXISTS simulation_progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            block TEXT NOT NULL,
            question_index INTEGER DEFAULT 0,
            user_answers TEXT DEFAULT '[]',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, block),
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    `);

    console.log('✅ Таблицы созданы успешно');
    
    // Закрываем соединение
    db.close((err) => {
        if (err) {
            console.error('❌ Ошибка закрытия базы данных:', err.message);
        } else {
            console.log('📁 База данных инициализирована:', DB_PATH);
            console.log('\nСтруктура базы данных:');
            console.log('┌─────────────────────────────────────────────┐');
            console.log('│ 1. users - Пользователи                      │');
            console.log('│ 2. trainer_progress - Прогресс тренажера     │');
            console.log('│ 3. exam_attempts - Попытки экзамена          │');
            console.log('│ 4. simulation_progress - Прогресс симуляции  │');
            console.log('└─────────────────────────────────────────────┘');
        }
    });
}