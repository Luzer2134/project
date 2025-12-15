let currentQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let timer;
let timeLeft = 45 * 60;
let currentBlock = '';
let startTime = null;

// Инициализация экзамена
// simulation.js (только ключевые функции)

// Основная функция сохранения попытки
// simulation.js (только ключевые функции)

// Основная функция сохранения попытки
async function saveAttemptToStorage(results) {
    console.log('💾 СОХРАНЕНИЕ ПОПЫТКИ ЭКЗАМЕНА');
    
    const user = window.examAPI ? window.examAPI.getUserFromStorage() : null;
    
    if (!user) {
        console.log('❌ Пользователь не найден, не могу сохранить попытку');
        alert('❌ Ошибка: пользователь не найден. Попытка не сохранена.');
        return;
    }
    
    const attempt = {
        block: currentBlock,
        correctAnswers: results.correct,
        totalQuestions: results.total,
        grade: results.grade,
        percentage: results.percentage,
        isPassed: results.isPassed,
        timeSpent: (45 * 60 - timeLeft),
        userAnswers: userAnswers,
        userId: user.id,
        userName: user.name,
        userType: user.userType,
        questions: currentQuestions.map(q => ({ 
            id: q.id, 
            question: q.question,
            correctAnswers: q.correctAnswers,
            options: q.options
        }))
    };
    
    console.log('📋 Данные попытки:', {
        пользователь: user.name,
        тип: user.userType,
        блок: attempt.block,
        результат: `${attempt.correctAnswers}/${attempt.totalQuestions}`,
        оценка: attempt.grade
    });
    
    // 1. ВСЕГДА сохраняем локально
    const localAttempt = {
        ...attempt,
        id: 'local_' + Date.now(),
        date: new Date().toISOString()
    };
    
    // Определяем ключ для localStorage
    const storageKey = user.userType === 'guest' 
        ? 'examAttempts_guest' 
        : `examAttempts_${user.id}`;
    
    const existingAttempts = JSON.parse(localStorage.getItem(storageKey) || '[]');
    existingAttempts.push(localAttempt);
    localStorage.setItem(storageKey, JSON.stringify(existingAttempts));
    
    console.log('✅ Попытка сохранена локально в ключе:', storageKey);
    
    // 2. Для зарегистрированных - сохраняем на сервер
    if (user.userType !== 'guest') {
        console.log('👤 Зарегистрированный пользователь, сохраняем на сервер...');
        
        try {
            const result = await window.examAPI.saveExamAttempt(attempt);
            
            if (result.success) {
                if (result.local) {
                    console.log('⚠️ Попытка сохранена локально (ошибка сервера)');
                    alert('⚠️ Попытка сохранена локально. Сервер недоступен.');
                } else {
                    console.log('✅ Попытка успешно сохранена на сервере!');
                    alert('✅ Результаты экзамена сохранены на сервере!');
                }
            } else {
                console.log('❌ Ошибка сохранения:', result.error);
                alert('❌ Ошибка сохранения: ' + result.error);
            }
        } catch (error) {
            console.error('❌ Критическая ошибка при сохранении:', error);
            alert('❌ Критическая ошибка при сохранении. Попытка сохранена только локально.');
        }
    } else {
        console.log('👤 Гость - только локальное сохранение');
        alert('✅ Результаты сохранены локально. Для синхронизации между устройствами зарегистрируйтесь.');
    }
}

