const { dbQuery, dbRun } = require('../config/database');

// Гостевой вход — один постоянный гость
async function guestLogin(req, res) {
    try {
        let users = await dbQuery('SELECT * FROM users WHERE user_type = "guest" LIMIT 1');
        let user;

        if (users.length === 0) {
            const result = await dbRun(
                `INSERT INTO users (email, name, user_type, is_authorized) VALUES (?, ?, ?, ?)`,
                ['guest@permanent.com', 'Гость', 'guest', 0]
            );
            user = await dbQuery('SELECT * FROM users WHERE id = ?', [result.id]);
            console.log('✅ Создан постоянный гость, ID:', user[0].id);
        } else {
            user = users;
            console.log('✅ Используем существующего гостя, ID:', user[0].id);
        }

        res.json({
            success: true,
            user: {
                id: user[0].id,
                email: user[0].email,
                name: user[0].name,
                userType: user[0].user_type,
                isAuthorized: user[0].is_authorized,
            },
        });
    } catch (error) {
        console.error('❌ Ошибка гостевого входа:', error);
        res.status(500).json({ success: false, error: 'Ошибка гостевого входа' });
    }
}

// Получение пользователя по ID
async function getUserById(req, res) {
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
                    yandexId: user.yandex_id,
                },
            });
        } else {
            res.status(404).json({ success: false, error: 'Пользователь не найден' });
        }
    } catch (error) {
        console.error('❌ Ошибка получения пользователя:', error);
        res.status(500).json({ success: false, error: 'Ошибка получения пользователя' });
    }
}

module.exports = { guestLogin, getUserById };