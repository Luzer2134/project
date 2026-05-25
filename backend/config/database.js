const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log('📁 Создана папка для данных:', DATA_DIR);
}

const DB_PATH = path.join(DATA_DIR, 'exam-platform.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Ошибка подключения к SQLite:', err.message);
    } else {
        console.log('✅ Подключено к SQLite базе данных');
        db.run('PRAGMA foreign_keys = ON');
        createTables();
    }
});

function createTables() {
    const tables = [
        `CREATE TABLE IF NOT EXISTS favourites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            question_id TEXT NOT NULL,
            block TEXT NOT NULL,
            question TEXT NOT NULL,
            options TEXT,
            correct_answers TEXT,
            comment TEXT,
            image TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, question_id),
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )`,
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
        db.run(sql, params, function (err) {
            if (err) {
                console.error('❌ Ошибка SQL выполнения:', err.message);
                reject(err);
            } else {
                resolve({ id: this.lastID, changes: this.changes });
            }
        });
    });
}

module.exports = { db, dbQuery, dbRun, DB_PATH };