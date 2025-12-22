// API для работы с бэкендом - ТОЛЬКО Яндекс OAuth и гостевой вход
class ExamAPI {
    constructor() {
        this.baseURL = 'http://localhost:3000';
        this.currentUser = null;
        this.init();
    }

    // Инициализация
    init() {
        console.log('🚀 ExamAPI инициализирован (только Яндекс OAuth + гостевой вход)');
        this.loadUserFromStorage();
    }

    // Общий метод для запросов с улучшенной обработкой ошибок
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
            
            // Проверяем Content-Type
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.error || `Ошибка ${response.status}`);
                }
                
                console.log(`✅ API ответ:`, data);
                return data;
            } else {
                // Если ответ не JSON, это ошибка
                const text = await response.text();
                console.warn(`⚠️ Ответ не JSON, получаем: ${text.substring(0, 100)}...`);
                
                // Если это HTML страница, значит маршрута нет
                if (text.includes('<!DOCTYPE') || text.includes('<html')) {
                    throw new Error('API маршрут не найден на сервере');
                } else {
                    throw new Error(`Некорректный ответ сервера: ${response.status}`);
                }
            }
        } catch (error) {
            console.error('❌ API Error:', error.message);
            throw error;
        }
    }

    // === ПРОГРЕСС ТРЕНАЖЕРА ===
    
    async saveTrainerProgress(block, userAnswers, currentQuestionIndex) {
        const user = this.getUserFromStorage();
        
        if (!user) {
            console.log('👤 Пользователь не найден');
            return { success: false, error: 'Пользователь не найден' };
        }
        
        // Для всех пользователей сохраняем локально, т.к. API маршрута может не быть
        console.log('💾 Сохраняем прогресс тренажера локально:', block);
        this.saveTrainerProgressLocal(block, userAnswers, currentQuestionIndex);
        
        if (user.userType === 'guest') {
            return { success: true, local: true };
        }
        
        // Для зарегистрированных пробуем отправить на сервер
        try {
            const result = await this.request('/api/trainer-progress', {
                method: 'POST',
                body: {
                    userId: user.id,
                    block,
                    userAnswers,
                    currentQuestionIndex
                }
            });
            
            console.log('✅ Прогресс тренажера сохранен на сервере');
            return result;
            
        } catch (error) {
            console.warn('⚠️ Не удалось сохранить на сервер, используем локальное хранилище');
            return { 
                success: true, 
                local: true,
                error: 'Сохранено локально (ошибка сервера)' 
            };
        }
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
        
        console.log('📥 Загружаем прогресс тренажера для:', user.id);
        
        // Сначала пробуем загрузить локально
        const localProgress = this.getTrainerProgressLocal(block);
        
        if (user.userType === 'guest') {
            console.log('👤 Гость - используем локальные данные');
            return { 
                success: true, 
                progress: localProgress,
                local: true
            };
        }
        
        // Для зарегистрированных пробуем сервер
        try {
            const endpoint = block 
                ? `/api/trainer-progress/${user.id}/${block}`
                : `/api/trainer-progress/${user.id}`;
            
            const result = await this.request(endpoint);
            console.log('✅ Прогресс тренажера загружен с сервера');
            
            // Объединяем с локальными данными (если сервер вернул данные)
            if (result.success && result.progress) {
                // Можно добавить логику слияния данных
                return result;
            } else {
                // Если сервер вернул пустые данные, используем локальные
                console.log('⚠️ Сервер вернул пустые данные, используем локальные');
                return {
                    success: true,
                    progress: localProgress,
                    local: true
                };
            }
            
        } catch (error) {
            console.warn('⚠️ Не удалось загрузить с сервера, используем локальные данные:', error.message);
            return {
                success: true,
                progress: localProgress,
                local: true,
                error: 'Загружено локально (ошибка сервера)'
            };
        }
    }

    // === СИМУЛЯЦИЯ ЭКЗАМЕНА ===
    
    async saveSimulationProgress(block, currentQuestionIndex, userAnswers) {
        const user = this.getUserFromStorage();
        
        if (!user) {
            return { success: false, error: 'Пользователь не найден' };
        }
        
        console.log('💾 Сохраняем прогресс симуляции для:', user.id, 'Тип:', user.userType);
        
        // Для всех пользователей сохраняем только локально
        console.log('🔧 Сохраняем только локально');
        this.saveSimulationProgressLocal(block, currentQuestionIndex, userAnswers, user);
        return { success: true, local: true };
    }

    async getSimulationProgress(block) {
        const user = this.getUserFromStorage();
        
        if (!user) {
            return { success: false, error: 'Пользователь не найден' };
        }
        
        console.log('📥 Загружаем прогресс симуляции для:', user.id);
        
        // Всегда используем локальное хранилище для симуляции
        const progress = this.getSimulationProgressLocal(block, user);
        
        return {
            success: true,
            progress: progress,
            local: true
        };
    }

    async deleteSimulationProgress(block) {
        const user = this.getUserFromStorage();
        
        if (!user) {
            return { success: false, error: 'Пользователь не найден' };
        }
        
        this.deleteSimulationProgressLocal(block, user);
        return { success: true, local: true };
    }

    // === ПОПЫТКИ ЭКЗАМЕНА ===
    
    async saveExamAttempt(attempt) {
        const user = this.getUserFromStorage();
        
        if (!user) {
            console.log('❌ Пользователь не найден');
            return { success: false, error: 'Пользователь не найден' };
        }
        
        console.log('💾 Сохраняем попытку для пользователя:', user.id);
        
        // Всегда сохраняем локально
        this.saveExamAttemptLocal(attempt, user);
        
        if (user.userType === 'guest') {
            console.log('👤 Гость - сохраняем только локально');
            return { success: true, local: true };
        }
        
        // Для зарегистрированных пробуем сервер
        try {
            const result = await this.request('/api/exam-attempts', {
                method: 'POST',
                body: {
                    userId: user.id,
                    attempt: attempt
                }
            });
            
            console.log('✅ Попытка сохранена на сервере');
            return result;
            
        } catch (error) {
            console.warn('⚠️ Не удалось сохранить на сервер, используем локальное хранилище');
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
        
        console.log('📥 Загружаем попытки для:', user.id);
        
        // Всегда загружаем локально
        const localAttempts = this.getExamAttemptsLocal(user);
        
        if (user.userType === 'guest') {
            console.log('👤 Гость - используем локальные данные');
            return {
                success: true,
                attempts: localAttempts,
                local: true
            };
        }
        
        // Для зарегистрированных пробуем сервер
        try {
            const result = await this.request(`/api/exam-attempts/${user.id}`);
            console.log('✅ Данные с сервера:', result.attempts?.length || 0, 'попыток');
            
            // Объединяем с локальными данными
            if (result.success && result.attempts && result.attempts.length > 0) {
                return result;
            } else {
                // Если сервер вернул пустые данные, используем локальные
                console.log('⚠️ Сервер вернул пустые данные, используем локальные');
                return {
                    success: true,
                    attempts: localAttempts,
                    local: true
                };
            }
            
        } catch (error) {
            console.warn('⚠️ Не удалось загрузить с сервера, используем локальные данные');
            return {
                success: true,
                attempts: localAttempts,
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
        
        // Всегда удаляем локально
        this.deleteExamAttemptLocal(attemptId, user);
        
        if (user.userType === 'guest') {
            return { success: true, local: true };
        }
        
        // Для зарегистрированных пробуем сервер
        try {
            return await this.request(`/api/exam-attempts/${user.id}/${attemptId}`, {
                method: 'DELETE'
            });
        } catch (error) {
            console.warn('⚠️ Не удалось удалить с сервера');
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
        console.log('💾 Локальный прогресс тренажера сохранен:', block, 'Ключ:', storageKey);
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

    // Прогресс симуляции локально
    saveSimulationProgressLocal(block, currentQuestionIndex, userAnswers, user) {
        const storageKey = user.userType === 'guest' 
            ? 'simulationProgress_guest' 
            : `simulationProgress_${user.id}`;
        
        let allProgress = JSON.parse(localStorage.getItem(storageKey) || '{}');
        
        allProgress[block] = {
            currentQuestionIndex: currentQuestionIndex,
            userAnswers: userAnswers,
            timestamp: new Date().toISOString(),
            userId: user.id,
            userType: user.userType
        };
        
        localStorage.setItem(storageKey, JSON.stringify(allProgress));
        console.log('💾 Локальный прогресс симуляции сохранен:', block, 'Ключ:', storageKey);
    }

    getSimulationProgressLocal(block, user) {
        const storageKey = user.userType === 'guest' 
            ? 'simulationProgress_guest' 
            : `simulationProgress_${user.id}`;
        
        console.log('🔍 Ищем локальный прогресс по ключу:', storageKey);
        const allProgress = JSON.parse(localStorage.getItem(storageKey) || '{}');
        const progress = allProgress[block] || null;
        
        if (progress) {
            console.log('✅ Найден локальный прогресс');
        } else {
            console.log('📭 Локальный прогресс не найден');
        }
        
        return progress;
    }

    deleteSimulationProgressLocal(block, user) {
        const storageKey = user.userType === 'guest' 
            ? 'simulationProgress_guest' 
            : `simulationProgress_${user.id}`;
        
        let allProgress = JSON.parse(localStorage.getItem(storageKey) || '{}');
        delete allProgress[block];
        localStorage.setItem(storageKey, JSON.stringify(allProgress));
        
        console.log('🗑️ Локальный прогресс симуляции удален:', block);
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
        
        console.log('🗑️ Локальная попытка удалена:', attemptId);
    }

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
            // Для гостей очищаем ВСЕ данные
            if (user.userType === 'guest') {
                const guestKeys = [
                    'examAttempts_guest',
                    'trainerProgress_guest', 
                    'simulationProgress_guest'
                ];
                
                guestKeys.forEach(key => {
                    localStorage.removeItem(key);
                    console.log(`🗑️ Удалено: ${key}`);
                });
            } else {
                // Для зарегистрированных оставляем данные
                console.log('🔐 Данные зарегистрированного пользователя сохранены');
            }
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
        
        // Находим гостевые симуляции
        const guestSimulationKey = 'simulationProgress_guest';
        const guestSimulation = JSON.parse(localStorage.getItem(guestSimulationKey) || '{}');
        
        let migratedCount = 0;
        let migratedBlocks = 0;
        let migratedSimulations = 0;
        
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
        
        // Перенос симуляций
        for (const [block, simulation] of Object.entries(guestSimulation)) {
            try {
                await this.saveSimulationProgress(
                    block,
                    simulation.currentQuestionIndex,
                    simulation.userAnswers
                );
                migratedSimulations++;
            } catch (error) {
                console.error(`❌ Ошибка переноса симуляции для блока ${block}:`, error);
            }
        }
        
        // Очищаем гостевые данные
        localStorage.removeItem(guestAttemptsKey);
        localStorage.removeItem(guestProgressKey);
        localStorage.removeItem(guestSimulationKey);
        
        console.log(`🎉 Перенос завершен: ${migratedCount} попыток экзамена, ${migratedBlocks} блоков прогресса, ${migratedSimulations} симуляций`);
        
        return {
            success: true,
            migratedAttempts: migratedCount,
            migratedBlocks: migratedBlocks,
            migratedSimulations: migratedSimulations
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