// Инициализация экзамена с проверкой авторизации
function initExam() {
    console.log('🚀 Инициализация экзамена...');
    
    // Проверяем авторизацию
    const user = window.examAPI ? window.examAPI.getUserFromStorage() : null;
    
    if (!user) {
        alert('❌ Вы не авторизованы! Перенаправляем на страницу входа.');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
        return;
    }
    
    console.log('👤 Пользователь:', user.name, 'Тип:', user.userType);
    
    // Получаем выбранный блок
    const selectedBlock = localStorage.getItem('selectedBlock');
    
    if (!selectedBlock) {
        alert('❌ Блок не выбран! Возвращаем на главную страницу.');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }

    currentBlock = selectedBlock;
    console.log(`📚 Выбран блок: ${currentBlock}`);
    
    // Продолжение инициализации...
    // (остальной код остается без изменений)
}
// Выбор случайных вопросов
function getRandomQuestions(questions, count) {
    const shuffled = [...questions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
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

// Отображение вопроса
function displayQuestion() {
    if (!currentQuestions || currentQuestions.length === 0) {
        console.error('❌ Нет вопросов для отображения!');
        return;
    }
    
    const question = currentQuestions[currentQuestionIndex];
    
    if (!question) {
        console.error('❌ Вопрос не найден!');
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
        optionElement.style.cssText = `
            padding: 10px;
            margin: 5px 0;
            border: 1px solid #ddd;
            border-radius: 5px;
            cursor: pointer;
            display: flex;
            align-items: center;
        `;
        
        const input = document.createElement('input');
        input.type = question.correctAnswers.length > 1 ? 'checkbox' : 'radio';
        input.name = 'answer';
        
        const cyrillicLetters = ['А', 'Б', 'В', 'Г', 'Д', 'Е'];
        input.value = cyrillicLetters[index];
        
        input.checked = userAnswers[currentQuestionIndex]?.includes(input.value) || false;
        input.style.cssText = `
            margin-right: 12px;
            transform: scale(1.2);
            cursor: pointer;
        `;
        
        const label = document.createElement('label');
        label.textContent = `${cyrillicLetters[index]}) ${option}`;
        label.style.cssText = `
            cursor: pointer;
            flex: 1;
        `;
        
        optionElement.appendChild(input);
        optionElement.appendChild(label);
        
        optionElement.addEventListener('click', function(e) {
            if (e.target !== input) {
                input.checked = !input.checked;
                input.dispatchEvent(new Event('change'));
            }
        });
        
        input.addEventListener('change', saveCurrentAnswer);
        
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
    saveCurrentAnswer();
    if (currentQuestionIndex < currentQuestions.length - 1) {
        currentQuestionIndex++;
        displayQuestion();
    }
}

function prevQuestion() {
    saveCurrentAnswer();
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        displayQuestion();
    }
}

// Завершение экзамена
function finishExam() {
    console.log('⏱️ Завершение экзамена...');
    clearInterval(timer);
    saveCurrentAnswer();
    
    const results = calculateResults();
    showResults(results);
    saveAttemptToStorage(results);
}

// Подсчёт результатов
function calculateResults() {
    let correctCount = 0;
    const questionResults = [];
    
    console.log('📊 Подсчет результатов...');
    
    currentQuestions.forEach((question, index) => {
        const userAnswer = userAnswers[index] || [];
        const correctAnswer = question.correctAnswers || [];
        
        const userSorted = [...userAnswer].sort().join('');
        const correctSorted = [...correctAnswer].sort().join('');
        const isCorrect = userSorted === correctSorted;
        
        if (isCorrect) {
            correctCount++;
        }
        
        questionResults.push({
            question: question,
            userAnswer: userAnswer,
            correctAnswer: correctAnswer,
            isCorrect: isCorrect,
            questionNumber: index + 1
        });
    });
    
    const percentage = (correctCount / currentQuestions.length) * 100;
    const isPassed = percentage >= 80;
    const grade = isPassed ? 'ЗАЧЕТ' : 'НЕЗАЧЕТ';
    
    console.log(`✅ Правильных ответов: ${correctCount}/${currentQuestions.length} (${percentage.toFixed(1)}%)`);
    
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
    
    // Показываем детальные результаты
    showDetailedResults(results.questionResults);
}

// Детальные результаты
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
    showQuestionsReview(questionResults);
}

// === ОСНОВНАЯ ФУНКЦИЯ СОХРАНЕНИЯ ===
async function saveAttemptToStorage(results) {
    console.log('💾 СОХРАНЕНИЕ ПОПЫТКИ ЭКЗАМЕНА');
    
    const attempt = {
        block: currentBlock,
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
    
    console.log('📋 Данные попытки:', {
        block: attempt.block,
        результат: `${attempt.correctAnswers}/${attempt.totalQuestions}`,
        оценка: attempt.grade
    });
    
    // 1. Сохраняем в localStorage (ВСЕГДА)
    const existingAttempts = JSON.parse(localStorage.getItem('examAttempts') || '[]');
    const localAttempt = {
        ...attempt,
        id: 'local_' + Date.now(),
        date: new Date().toISOString()
    };
    existingAttempts.push(localAttempt);
    localStorage.setItem('examAttempts', JSON.stringify(existingAttempts));
    console.log('✅ Попытка сохранена в localStorage:', localAttempt.id);
    
    // 2. Сохраняем на сервер (только для зарегистрированных)
    const user = window.examAPI ? window.examAPI.getUserFromStorage() : null;
    
    if (user && user.userType !== 'guest') {
        console.log('👤 Зарегистрированный пользователь, сохраняем на сервер...');
        console.log('ID пользователя:', user.id);
        
        try {
            const result = await window.examAPI.saveExamAttempt(attempt);
            
            if (result.success) {
                if (result.local) {
                    console.log('⚠️ Попытка сохранена локально (ошибка сервера)');
                } else {
                    console.log('✅ Попытка успешно сохранена на сервере!');
                }
            } else {
                console.log('❌ Ошибка сохранения:', result.error);
            }
        } catch (error) {
            console.error('❌ Критическая ошибка при сохранении:', error);
        }
    } else {
        console.log('👤 Гость или API не доступен - только локальное сохранение');
    }
}

// Вспомогательные функции
function saveAttempt() {
    console.log('📋 Переход к истории попыток...');
    window.location.href = 'history.html';
}

function confirmExit() {
    if (confirm('Вы уверены, что хотите завершить экзамен досрочно? Результаты не будут сохранены.')) {
        finishExam();
    }
}

// Обзор вопросов
function showQuestionsReview(questionResults) {
    const reviewContainer = document.getElementById('questions-review');
    reviewContainer.innerHTML = '';
    
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
                    
                    return `<div style="${style}">${letter}) ${option}</div>`;
                }).join('')}
            </div>
        </div>
    `;
    
    return element;
}

// Запуск при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎮 Страница симуляции загружена');
    console.log('🔧 examAPI доступен:', !!window.examAPI);
    
    const user = window.examAPI ? window.examAPI.getUserFromStorage() : null;
    console.log('👤 Текущий пользователь:', user ? `${user.name} (${user.userType})` : 'не авторизован');
    
    setTimeout(initExam, 100);
});