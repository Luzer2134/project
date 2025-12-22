/// progress.js - основные функции статистики

let questionsData = null;

// Загружаем данные вопросов с улучшенной обработкой ошибок
async function loadQuestionsData() {
    try {
        // Сначала проверяем глобальную переменную (может быть загружена из data-loader.js)
        if (typeof window.questionsData !== 'undefined') {
            questionsData = window.questionsData;
            console.log('✅ Вопросы загружены из глобальной переменной');
            return true;
        }
        
        // Пробуем загрузить из data-loader.js если он есть
        if (typeof loadQuestions === 'function') {
            try {
                await loadQuestions();
                if (typeof window.questionsData !== 'undefined') {
                    questionsData = window.questionsData;
                    console.log('✅ Вопросы загружены из data-loader.js');
                    return true;
                }
            } catch (loaderError) {
                console.warn('⚠️ Ошибка загрузки из data-loader.js:', loaderError.message);
            }
        }
        
        // Пробуем загрузить из localStorage
        try {
            const savedData = localStorage.getItem('questionsData');
            if (savedData) {
                questionsData = JSON.parse(savedData);
                console.log('✅ Вопросы загружены из localStorage');
                return true;
            }
        } catch (storageError) {
            console.warn('⚠️ Ошибка загрузки из localStorage:', storageError.message);
        }
        
        // Пробуем загрузить через fetch
        try {
            const response = await fetch('questions-data.json');
            if (response.ok) {
                questionsData = await response.json();
                console.log('✅ Вопросы загружены из questions-data.json');
                return true;
            }
        } catch (fetchError) {
            console.warn('⚠️ Ошибка загрузки questions-data.json:', fetchError.message);
        }
        
        console.warn('⚠️ Данные вопросов не найдены. Продолжаем без них.');
        // Создаем пустую структуру для работы
        questionsData = {
            'Блок 1': [],
            'Блок 2': [], 
            'Блок 3': [],
            'Блок 4': []
        };
        
        return false;
    } catch (error) {
        console.error('❌ Критическая ошибка загрузки данных вопросов:', error);
        // Создаем пустую структуру для работы
        questionsData = {
            'Блок 1': [],
            'Блок 2': [], 
            'Блок 3': [],
            'Блок 4': []
        };
        return false;
    }
}

// Получаем количество вопросов для блока
function getQuestionsCountForBlock(block) {
    if (!questionsData) return 0;
    
    const blockData = questionsData[block];
    return blockData ? blockData.length : 0;
}

// Инициализация страницы
async function initProgressPage() {
    console.log('📊 Инициализация страницы прогресса');
    
    const user = window.examAPI ? window.examAPI.getUserFromStorage() : null;
    
    if (!user) {
        console.log('👤 Пользователь не найден, перенаправляем на логин');
        alert('Пожалуйста, войдите в систему!');
        window.location.href = 'login.html';
        return;
    }
    
    // Отображаем информацию о пользователе
    document.getElementById('user-name').textContent = user.name || 'Гость';
    document.getElementById('user-type').textContent = getUserTypeText(user.userType);
    document.getElementById('user-id').textContent = user.id || 'не указан';
    
    const statusText = user.userType === 'guest' 
        ? '⚠️ Только в этом браузере (данные удалятся при очистке кэша)' 
        : '✅ Сохраняется на сервере и доступно на всех устройствах';
    document.getElementById('progress-status').textContent = statusText;
    
    // Загружаем данные вопросов (но не блокируем загрузку страницы)
    loadQuestionsData().then(loaded => {
        if (!loaded) {
            console.log('⚠️ Работаем без полных данных вопросов');
            // Показываем сообщение пользователю
            showNotification('Некоторые данные вопросов недоступны, но статистика все равно будет показана', 'warning');
        }
    });
    
    // Рассчитываем статистику
    await calculateAllStats();
    
    console.log('✅ Страница прогресса инициализирована');
}

