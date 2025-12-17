// API для работы с бэкендом - ТОЛЬКО Яндекс OAuth и гостевой вход
class ExamAPI {
    constructor() {
        this.baseURL = 'http://localhost:3000/api';
        this.currentUser = null;
        this.init();
    }

    // Инициализация
    init() {
        console.log('🚀 ExamAPI инициализирован (только Яндекс OAuth + гостевой вход)');
        this.loadUserFromStorage();
    }

    // Общий метод для запросов
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const config = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (options.body) {
            config.body = JSON.stringify(options.body);
        }

        try {
            console.log(`📡 API запрос: ${url}`, options.body || '');
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || `Ошибка ${response.status}`);
            }
            
            console.log(`✅ API ответ:`, data);
            return data;
        } catch (error) {
            console.error('❌ API Error:', error.message);
            throw error;
        }
    }

    // === АВТОРИЗАЦИЯ ===
    
    // Гостевой вход
    async guestLogin() {
        try {
            const result = await this.request('/guest', {
                method: 'POST'
            });
            
            if (result.success) {
                this.saveUserToStorage(result.user);
            }
            
            return result;
        } catch (error) {
            console.error('❌ Ошибка гостевого входа:', error);
            return { success: false, error: error.message };
        }
    }

    // Проверка пользователя на сервере (для Яндекс пользователей)
    async checkUserSession(userId) {
        try {
            const result = await this.request(`/user/${userId}`);
            return result;
        } catch (error) {
            console.error('❌ Ошибка проверки сессии:', error);
            return { success: false, error: error.message };
        }
    }

    // Выход из Яндекс
    async yandexLogout(userId) {
        try {
            const result = await fetch(`/auth/yandex/logout?userId=${userId}`);
            const data = await result.json();
            return data;
        } catch (error) {
            console.error('❌ Ошибка выхода из Яндекс:', error);
            return { success: false, error: error.message };
        }
    }

    // === ПРОГРЕСС ТРЕНАЖЕРА ===
    
    // В api.js обновите функцию saveTrainerProgress:
// api.js - ДОБАВЬТЕ ЭТИ ФУНКЦИИ В КЛАСС ExamAPI

// Сохранение прогресса тренажера на сервер
// api.js - ЗАМЕНИТЕ ЭТИ МЕТОДЫ В КЛАССЕ ExamAPI

// Сохранение прогресса тренажера
async saveTrainerProgress(block, progressData) {
    const user = this.getUserFromStorage();
    
    if (!user) {
        console.log('❌ Нет пользователя для сохранения прогресса');
        return { success: false, error: 'Пользователь не найден' };
    }
    
    console.log(`💾 Сохраняем прогресс: блок "${block}", пользователь "${user.name}"`);
    
    // Для гостей - только локальное сохранение
    if (user.userType === 'guest') {
        console.log('👤 Гость - сохраняем только локально');
        this.saveTrainerProgressLocal(block, progressData, user);
        return { success: true, local: true };
    }
    
    try {
        // Сохраняем на сервер
        const result = await this.request('/trainer-progress', {
            method: 'POST',
            body: {
                userId: user.id,
                block: block,
                userAnswers: progressData.userAnswers,
                currentQuestionIndex: progressData.currentQuestionIndex
            }
        });
        
        console.log('✅ Прогресс сохранен на сервере');
        
        // Также сохраняем локально для быстрого доступа
        this.saveTrainerProgressLocal(block, progressData, user);
        
        return result;
        
    } catch (error) {
        console.error('❌ Ошибка сохранения на сервере, сохраняем локально:', error);
        this.saveTrainerProgressLocal(block, progressData, user);
        return { 
            success: true, 
            local: true,
            error: 'Сохранено локально (ошибка сервера)' 
        };
    }
}

