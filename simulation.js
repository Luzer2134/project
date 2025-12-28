// simulation.js
let currentQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let timer;
let timeLeft = 45 * 60;
let currentBlock = '';
let startTime = null;
let isGuestMode = false;
let autoSaveInterval;
let isExamFinished = false;

// Инициализация экзамена
async function initExam() {
    console.log('Инициализация экзамена...');
    
    // Получаем выбранный блок
    const selectedBlock = localStorage.getItem('selectedBlock');
    
    if (!selectedBlock) {
        alert('Блок не выбран! Возвращаем на главную страницу.');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }

    currentBlock = selectedBlock;
    
    // Проверяем тип пользователя
    const user = window.examAPI ? window.examAPI.getUserFromStorage() : null;
    if (user && user.userType === 'guest') {
        isGuestMode = true;
        console.log('👤 Гостевой режим');
    } else if (user) {
        console.log('👤 Зарегистрированный пользователь:', user.userType);
    }
    
    console.log(`Выбран блок: ${currentBlock}, Режим: ${isGuestMode ? 'Гость' : 'Зарегистрированный'}`);
    document.getElementById('current-block-name').textContent = currentBlock;
    
    // Проверяем загружены ли вопросы
    if (typeof questionsData === 'undefined') {
        alert('Ошибка: вопросы не загружены! Возвращаем на главную.');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }
    
    if (!questionsData[currentBlock]) {
        alert(`Вопросы для блока "${currentBlock}" не найдены! Возвращаем на главную.`);
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }
    
    const blockQuestions = questionsData[currentBlock];
    
    if (blockQuestions.length === 0) {
        alert(`Для блока "${currentBlock}" нет вопросов! Возвращаем на главную.`);
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }
    
    console.log(`Загружено вопросов для "${currentBlock}": ${blockQuestions.length}`);
    
    // Пытаемся загрузить сохраненный прогресс
    const hasSavedProgress = await loadSavedProgress();
    
    // Если нет сохраненного прогресса, начинаем с начала
    if (!hasSavedProgress) {
        // Выбираем 30 случайных вопросов
        const questionsCount = Math.min(30, blockQuestions.length);
        currentQuestions = getRandomQuestions(blockQuestions, questionsCount);
        userAnswers = new Array(currentQuestions.length).fill(null);
        currentQuestionIndex = 0;
        console.log(`Создана новая симуляция: ${currentQuestions.length} вопросов`);
    }
    
    startTime = new Date();
    startTimer();
    startAutoSave();
    displayQuestion();
}

