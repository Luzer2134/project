// login_script.js
function loginYandex() {
    // Устанавливаем флаг что это авторизованный пользователь
    localStorage.setItem('isAuthorized', 'true');
    localStorage.setItem('userType', 'yandex');
    localStorage.setItem('userName', 'Пользователь Яндекс');
    
    console.log('Вход через Яндекс - прогресс будет сохранен');
    window.location.href = 'index.html';
}

function loginGuest() {
    // Гостевой режим - не сохраняем прогресс
    localStorage.setItem('isAuthorized', 'false');
    localStorage.setItem('userType', 'guest');
    localStorage.setItem('userName', 'Гость');
    
    // Очищаем прогресс гостя при каждом новом входе
    clearGuestProgress();
    
    console.log('Гостевой вход - прогресс не сохраняется');
    window.location.href = 'index.html';
}

function clearGuestProgress() {
    // Очищаем все данные о прогрессе для гостя
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('trainerProgress_') || 
            key.startsWith('examProgress_') ||
            key === 'selectedBlock' ||
            key === 'examAttempts') {
            keysToRemove.push(key);
        }
    }
    
    keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`Очищен прогресс: ${key}`);
    });
}

// Проверка авторизации при загрузке страниц
function checkAuth() {
    const isAuthorized = localStorage.getItem('isAuthorized');
    if (!isAuthorized) {
        // Перенаправляем на страницу входа если не авторизованы
        if (window.location.pathname !== '/login.html' && 
            !window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
    }
}

// Проверка при загрузке страницы (кроме login.html)
if (!window.location.pathname.includes('login.html')) {
    document.addEventListener('DOMContentLoaded', checkAuth);
}