// Получение прогресса тренажера
async getTrainerProgress(block = null) {
    const user = this.getUserFromStorage();
    
    if (!user) {
        console.log('❌ Нет пользователя для загрузки прогресса');
        return { success: false, error: 'Пользователь не найден' };
    }
    
    console.log(`📥 Загружаем прогресс для: ${user.name}, блок: ${block || 'все'}`);
    
    // Для гостей - только локальное хранилище
    if (user.userType === 'guest') {
        console.log('👤 Гость - загружаем локально');
        const localProgress = this.getTrainerProgressLocal(block);
        return { 
            success: true, 
            progress: localProgress,
            local: true 
        };
    }
    
    try {
        // Пробуем загрузить с сервера
        let endpoint;
        if (block) {
            endpoint = `/trainer-progress/${user.id}/${block}`;
        } else {
            endpoint = `/trainer-progress/${user.id}`;
        }
        
        const result = await this.request(endpoint);
        
        if (result.success && result.progress) {
            console.log(`✅ Прогресс загружен с сервера для блока: ${block || 'все'}`);
            
            // Сохраняем также локально для быстрого доступа
            if (block && result.progress) {
                this.saveTrainerProgressLocal(block, result.progress, user);
            } else if (result.progress && typeof result.progress === 'object') {
                // Сохраняем все блоки локально
                for (const [blockKey, blockProgress] of Object.entries(result.progress)) {
                    this.saveTrainerProgressLocal(blockKey, blockProgress, user);
                }
            }
            
            return result;
        } else {
            console.log('⚠️ На сервере нет данных, пробуем локально');
            const localProgress = this.getTrainerProgressLocal(block);
            return { 
                success: true, 
                progress: localProgress,
                local: true 
            };
        }
        
    } catch (error) {
        console.error('❌ Ошибка загрузки с сервера:', error);
        // При ошибке загружаем локально
        const localProgress = this.getTrainerProgressLocal(block);
        return { 
            success: true, 
            progress: localProgress,
            local: true,
            error: 'Загружено локально (ошибка сервера)' 
        };
    }
}

// Удаление прогресса
async deleteTrainerProgress(block = null) {
    const user = this.getUserFromStorage();
    
    if (!user) {
        return { success: false, error: 'Пользователь не найден' };
    }
    
    console.log(`🗑️ Удаление прогресса для: ${user.name}, блок: ${block || 'все'}`);
    
    // Удаляем локально в любом случае
    this.deleteTrainerProgressLocal(block, user);
    
    // Для гостей - только локальное удаление
    if (user.userType === 'guest') {
        return { success: true, local: true };
    }
    
    try {
        let endpoint;
        if (block) {
            endpoint = `/trainer-progress/${user.id}/${block}`;
        } else {
            endpoint = `/trainer-progress/${user.id}`;
        }
        
        // Пытаемся удалить с сервера
        const result = await this.request(endpoint, { method: 'DELETE' });
        return result;
        
    } catch (error) {
        console.error('❌ Ошибка удаления с сервера:', error);
        return { success: true, local: true };
    }
}

// Локальные методы для тренажера (ОСТАВЬТЕ ИХ КАК ЕСТЬ, они уже правильные)
saveTrainerProgressLocal(block, progressData, user) {
    const userToUse = user || this.getUserFromStorage();
    if (!userToUse) return;
    
    const storageKey = userToUse.userType === 'guest' 
        ? 'trainerProgress_guest' 
        : `trainerProgress_${userToUse.id}`;
    
    let allProgress = JSON.parse(localStorage.getItem(storageKey) || '{}');
    
    allProgress[block] = {
        ...progressData,
        userId: userToUse.id,
        timestamp: new Date().toISOString()
    };
    
    localStorage.setItem(storageKey, JSON.stringify(allProgress));
    console.log(`💾 Локальный прогресс сохранен: ${block}, ключ: ${storageKey}`);
}

getTrainerProgressLocal(block = null) {
    const user = this.getUserFromStorage();
    if (!user) return block ? null : {};
    
    const storageKey = user.userType === 'guest' 
        ? 'trainerProgress_guest' 
        : `trainerProgress_${user.id}`;
    
    const allProgress = JSON.parse(localStorage.getItem(storageKey) || '{}');
    
    if (block) {
        const blockProgress = allProgress[block];
        // Проверяем принадлежность данных
        if (blockProgress && (blockProgress.userId === user.id || user.userType === 'guest')) {
            return blockProgress;
        }
        return null;
    }
    
    // Фильтруем только прогресс текущего пользователя
    const filteredProgress = {};
    for (const [blockKey, blockProgress] of Object.entries(allProgress)) {
        if (blockProgress.userId === user.id || user.userType === 'guest') {
            filteredProgress[blockKey] = blockProgress;
        }
    }
    
    return filteredProgress;
}

