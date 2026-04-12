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
    
    
    
    const blockQuestions = questionsData[currentBlock];
    
    
    console.log(`Загружено вопросов для "${currentBlock}": ${blockQuestions.length}`);
    
    // Пытаемся загрузить сохраненный прогресс
    const hasSavedProgress = await loadSavedProgress();
    
    // Если нет сохраненного прогресса, начинаем с начала
    if (!hasSavedProgress) {
        // Выбираем 30 случайных вопросов
        const questionsCount = Math.min(30, blockQuestions.length);
        currentQuestions = getRandomQuestions(blockQuestions, questionsCount);
        // Инициализируем userAnswers как массив null значений
        userAnswers = new Array(currentQuestions.length).fill(null);
        currentQuestionIndex = 0;
        console.log(`Создана новая симуляция: ${currentQuestions.length} вопросов`);
        console.log('Инициализирован userAnswers:', userAnswers);
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
        const result = await Promise.race([
             window.examAPI.getSimulationProgress(currentBlock),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
        ]);
        
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
                // Заполняем недостающие значения null
                userAnswers = userAnswers.concat(new Array(currentQuestions.length - userAnswers.length).fill(null));
            }
            
            // Преобразуем null в пустые массивы
            userAnswers = userAnswers.map(answer => answer === null ? [] : answer);
            
            console.log(`✅ Прогресс восстановлен: вопрос ${currentQuestionIndex + 1} из ${currentQuestions.length}`);
            console.log('Восстановленные ответы:', userAnswers);
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
    if (question.картинки || question.image) {
        const img = document.createElement('img');
        img.src = question.картинки || question.image;
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
    
    // Получаем сохраненный ответ для текущего вопроса
    const savedAnswer = userAnswers[currentQuestionIndex];
    console.log(`Вопрос ${questionNumber}: сохраненный ответ:`, savedAnswer);
    
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
        const letter = cyrillicLetters[index];
        input.value = letter;
        
        // Проверяем, выбран ли этот вариант в сохраненном ответе
        const isChecked = savedAnswer ? savedAnswer.includes(letter) : false;
        input.checked = isChecked;
        
        input.style.cssText = `
            margin-right: 12px;
            transform: scale(1.2);
            cursor: pointer;
        `;
        
        const label = document.createElement('label');
        const cleanOption = option.replace(/^[А-Е][\)\.]\s*/, '');
        label.textContent = `${letter}) ${cleanOption}`;
        label.style.cursor = 'pointer';
        label.style.flex = '1';
        
        optionElement.appendChild(input);
        optionElement.appendChild(label);
        
        // Клик по всему блоку опции
        optionElement.addEventListener('click', function(e) {
            if (e.target !== input) {
                // Для радио-кнопок нужно снять выделение с других
                if (input.type === 'radio') {
                    document.querySelectorAll('input[name="answer"]').forEach(otherInput => {
                        otherInput.checked = false;
                    });
                    input.checked = true;
                } else {
                    input.checked = !input.checked;
                }
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
        
        console.log(`Вопрос ${index + 1}:`);
        console.log('  - Ответ пользователя:', userAnswer);
        console.log('  - Правильный ответ:', correctAnswer);
        console.log('  - Длина пользовательского ответа:', userAnswer.length);
        console.log('  - Длина правильного ответа:', correctAnswer.length);
        
        let isCorrect = false;
        
        // Если ответы пустые, считаем неправильным
        if (userAnswer.length === 0) {
            isCorrect = false;
            console.log('  - Результат: НЕВЕРНО (пустой ответ)');
        } 
        // Если длины ответов разные, точно неправильно
        else if (userAnswer.length !== correctAnswer.length) {
            isCorrect = false;
            console.log('  - Результат: НЕВЕРНО (разная длина ответов)');
        }
        // Сравниваем массивы
        else {
            const userSorted = [...userAnswer].sort().join('');
            const correctSorted = [...correctAnswer].sort().join('');
            isCorrect = userSorted === correctSorted;
            console.log('  - Результат:', isCorrect ? 'ВЕРНО' : 'НЕВЕРНО');
        }
        
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
    });
    
    const total = currentQuestions.length;
    const percentage = total > 0 ? (correctCount / total) * 100 : 0;
    
    // Система зачет/незачет (от 80%)
    const isPassed = percentage >= 80;
    const grade = isPassed ? 'ЗАЧЕТ' : 'НЕЗАЧЕТ';
    
    console.log(`📊 Итоговые результаты:`);
    console.log(`  - Правильных: ${correctCount}/${total}`);
    console.log(`  - Процент: ${percentage.toFixed(1)}%`);
    console.log(`  - Оценка: ${grade}`);
    console.log(`  - Сдал: ${isPassed ? 'Да' : 'Нет'}`);
    
    return {
        correct: correctCount,
        total: total,
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
    document.getElementById('correct-answers').textContent = results.correct || 0;
    document.getElementById('total-questions').textContent = results.total || 0;
    document.getElementById('grade').textContent = results.grade || 'НЕЗАЧЕТ';
    
    // Время
    const timeSpent = 45 * 60 - timeLeft;
    const minutes = Math.floor(timeSpent / 60);
    const seconds = timeSpent % 60;
    document.getElementById('time-spent').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Процент правильных ответов
    const percentageElement = document.createElement('p');
    const percentageValue = results.percentage !== undefined ? results.percentage.toFixed(1) : '0.0';
    percentageElement.innerHTML = `<strong>Процент правильных ответов:</strong> ${percentageValue}%`;
    document.querySelector('#results-container .block').appendChild(percentageElement);
    
    // Статус сдачи
    const statusElement = document.createElement('p');
    statusElement.innerHTML = `<strong>Статус:</strong> <span style="color: ${results.isPassed ? '#64D23F' : '#D23F3F'}; font-weight: bold;">${results.isPassed ? 'СДАЛ' : 'НЕ СДАЛ'}</span>`;
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
    
    // Генерируем уникальный ID для попытки
    const attemptId = `attempt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Убеждаемся что все необходимые поля есть
    const attempt = {
        id: attemptId,
        block: currentBlock || 'Неизвестный блок',
        date: new Date().toISOString(),
        correctAnswers: results.correct || 0,
        totalQuestions: results.total || currentQuestions.length || 0,
        grade: results.grade || (results.isPassed ? 'ЗАЧЕТ' : 'НЕЗАЧЕТ'),
        percentage: results.percentage || (results.total > 0 ? (results.correct / results.total * 100) : 0),
        isPassed: results.isPassed || false,
        timeSpent: (45 * 60 - timeLeft) || 0,
        userAnswers: userAnswers || [],
        questions: currentQuestions.map(q => ({ 
            id: q.id || 'unknown', 
            question: q.question || 'Без вопроса',
            correctAnswers: q.correctAnswers || []
        })) || [],
        userId: user.id || 'guest',
        userType: user.userType || 'guest'
    };
    
    // Проверяем все поля
    console.log('💾 Сохраняемая попытка:', {
        ...attempt,
        questionsCount: attempt.questions.length
    });
    
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
        border-left: 5px solid ${result.isCorrect ? '#4FA532' : '#9C2C2C'};
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
            <span style="color: ${result.isCorrect ? '#64D23F' : '#D23F3F'}; font-weight: bold;">
                ${result.isCorrect ? 'ВЕРНО' : 'НЕВЕРНО'}
            </span>
        </div>
        
        <div style="margin-bottom: 15px;">
            <strong>Вопрос:</strong> ${question.question}
        </div>
        
        <div style="margin-bottom: 10px;">
            <strong>Ваш ответ:</strong> 
            <span style="color: ${result.isCorrect ? '#64D23F' : '#D23F3F'}">
                ${userAnswer}
            </span>
        </div>
        
        <div style="margin-bottom: 10px;">
            <strong>Правильный ответ:</strong> 
            <span style="color: #64D23F">${correctAnswer}</span>
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
                        style += 'background: #c8e6c9; color: #64D23F;';
                    } else if (isUserSelected && !isCorrectOption) {
                        style += 'background: #ffcdd2; color: #D23F3F;';
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

// Обработка сохранения и выхода - теперь идет на историю
function saveAttempt() {
    // Уже сохранено в saveAttemptToStorage, просто переходим на историю
    window.location.href = 'history.html';
}

// Функция для возврата на главную страницу
function goToMain() {
    window.location.href = 'index.html';
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


