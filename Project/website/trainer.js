// trainer.js
let currentQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let currentBlock = '';

// Инициализация тренажёра
function initTrainer() {
    console.log('Инициализация тренажёра...');
    
    // Получаем выбранный блок
    currentBlock = localStorage.getItem('selectedBlock');
    
    if (!currentBlock) {
        alert('Блок не выбран! Возвращаем на главную страницу.');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }

    console.log(`Выбран блок: ${currentBlock}`);
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
    
    console.log(`Загружено вопросов для тренажёра: ${blockQuestions.length}`);
    
    // Берем ВСЕ вопросы блока
    currentQuestions = [...blockQuestions];
    userAnswers = new Array(currentQuestions.length).fill(null);
    
    // Загружаем сохраненный прогресс
    loadProgress();
    
    // Показываем первый вопрос
    displayQuestion();
    
    // Обновляем прогресс
    updateProgress();
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
    
    // Сбрасываем выбранные ответы для текущего вопроса
    const currentUserAnswer = userAnswers[currentQuestionIndex] || [];
    
    question.options.forEach((option, index) => {
        const optionElement = document.createElement('div');
        optionElement.className = 'option';
        optionElement.style.cssText = `
            padding: 12px 15px;
            margin: 8px 0;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            background: white;
        `;
        
        const input = document.createElement('input');
        input.type = question.correctAnswers.length > 1 ? 'checkbox' : 'radio';
        input.name = 'answer';
        
        // Используем кириллические буквы А-Е
        const cyrillicLetters = ['А', 'Б', 'В', 'Г', 'Д', 'Е'];
        input.value = cyrillicLetters[index];
        
        // Восстанавливаем сохраненный ответ
        input.checked = currentUserAnswer.includes(input.value);
        input.style.cssText = `
            margin-right: 12px;
            transform: scale(1.2);
            cursor: pointer;
        `;
        
        const label = document.createElement('label');
        label.textContent = option;
        label.style.cssText = `
            cursor: pointer;
            flex: 1;
            font-size: 16px;
            line-height: 1.4;
            display: block;
        `;
        
        // Подсветка уже проверенных ответов
        if (currentUserAnswer.length > 0 && userAnswers[currentQuestionIndex] !== null) {
            const isCorrect = checkSingleAnswer(question, currentUserAnswer);
            if (isCorrect) {
                optionElement.style.borderColor = '#4CAF50';
                optionElement.style.backgroundColor = '#f1f8e9';
            } else {
                optionElement.style.borderColor = '#f44336';
                optionElement.style.backgroundColor = '#ffebee';
            }
            input.disabled = true;
            label.style.cursor = 'default';
            optionElement.style.cursor = 'default';
        } else {
            // Обработчики только для непроверенных вопросов
            optionElement.addEventListener('click', function(e) {
                if (e.target !== input && !input.disabled) {
                    input.checked = !input.checked;
                }
            });
        }
        
        optionElement.appendChild(input);
        optionElement.appendChild(label);
        optionsContainer.appendChild(optionElement);
    });
    
    // Управление кнопками
    document.getElementById('prev-btn').style.display = currentQuestionIndex > 0 ? 'inline-block' : 'none';
    document.getElementById('next-btn').style.display = currentQuestionIndex < currentQuestions.length - 1 ? 'inline-block' : 'none';
    document.getElementById('check-btn').style.display = userAnswers[currentQuestionIndex] === null ? 'inline-block' : 'none';
}

// Проверка ответа
function checkAnswer() {
    const selectedOptions = Array.from(document.querySelectorAll('input[name="answer"]:checked'))
        .map(input => input.value);
    
    if (selectedOptions.length === 0) {
        alert('Пожалуйста, выберите ответ!');
        return;
    }
    
    // Сохраняем ответ
    userAnswers[currentQuestionIndex] = selectedOptions;
    saveProgress();
    
    const question = currentQuestions[currentQuestionIndex];
    const isCorrect = checkSingleAnswer(question, selectedOptions);
    
    // Показываем модальное окно с результатом
    showResultModal(question, selectedOptions, isCorrect);
    
    // Обновляем прогресс
    updateProgress();
}

// Проверка одного ответа
function checkSingleAnswer(question, userAnswer) {
    const userSorted = [...userAnswer].sort().join('');
    const correctSorted = [...question.correctAnswers].sort().join('');
    return userSorted === correctSorted;
}