// Показ уведомления
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px;
        border-radius: 8px;
        color: white;
        z-index: 1000;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
    `;
    
    if (type === 'warning') {
        notification.style.background = '#ff9800';
    } else if (type === 'error') {
        notification.style.background = '#f44336';
    } else {
        notification.style.background = '#4CAF50';
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Автоматическое скрытие через 5 секунд
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

// Добавляем стили для анимации
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Текст для типа пользователя
function getUserTypeText(userType) {
    switch(userType) {
        case 'guest': return 'Гость';
        case 'yandex': return 'Яндекс ID';
        case 'registered': return 'Зарегистрированный пользователь';
        default: return userType || 'Неизвестно';
    }
}

// Расчет всей статистики
async function calculateAllStats() {
    console.log('📊 Расчет всей статистики...');
    
    try {
        await calculateTrainerStats();
        await calculateExamStats();
        await calculateBlocksStats();
        await calculateDetailedBlockProgress();
    } catch (error) {
        console.error('❌ Ошибка расчета статистики:', error);
        showNotification('Ошибка при расчете статистики', 'error');
    }
}

async function calculateTrainerStats() {
    const user = window.examAPI ? window.examAPI.getUserFromStorage() : null;
    
    if (!user) {
        console.log('👤 Пользователь не найден');
        displayEmptyStats('trainer');
        return;
    }
    
    console.log(`📊 Расчет статистики тренажера для: ${user.name} (${user.userType})`);
    
    try {
        const result = await window.examAPI.getTrainerProgress();
        
        if (result.success) {
            if (user.userType === 'guest' || result.local) {
                calculateLocalTrainerStats(user, result.progress || {});
            } else {
                calculateServerTrainerStats(result.progress || {});
            }
        } else {
            console.error('❌ Ошибка загрузки прогресса тренажера:', result.error);
            calculateLocalTrainerStats(user);
        }
    } catch (error) {
        console.error('❌ Ошибка расчета статистики тренажера:', error);
        calculateLocalTrainerStats(user);
    }
}

// Статистика тренажера
function calculateServerTrainerStats(serverProgress) {
    const blocks = ['Блок 1', 'Блок 2', 'Блок 3', 'Блок 4'];
    let totalCompleted = 0;
    let totalCorrect = 0;
    
    blocks.forEach(block => {
        const blockProgress = serverProgress[block];
        
        if (blockProgress) {
            const userAnswers = blockProgress.userAnswers || [];
            const completed = userAnswers.filter(answer => answer !== null && answer !== undefined).length;
            totalCompleted += completed;
            
            // Считаем правильные ответы
            if (questionsData && questionsData[block]) {
                let correctInBlock = 0;
                userAnswers.forEach((answer, index) => {
                    if (answer !== null && answer !== undefined && questionsData[block][index]) {
                        const question = questionsData[block][index];
                        const isCorrect = checkSingleAnswer(question, answer);
                        if (isCorrect) correctInBlock++;
                    }
                });
                totalCorrect += correctInBlock;
            }
        }
    });
    
    const percentage = totalCompleted > 0 ? Math.round((totalCorrect / totalCompleted) * 100) : 0;
    
    updateTrainerStats(totalCompleted, totalCorrect, percentage);
}

// Локальная статистика тренажера
function calculateLocalTrainerStats(user, localProgress = null) {
    const blocks = ['Блок 1', 'Блок 2', 'Блок 3', 'Блок 4'];
    let totalCompleted = 0;
    let totalCorrect = 0;
    
    // Определяем ключ для localStorage
    const storageKey = user.userType === 'guest' 
        ? 'trainerProgress_guest' 
        : `trainerProgress_${user.id}`;
    
    // Используем переданный прогресс или загружаем из localStorage
    let allProgress = localProgress;
    if (!allProgress || Object.keys(allProgress).length === 0) {
        const savedProgress = localStorage.getItem(storageKey);
        allProgress = savedProgress ? JSON.parse(savedProgress) : {};
    }
    
    blocks.forEach(block => {
        const blockProgress = allProgress[block];
        
        if (blockProgress) {
            const userAnswers = blockProgress.userAnswers || [];
            const completed = userAnswers.filter(answer => answer !== null && answer !== undefined).length;
            totalCompleted += completed;
            
            // Считаем правильные ответы
            if (questionsData && questionsData[block]) {
                let correctInBlock = 0;
                userAnswers.forEach((answer, index) => {
                    if (answer !== null && answer !== undefined && questionsData[block][index]) {
                        const question = questionsData[block][index];
                        const isCorrect = checkSingleAnswer(question, answer);
                        if (isCorrect) correctInBlock++;
                    }
                });
                totalCorrect += correctInBlock;
            }
        }
    });
    
    const percentage = totalCompleted > 0 ? Math.round((totalCorrect / totalCompleted) * 100) : 0;
    
    updateTrainerStats(totalCompleted, totalCorrect, percentage);
}

// Обновление статистики тренажера в DOM
function updateTrainerStats(completed, correct, percentage) {
    document.getElementById('trainer-completed').textContent = completed;
    document.getElementById('trainer-correct').textContent = correct;
    document.getElementById('trainer-percentage').textContent = `${percentage}%`;
    
    console.log(`✅ Статистика тренажера: ${completed} пройдено, ${correct} правильно (${percentage}%)`);
}

async function calculateExamStats() {
    const user = window.examAPI ? window.examAPI.getUserFromStorage() : null;
    
    if (!user) {
        displayEmptyStats('exam');
        return;
    }
    
    console.log(`📊 Расчет статистики экзаменов для: ${user.name} (${user.userType})`);
    
    try {
        const result = await window.examAPI.getExamAttempts();
        
        if (result.success) {
            const attempts = result.attempts || [];
            
            document.getElementById('exam-attempts').textContent = attempts.length;
            
            const passedAttempts = attempts.filter(attempt => attempt.isPassed).length;
            document.getElementById('exam-passed').textContent = passedAttempts;
            
            if (attempts.length > 0) {
                const totalPercentage = attempts.reduce((sum, attempt) => {
                    const perc = attempt.percentage || 0;
                    return sum + (typeof perc === 'number' ? perc : parseFloat(perc) || 0);
                }, 0);
                const averagePercentage = Math.round(totalPercentage / attempts.length);
                document.getElementById('exam-average').textContent = `${averagePercentage}%`;
                
                // Лучший результат
                const bestResult = attempts.reduce((best, attempt) => {
                    const perc = attempt.percentage || 0;
                    const currentPerc = typeof perc === 'number' ? perc : parseFloat(perc) || 0;
                    return currentPerc > best ? currentPerc : best;
                }, 0);
                document.getElementById('exam-best').textContent = `${bestResult}%`;
                
                console.log(`✅ Статистика экзаменов: ${attempts.length} попыток, ${passedAttempts} сдано, лучший: ${bestResult}%`);
            } else {
                document.getElementById('exam-average').textContent = '0%';
                document.getElementById('exam-best').textContent = '0%';
                console.log('📭 Нет попыток экзамена');
            }
        } else {
            displayEmptyStats('exam');
        }
    } catch (error) {
        console.error('❌ Ошибка расчета статистики экзаменов:', error);
        displayEmptyStats('exam');
    }
}

// Статистика по блокам
async function calculateBlocksStats() {
    const blocks = ['Блок 1', 'Блок 2', 'Блок 3', 'Блок 4'];
    
    // Рассчитываем изученные блоки
    let studiedBlocks = 0;
    let totalQuestions = 0;
    let bestBlock = null;
    let bestBlockPercentage = 0;
    let worstBlock = null;
    let worstBlockPercentage = 100;
    
    if (questionsData) {
        blocks.forEach(block => {
            if (questionsData[block] && questionsData[block].length > 0) {
                totalQuestions += questionsData[block].length;
                studiedBlocks++;
            }
        });
    }
    
    // Пока просто ставим заглушки
    document.getElementById('blocks-studied').textContent = studiedBlocks;
    document.getElementById('total-questions').textContent = totalQuestions;
    document.getElementById('best-block').textContent = bestBlock || '-';
    document.getElementById('worst-block').textContent = worstBlock || '-';
}

// Детальный прогресс по блокам
async function calculateDetailedBlockProgress() {
    const blocks = ['Блок 1', 'Блок 2', 'Блок 3', 'Блок 4'];
    const container = document.getElementById('blocks-progress');
    
    if (!container) {
        console.error('❌ Контейнер блок-прогресса не найден');
        return;
    }
    
    container.innerHTML = '';
    
    for (const block of blocks) {
        const blockElement = await createBlockProgressElement(block);
        container.appendChild(blockElement);
    }
}

function checkSingleAnswer(question, userAnswer) {
    if (!question || !userAnswer) return false;
    
    const correctAnswers = question.correctAnswers || [];
    const userAnswers = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
    
    // Сортируем и сравниваем
    const userSorted = [...userAnswers].sort().join('');
    const correctSorted = [...correctAnswers].sort().join('');
    
    return userSorted === correctSorted;
}

// Создание элемента прогресса для блока с безопасным доступом к questionsData
async function createBlockProgressElement(block) {
    const element = document.createElement('div');
    element.className = 'block-progress';
    
    try {
        // Получаем данные о прогрессе
        const trainerData = await getBlockTrainerData(block);
        const examData = await getBlockExamData(block);
        
        const completedQuestions = trainerData.completed || 0;
        const correctAnswers = trainerData.correct || 0;
        const examAttempts = examData.attempts || 0;
        const examPassed = examData.passed || 0;
        
        const questionsCount = getQuestionsCountForBlock(block);
        const completionPercentage = questionsCount > 0 
            ? Math.round((completedQuestions / questionsCount) * 100)
            : 0;
        
        const accuracyPercentage = completedQuestions > 0 
            ? Math.round((correctAnswers / completedQuestions) * 100)
            : 0;
        
        const examSuccessPercentage = examAttempts > 0 
            ? Math.round((examPassed / examAttempts) * 100)
            : 0;
        
        element.innerHTML = `
            <h4>${block}</h4>
            
            <div style="margin: 10px 0;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span>Тренажер: ${completedQuestions}/${questionsCount} вопросов</span>
                    <span>${completionPercentage}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${completionPercentage}%; background: #2196F3;"></div>
                </div>
            </div>
            
            <div style="margin: 10px 0;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span>Точность ответов: ${correctAnswers}/${completedQuestions}</span>
                    <span>${accuracyPercentage}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${accuracyPercentage}%; background: #4CAF50;"></div>
                </div>
            </div>
            
            <div style="margin: 10px 0;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span>Экзамены: ${examPassed}/${examAttempts} сдано</span>
                    <span>${examSuccessPercentage}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${examSuccessPercentage}%; background: #FF9800;"></div>
                </div>
            </div>
            
            <div style="display: flex; gap: 10px; margin-top: 15px;">
                <button class="button" onclick="startTrainer('${block}')" style="padding: 8px 15px; font-size: 14px; background: #2196F3;">Продолжить тренажер</button>
                <button class="button" onclick="startExam('${block}')" style="padding: 8px 15px; font-size: 14px; background: #4CAF50;">Начать экзамен</button>
            </div>
        `;
    } catch (error) {
        console.error(`❌ Ошибка создания элемента для блока ${block}:`, error);
        element.innerHTML = `
            <h4>${block}</h4>
            <p style="color: #f44336;">⚠️ Ошибка загрузки данных для этого блока</p>
        `;
    }
    
    return element;
}

// Запуск тренажера
function startTrainer(block) {
    console.log(`🎯 Запуск тренажера для блока: ${block}`);
    localStorage.setItem('selectedBlock', block);
    localStorage.setItem('trainingMode', 'trainer');
    
    // Проверяем, есть ли страница тренажера
    const hasTrainerPage = checkPageExists('trainer.html');
    
    if (hasTrainerPage) {
        window.location.href = 'trainer.html';
    } else {
        alert('Страница тренажера не найдена. Переходим на главную.');
        window.location.href = 'index.html';
    }
}

// Запуск экзамена
function startExam(block) {
    console.log(`🎯 Запуск экзамена для блока: ${block}`);
    localStorage.setItem('selectedBlock', block);
    window.location.href = 'simulation.html';
}

// Проверка существования страницы
function checkPageExists(page) {
    // Простая проверка - если у нас есть симуляция, то тренажер тоже должен быть
    return page === 'simulation.html' ? true : false; // Заглушка
}

// Функции кнопок
function goToMain() {
    window.location.href = 'index.html';
}

function refreshStats() {
    console.log('🔄 Обновление статистики...');
    calculateAllStats();
    showNotification('Статистика обновлена', 'info');
}

async function exportProgress() {
    const user = window.examAPI ? window.examAPI.getUserFromStorage() : null;
    
    if (!user) {
        alert('Пользователь не найден!');
        return;
    }
    
    try {
        showNotification('Подготовка данных для экспорта...', 'info');
        
        // Собираем все данные
        const progressData = {
            user: {
                name: user.name,
                id: user.id,
                type: user.userType
            },
            date: new Date().toISOString(),
            trainerStats: await window.examAPI.getTrainerProgress(),
            examStats: await window.examAPI.getExamAttempts(),
            exportInfo: {
                appName: 'Exam Trainer',
                exportDate: new Date().toLocaleString('ru-RU'),
                totalAttempts: document.getElementById('exam-attempts').textContent,
                successRate: document.getElementById('trainer-percentage').textContent
            }
        };
        
        // Создаем файл для скачивания
        const dataStr = JSON.stringify(progressData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `progress_${user.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        console.log('✅ Прогресс экспортирован');
        showNotification('Прогресс успешно экспортирован в файл!', 'success');
        
    } catch (error) {
        console.error('❌ Ошибка экспорта прогресса:', error);
        showNotification('Ошибка при экспорте прогресса: ' + error.message, 'error');
    }
}

// Загружаем прогресс при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('📊 Страница прогресса загружена');
    
    // Ждем инициализации API
    setTimeout(() => {
        if (window.examAPI) {
            initProgressPage();
        } else {
            console.error('API не инициализирован');
            showNotification('Ошибка инициализации системы. Попробуйте обновить страницу.', 'error');
        }
    }, 100);
});