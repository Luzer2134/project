const { dbQuery, dbRun } = require('../config/database');

// Старт авторизации через Яндекс
function startYandexAuth(req, res) {
    const YANDEX_CLIENT_ID = process.env.YANDEX_CLIENT_ID;
    const REDIRECT_URI = encodeURIComponent(process.env.YANDEX_REDIRECT_URI);

    if (!YANDEX_CLIENT_ID) {
        console.error('❌ YANDEX_CLIENT_ID не настроен в .env файле');
        return res.redirect('/login.html?error=oauth_not_configured');
    }

    const authUrl =
        `https://oauth.yandex.ru/authorize?` +
        `response_type=code&` +
        `client_id=${YANDEX_CLIENT_ID}&` +
        `redirect_uri=${REDIRECT_URI}&` +
        `force_confirm=true`;

    console.log('🔗 Перенаправление на Яндекс OAuth:', authUrl);
    res.redirect(authUrl);
}

// Callback от Яндекс OAuth
async function yandexCallback(req, res) {
    console.log('🔄 Яндекс OAuth callback получен:', req.query);

    try {
        const { code, error, error_description } = req.query;

        if (error) {
            console.error('❌ Ошибка от Яндекс OAuth:', error, error_description);
            return res.redirect(`/index.html?error=${encodeURIComponent(error_description || error)}`);
        }

        if (!code) {
            console.error('❌ Код авторизации не получен');
            return res.redirect('/index.html?error=no_auth_code');
        }

        const YANDEX_CLIENT_ID = process.env.YANDEX_CLIENT_ID;
        const YANDEX_CLIENT_SECRET = process.env.YANDEX_CLIENT_SECRET;

        if (!YANDEX_CLIENT_ID || !YANDEX_CLIENT_SECRET) {
            console.error('❌ Яндекс OAuth не настроен в .env файле');
            return res.redirect('/index.html?error=oauth_not_configured');
        }

        console.log('🔐 Получение токена от Яндекс...');

        const tokenResponse = await fetch('https://oauth.yandex.ru/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json',
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                client_id: YANDEX_CLIENT_ID,
                client_secret: YANDEX_CLIENT_SECRET,
                redirect_uri: process.env.YANDEX_REDIRECT_URI,
            }),
        });

        const tokenText = await tokenResponse.text();
        console.log('📨 Ответ от Яндекс:', tokenText);

        let tokenData;
        try {
            tokenData = JSON.parse(tokenText);
        } catch (e) {
            throw new Error('Некорректный ответ от Яндекс');
        }

        if (!tokenData.access_token) {
            throw new Error(tokenData.error_description || 'Не удалось получить токен от Яндекс');
        }

        console.log('✅ Токен получен, получение данных пользователя...');

        const userResponse = await fetch('https://login.yandex.ru/info?format=json', {
            headers: {
                Authorization: `OAuth ${tokenData.access_token}`,
                Accept: 'application/json',
            },
        });

        const userText = await userResponse.text();
        let userData;
        try {
            userData = JSON.parse(userText);
        } catch (e) {
            throw new Error('Некорректные данные пользователя');
        }

        if (!userData.id) {
            throw new Error('Не удалось получить данные пользователя');
        }

        console.log('👤 Данные пользователя Яндекс:', {
            id: userData.id,
            email: userData.default_email,
            name: userData.real_name || userData.display_name || userData.login,
        });

        let user = await dbQuery(
            'SELECT * FROM users WHERE yandex_id = ? OR email = ?',
            [userData.id, userData.default_email]
        );

        if (user.length === 0) {
            const result = await dbRun(
                `INSERT INTO users 
                (yandex_id, email, name, user_type, access_token, refresh_token, is_authorized, last_login) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userData.id,
                    userData.default_email,
                    userData.real_name || userData.display_name || userData.login || 'Пользователь Яндекс',
                    'yandex',
                    tokenData.access_token,
                    tokenData.refresh_token || '',
                    1,
                    new Date().toISOString(),
                ]
            );
            user = await dbQuery('SELECT * FROM users WHERE id = ?', [result.id]);
            console.log(`✅ Создан новый пользователь: ${userData.default_email}`);
        } else {
            await dbRun(
                `UPDATE users SET name = ?, access_token = ?, refresh_token = ?, is_authorized = ?, last_login = ? WHERE id = ?`,
                [
                    userData.real_name || userData.display_name || userData.login || user[0].name,
                    tokenData.access_token,
                    tokenData.refresh_token || '',
                    1,
                    new Date().toISOString(),
                    user[0].id,
                ]
            );
            user = await dbQuery('SELECT * FROM users WHERE id = ?', [user[0].id]);
            console.log(`✅ Обновлен существующий пользователь: ${userData.default_email}`);
        }

        const userForFrontend = {
            id: user[0].id,
            email: user[0].email,
            name: user[0].name,
            userType: user[0].user_type,
            isAuthorized: user[0].is_authorized,
            yandexId: user[0].yandex_id,
        };

        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Авторизация</title>
            <script>
                localStorage.setItem('currentUser', JSON.stringify(${JSON.stringify(userForFrontend)}));
                localStorage.setItem('isAuthorized', 'true');
                localStorage.setItem('userType', 'yandex');
                setTimeout(() => { window.location.href = '/index.html'; }, 500);
            </script>
        </head>
        <body><p>Авторизация успешна. Перенаправление...</p></body>
        </html>`;

        res.send(html);
    } catch (error) {
        console.error('❌ Критическая ошибка Яндекс OAuth:', error);
        console.error(error.stack);

        const errorHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>Ошибка авторизации</title></head>
        <body>
            <h1>Ошибка авторизации</h1>
            <p>${error.message}</p>
            <p><a href="/index.html">Вернуться на главную</a></p>
            <script>
                setTimeout(() => { window.location.href = '/index.html?error=${encodeURIComponent(error.message)}'; }, 3000);
            </script>
        </body>
        </html>`;

        res.send(errorHtml);
    }
}

// Выход из Яндекс
async function yandexLogout(req, res) {
    try {
        const userId = req.query.userId;

        if (!userId) {
            return res.json({ success: false, error: 'Не указан userId' });
        }

        const users = await dbQuery('SELECT * FROM users WHERE id = ?', [userId]);

        if (users.length === 0) {
            return res.json({ success: false, error: 'Пользователь не найден' });
        }

        const user = users[0];

        if (user.access_token) {
            try {
                await fetch('https://oauth.yandex.ru/revoke_token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        access_token: user.access_token,
                        client_id: process.env.YANDEX_CLIENT_ID,
                        client_secret: process.env.YANDEX_CLIENT_SECRET,
                    }),
                });
                console.log(`✅ Токен Яндекс отозван для пользователя: ${user.email}`);
            } catch (revokeError) {
                console.warn('⚠️ Не удалось отозвать токен Яндекс:', revokeError);
            }

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
}

module.exports = { startYandexAuth, yandexCallback, yandexLogout };