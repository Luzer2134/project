// login_script.js - Упрощенная версия, только для гостевого входа
let isLoading = false;

// Удалены функции performLogin() и performRegister()
// Оставлена только функция гостевого входа

async function loginGuest() {
    if (isLoading) return;
    
    const button = document.getElementById('guest-button');
    const errorEl = document.getElementById('error-message');
    
    // Блокируем кнопку
    isLoading = true;
    button.disabled = true;
    button.textContent = 'Подключение...';
    button.classList.add('loading');
    
    try {
        console.log('👤 Гостевой вход...');
        const result = await examAPI.guestLogin();
        
        if (result.success) {
            console.log('✅ Гостевой вход успешен');
            window.location.href = 'index.html';
        } else {
            showError(result.error || 'Ошибка гостевого входа');
        }
    } catch (error) {
        console.error('❌ Ошибка гостевого входа:', error);
        showError('Ошибка подключения к серверу');
    } finally {
        isLoading = false;
        button.disabled = false;
        button.textContent = 'Продолжить как гость';
        button.classList.remove('loading');
    }
}

// Функция показа ошибки
function showError(message) {
    const errorEl = document.getElementById('error-message');
    errorEl.textContent = message;
    errorEl.classList.add('show');
    
    // Автоматически скрыть через 10 секунд
    setTimeout(() => {
        errorEl.classList.remove('show');
    }, 10000);
}

// Функция для входа через Яндекс (вызывается из login.html)
function loginWithYandex() {
    console.log('🔐 Вход через Яндекс...');
    window.location.href = '/auth/yandex';
}