deleteTrainerProgressLocal(block, user) {
    const userToUse = user || this.getUserFromStorage();
    if (!userToUse) return;
    
    const storageKey = userToUse.userType === 'guest' 
        ? 'trainerProgress_guest' 
        : `trainerProgress_${userToUse.id}`;
    
    let allProgress = JSON.parse(localStorage.getItem(storageKey) || '{}');
    
    if (block) {
        delete allProgress[block];
    } else {
        allProgress = {};
    }
    
    localStorage.setItem(storageKey, JSON.stringify(allProgress));
    console.log(`🗑️ Локальный прогресс удален: ${block || 'все'}`);
}

// Загрузка прогресса тренажера с сервера
async loadTrainerProgress(block = null) {
    const user = this.getUserFromStorage();
    
    if (!user) {
        console.log('❌ Нет пользователя для загрузки прогресса');
        return { success: false, error: 'Пользователь не найден' };
    }
    
    if (user.userType === 'guest') {
        console.log('👤 Гость - загружаем только локально');
        const localData = this.getTrainerProgressLocal(block);
        return { 
            success: true, 
            progress: localData,
            local: true 
        };
    }
    
    try {
        console.log(`📥 Загружаем прогресс с сервера для пользователя: ${user.id}`);
        
        const endpoint = block 
            ? `/trainer-progress/${user.id}/${block}`
            : `/trainer-progress/${user.id}`;
            
        const result = await this.request(endpoint);
        
        if (result.success) {
            console.log(`✅ Прогресс загружен с сервера для блока: ${block || 'все'}`);
            
            // Сохраняем также локально для быстрого доступа
            if (block && result.progress) {
                const storageKey = `trainerProgress_${user.id}`;
                let allProgress = JSON.parse(localStorage.getItem(storageKey) || '{}');
                allProgress[block] = result.progress;
                localStorage.setItem(storageKey, JSON.stringify(allProgress));
            }
        }
        
        return result;
        
    } catch (error) {
        console.error('❌ Ошибка загрузки прогресса с сервера:', error);
        
        // При ошибке загружаем локально
        const localData = this.getTrainerProgressLocal(block);
        return { 
            success: true, 
            progress: localData,
            local: true,
            error: 'Загружено локально (ошибка сервера)' 
        };
    }
}

// Удаление прогресса
async deleteTrainerProgress(block = null) {
    const user = this.getUserFromStorage();
    
    if (!user) {
        return { success: false, error: 'Пользователь не найден' };
    }
    
    if (user.userType === 'guest') {
        this.deleteTrainerProgressLocal(block, user);
        return { success: true, local: true };
    }
    
    try {
        const endpoint = block 
            ? `/trainer-progress/${user.id}/${block}`
            : `/trainer-progress/${user.id}`;
            
        return await this.request(endpoint, { method: 'DELETE' });
    } catch (error) {
        console.error('❌ Ошибка удаления прогресса:', error);
        this.deleteTrainerProgressLocal(block, user);
        return { success: true, local: true };
    }
}

// Локальные методы для тренажера
saveTrainerProgressLocal(block, data, user) {
    const userToUse = user || this.getUserFromStorage();
    if (!userToUse) return;
    
    const storageKey = userToUse.userType === 'guest' 
        ? 'trainerProgress_guest' 
        : `trainerProgress_${userToUse.id}`;
    
    let allProgress = JSON.parse(localStorage.getItem(storageKey) || '{}');
    allProgress[block] = {
        ...data,
        userId: userToUse.id,
        timestamp: new Date().toISOString()
    };
    
    localStorage.setItem(storageKey, JSON.stringify(allProgress));
    console.log(`💾 Локальный прогресс сохранен: ${block}`);
}