// Показ модального окна с результатом
function showResultModal(question, userAnswer, isCorrect) {
    const modal = document.getElementById('result-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    
    modalTitle.textContent = isCorrect ? 'ВЕРНО' : 'НЕВЕРНО';
    modalTitle.style.color = isCorrect ? '#4CAF50' : '#f44336';
    
    let content = `
        <div style="margin-bottom: 15px;">
            <strong>Ваш ответ:</strong> ${userAnswer.join(', ')}
        </div>
        <div style="margin-bottom: 15px;">
            <strong>Правильный ответ:</strong> ${question.correctAnswers.join(', ')}
        </div>
    `;
    
    if (question.comment) {
        content += `
            <div style="margin-bottom: 15px; padding: 10px; background: #e8f4fd; border-radius: 5px;">
                <strong>Комментарий:</strong> ${question.comment}
            </div>
        `;
    }
    
    // Показываем все варианты с подсветкой
    content += `<div style="margin-bottom: 15px;"><strong>Все варианты:</strong></div>`;
    
    question.options.forEach((option, index) => {
        const letter = String.fromCharCode(1040 + index);
        const isUserSelected = userAnswer.includes(letter);
        const isCorrectOption = question.correctAnswers.includes(letter);
        
        let style = 'padding: 8px; margin: 5px 0; border-radius: 5px;';
        
        if (isUserSelected && isCorrectOption) {
            style += 'background: #c8e6c9; color: #2e7d32; border-left: 4px solid #4CAF50;';
        } else if (isUserSelected && !isCorrectOption) {
            style += 'background: #ffcdd2; color: #c62828; border-left: 4px solid #f44336;';
        } else if (!isUserSelected && isCorrectOption) {
            style += 'background: #fff9c4; color: #f57f17; border-left: 4px solid #ffc107;';
        } else {
            style += 'background: #f5f5f5; color: #666;';
        }
        
        content += `<div style="${style}">${option}</div>`;
    });
    
    modalContent.innerHTML = content;
    modal.style.display = 'block';
}

// Закрытие модального окна
function closeModal() {
    document.getElementById('result-modal').style.display = 'none';
    
    // Перерисовываем вопрос (чтобы заблокировать ответы)
    displayQuestion();
}

// Навигация по вопросам
function nextQuestion() {
    if (currentQuestionIndex < currentQuestions.length - 1) {
        currentQuestionIndex++;
        displayQuestion();
    }
}

function prevQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        displayQuestion();
    }
}

// Обновление прогресса
function updateProgress() {
    const answeredCount = userAnswers.filter(answer => answer !== null).length;
    const totalCount = currentQuestions.length;
    
    document.getElementById('progress').textContent = answeredCount;
    document.getElementById('total-questions').textContent = totalCount;
}

// Сохранение прогресса в localStorage
function saveProgress() {
    const progressData = {
        block: currentBlock,
        userAnswers: userAnswers,
        currentQuestionIndex: currentQuestionIndex,
        timestamp: new Date().toISOString()
    };
    
    localStorage.setItem(`trainerProgress_${currentBlock}`, JSON.stringify(progressData));
    console.log('Прогресс сохранен');
}

// Загрузка прогресса из localStorage
function loadProgress() {
    const savedProgress = localStorage.getItem(`trainerProgress_${currentBlock}`);
    
    if (savedProgress) {
        try {
            const progressData = JSON.parse(savedProgress);
            userAnswers = progressData.userAnswers || new Array(currentQuestions.length).fill(null);
            currentQuestionIndex = progressData.currentQuestionIndex || 0;
            console.log('Прогресс загружен');
        } catch (error) {
            console.error('Ошибка загрузки прогресса:', error);
            userAnswers = new Array(currentQuestions.length).fill(null);
        }
    }
}

// Сброс прогресса
function resetProgress() {
    if (confirm('Вы уверены, что хотите начать тренажёр заново? Весь прогресс будет потерян.')) {
        userAnswers = new Array(currentQuestions.length).fill(null);
        currentQuestionIndex = 0;
        localStorage.removeItem(`trainerProgress_${currentBlock}`);
        displayQuestion();
        updateProgress();
        console.log('Прогресс сброшен');
    }
}

// Переход на главную
function goToMain() {
    // Сохраняем прогресс перед выходом
    saveProgress();
    window.location.href = 'index.html';
}

// Запускаем тренажёр при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('Trainer page loaded');
    setTimeout(initTrainer, 100);
});