// Выбор случайных вопросов
function getRandomQuestions(questions, count) {
    const shuffled = [...questions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

// Загрузка сохраненного прогресса
async function loadSavedProgress() {
    try {
        console.log('🔍 Загружаем сохраненный прогресс...');
        const result = await window.examAPI.getSimulationProgress(currentBlock);
        
        if (result.success && result.progress) {
            console.log('📥 Загружен сохраненный прогресс симуляции:', result.progress);
            
            const blockQuestions = questionsData[currentBlock];
            const savedProgress = result.progress;
            
            // Проверяем принадлежность данных текущему пользователю
            const user = window.examAPI.getUserFromStorage();
            if (user && savedProgress.userId !== user.id && savedProgress.userType !== user.userType) {
                console.log('⚠️ Данные принадлежат другому пользователю, игнорируем');
                return false;
            }
            
            // Восстанавливаем индекс текущего вопроса
            currentQuestionIndex = savedProgress.currentQuestionIndex || 0;
            
            // Восстанавливаем ответы пользователя
            userAnswers = savedProgress.userAnswers || [];
            
            // Создаем новую симуляцию с теми же вопросами
            const questionsCount = Math.min(30, blockQuestions.length);
            currentQuestions = getRandomQuestions(blockQuestions, questionsCount);
            
            // Если userAnswers не соответствует длине currentQuestions, корректируем
            if (userAnswers.length > currentQuestions.length) {
                userAnswers = userAnswers.slice(0, currentQuestions.length);
            } else if (userAnswers.length < currentQuestions.length) {
                userAnswers = userAnswers.concat(new Array(currentQuestions.length - userAnswers.length).fill(null));
            }
            
            console.log(`✅ Прогресс восстановлен: вопрос ${currentQuestionIndex + 1} из ${currentQuestions.length}`);
            return true;
        } else {
            console.log('📭 Сохраненного прогресса нет');
            return false;
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки прогресса:', error);
        return false;
    }
}

// Сохранение прогресса
async function saveProgress() {
    if (!currentBlock || currentQuestions.length === 0 || isExamFinished) {
        console.log('⚠️ Сохранение прогресса пропущено');
        return;
    }
    
    // Сохраняем текущий ответ
    saveCurrentAnswer();
    
    console.log('💾 Сохраняем прогресс симуляции...');
    const result = await window.examAPI.saveSimulationProgress(currentBlock, currentQuestionIndex, userAnswers);
    
    if (result.success) {
        console.log('✅ Прогресс сохранен');
    } else {
        console.error('❌ Ошибка сохранения прогресса:', result.error);
    }
}

// Таймер
function startTimer() {
    timer = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        
        if (timeLeft <= 0) {
            finishExam();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById('timer').textContent = 
        `Осталось времени: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Меняем цвет при малом остатке времени
    if (timeLeft < 300) {
        document.getElementById('timer').style.color = '#ff0000';
    } else if (timeLeft < 600) {
        document.getElementById('timer').style.color = '#ff6b00';
    }
}

// Автосохранение
function startAutoSave() {
    autoSaveInterval = setInterval(() => {
        if (currentBlock && currentQuestions.length > 0 && !isExamFinished) {
            saveProgress();
            console.log('💾 Автосохранение прогресса');
        }
    }, 30000); // 30 секунд
}

// Отображение вопроса
function displayQuestion() {
    if (!currentQuestions || currentQuestions.length === 0) {
        console.error('Нет вопросов для отображения!');
        return;
    }
    
    const question = currentQuestions[currentQuestionIndex];
    
    if (!question) {
        console.error('Вопрос не найден!');
        return;
    }
    
    const questionNumber = currentQuestionIndex + 1;
    
    document.getElementById('question-number').textContent = `Вопрос ${questionNumber} из ${currentQuestions.length}`;
    document.getElementById('question-text').textContent = question.question;
    
    // Отображение изображения
    const imageContainer = document.getElementById('question-image');
    imageContainer.innerHTML = '';
    if (question.image) {
        const img = document.createElement('img');
        img.src = question.image;
        img.alt = 'Иллюстрация к вопросу';
        img.style.maxWidth = '100%';
        img.style.maxHeight = '300px';
        imageContainer.appendChild(img);
    }
    
    // Отображение вариантов ответа
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';
    
    if (!question.options || question.options.length === 0) {
        optionsContainer.innerHTML = '<p>Нет вариантов ответа</p>';
        return;
    }
    
    question.options.forEach((option, index) => {
        const optionElement = document.createElement('div');
        optionElement.className = 'option';
        optionElement.style.padding = '10px';
        optionElement.style.margin = '5px 0';
        optionElement.style.border = '1px solid #ddd';
        optionElement.style.borderRadius = '5px';
        optionElement.style.cursor = 'pointer';
        
        const input = document.createElement('input');
        input.type = question.correctAnswers.length > 1 ? 'checkbox' : 'radio';
        input.name = 'answer';
        
        const cyrillicLetters = ['А', 'Б', 'В', 'Г', 'Д', 'Е'];
        input.value = cyrillicLetters[index];
        
        // Проверяем, выбран ли этот вариант в сохраненном ответе
        const userAnswer = userAnswers[currentQuestionIndex];
        const isChecked = userAnswer ? userAnswer.includes(input.value) : false;
        input.checked = isChecked;
        
        input.style.cssText = `
            margin-right: 12px;
            transform: scale(1.2);
            cursor: pointer;
        `;
        
        const label = document.createElement('label');
        label.textContent = option;
        label.style.cursor = 'pointer';
        label.style.flex = '1';
        
        optionElement.appendChild(input);
        optionElement.appendChild(label);
        
        // Клик по всему блоку опции
        optionElement.addEventListener('click', function(e) {
            if (e.target !== input) {
                input.checked = !input.checked;
                input.dispatchEvent(new Event('change'));
            }
        });
        
        // При изменении чекбокса/радио сохраняем ответ
        input.addEventListener('change', function() {
            saveCurrentAnswer();
        });
        
        optionsContainer.appendChild(optionElement);
    });
    
    // Управление кнопками
    document.getElementById('prev-btn').style.display = currentQuestionIndex > 0 ? 'inline-block' : 'none';
    document.getElementById('next-btn').style.display = currentQuestionIndex < currentQuestions.length - 1 ? 'inline-block' : 'none';
    document.getElementById('finish-btn').style.display = currentQuestionIndex === currentQuestions.length - 1 ? 'inline-block' : 'none';
}

// Сохранение текущего ответа
function saveCurrentAnswer() {
    const selectedOptions = Array.from(document.querySelectorAll('input[name="answer"]:checked'))
        .map(input => input.value);
    userAnswers[currentQuestionIndex] = selectedOptions;
}

// Навигация по вопросам
function nextQuestion() {
    if (isExamFinished) return;
    
    saveCurrentAnswer();
    saveProgress();
    
    if (currentQuestionIndex < currentQuestions.length - 1) {
        currentQuestionIndex++;
        displayQuestion();
    }
}

function prevQuestion() {
    if (isExamFinished) return;
    
    saveCurrentAnswer();
    saveProgress();
    
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        displayQuestion();
    }
}

// Завершение экзамена (нормальное или по таймеру)
async function finishExam() {
    if (isExamFinished) return;
    
    isExamFinished = true;
    clearInterval(timer);
    clearInterval(autoSaveInterval);
    saveCurrentAnswer();
    saveProgress();
    
    const results = calculateResults();
    showResults(results);
    
    // Удаляем сохраненный прогресс симуляции после завершения
    await deleteSimulationProgress();
    
    // Сохраняем попытку в историю
    await saveAttemptToStorage(results);
}

// Завершение экзамена досрочно
async function finishExamEarly() {
    if (isExamFinished) return;
    
    isExamFinished = true;
    clearInterval(timer);
    clearInterval(autoSaveInterval);
    saveCurrentAnswer();
    saveProgress();
    
    const results = calculateResults();
    showResults(results);
    
    // Удаляем сохраненный прогресс симуляции после завершения
    await deleteSimulationProgress();
    
    // Сохраняем попытку в историю
    await saveAttemptToStorage(results);
}

// Удаление прогресса симуляции
async function deleteSimulationProgress() {
    console.log('🗑️ Удаляем прогресс симуляции...');
    const result = await window.examAPI.deleteSimulationProgress(currentBlock);
    
    if (result.success) {
        console.log('✅ Прогресс симуляции удален');
    } else {
        console.error('❌ Ошибка удаления прогресса:', result.error);
    }
}

// Подсчёт результатов
function calculateResults() {
    let correctCount = 0;
    const questionResults = [];
    
    console.log('=== ПОДСЧЕТ РЕЗУЛЬТАТОВ ===');
    
    currentQuestions.forEach((question, index) => {
        const userAnswer = userAnswers[index] || [];
        const correctAnswer = question.correctAnswers || [];
        
        // Сравниваем массивы
        const userSorted = [...userAnswer].sort().join('');
        const correctSorted = [...correctAnswer].sort().join('');
        const isCorrect = userSorted === correctSorted;
        
        if (isCorrect) {
            correctCount++;
        }
        
        // Сохраняем детали по каждому вопросу для показа результатов
        questionResults.push({
            question: question,
            userAnswer: userAnswer,
            correctAnswer: correctAnswer,
            isCorrect: isCorrect,
            questionNumber: index + 1
        });
        
        console.log(`Вопрос ${index + 1}: ${isCorrect ? 'ВЕРНЫЙ' : 'НЕВЕРНЫЙ'}`);
    });
    
    const percentage = (correctCount / currentQuestions.length) * 100;
    
    // Система зачет/незачет (от 80%)
    const isPassed = percentage >= 80;
    const grade = isPassed ? 'ЗАЧЕТ' : 'НЕЗАЧЕТ';
    
    return {
        correct: correctCount,
        total: currentQuestions.length,
        percentage: percentage,
        grade: grade,
        isPassed: isPassed,
        questionResults: questionResults
    };
}

// Показ результатов
function showResults(results) {
    document.getElementById('exam-container').style.display = 'none';
    document.getElementById('results-container').style.display = 'block';
    
    // Основная статистика
    document.getElementById('correct-answers').textContent = results.correct;
    document.getElementById('total-questions').textContent = results.total;
    document.getElementById('grade').textContent = results.grade;
    
    // Время
    const timeSpent = 45 * 60 - timeLeft;
    const minutes = Math.floor(timeSpent / 60);
    const seconds = timeSpent % 60;
    document.getElementById('time-spent').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Процент правильных ответов
    const percentageElement = document.createElement('p');
    percentageElement.innerHTML = `<strong>Процент правильных ответов:</strong> ${results.percentage.toFixed(1)}%`;
    document.querySelector('#results-container .block').appendChild(percentageElement);
    
    // Статус сдачи
    const statusElement = document.createElement('p');
    statusElement.innerHTML = `<strong>Статус:</strong> <span style="color: ${results.isPassed ? '#4CAF50' : '#f44336'}; font-weight: bold;">${results.isPassed ? 'СДАЛ' : 'НЕ СДАЛ'}</span>`;
    document.querySelector('#results-container .block').appendChild(statusElement);
    
    // Показываем детальные результаты
    showDetailedResults(results.questionResults);
}

// Сохранение попытки
async function saveAttemptToStorage(results) {
    const user = window.examAPI ? window.examAPI.getUserFromStorage() : null;
    
    if (!user) {
        console.log('Пользователь не найден - попытка не сохраняется');
        return;
    }
    
    const attempt = {
        block: currentBlock,
        date: new Date().toISOString(),
        correctAnswers: results.correct,
        totalQuestions: results.total,
        grade: results.grade,
        percentage: results.percentage,
        isPassed: results.isPassed,
        timeSpent: (45 * 60 - timeLeft),
        userAnswers: userAnswers,
        questions: currentQuestions.map(q => ({ 
            id: q.id, 
            question: q.question,
            correctAnswers: q.correctAnswers
        }))
    };
    
    // Используем API для сохранения
    const saveResult = await window.examAPI.saveExamAttempt(attempt);
    
    if (saveResult.success) {
        console.log('✅ Попытка экзамена сохранена');
        
        if (saveResult.local) {
            console.log('⚠️ Данные сохранены только локально (гость или ошибка сервера)');
        }
    } else {
        console.error('❌ Ошибка сохранения попытки:', saveResult.error);
    }
}

// Функция для показа обзора вопросов
function showDetailedResults(questionResults) {
    const detailsContainer = document.createElement('div');
    detailsContainer.id = 'detailed-results';
    detailsContainer.style.cssText = `
        margin-top: 30px;
        text-align: left;
        max-width: 800px;
        margin-left: auto;
        margin-right: auto;
    `;
    
    detailsContainer.innerHTML = `
        <h3>Детальные результаты:</h3>
        <div id="questions-review"></div>
    `;
    
    document.getElementById('results-container').appendChild(detailsContainer);
    
    // Показываем вопросы с ответами
    showQuestionsReview(questionResults);
}

function showQuestionsReview(questionResults) {
    const reviewContainer = document.getElementById('questions-review');
    
    questionResults.forEach(result => {
        const questionElement = createQuestionReviewElement(result);
        reviewContainer.appendChild(questionElement);
    });
}

function createQuestionReviewElement(result) {
    const element = document.createElement('div');
    element.className = `question-review ${result.isCorrect ? 'correct' : 'incorrect'}`;
    element.style.cssText = `
        margin: 20px 0;
        padding: 15px;
        border-radius: 8px;
        border-left: 5px solid ${result.isCorrect ? '#4CAF50' : '#f44336'};
        background: #f9f9f9;
    `;
    
    const question = result.question;
    const userAnswer = result.userAnswer.join(', ') || 'Нет ответа';
    const correctAnswer = result.correctAnswer.join(', ');
    
    element.innerHTML = `
        <div style="display: flex; align-items: center; margin-bottom: 10px;">
            <span style="font-size: 18px; font-weight: bold; margin-right: 10px;">
                Вопрос ${result.questionNumber}
            </span>
            <span style="color: ${result.isCorrect ? '#4CAF50' : '#f44336'}; font-weight: bold;">
                ${result.isCorrect ? 'ВЕРНО' : 'НЕВЕРНО'}
            </span>
        </div>
        
        <div style="margin-bottom: 15px;">
            <strong>Вопрос:</strong> ${question.question}
        </div>
        
        <div style="margin-bottom: 10px;">
            <strong>Ваш ответ:</strong> 
            <span style="color: ${result.isCorrect ? '#4CAF50' : '#f44336'}">
                ${userAnswer}
            </span>
        </div>
        
        <div style="margin-bottom: 10px;">
            <strong>Правильный ответ:</strong> 
            <span style="color: #4CAF50">${correctAnswer}</span>
        </div>
        
        ${question.comment ? `
        <div style="margin-bottom: 10px; padding: 10px; background: #e8f4fd; border-radius: 5px;">
            <strong>Комментарий:</strong> ${question.comment}
        </div>
        ` : ''}
        
        <div style="margin-top: 10px;">
            <strong>Варианты ответов:</strong>
            <div style="margin-left: 20px;">
                ${question.options.map((option, index) => {
                    const letter = String.fromCharCode(1040 + index);
                    const isUserSelected = result.userAnswer.includes(letter);
                    const isCorrectOption = result.correctAnswer.includes(letter);
                    
                    let style = 'padding: 2px 5px; margin: 2px 0;';
                    if (isUserSelected && isCorrectOption) {
                        style += 'background: #c8e6c9; color: #2e7d32;';
                    } else if (isUserSelected && !isCorrectOption) {
                        style += 'background: #ffcdd2; color: #c62828;';
                    } else if (!isUserSelected && isCorrectOption) {
                        style += 'background: #fff9c4; color: #f57f17;';
                    }
                    
                    return `<div style="${style}">${letter}. ${option}</div>`;
                }).join('')}
            </div>
        </div>
    `;
    
    return element;
}

// Обработка выхода из экзамена ДОСРОЧНО
function confirmExit() {
    if (confirm('Завершить экзамен досрочно? Будет подсчитан результат на основе отвеченных вопросов.')) {
        finishExamEarly();
    }
}

// Обработка сохранения и выхода
function saveAttempt() {
    window.location.href = 'history.html';
}

// Обработка закрытия страницы
window.addEventListener('beforeunload', function (e) {
    if (currentBlock && currentQuestions.length > 0 && timeLeft > 0 && !isExamFinished) {
        saveCurrentAnswer();
        saveProgress();
        
        // Показываем предупреждение только если экзамен не завершен
        e.preventDefault();
        e.returnValue = 'У вас есть несохраненный прогресс симуляции. Вы уверены, что хотите уйти?';
    }
});

// Запускаем экзамен при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('Simulation page loaded');
    setTimeout(initExam, 100);
});