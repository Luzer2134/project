// login_script.js
let isLoading = false;

async function performRegister() {
    if (isLoading) return;
    
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const passwordConfirm = document.getElementById('register-password-confirm').value;
    const errorEl = document.getElementById('register-error');
    const successEl = document.getElementById('register-success');
    const button = document.getElementById('register-button');
    
    errorEl.textContent = '';
    successEl.textContent = '';
    
    // Валидация
    if (!name || !email || !password) {
        errorEl.textContent = 'Все поля обязательны для заполнения';
        return;
    }
    
    if (!isValidEmail(email)) {
        errorEl.textContent = 'Введите корректный email адрес';
        return;
    }
    
    if (password.length < 6) {
        errorEl.textContent = 'Пароль должен быть не менее 6 символов';
        return;
    }
    
    if (password !== passwordConfirm) {
        errorEl.textContent = 'Пароли не совпадают';
        return;
    }
    
    // Блокируем кнопку
    isLoading = true;
    button.disabled = true;
    button.textContent = 'Регистрация...';
    button.classList.add('loading');
    
    try {
        console.log('Отправка запроса на регистрацию:', email);
        const result = await examAPI.register(email, password, name);
        
        if (result.success) {
            successEl.textContent = 'Регистрация успешна!';
            console.log('✅ Регистрация успешна');
            
            // Переносим данные гостя на сервер
            setTimeout(async () => {
                try {
                    const migrationResult = await examAPI.migrateGuestData();
                    if (migrationResult.success) {
                        console.log('✅ Данные гостя перенесены на сервер');
                    }
                } catch (migrateError) {
                    console.error('Ошибка переноса данных:', migrateError);
                }
                
                // Переход на главную страницу
                window.location.href = 'index.html';
            }, 1000);
            
        } else {
            errorEl.textContent = result.error || 'Ошибка регистрации';
            console.error('❌ Ошибка регистрации:', result.error);
        }
    } catch (error) {
        errorEl.textContent = 'Ошибка подключения к серверу. Проверьте соединение.';
        console.error('❌ Сетевая ошибка при регистрации:', error);
    } finally {
        isLoading = false;
        button.disabled = false;
        button.textContent = 'Зарегистрироваться';
        button.classList.remove('loading');
    }
}

async function performLogin() {
    if (isLoading) return;
    
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    const successEl = document.getElementById('login-success');
    const button = document.getElementById('login-button');
    
    errorEl.textContent = '';
    successEl.textContent = '';
    
    if (!email || !password) {
        errorEl.textContent = 'Заполните все поля';
        return;
    }
    
    if (!isValidEmail(email)) {
        errorEl.textContent = 'Введите корректный email адрес';
        return;
    }
    
    // Блокируем кнопку
    isLoading = true;
    button.disabled = true;
    button.textContent = 'Вход...';
    button.classList.add('loading');
    
    try {
        console.log('Отправка запроса на вход:', email);
        const result = await examAPI.login(email, password);
        
        if (result.success) {
            successEl.textContent = 'Вход успешен!';
            console.log('✅ Вход успешен');
            
            // Переносим данные гостя на сервер
            setTimeout(async () => {
                try {
                    const migrationResult = await examAPI.migrateGuestData();
                    if (migrationResult.success) {
                        console.log('✅ Данные гостя перенесены на сервер');
                    }
                } catch (migrateError) {
                    console.error('Ошибка переноса данных:', migrateError);
                }
                
                // Переход на главную страницу
                window.location.href = 'index.html';
            }, 1000);
            
        } else {
            errorEl.textContent = result.error || 'Неверный email или пароль';
            console.error('❌ Ошибка входа:', result.error);
        }
    } catch (error) {
        errorEl.textContent = 'Ошибка подключения к серверу. Проверьте соединение.';
        console.error('❌ Сетевая ошибка при входе:', error);
    } finally {
        isLoading = false;
        button.disabled = false;
        button.textContent = 'Войти';
        button.classList.remove('loading');
    }
}

async function loginGuest() {
    if (isLoading) return;
    
    const button = document.getElementById('guest-button');
    const errorEl = document.getElementById('login-error');
    
    // Блокируем кнопку
    isLoading = true;
    button.disabled = true;
    button.textContent = 'Подключение...';
    button.classList.add('loading');
    
    try {
        console.log('Гостевой вход...');
        const result = await examAPI.guestLogin();
        
        if (result.success) {
            console.log('✅ Гостевой вход успешен');
            window.location.href = 'index.html';
        } else {
            errorEl.textContent = result.error || 'Ошибка гостевого входа';
            console.error('❌ Ошибка гостевого входа:', result.error);
        }
    } catch (error) {
        errorEl.textContent = 'Ошибка подключения к серверу';
        console.error('❌ Сетевая ошибка при гостевом входе:', error);
    } finally {
        isLoading = false;
        button.disabled = false;
        button.textContent = 'Войти как гость';
        button.classList.remove('loading');
    }
}

// Вспомогательная функция для валидации email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}