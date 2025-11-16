// simulation.js
// Убедитесь что эти переменные объявлены только один раз!
let currentQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let timer;
let timeLeft = 60 * 60;
let currentBlock = '';
let startTime = null;

// Инициализация экзамена
function initExam() {
    console.log('🚀 Инициализация экзамена...');
    
    // Получаем выбранный блок
    currentBlock = localStorage.getItem('selectedBlock');
    
    if (!currentBlock) {
        alert('Блок не выбран! Возвращаем на главную страницу.');
        window.location.href = 'index.html';
        return;
    }

    console.log(`Выбран блок: ${currentBlock}`);
    document.getElementById('current-block-name').textContent = currentBlock;
    
    // Проверяем загружены ли вопросы
    if (typeof questionsData === 'undefined') {
        alert('Ошибка: вопросы не загружены!');
        return;
    }
    
    if (!questionsData[currentBlock]) {
        alert(`Вопросы для блока "${currentBlock}" не найдены!`);
        window.location.href = 'index.html';
        return;
    }
    
    const blockQuestions = questionsData[currentBlock];
    
    if (blockQuestions.length === 0) {
        alert(`Для блока "${currentBlock}" нет вопросов!`);
        window.location.href = 'index.html';
        return;
    }
    
    console.log(`Загружено вопросов для "${currentBlock}": ${blockQuestions.length}`);
    
    // Выбираем 30 случайных вопросов
    const questionsCount = Math.min(30, blockQuestions.length);
    currentQuestions = getRandomQuestions(blockQuestions, questionsCount);
    userAnswers = new Array(currentQuestions.length).fill(null);
    
    console.log(`Выбрано ${currentQuestions.length} случайных вопросов`);
    
    startTime = new Date();
    startTimer();
    displayQuestion();
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
        input.value = cyrillicLetters[index]; // А, Б, В, Г, Д, Е
        
        input.checked = userAnswers[currentQuestionIndex]?.includes(input.value) || false;
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
            }
        });
        
        optionsContainer.appendChild(optionElement);
    });
    
    // Управление кнопками
    document.getElementById('prev-btn').style.display = currentQuestionIndex > 0 ? 'inline-block' : 'none';
    document.getElementById('next-btn').style.display = currentQuestionIndex < currentQuestions.length - 1 ? 'inline-block' : 'none';
    document.getElementById('finish-btn').style.display = currentQuestionIndex === currentQuestions.length - 1 ? 'inline-block' : 'none';
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

// Сохранение текущего ответа
function saveCurrentAnswer() {
    const selectedOptions = Array.from(document.querySelectorAll('input[name="answer"]:checked'))
        .map(input => input.value);
    userAnswers[currentQuestionIndex] = selectedOptions;
}

// Завершение экзамена
function finishExam() {
    clearInterval(timer);
    saveCurrentAnswer();
    
    const results = calculateResults();
    showResults(results);
    saveAttemptToStorage(results);
}

// Подсчёт результатов
// simulation.js - полностью переписанная функция calculateResults
// simulation.js - добавьте отладочную информацию
function calculateResults() {
    let correctCount = 0;
    
    console.log('=== ПОДСЧЕТ РЕЗУЛЬТАТОВ (КИРИЛЛИЦА) ===');
    
    currentQuestions.forEach((question, index) => {
        const userAnswer = userAnswers[index] || [];
        const correctAnswer = question.correctAnswers || [];
        
        console.log(`\n--- Вопрос ${index + 1} ---`);
        console.log('Вопрос:', question.question.substring(0, 50) + '...');
        console.log('Правильные ответы:', correctAnswer, 'тип:', typeof correctAnswer[0]);
        console.log('Ответ пользователя:', userAnswer, 'тип:', typeof userAnswer[0]);
        
        // Проверяем что используем кириллицу
        if (correctAnswer.length > 0) {
            const firstChar = correctAnswer[0].charCodeAt(0);
            console.log('Код первого символа правильного ответа:', firstChar, 'символ:', String.fromCharCode(firstChar));
        }
        
        if (userAnswer.length > 0) {
            const firstChar = userAnswer[0].charCodeAt(0);
            console.log('Код первого символа ответа пользователя:', firstChar, 'символ:', String.fromCharCode(firstChar));
        }
        
        let isCorrect = false;
        
        // Простая проверка для отладки
        if (userAnswer.length === 0 && correctAnswer.length === 0) {
            isCorrect = true; // Если оба пустые
        } else if (userAnswer.length !== correctAnswer.length) {
            isCorrect = false; // Разное количество ответов
        } else {
            // Сравниваем массивы
            const userSorted = [...userAnswer].sort().join('');
            const correctSorted = [...correctAnswer].sort().join('');
            isCorrect = userSorted === correctSorted;
            
            console.log('Сравнение строк:', `"${userSorted}" === "${correctSorted}"`, isCorrect);
        }
        
        if (isCorrect) {
            correctCount++;
            console.log('✅ ПРАВИЛЬНО!');
        } else {
            console.log('❌ НЕПРАВИЛЬНО!');
        }
    });
    
    console.log(`\n=== ИТОГО: ${correctCount} из ${currentQuestions.length} ===`);
    
    const percentage = (correctCount / currentQuestions.length) * 100;
    const grade = percentage >= 80 ? '5' : 
                  percentage >= 60 ? '4' : 
                  percentage >= 40 ? '3' : '2';
    
    return {
        correct: correctCount,
        total: currentQuestions.length,
        percentage: percentage,
        grade: grade
    };
}

// Показ результатов
function showResults(results) {
    document.getElementById('exam-container').style.display = 'none';
    document.getElementById('results-container').style.display = 'block';
    
    document.getElementById('correct-answers').textContent = results.correct;
    document.getElementById('total-questions').textContent = results.total;
    document.getElementById('grade').textContent = results.grade;
    
    const timeSpent = 60 * 60 - timeLeft;
    const minutes = Math.floor(timeSpent / 60);
    const seconds = timeSpent % 60;
    document.getElementById('time-spent').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Сохранение попытки
function saveAttemptToStorage(results) {
    const attempt = {
        block: currentBlock,
        date: new Date().toISOString(),
        correctAnswers: results.correct,
        totalQuestions: results.total,
        grade: results.grade,
        percentage: results.percentage,
        timeSpent: (60 * 60 - timeLeft),
        userAnswers: userAnswers,
        questions: currentQuestions.map(q => ({ id: q.id, question: q.question })) // Сохраняем только ID и текст вопросов
    };
    
    const existingAttempts = JSON.parse(localStorage.getItem('examAttempts') || '[]');
    existingAttempts.push(attempt);
    localStorage.setItem('examAttempts', JSON.stringify(existingAttempts));
}

function saveAttempt() {
    window.location.href = 'history.html';
}

function confirmExit() {
    if (confirm('Вы уверены, что хотите завершить экзамен досрочно? Результаты будут сохранены.')) {
        finishExam();
    }
}

// Запускаем экзамен при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Simulation page loaded');
    setTimeout(initExam, 100); // Даем время на загрузку данных
});