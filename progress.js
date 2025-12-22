/// progress.js - основные функции статистики

let questionsData = null;

// Загружаем данные вопросов
async function loadQuestionsData() {
    try {
        // Пробуем загрузить из data-loader.js если он есть
        if (typeof loadQuestions === 'function') {
            await loadQuestions();
            if (typeof questionsData !== 'undefined') {
                console.log('✅ Вопросы загружены из data-loader.js');
                return true;
            }
        }
        
        // Пробуем загрузить из localStorage
        const savedData = localStorage.getItem('questionsData');
        if (savedData) {
            questionsData = JSON.parse(savedData);
            console.log('✅ Вопросы загружены из localStorage');
            return true;
        }
        
        console.warn('⚠️ Данные вопросов не найдены');
        return false;
    } catch (error) {
        console.error('❌ Ошибка загрузки данных вопросов:', error);
        return false;
    }
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
    
    // Загружаем данные вопросов
    await loadQuestionsData();
    
    // Рассчитываем статистику
    await calculateAllStats();
    
    console.log('✅ Страница прогресса инициализирована');
}

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
            if (user.userType === 'guest') {
                calculateLocalTrainerStats(user, result.progress || {});
            } else {
                // Для зарегистрированных пробуем с сервера, потом локально
                if (result.progress && Object.keys(result.progress).length > 0) {
                    calculateServerTrainerStats(result.progress);
                } else {
                    console.log('⚠️ Нет данных на сервере, пробуем локально');
                    calculateLocalTrainerStats(user);
                }
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

// Статистика тренажера с сервера
function calculateServerTrainerStats(serverProgress) {
    const blocks = ['Блок 1', 'Блок 2', 'Блок 3', 'Блок 4'];
    let totalCompleted = 0;
    let totalCorrect = 0;
    let totalQuestionsCount = 0;
    
    blocks.forEach(block => {
        const blockProgress = serverProgress[block];
        
        if (blockProgress) {
            const userAnswers = blockProgress.userAnswers || [];
            const completed = userAnswers.filter(answer => answer !== null && answer !== undefined).length;
            totalCompleted += completed;
            
            // Считаем правильные ответы
            if (questionsData && questionsData[block]) {
                const blockQuestions = questionsData[block];
                totalQuestionsCount += blockQuestions.length;
                
                let correctInBlock = 0;
                userAnswers.forEach((answer, index) => {
                    if (answer !== null && answer !== undefined && blockQuestions[index]) {
                        const question = blockQuestions[index];
                        const isCorrect = checkSingleAnswer(question, answer);
                        if (isCorrect) correctInBlock++;
                    }
                });
                
                totalCorrect += correctInBlock;
            }
        }
    });
    
    const percentage = totalCompleted > 0 ? Math.round((totalCorrect / totalCompleted) * 100) : 0;
    
    document.getElementById('trainer-completed').textContent = totalCompleted;
    document.getElementById('trainer-correct').textContent = totalCorrect;
    document.getElementById('trainer-percentage').textContent = `${percentage}%`;
    
    console.log(`✅ Статистика тренажера: ${totalCompleted} пройдено, ${totalCorrect} правильно (${percentage}%)`);
}

// Локальная статистика тренажера
function calculateLocalTrainerStats(user, localProgress = null) {
    const blocks = ['Блок 1', 'Блок 2', 'Блок 3', 'Блок 4'];
    let totalCompleted = 0;
    let totalCorrect = 0;
    let totalQuestionsCount = 0;
    
    // Определяем ключ для localStorage
    const storageKey = user.userType === 'guest' 
        ? 'trainerProgress_guest' 
        : `trainerProgress_${user.id}`;
    
    // Используем переданный прогресс или загружаем из localStorage
    let allProgress = localProgress;
    if (!allProgress) {
        const savedProgress = localStorage.getItem(storageKey);
        allProgress = savedProgress ? JSON.parse(savedProgress) : {};
    }
    
    blocks.forEach(block => {
        const blockProgress = allProgress[block];
        
        if (blockProgress) {
            // Проверяем принадлежность данных
            if (blockProgress.userId === user.id || user.userType === 'guest') {
                const userAnswers = blockProgress.userAnswers || [];
                const completed = userAnswers.filter(answer => answer !== null && answer !== undefined).length;
                totalCompleted += completed;
                
                // Считаем правильные ответы
                if (questionsData && questionsData[block]) {
                    const blockQuestions = questionsData[block];
                    totalQuestionsCount += blockQuestions.length;
                    
                    let correctInBlock = 0;
                    userAnswers.forEach((answer, index) => {
                        if (answer !== null && answer !== undefined && blockQuestions[index]) {
                            const question = blockQuestions[index];
                            const isCorrect = checkSingleAnswer(question, answer);
                            if (isCorrect) correctInBlock++;
                        }
                    });
                    
                    totalCorrect += correctInBlock;
                }
            }
        }
    });
    
    const percentage = totalCompleted > 0 ? Math.round((totalCorrect / totalCompleted) * 100) : 0;
    
    document.getElementById('trainer-completed').textContent = totalCompleted;
    document.getElementById('trainer-correct').textContent = totalCorrect;
    document.getElementById('trainer-percentage').textContent = `${percentage}%`;
    
    console.log(`✅ Локальная статистика тренажера: ${totalCompleted} пройдено`);
}

// Статистика экзаменов
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

// Создание элемента прогресса для блока
async function createBlockProgressElement(block) {
    const element = document.createElement('div');
    element.className = 'block-progress';
    
    // Получаем данные о прогрессе
    const trainerData = await getBlockTrainerData(block);
    const examData = await getBlockExamData(block);
    
    const completedQuestions = trainerData.completed || 0;
    const correctAnswers = trainerData.correct || 0;
    const examAttempts = examData.attempts || 0;
    const examPassed = examData.passed || 0;
    
    const completionPercentage = questionsData && questionsData[block] 
        ? Math.round((completedQuestions / questionsData[block].length) * 100)
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
                <span>Тренажер: ${completedQuestions}/${questionsData && questionsData[block] ? questionsData[block].length : '?'} вопросов</span>
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
    
    return element;
}

// Получение данных тренажера для блока
async function getBlockTrainerData(block) {
    const user = window.examAPI ? window.examAPI.getUserFromStorage() : null;
    if (!user) return { completed: 0, correct: 0 };
    
    try {
        const result = await window.examAPI.getTrainerProgress();
        
        if (result.success) {
            const blockProgress = result.progress && result.progress[block];
            if (blockProgress) {
                const userAnswers = blockProgress.userAnswers || [];
                const completed = userAnswers.filter(answer => answer !== null && answer !== undefined).length;
                
                let correct = 0;
                if (questionsData && questionsData[block]) {
                    const blockQuestions = questionsData[block];
                    userAnswers.forEach((answer, index) => {
                        if (answer !== null && answer !== undefined && blockQuestions[index]) {
                            const question = blockQuestions[index];
                            if (checkSingleAnswer(question, answer)) {
                                correct++;
                            }
                        }
                    });
                }
                
                return { completed, correct };
            }
        }
    } catch (error) {
        console.error(`❌ Ошибка получения данных тренажера для ${block}:`, error);
    }
    
    return { completed: 0, correct: 0 };
}

// Получение данных экзаменов для блока
async function getBlockExamData(block) {
    const user = window.examAPI ? window.examAPI.getUserFromStorage() : null;
    if (!user) return { attempts: 0, passed: 0 };
    
    try {
        const result = await window.examAPI.getExamAttempts();
        
        if (result.success) {
            const attempts = result.attempts || [];
            const blockAttempts = attempts.filter(attempt => attempt.block === block);
            const passed = blockAttempts.filter(attempt => attempt.isPassed).length;
            
            return { 
                attempts: blockAttempts.length, 
                passed: passed 
            };
        }
    } catch (error) {
        console.error(`❌ Ошибка получения данных экзаменов для ${block}:`, error);
    }
    
    return { attempts: 0, passed: 0 };
}

// Проверка ответа на вопрос
function checkSingleAnswer(question, userAnswer) {
    if (!question || !userAnswer) return false;
    
    const correctAnswers = question.correctAnswers || [];
    const userAnswers = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
    
    // Сортируем и сравниваем
    const userSorted = [...userAnswers].sort().join('');
    const correctSorted = [...correctAnswers].sort().join('');
    
    return userSorted === correctSorted;
}

// Запуск тренажера
function startTrainer(block) {
    console.log(`🎯 Запуск тренажера для блока: ${block}`);
    localStorage.setItem('selectedBlock', block);
    localStorage.setItem('trainingMode', 'trainer');
    window.location.href = 'trainer.html'; // Предполагается, что у вас есть страница тренажера
}

// Запуск экзамена
function startExam(block) {
    console.log(`🎯 Запуск экзамена для блока: ${block}`);
    localStorage.setItem('selectedBlock', block);
    window.location.href = 'simulation.html';
}

// Функции кнопок
function goToMain() {
    window.location.href = 'index.html';
}

function refreshStats() {
    console.log('🔄 Обновление статистики...');
    calculateAllStats();
}

async function exportProgress() {
    const user = window.examAPI ? window.examAPI.getUserFromStorage() : null;
    
    if (!user) {
        alert('Пользователь не найден!');
        return;
    }
    
    try {
        // Собираем все данные
        const progressData = {
            user: {
                name: user.name,
                id: user.id,
                type: user.userType
            },
            date: new Date().toISOString(),
            trainerStats: await getTrainerStatsForExport(),
            examStats: await getExamStatsForExport(),
            blocks: await getBlocksStatsForExport()
        };
        
        // Создаем файл для скачивания
        const dataStr = JSON.stringify(progressData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `progress_${user.name}_${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        console.log('✅ Прогресс экспортирован');
        alert('Прогресс успешно экспортирован в файл!');
        
    } catch (error) {
        console.error('❌ Ошибка экспорта прогресса:', error);
        alert('Ошибка при экспорте прогресса: ' + error.message);
    }
}

async function getTrainerStatsForExport() {
    const user = window.examAPI ? window.examAPI.getUserFromStorage() : null;
    if (!user) return {};
    
    try {
        const result = await window.examAPI.getTrainerProgress();
        return result.success ? result.progress || {} : {};
    } catch (error) {
        console.error('Ошибка получения данных тренажера для экспорта:', error);
        return {};
    }
}

async function getExamStatsForExport() {
    try {
        const result = await window.examAPI.getExamAttempts();
        return result.success ? result.attempts || [] : [];
    } catch (error) {
        console.error('Ошибка получения данных экзаменов для экспорта:', error);
        return [];
    }
}

async function getBlocksStatsForExport() {
    const blocks = ['Блок 1', 'Блок 2', 'Блок 3', 'Блок 4'];
    const result = {};
    
    for (const block of blocks) {
        const trainerData = await getBlockTrainerData(block);
        const examData = await getBlockExamData(block);
        
        result[block] = {
            trainer: trainerData,
            exam: examData,
            totalQuestions: questionsData && questionsData[block] ? questionsData[block].length : 0
        };
    }
    
    return result;
}

async function clearProgress() {
    const user = window.examAPI ? window.examAPI.getUserFromStorage() : null;
    
    if (!user) {
        alert('Пользователь не найден!');
        return;
    }
    
    if (!confirm('Вы уверены, что хотите очистить весь прогресс тренажера? Это действие нельзя отменить.')) {
        return;
    }
    
    try {
        const storageKey = user.userType === 'guest' 
            ? 'trainerProgress_guest' 
            : `trainerProgress_${user.id}`;
        
        localStorage.removeItem(storageKey);
        
        console.log('🗑️ Прогресс тренажера очищен');
        alert('Прогресс тренажера успешно очищен!');
        
        // Обновляем статистику
        await calculateAllStats();
        
    } catch (error) {
        console.error('❌ Ошибка очистки прогресса:', error);
        alert('Ошибка при очистке прогресса: ' + error.message);
    }
}

async function clearExamHistory() {
    const user = window.examAPI ? window.examAPI.getUserFromStorage() : null;
    
    if (!user) {
        alert('Пользователь не найден!');
        return;
    }
    
    if (!confirm('Вы уверены, что хотите очистить всю историю экзаменов? Это действие нельзя отменить.')) {
        return;
    }
    
    try {
        const storageKey = `examAttempts_${user.id}`;
        localStorage.removeItem(storageKey);
        
        console.log('🗑️ История экзаменов очищена');
        alert('История экзаменов успешно очищена!');
        
        // Обновляем статистику
        await calculateAllStats();
        
    } catch (error) {
        console.error('❌ Ошибка очистки истории экзаменов:', error);
        alert('Ошибка при очистке истории экзаменов: ' + error.message);
    }
}

function displayEmptyStats(type) {
    if (type === 'trainer') {
        document.getElementById('trainer-completed').textContent = '0';
        document.getElementById('trainer-correct').textContent = '0';
        document.getElementById('trainer-percentage').textContent = '0%';
    } else if (type === 'exam') {
        document.getElementById('exam-attempts').textContent = '0';
        document.getElementById('exam-passed').textContent = '0';
        document.getElementById('exam-average').textContent = '0%';
        document.getElementById('exam-best').textContent = '0%';
    } else if (type === 'blocks') {
        document.getElementById('blocks-studied').textContent = '0';
        document.getElementById('total-questions').textContent = '0';
        document.getElementById('best-block').textContent = '-';
        document.getElementById('worst-block').textContent = '-';
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
            alert('Ошибка инициализации системы');
        }
    }, 100);
});