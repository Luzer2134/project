// API для работы с бэкендом - версия с SQLite
class ExamAPI {
    constructor() {
        this.baseURL = '';
        this.currentUser = null;
        this.init();
    }

    // Инициализация
    init() {
        console.log('🚀 ExamAPI инициализирован (SQLite версия)');
        this.loadUserFromStorage();
        
        // Проверяем соединение с сервером
        this.checkConnection();
    }

    // Проверка соединения с сервером
    async checkConnection() {
        try {
            const result = await this.request('/api/test');
            console.log('✅ Сервер доступен:', result.message);
            return true;
        } catch (error) {
            console.warn('⚠️ Сервер не отвечает, используем только локальное хранилище');
            return false;
        }
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
            
            // Проверяем если это ошибка сети
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                throw new Error('Сервер недоступен. Проверьте запущен ли сервер на localhost:3000');
            }
            
            throw error;
        }
    }

    // === АВТОРИЗАЦИЯ ===

    // Гостевой вход
    async guestLogin() {
        try {
            console.log('👤 Гостевой вход...');
            const result = await this.request('/api/guest', {
                method: 'POST'
            });
            
            if (result.success && result.user) {
                this.saveUserToStorage(result.user);
                console.log('✅ Гостевой вход успешен');
                return { success: true, user: result.user };
            } else {
                return { success: false, error: result.error || 'Ошибка входа' };
            }
        } catch (error) {
            console.error('❌ Ошибка гостевого входа:', error);
            
            // Если сервер недоступен, создаем локального гостя
            if (error.message.includes('Сервер недоступен') || error.message.includes('NetworkError')) {
                console.log('🔄 Создаем локального гостя (сервер недоступен)');
                return this.createLocalGuest();
            }
            
            return { success: false, error: error.message };
        }
    }

    // Создание локального гостя (когда сервер недоступен)
    createLocalGuest() {
        const guestUser = {
            id: 'local_guest_' + Date.now(),
            email: 'guest_' + Date.now() + '@temp.com',
            name: 'Гость (локальный)',
            userType: 'guest',
            isAuthorized: false,
            createdAt: new Date().toISOString()
        };
        
        this.saveUserToStorage(guestUser);
        console.log('✅ Локальный гость создан');
        return { success: true, user: guestUser, local: true };
    }

    // Выход из Яндекс
    async yandexLogout(userId) {
        try {
            const result = await this.request(`/auth/yandex/logout?userId=${userId}`);
            return result;
        } catch (error) {
            console.warn('⚠️ Ошибка выхода из Яндекс:', error);
            return { success: false, error: error.message };
        }
    }

    // === ПРОГРЕСС ТРЕНАЖЕРА ===
    
    async saveTrainerProgress(block, userAnswers, currentQuestionIndex) {
        const user = this.getUserFromStorage();
        
        if (!user) {
            console.log('👤 Пользователь не найден');
            return { success: false, error: 'Пользователь не найден' };
        }
        
        console.log('💾 Сохраняем прогресс тренажера:', block, 'для пользователя:', user.id);
        
        // Всегда сохраняем локально для быстрого доступа
        this.saveTrainerProgressLocal(block, userAnswers, currentQuestionIndex);
        
        // Если пользователь гость или сервер недоступен, сохраняем только локально
        if (user.userType === 'guest') {
            console.log('👤 Гость - сохраняем только локально');
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
            console.warn('⚠️ Не удалось сохранить на сервер, используем локальное хранилище:', error.message);
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
        
        console.log('📥 Загружаем прогресс тренажера для:', user.id, block ? `блок: ${block}` : 'все блоки');
        
        // Сначала пробуем загрузить локально (для быстрого отображения)
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
            
            if (result.success && result.progress) {
                console.log('✅ Прогресс тренажера загружен с сервера');
                
                // Обновляем локальные данные данными с сервера
                if (block && result.progress.userAnswers) {
                    this.saveTrainerProgressLocal(block, result.progress.userAnswers, result.progress.currentQuestionIndex);
                } else if (!block) {
                    // Для всех блоков
                    Object.keys(result.progress).forEach(b => {
                        if (result.progress[b]) {
                            this.saveTrainerProgressLocal(
                                b, 
                                result.progress[b].userAnswers, 
                                result.progress[b].currentQuestionIndex
                            );
                        }
                    });
                }
                
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
        
        console.log('💾 Сохраняем прогресс симуляции для:', user.id, 'блок:', block);
        
        // Сохраняем локально
        this.saveSimulationProgressLocal(block, currentQuestionIndex, userAnswers, user);
        
        // Если пользователь гость или сервер недоступен, сохраняем только локально
        if (user.userType === 'guest') {
            console.log('👤 Гость - сохраняем только локально');
            return { success: true, local: true };
        }
        
        // Для зарегистрированных пробуем сервер
        try {
            const result = await this.request('/api/simulation-progress', {
                method: 'POST',
                body: {
                    userId: user.id,
                    block,
                    userAnswers,
                    currentQuestionIndex
                }
            });
            
            console.log('✅ Прогресс симуляции сохранен на сервере');
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

    async getSimulationProgress(block) {
        const user = this.getUserFromStorage();
        
        if (!user) {
            return { success: false, error: 'Пользователь не найден' };
        }
        
        console.log('📥 Загружаем прогресс симуляции для:', user.id, 'блок:', block);
        
        // Сначала пробуем локально
        const localProgress = this.getSimulationProgressLocal(block, user);
        
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
            const result = await this.request(`/api/simulation-progress/${user.id}/${block}`);
            
            if (result.success) {
                console.log('✅ Прогресс симуляции загружен с сервера');
                
                // Обновляем локальные данные
                if (result.progress) {
                    this.saveSimulationProgressLocal(
                        block, 
                        result.progress.currentQuestionIndex, 
                        result.progress.userAnswers, 
                        user
                    );
                }
                
                return result;
            } else {
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

    async deleteSimulationProgress(block) {
        const user = this.getUserFromStorage();
        
        if (!user) {
            return { success: false, error: 'Пользователь не найден' };
        }
        
        // Удаляем локально
        this.deleteSimulationProgressLocal(block, user);
        
        // Если пользователь гость, удаляем только локально
        if (user.userType === 'guest') {
            return { success: true, local: true };
        }
        
        // Для зарегистрированных пробуем сервер
        try {
            const result = await this.request(`/api/simulation-progress/${user.id}/${block}`, {
                method: 'DELETE'
            });
            
            return result;
            
        } catch (error) {
            console.warn('⚠️ Не удалось удалить с сервера, удаляем локально');
            return { success: true, local: true };
        }
    }

    // === ПОПЫТКИ ЭКЗАМЕНА ===
    
    async saveExamAttempt(attempt) {
        const user = this.getUserFromStorage();
        
        if (!user) {
            console.log('❌ Пользователь не найден');
            return { success: false, error: 'Пользователь не найден' };
        }
        
        console.log('💾 Сохраняем попытку для пользователя:', user.id, 'блок:', attempt.block);
        
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
            console.warn('⚠️ Не удалось сохранить на сервер, используем локальное хранилище:', error.message);
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
        
        console.log('📥 Загружаем попытки для:', user.id, 'тип:', user.userType);
        
        // Всегда загружаем локально (для быстрого отображения)
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
            
            if (result.success && result.attempts) {
                // Обновляем локальные данные
                this.updateLocalAttempts(result.attempts, user);
                
                // Объединяем с локальными данными (удаляем дубликаты)
                const mergedAttempts = this.mergeAttempts(result.attempts, localAttempts);
                
                return {
                    success: true,
                    attempts: mergedAttempts,
                    fromServer: true
                };
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
            console.warn('⚠️ Не удалось загрузить с сервера, используем локальные данные:', error.message);
            return {
                success: true,
                attempts: localAttempts,
                local: true,
                error: 'Загружено локально (ошибка сервера)'
            };
        }
    }

    // Обновление локальных попыток данными с сервера
    updateLocalAttempts(serverAttempts, user) {
        const storageKey = `examAttempts_${user.id}`;
        const currentLocal = this.getExamAttemptsLocal(user);
        
        // Создаем Map для быстрого поиска по ID
        const serverMap = new Map();
        serverAttempts.forEach(attempt => {
            serverMap.set(attempt.id, attempt);
        });
        
        // Объединяем: серверные данные имеют приоритет
        const updatedAttempts = [...currentLocal];
        
        serverAttempts.forEach(serverAttempt => {
            const localIndex = updatedAttempts.findIndex(a => a.id === serverAttempt.id);
            if (localIndex === -1) {
                // Добавляем новую попытку с сервера
                updatedAttempts.push(serverAttempt);
            } else {
                // Обновляем существующую (серверная версия новее)
                updatedAttempts[localIndex] = serverAttempt;
            }
        });
        
        // Сохраняем обновленные данные
        localStorage.setItem(storageKey, JSON.stringify(updatedAttempts));
        console.log('💾 Локальные попытки обновлены данными с сервера');
    }

    // Объединение попыток с сервера и локальных
    mergeAttempts(serverAttempts, localAttempts) {
        const mergedMap = new Map();
        
        // Сначала добавляем серверные (они имеют приоритет)
        serverAttempts.forEach(attempt => {
            mergedMap.set(attempt.id, attempt);
        });
        
        // Добавляем локальные, которых нет на сервере
        localAttempts.forEach(attempt => {
            if (!mergedMap.has(attempt.id) && attempt.id.startsWith('local_')) {
                mergedMap.set(attempt.id, attempt);
            }
        });
        
        return Array.from(mergedMap.values()).sort((a, b) => {
            const dateA = new Date(a.date || a.attempt_date || 0);
            const dateB = new Date(b.date || b.attempt_date || 0);
            return dateB - dateA; // Новые сверху
        });
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
            console.warn('⚠️ Не удалось удалить с сервера, удаляем локально');
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
            timestamp: new Date().toISOString(),
            synced: false
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
            userType: user.userType,
            synced: false
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
            id: attempt.id || 'local_' + Date.now(),
            date: new Date().toISOString(),
            userId: user.id,
            local: true
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
        const initialLength = attempts.length;
        attempts = attempts.filter(a => a.id !== attemptId);
        
        if (attempts.length < initialLength) {
            localStorage.setItem(storageKey, JSON.stringify(attempts));
            console.log('🗑️ Локальная попытка удалена:', attemptId);
        }
    }

    // === УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ ===

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

    // === СИНХРОНИЗАЦИЯ ДАННЫХ ===

    // Синхронизация локальных данных с сервером
    async syncLocalDataToServer() {
        const user = this.getUserFromStorage();
        
        if (!user || user.userType === 'guest') {
            console.log('👤 Синхронизация не требуется для гостя');
            return { success: true, message: 'Синхронизация не требуется для гостя' };
        }
        
        console.log('🔄 Синхронизация данных с сервером для пользователя:', user.id);
        
        try {
            // 1. Синхронизация прогресса тренажера
            await this.syncTrainerProgress(user);
            
            // 2. Синхронизация попыток экзамена
            await this.syncExamAttempts(user);
            
            // 3. Синхронизация прогресса симуляции
            await this.syncSimulationProgress(user);
            
            console.log('✅ Все данные синхронизированы с сервером');
            return { success: true, message: 'Данные синхронизированы' };
            
        } catch (error) {
            console.error('❌ Ошибка синхронизации:', error);
            return { success: false, error: error.message };
        }
    }

    async syncTrainerProgress(user) {
        const storageKey = `trainerProgress_${user.id}`;
        const localProgress = JSON.parse(localStorage.getItem(storageKey) || '{}');
        
        for (const [block, progress] of Object.entries(localProgress)) {
            if (progress && !progress.synced) {
                try {
                    await this.request('/api/trainer-progress', {
                        method: 'POST',
                        body: {
                            userId: user.id,
                            block,
                            userAnswers: progress.userAnswers,
                            currentQuestionIndex: progress.currentQuestionIndex
                        }
                    });
                    
                    // Помечаем как синхронизированное
                    progress.synced = true;
                    console.log(`✅ Синхронизирован прогресс тренажера: ${block}`);
                    
                } catch (error) {
                    console.warn(`⚠️ Не удалось синхронизировать прогресс тренажера ${block}:`, error.message);
                }
            }
        }
        
        // Сохраняем обновленные данные
        localStorage.setItem(storageKey, JSON.stringify(localProgress));
    }

    async syncExamAttempts(user) {
        const storageKey = `examAttempts_${user.id}`;
        const localAttempts = this.getExamAttemptsLocal(user);
        
        for (const attempt of localAttempts) {
            if (attempt.local && !attempt.synced) {
                try {
                    await this.request('/api/exam-attempts', {
                        method: 'POST',
                        body: {
                            userId: user.id,
                            attempt: {
                                ...attempt,
                                id: undefined // Сервер создаст свой ID
                            }
                        }
                    });
                    
                    // Помечаем как синхронизированное
                    attempt.synced = true;
                    console.log(`✅ Синхронизирована попытка: ${attempt.id}`);
                    
                } catch (error) {
                    console.warn(`⚠️ Не удалось синхронизировать попытку ${attempt.id}:`, error.message);
                }
            }
        }
        
        // Сохраняем обновленные данные
        localStorage.setItem(storageKey, JSON.stringify(localAttempts));
    }

    async syncSimulationProgress(user) {
        const storageKey = user.userType === 'guest' 
            ? 'simulationProgress_guest'
            : `simulationProgress_${user.id}`;
        
        const localProgress = JSON.parse(localStorage.getItem(storageKey) || '{}');
        
        for (const [block, progress] of Object.entries(localProgress)) {
            if (progress && !progress.synced) {
                try {
                    await this.request('/api/simulation-progress', {
                        method: 'POST',
                        body: {
                            userId: user.id,
                            block,
                            userAnswers: progress.userAnswers,
                            currentQuestionIndex: progress.currentQuestionIndex
                        }
                    });
                    
                    // Помечаем как синхронизированное
                    progress.synced = true;
                    console.log(`✅ Синхронизирован прогресс симуляции: ${block}`);
                    
                } catch (error) {
                    console.warn(`⚠️ Не удалось синхронизировать прогресс симуляции ${block}:`, error.message);
                }
            }
        }
        
        // Сохраняем обновленные данные
        localStorage.setItem(storageKey, JSON.stringify(localProgress));
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

    // === СТАТИСТИКА ===

    async getStatistics() {
        const user = this.getUserFromStorage();
        
        if (!user) {
            return { success: false, error: 'Пользователь не найден' };
        }
        
        try {
            const result = await this.request(`/api/stats/${user.id}`);
            return result;
        } catch (error) {
            console.warn('⚠️ Не удалось получить статистику с сервера:', error.message);
            
            // Возвращаем локальную статистику
            return this.getLocalStatistics(user);
        }
    }

    getLocalStatistics(user) {
        const attempts = this.getExamAttemptsLocal(user);
        const trainerProgress = this.getTrainerProgressLocal();
        
        let totalTrainerQuestions = 0;
        let completedTrainerQuestions = 0;
        
        Object.values(trainerProgress).forEach(progress => {
            if (progress && progress.userAnswers) {
                const completed = progress.userAnswers.filter(a => a !== null && a !== undefined).length;
                completedTrainerQuestions += completed;
            }
        });
        
        const totalExamAttempts = attempts.length;
        const passedExamAttempts = attempts.filter(a => a.isPassed).length;
        const averagePercentage = attempts.length > 0 
            ? attempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / attempts.length
            : 0;
        
        return {
            success: true,
            stats: {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    type: user.userType
                },
                trainer: {
                    completedQuestions: completedTrainerQuestions,
                    totalQuestions: totalTrainerQuestions
                },
                exams: {
                    totalAttempts: totalExamAttempts,
                    passedAttempts: passedExamAttempts,
                    successRate: totalExamAttempts > 0 ? (passedExamAttempts / totalExamAttempts) * 100 : 0,
                    averagePercentage: averagePercentage
                }
            },
            local: true
        };
    }

    // Вспомогательный метод для отладки
    debugStorage() {
        console.log('🔍 ДЕБАГ LOCALSTORAGE:');
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            
            try {
                const parsed = JSON.parse(value);
                console.log(`${key}:`, parsed);
            } catch {
                console.log(`${key}: ${value}`);
            }
        }
    }

    // Получить информацию о состоянии соединения
    getConnectionStatus() {
        return new Promise(async (resolve) => {
            try {
                const result = await this.request('/api/test');
                resolve({
                    connected: true,
                    message: result.message,
                    time: result.time
                });
            } catch (error) {
                resolve({
                    connected: false,
                    message: error.message,
                    time: new Date().toISOString()
                });
            }
        });
    }
}

// Создаем глобальный экземпляр
window.examAPI = new ExamAPI();

// Тестовый вызов при загрузке
window.addEventListener('DOMContentLoaded', () => {
    const user = window.examAPI.getUserFromStorage();
    console.log('🚀 API загружен. Текущий пользователь:', 
         user ? `${user.name} (${user.userType}, id: ${user.id})` : 'не авторизован');
    
    // Проверяем соединение
    window.examAPI.getConnectionStatus().then(status => {
        console.log('📡 Статус соединения:', status.connected ? '✅ Соединение установлено' : '❌ Сервер недоступен');
    });
    
    // Автоматическая синхронизация при загрузке (если пользователь зарегистрирован)
    if (user && user.userType !== 'guest') {
        setTimeout(() => {
            window.examAPI.syncLocalDataToServer().then(result => {
                if (result.success) {
                    console.log('✅ Автоматическая синхронизация завершена');
                }
            });
        }, 3000); // Ждем 3 секунды после загрузки
    }
});

// Экспорт для использования в модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExamAPI;
}