getTrainerProgressLocal(block = null) {
    const user = this.getUserFromStorage();
    if (!user) return block ? null : {};
    
    const storageKey = user.userType === 'guest' 
        ? 'trainerProgress_guest' 
        : `trainerProgress_${user.id}`;
    
    const allProgress = JSON.parse(localStorage.getItem(storageKey) || '{}');
    
    if (block) {
        const blockProgress = allProgress[block];
        // Проверяем, что прогресс принадлежит текущему пользователю
        if (blockProgress && (blockProgress.userId === user.id || user.userType === 'guest')) {
            return blockProgress;
        }
        return null;
    }
    
    return allProgress;
}

deleteTrainerProgressLocal(block, user) {
    const userToUse = user || this.getUserFromStorage();
    if (!userToUse) return;
    
    const storageKey = userToUse.userType === 'guest' 
        ? 'trainerProgress_guest' 
        : `trainerProgress_${userToUse.id}`;
    
    let allProgress = JSON.parse(localStorage.getItem(storageKey) || '{}');
    
    if (block) {
        delete allProgress[block];
    } else {
        allProgress = {};
    }
    
    localStorage.setItem(storageKey, JSON.stringify(allProgress));
    console.log(`🗑️ Локальный прогресс удален: ${block || 'весь'}`);
}

    async getTrainerProgress(block = null) {
        const user = this.getUserFromStorage();
        
        if (!user) {
            console.log('👤 Пользователь не найден');
            return { 
                success: false, 
                error: 'Пользователь не найден' 
            };
        }
        
        if (user.userType === 'guest') {
            console.log('👤 Гость - прогресс не загружается с сервера');
            return { 
                success: true, 
                progress: block ? {
                    userAnswers: [],
                    currentQuestionIndex: 0
                } : {},
                local: true
            };
        }
        
        try {
            const endpoint = block 
                ? `/trainer-progress/${user.id}/${block}`
                : `/trainer-progress/${user.id}`;
            
            return await this.request(endpoint);
        } catch (error) {
            console.error('❌ Ошибка получения прогресса тренажера:', error);
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    // === ПОПЫТКИ ЭКЗАМЕНА ===
    
    async saveExamAttempt(attempt) {
        const user = this.getUserFromStorage();
        
        if (!user) {
            console.log('❌ Пользователь не найден');
            return { success: false, error: 'Пользователь не найден' };
        }
        
        console.log('💾 Сохраняем попытку для пользователя:', user.id, 'Тип:', user.userType);
        
        if (user.userType === 'guest') {
            console.log('👤 Гость - сохраняем только локально');
            this.saveExamAttemptLocal(attempt, user);
            return { success: true, local: true };
        }
        
        try {
            const result = await this.request('/exam-attempts', {
                method: 'POST',
                body: {
                    userId: user.id,
                    attempt: attempt
                }
            });
            
            console.log('✅ Попытка сохранена на сервере:', result);
            return result;
            
        } catch (error) {
            console.error('❌ Ошибка сохранения попытки на сервере:', error);
            this.saveExamAttemptLocal(attempt, user);
            return { 
                success: true, 
                local: true,
                error: 'Сохранено локально (ошибка сервера)' 
            };
        }
    }

    async getExamAttempts() {
        const user = this.getUserFromStorage();
        
        if (!user) {
            console.log('❌ Пользователь не найден');
            return { success: false, error: 'Пользователь не найден' };
        }
        
        console.log('📥 Загружаем попытки для:', user.id, 'Тип:', user.userType);
        
        if (user.userType === 'guest') {
            console.log('👤 Гость - загружаем локальные данные');
            return {
                success: true,
                attempts: this.getExamAttemptsLocal(user),
                local: true
            };
        }
        
        try {
            const result = await this.request(`/exam-attempts/${user.id}`);
            console.log('✅ Данные с сервера:', result.attempts?.length || 0, 'попыток');
            return result;
        } catch (error) {
            console.error('❌ Ошибка загрузки попыток с сервера:', error);
            return {
                success: true,
                attempts: this.getExamAttemptsLocal(user),
                local: true,
                error: 'Загружено локально (ошибка сервера)'
            };
        }
    }

    async deleteExamAttempt(attemptId) {
        const user = this.getUserFromStorage();
        
        if (!user) {
            return { success: false, error: 'Пользователь не найден' };
        }
        
        if (user.userType === 'guest') {
            this.deleteExamAttemptLocal(attemptId, user);
            return { success: true, local: true };
        }
        
        try {
            return await this.request(`/exam-attempts/${user.id}/${attemptId}`, {
                method: 'DELETE'
            });
        } catch (error) {
            console.error('❌ Ошибка удаления попытки:', error);
            this.deleteExamAttemptLocal(attemptId, user);
            return { success: true, local: true };
        }
    }

    // === ЛОКАЛЬНОЕ ХРАНЕНИЕ ===

    // Прогресс тренажера локально
    saveTrainerProgressLocal(block, userAnswers, currentQuestionIndex) {
        const user = this.getUserFromStorage();
        if (!user) return;
        
        const storageKey = `trainerProgress_${user.id}`;
        let allProgress = JSON.parse(localStorage.getItem(storageKey) || '{}');
        
        allProgress[block] = {
            userAnswers,
            currentQuestionIndex,
            userId: user.id,
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem(storageKey, JSON.stringify(allProgress));
        console.log('💾 Локальный прогресс тренажера сохранен:', block);
    }

    getTrainerProgressLocal(block = null) {
        const user = this.getUserFromStorage();
        if (!user) return block ? { userAnswers: [], currentQuestionIndex: 0 } : {};
        
        const storageKey = `trainerProgress_${user.id}`;
        const allProgress = JSON.parse(localStorage.getItem(storageKey) || '{}');
        
        if (block) {
            return allProgress[block] || { userAnswers: [], currentQuestionIndex: 0 };
        }
        
        return allProgress;
    }

    // Попытки экзамена локально
    saveExamAttemptLocal(attempt, user) {
        const storageKey = `examAttempts_${user.id}`;
        const attempts = this.getExamAttemptsLocal(user);
        
        const attemptWithId = {
            ...attempt,
            id: 'local_' + Date.now(),
            date: new Date().toISOString(),
            userId: user.id
        };
        
        attempts.push(attemptWithId);
        localStorage.setItem(storageKey, JSON.stringify(attempts));
        
        console.log('💾 Попытка сохранена локально:', attemptWithId.id, 'Ключ:', storageKey);
    }

    getExamAttemptsLocal(user) {
        const storageKey = `examAttempts_${user.id}`;
        const attemptsJson = localStorage.getItem(storageKey);
        return attemptsJson ? JSON.parse(attemptsJson) : [];
    }

    deleteExamAttemptLocal(attemptId, user) {
        const storageKey = `examAttempts_${user.id}`;
        let attempts = this.getExamAttemptsLocal(user);
        attempts = attempts.filter(a => a.id !== attemptId);
        localStorage.setItem(storageKey, JSON.stringify(attempts));
        
        console.log('🗑️ Локальная попытка удалена:', attemptId, 'Ключ:', storageKey);
    }

    // === УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЕМ ===
    
    saveUserToStorage(user) {
        console.log('💾 СОХРАНЕНИЕ ПОЛЬЗОВАТЕЛЯ В LOCALSTORAGE');
        console.log('Данные пользователя:', user);
        
        // Сохраняем ВСЕ данные
        localStorage.setItem('currentUser', JSON.stringify(user));
        localStorage.setItem('isAuthorized', user.isAuthorized || false);
        localStorage.setItem('userType', user.userType || 'guest');
        localStorage.setItem('userName', user.name || 'Гость');
        localStorage.setItem('userId', user.id);
        
        // Устанавливаем текущего пользователя
        this.currentUser = user;
        
        console.log('✅ Пользователь сохранен');
    }
    
    loadUserFromStorage() {
        const userJson = localStorage.getItem('currentUser');
        if (userJson) {
            try {
                this.currentUser = JSON.parse(userJson);
                console.log('👤 Пользователь загружен из localStorage:', this.currentUser.name);
            } catch (e) {
                console.error('❌ Ошибка парсинга пользователя:', e);
                this.currentUser = null;
            }
        }
        return this.currentUser;
    }

    getUserFromStorage() {
        if (!this.currentUser) {
            return this.loadUserFromStorage();
        }
        return this.currentUser;
    }

    async logout() {
        console.log('👋 Выход из системы');
        const user = this.getUserFromStorage();
        
        if (user && user.userType === 'yandex') {
            // Для Яндекс пользователей - отзываем токен
            try {
                await this.yandexLogout(user.id);
                console.log('✅ Яндекс токен отозван');
            } catch (error) {
                console.warn('⚠️ Не удалось отозвать Яндекс токен:', error);
            }
        }
        
        // Если был пользователь, очищаем его локальные данные
        if (user) {
            const attemptsKey = `examAttempts_${user.id}`;
            const progressKey = `trainerProgress_${user.id}`;
            localStorage.removeItem(attemptsKey);
            localStorage.removeItem(progressKey);
        }
        
        // Очищаем данные авторизации
        localStorage.removeItem('currentUser');
        localStorage.removeItem('isAuthorized');
        localStorage.removeItem('userType');
        localStorage.removeItem('userName');
        localStorage.removeItem('userId');
        
        this.currentUser = null;
        
        // Перенаправляем на страницу логина
        window.location.href = 'login.html';
    }

    isLoggedIn() {
        return !!this.getUserFromStorage();
    }

    isGuest() {
        const user = this.getUserFromStorage();
        return user && user.userType === 'guest';
    }
    
    isYandexUser() {
        const user = this.getUserFromStorage();
        return user && user.userType === 'yandex';
    }
    
    // Перенос данных гостя на сервер при входе через Яндекс
    async migrateGuestData(targetUserId) {
        const user = this.getUserFromStorage();
        
        if (!user || user.userType !== 'yandex') {
            console.log('👤 Для переноса нужен Яндекс пользователь');
            return { success: false, error: 'Для переноса нужен Яндекс пользователь' };
        }
        
        console.log('🚚 Перенос данных гостя на сервер для пользователя:', user.id);
        
        // Находим гостевые данные (старый формат)
        const guestAttemptsKey = 'examAttempts_guest';
        const guestAttempts = JSON.parse(localStorage.getItem(guestAttemptsKey) || '[]');
        
        // Находим гостевой прогресс
        const guestProgressKey = 'trainerProgress_guest';
        const guestProgress = JSON.parse(localStorage.getItem(guestProgressKey) || '{}');
        
        let migratedCount = 0;
        let migratedBlocks = 0;
        
        // Перенос попыток экзамена
        for (const attempt of guestAttempts) {
            try {
                await this.saveExamAttempt(attempt);
                migratedCount++;
            } catch (error) {
                console.error('❌ Ошибка переноса попытки:', error);
            }
        }
        
        // Перенос прогресса тренажера
        for (const [block, progress] of Object.entries(guestProgress)) {
            try {
                await this.saveTrainerProgress(
                    block, 
                    progress.userAnswers, 
                    progress.currentQuestionIndex
                );
                migratedBlocks++;
            } catch (error) {
                console.error(`❌ Ошибка переноса прогресса для блока ${block}:`, error);
            }
        }
        
        // Очищаем гостевые данные
        localStorage.removeItem(guestAttemptsKey);
        localStorage.removeItem(guestProgressKey);
        
        console.log(`🎉 Перенос завершен: ${migratedCount} попыток экзамена, ${migratedBlocks} блоков прогресса`);
        
        return {
            success: true,
            migratedAttempts: migratedCount,
            migratedBlocks: migratedBlocks
        };
    }

    // Вспомогательный метод для отладки
    debugStorage() {
        console.log('🔍 ДЕБАГ LOCALSTORAGE:');
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            console.log(`${key}: ${localStorage.getItem(key)}`);
        }
    }
}

// Создаем глобальный экземпляр
window.examAPI = new ExamAPI();

// Тестовый вызов при загрузке
window.addEventListener('DOMContentLoaded', () => {
    const user = window.examAPI.getUserFromStorage();
    console.log('🚀 API загружен. Текущий пользователь:', 
        user ? `${user.name} (${user.userType}, id: ${user.id})` : 'не авторизован');
});