// attempt-details.js
let attemptData = null;

function goToHistory() {
    window.location.href = 'history.html';
}

// Основные функции
async function goToHistory() {
    window.location.href = 'history.html';
}

async function loadAttemptDetails() {
    console.log('🔄 Загрузка деталей попытки...');
    
    // Получаем информацию о попытке из localStorage
    const viewingData = localStorage.getItem('viewingAttempt');
    
    if (!viewingData) {
        alert('Данные о попытке не найдены!');
        goToHistory();
        return;
    }
    
    try {
        const parsedData = JSON.parse(viewingData);
        console.log('📋 Данные из localStorage:', parsedData);
        
        // Если есть attemptId, загружаем полные данные через API
        if (parsedData.id) {
            await loadAttemptFromAPI(parsedData.id);
        } else if (parsedData.index !== undefined) {
            // Если есть index, загружаем из истории
            await loadAttemptFromHistory(parsedData.index);
        } else {
            // Если данных достаточно, используем их
            attemptData = parsedData;
            displayAttemptDetails();
        }
    } catch (error) {
        console.error('Ошибка загрузки данных попытки:', error);
        alert('Ошибка загрузки данных попытки');
        goToHistory();
    }
}

// Загрузка попытки из API по ID
async function loadAttemptFromAPI(attemptId) {
    console.log(`🔍 Загружаем попытку ${attemptId} из API...`);
    
    try {
        const user = window.examAPI.getUserFromStorage();
        if (!user) {
            console.log('Пользователь не авторизован');
            // Используем локальные данные если есть
            const localData = localStorage.getItem('viewingAttempt');
            if (localData) {
                attemptData = JSON.parse(localData);
                displayAttemptDetails();
            } else {
                alert('Пожалуйста, войдите в систему');
                goToHistory();
            }
            return;
        }
        
        // Пытаемся получить попытку через API
        const result = await window.examAPI.getExamAttempts();
        
        if (result.success && result.attempts) {
            const attempts = result.attempts;
            
            // Ищем попытку по ID
            const attempt = attempts.find(a => a.id === attemptId);
            
            if (attempt) {
                console.log('✅ Попытка найдена через API:', attempt);
                attemptData = attempt;
                displayAttemptDetails();
            } else {
                // Если не нашли через API, ищем локально
                console.log('🔍 Попытка не найдена через API, ищем локально...');
                await loadAttemptFromStorage(attemptId);
            }
        } else {
            console.log('⚠️ Не удалось загрузить попытки через API, используем локальные данные');
            await loadAttemptFromStorage(attemptId);
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки через API:', error);
        // Используем локальные данные в случае ошибки
        await loadAttemptFromStorage(attemptId);
    }
}

// Загрузка попытки из истории по индексу
async function loadAttemptFromHistory(index) {
    console.log(`🔍 Загружаем попытку #${index} из истории...`);
    
    try {
        const result = await window.examAPI.getExamAttempts();
        
        if (result.success && result.attempts) {
            const attempts = result.attempts;
            
            if (index >= 0 && index < attempts.length) {
                const attempt = attempts[index];
                console.log('✅ Попытка найдена в истории:', attempt);
                
                attemptData = attempt;
                displayAttemptDetails();
            } else {
                alert('Попытка не найдена в истории!');
                goToHistory();
            }
        } else {
            alert('Не удалось загрузить историю попыток');
            goToHistory();
        }
    } catch (error) {
        console.error('Ошибка загрузки из истории:', error);
        alert('Ошибка загрузки истории');
        goToHistory();
    }
}

// Загрузка попытки из localStorage
async function loadAttemptFromStorage(attemptId) {
    console.log(`🔍 Ищем попытку ${attemptId} в localStorage...`);
    
    const user = window.examAPI.getUserFromStorage();
    if (!user) {
        console.log('Пользователь не найден');
        return;
    }
    
    // Получаем все попытки пользователя
    const storageKey = `examAttempts_${user.id}`;
    const attemptsJson = localStorage.getItem(storageKey);
    
    if (attemptsJson) {
        const attempts = JSON.parse(attemptsJson);
        const attempt = attempts.find(a => a.id === attemptId);
        
        if (attempt) {
            console.log('✅ Попытка найдена в localStorage:', attempt);
            attemptData = attempt;
            displayAttemptDetails();
        } else {
            // Последняя попытка: смотрим в viewingAttempt
            const viewingData = localStorage.getItem('viewingAttempt');
            if (viewingData) {
                const parsed = JSON.parse(viewingData);
                if (parsed.id === attemptId) {
                    attemptData = parsed;
                    displayAttemptDetails();
                    return;
                }
            }
            
            alert('Попытка не найдена!');
            goToHistory();
        }
    } else {
        alert('История попыток пуста!');
        goToHistory();
    }
}

// Отображение деталей попытки
function displayAttemptDetails() {
    if (!attemptData) return;
    
    console.log('📊 Отображаем детали попытки:', attemptData);
    
    // Форматируем дату
    const date = attemptData.date ? new Date(attemptData.date) : new Date();
    const formattedDate = date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Время выполнения
    const timeSpent = attemptData.timeSpent || 0;
    const timeSpentMinutes = Math.floor(timeSpent / 60);
    const timeSpentSeconds = timeSpent % 60;
    
    // Подготовка данных
    const blockName = attemptData.block || 'Неизвестный блок';
    const grade = attemptData.grade || (attemptData.isPassed ? 'ЗАЧЕТ' : 'НЕЗАЧЕТ');
    const correctAnswers = attemptData.correctAnswers || 0;
    const totalQuestions = attemptData.totalQuestions || 0;
    const percentage = attemptData.percentage || 
        (totalQuestions > 0 ? ((correctAnswers / totalQuestions) * 100).toFixed(1) : 0);
    const isPassed = attemptData.isPassed || false;
    
    // Обновляем заголовок
    document.getElementById('attempt-title').textContent = 
        `Попытка экзамена - ${blockName}`;
    
    // Обновляем статистику
    const statsGrid = document.querySelector('#attempt-summary .stats-grid');
    if (statsGrid) {
        statsGrid.innerHTML = `
            <div class="stat-item">
                <strong>Дата и время:</strong>
                <div class="stat-value">${formattedDate}</div>
            </div>
            <div class="stat-item">
                <strong>Результат:</strong>
                <div class="stat-value ${isPassed ? 'grade-passed' : 'grade-failed'}">
                    ${grade}
                </div>
            </div>
            <div class="stat-item">
                <strong>Правильных ответов:</strong>
                <div class="stat-value">${correctAnswers}/${totalQuestions}</div>
            </div>
            <div class="stat-item">
                <strong>Процент:</strong>
                <div class="stat-value">${percentage}%</div>
            </div>
            <div class="stat-item">
                <strong>Время выполнения:</strong>
                <div class="stat-value">
                    ${timeSpentMinutes.toString().padStart(2, '0')}:${timeSpentSeconds.toString().padStart(2, '0')}
                </div>
            </div>
        `;
    }
    
    // Отображаем вопросы с ответами
    displayQuestionsReview();
}

// Отображение вопросов с ответами
function displayQuestionsReview() {
    const container = document.getElementById('questions-review');
    
    // Проверяем, есть ли данные о вопросах
    if (!attemptData.questions || attemptData.questions.length === 0) {
        // Пытаемся загрузить вопросы из другого источника
        const questionsData = window.questionsData || {};
        const blockQuestions = questionsData[attemptData.block] || [];
        
        if (blockQuestions.length > 0) {
            // Создаем вопросы на основе данных
            console.log('Восстанавливаем вопросы из базы данных...');
            
            const userAnswers = attemptData.userAnswers || [];
            const questions = [];
            
            // Берем первые N вопросов из блока
            const questionCount = Math.min(userAnswers.length, blockQuestions.length);
            for (let i = 0; i < questionCount; i++) {
                const question = blockQuestions[i];
                const userAnswer = userAnswers[i];
                const correctAnswer = question.correctAnswers || [];
                
                questions.push({
                    ...question,
                    userAnswer: Array.isArray(userAnswer) ? userAnswer : [userAnswer],
                    correctAnswer: correctAnswer
                });
            }
            
            attemptData.questions = questions;
            console.log('Восстановлено вопросов:', questions.length);
        } else {
            container.innerHTML = '<div class="question-review"><p>Детальная информация о вопросах не найдена</p></div>';
            return;
        }
    }
    
    let html = '<h3>Детальный разбор вопросов:</h3>';
    
    attemptData.questions.forEach((question, index) => {
        const userAnswer = question.userAnswer || attemptData.userAnswers?.[index] || [];
        const correctAnswer = question.correctAnswers || [];
        const isCorrect = checkSingleAnswer(question, userAnswer);
        
        html += `
            <div class="question-review ${isCorrect ? 'correct' : 'incorrect'}">
                <div class="question-header">
                    <span class="question-number">Вопрос ${index + 1}</span>
                    <span class="question-status ${isCorrect ? 'status-correct' : 'status-incorrect'}">
                        ${isCorrect ? 'ВЕРНО' : 'НЕВЕРНО'}
                    </span>
                </div>
                
                <div class="question-text">
                    <strong>Вопрос:</strong> ${question.question || 'Вопрос не найден'}
                </div>
                
                <div class="answer-section">
                    <strong>Ваш ответ:</strong>
                    <div class="user-answer">${Array.isArray(userAnswer) ? userAnswer.join(', ') : userAnswer || 'Нет ответа'}</div>
                </div>
                
                <div class="answer-section">
                    <strong>Правильный ответ:</strong>
                    <div class="correct-answer">${Array.isArray(correctAnswer) ? correctAnswer.join(', ') : correctAnswer}</div>
                </div>
                
                ${question.comment ? `
                <div class="answer-section">
                    <strong>Комментарий:</strong>
                    <div>${question.comment}</div>
                </div>
                ` : ''}
                
                ${question.options ? `
                <div class="answer-section">
                    <strong>Варианты ответов:</strong>
                    <div style="margin-top: 5px;">
                        ${question.options.map((option, optIndex) => {
                            const letter = String.fromCharCode(1040 + optIndex); // А, Б, В, Г...
                            const isUserSelected = Array.isArray(userAnswer) ? userAnswer.includes(letter) : userAnswer === letter;
                            const isCorrectOption = correctAnswer.includes(letter);
                            let style = 'padding: 3px 8px; margin: 2px; border-radius: 4px;';
                            
                            if (isUserSelected && isCorrectOption) {
                                style += 'background: #c8e6c9; color: #2e7d32; border: 1px solid #81c784;';
                            } else if (isUserSelected && !isCorrectOption) {
                                style += 'background: #ffcdd2; color: #c62828; border: 1px solid #e57373;';
                            } else if (!isUserSelected && isCorrectOption) {
                                style += 'background: #fff9c4; color: #f57f17; border: 1px solid #fff176;';
                            } else {
                                style += 'background: #f5f5f5; color: #616161; border: 1px solid #e0e0e0;';
                            }
                            
                            return `<div style="${style}"><strong>${letter}.</strong> ${option}</div>`;
                        }).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function checkSingleAnswer(question, userAnswer) {
    if (!question || !userAnswer) return false;
    
    const userAnswers = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
    const correctAnswers = question.correctAnswers || [];
    
    if (userAnswers.length === 0) return false;
    if (userAnswers.length !== correctAnswers.length) return false;
    
    const userSorted = [...userAnswers].sort().join('');
    const correctSorted = [...correctAnswers].sort().join('');
    return userSorted === correctSorted;
}

// Навигация и профиль
function navigateTo(page) {
    closeProfilePanel();
    setTimeout(() => {
        window.location.href = page;
    }, 300);
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('Страница деталей попытки загружена');
    
    // Проверяем авторизацию
    const user = window.examAPI.getUserFromStorage();
    if (!user) {
        console.log('Пользователь не авторизован');
        // Можно показать сообщение, но не перенаправляем
        // Пользователь может просматривать попытки и без авторизации
    } else {
        console.log('Пользователь авторизован:', user.name);
    }
    
    // Инициализируем панель профиля
    initProfilePanel();
    
    // Назначаем обработчик на кнопку профиля
    const profileBtn = document.getElementById('profile-btn');
    if (profileBtn) {
        profileBtn.onclick = toggleProfilePanel;
    }
    
    // Включаем кнопку "Экзамен"
    const simulationBtn = document.getElementById('simulation-btn');
    if (simulationBtn) {
        simulationBtn.disabled = false;
    }
    
    // Загружаем детали попытки
    loadAttemptDetails();
});

function displayAttemptDetails() {
    if (!attemptData) return;
    
    const date = new Date(attemptData.date);
    const formattedDate = date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const timeSpentMinutes = Math.floor(attemptData.timeSpent / 60);
    const timeSpentSeconds = attemptData.timeSpent % 60;
    
    document.getElementById('attempt-title').textContent = 
        `Попытка экзамена - ${attemptData.block}`;
    
    document.getElementById('attempt-summary').innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-top: 10px;">
            <div>
                <strong>Дата:</strong><br>
                ${formattedDate}
            </div>
            <div>
                <strong>Результат:</strong><br>
                <span style="color: ${attemptData.isPassed ? '#4CAF50' : '#f44336'}; font-weight: bold;">
                    ${attemptData.grade}
                </span>
            </div>
            <div>
                <strong>Правильных ответов:</strong><br>
                ${attemptData.correctAnswers}/${attemptData.totalQuestions}
            </div>
            <div>
                <strong>Процент:</strong><br>
                ${attemptData.percentage.toFixed(1)}%
            </div>
            <div>
                <strong>Время:</strong><br>
                ${timeSpentMinutes.toString().padStart(2, '0')}:${timeSpentSeconds.toString().padStart(2, '0')}
            </div>
        </div>
    `;
    
    displayQuestionsReview();
}

function displayQuestionsReview() {
    const container = document.getElementById('questions-review');
    
    if (!attemptData.questions || attemptData.questions.length === 0) {
        container.innerHTML = '<p>Детальная информация о вопросах не найдена</p>';
        return;
    }
    
    let html = '<h3>Детальный разбор вопросов:</h3>';
    
    attemptData.questions.forEach((question, index) => {
        const userAnswer = attemptData.userAnswers[index] || [];
        const correctAnswer = question.correctAnswers || [];
        const isCorrect = checkSingleAnswer(question, userAnswer);
        
        html += `
            <div class="question-review" style="
                margin: 20px 0;
                padding: 15px;
                border-radius: 8px;
                border-left: 5px solid ${isCorrect ? '#4CAF50' : '#f44336'};
                background: ${isCorrect ? '#f1f8e9' : '#ffebee'};
            ">
                <div style="display: flex; align-items: center; margin-bottom: 10px;">
                    <span style="font-size: 18px; font-weight: bold; margin-right: 10px;">
                        Вопрос ${index + 1}
                    </span>
                    <span style="color: ${isCorrect ? '#4CAF50' : '#f44336'}; font-weight: bold;">
                        ${isCorrect ? 'ВЕРНО' : 'НЕВЕРНО'}
                    </span>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <strong>Вопрос:</strong> ${question.question}
                </div>
                
                <div style="margin-bottom: 10px;">
                    <strong>Ваш ответ:</strong> 
                    <span style="color: ${isCorrect ? '#4CAF50' : '#f44336'}">
                        ${userAnswer.join(', ') || 'Нет ответа'}
                    </span>
                </div>
                
                <div style="margin-bottom: 10px;">
                    <strong>Правильный ответ:</strong> 
                    <span style="color: #4CAF50">${correctAnswer.join(', ')}</span>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function checkSingleAnswer(question, userAnswer) {
    if (!question || !userAnswer) return false;
    const userSorted = [...userAnswer].sort().join('');
    const correctSorted = [...question.correctAnswers].sort().join('');
    return userSorted === correctSorted;
}

// Загружаем детали при загрузке страницы
document.addEventListener('DOMContentLoaded', loadAttemptDetails);