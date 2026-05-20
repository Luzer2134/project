// trainer.js - Тренажёр с обучением
let currentQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let currentBlock = '';

async function waitForQuestionsData() {
    console.log('Ожидание загрузки вопросов...');
    
    // Максимальное время ожидания - 10 секунд
    let attempts = 0;
    const maxAttempts = 100; // 100 * 100мс = 10 секунд
    
    while (attempts < maxAttempts) {
        // Проверяем, загрузились ли данные
        if (typeof questionsData !== 'undefined' && questionsData && !isLoading) {
            // Дополнительная проверка: есть ли хоть какие-то вопросы
            const hasQuestions = Object.values(questionsData).some(arr => arr && arr.length > 0);
            if (hasQuestions) {
                console.log('✅ Вопросы загружены!');
                return true;
            }
        }
        await new Promise(resolve => setTimeout(resolve, 100)); // Ждём 100мс
        attempts++;
    }
    console.error('❌ Таймаут загрузки вопросов');
    return false;
}

// ЛОКАЛЬНАЯ СИСТЕМА СОХРАНЕНИЯ ПРОГРЕССА
class LocalProgressManager {
    constructor() {
        console.log('Локальный менеджер прогресса инициализирован');
    }

    // Сохранить прогресс тренажера
    saveTrainerProgress(block, answers, index) {
        try {
            const user = this.getUser();
            if (!user) return { success: false, error: 'Пользователь не найден' };
            
            const key = `trainer_${user.id || 'guest'}_${block}`;
            
            const data = {
                block: block,
                userAnswers: answers,
                currentQuestionIndex: index,
                timestamp: new Date().toISOString(),
                userId: user.id || 'guest',
                userName: user.name || 'Гость'
            };
            
            localStorage.setItem(key, JSON.stringify(data));
            this.updateTrainerProgressList(block, key);
            
            console.log('Прогресс сохранен локально:', key);
            return { success: true, local: true };
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            return { success: false, error: error.message };
        }
    }

    // Загрузить прогресс тренажера
    getTrainerProgress(block) {
        try {
            const user = this.getUser();
            if (!user) return { success: false, error: 'Пользователь не найден' };
            
            const keys = [
                `trainer_${user.id || 'guest'}_${block}`,
                `trainer_guest_${block}`,
                `trainerProgress_local_${user.id || 'guest'}`,
                `trainerProgress_${user.id || 'guest'}`
            ];
            
            let progress = null;
            let usedKey = '';
            
            for (const key of keys) {
                const data = localStorage.getItem(key);
                if (data) {
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.block === block || key.includes(block)) {
                            progress = parsed;
                            usedKey = key;
                            break;
                        }
                    } catch (e) {
                        console.warn('Ошибка парсинга данных для ключа', key, e);
                    }
                }
            }
            
            if (progress) {
                console.log('Прогресс загружен локально из ключа:', usedKey);
                return { 
                    success: true, 
                    progress: progress,
                    local: true 
                };
            } else {
                console.log('Прогресс не найден для блока:', block);
                return { 
                    success: true, 
                    progress: { userAnswers: [], currentQuestionIndex: 0 },
                    local: true 
                };
            }
        } catch (error) {
            console.error('Ошибка загрузки:', error);
            return { 
                success: true, 
                progress: { userAnswers: [], currentQuestionIndex: 0 },
                local: true,
                error: error.message 
            };
        }
    }

    // Обновить список прогресса
    updateTrainerProgressList(block, key) {
        try {
            const user = this.getUser();
            const listKey = `trainer_list_${user.id || 'guest'}`;
            let list = JSON.parse(localStorage.getItem(listKey) || '{}');
            
            list[block] = {
                key: key,
                timestamp: new Date().toISOString(),
                questionCount: userAnswers.length,
                answeredCount: userAnswers.filter(a => a !== null).length
            };
            
            localStorage.setItem(listKey, JSON.stringify(list));
        } catch (error) {
            console.warn('Ошибка обновления списка:', error);
        }
    }

    // Получить пользователя
    getUser() {
        try {
            const userJson = localStorage.getItem('currentUser');
            if (userJson) {
                return JSON.parse(userJson);
            }
            
            return {
                id: 'guest_' + Date.now(),
                name: 'Гость',
                email: 'guest@example.com',
                userType: 'guest',
                isAuthorized: false,
                createdAt: new Date().toISOString()
            };
        } catch (error) {
            console.error(' Ошибка получения пользователя:', error);
            return null;
        }
    }

    // Отладка localStorage
    debugStorage() {
        console.log('ДЕБАГ LOCALSTORAGE:');
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.includes('trainer') || key.includes('progress')) {
                try {
                    const value = JSON.parse(localStorage.getItem(key));
                    console.log(` ${key}:`, value);
                } catch {
                    console.log(` ${key}:`, localStorage.getItem(key));
                }
            }
        }
    }

    // Сбросить прогресс
    resetTrainerProgress(block) {
        try {
            const user = this.getUser();
            if (!user) return { success: false, error: 'Пользователь не найден' };
            
            const keys = [
                `trainer_${user.id || 'guest'}_${block}`,
                `trainer_guest_${block}`,
                `trainerProgress_local_${user.id || 'guest'}`,
                `trainerProgress_${user.id || 'guest'}`
            ];
            
            keys.forEach(key => {
                if (localStorage.getItem(key)) {
                    try {
                        const data = JSON.parse(localStorage.getItem(key));
                        if (typeof data === 'object') {
                            if (data[block]) {
                                delete data[block];
                                localStorage.setItem(key, JSON.stringify(data));
                            } else if (data.block === block) {
                                localStorage.removeItem(key);
                            }
                        }
                    } catch (e) {
                        localStorage.removeItem(key);
                    }
                }
            });
            
            console.log('Прогресс сброшен для блока:', block);
            return { success: true };
        } catch (error) {
            console.error('Ошибка сброса:', error);
            return { success: false, error: error.message };
        }
    }
}

// Создаем глобальный экземпляр
window.localProgress = new LocalProgressManager();

// Инициализация тренажёра
async function initTrainer() {
    console.log('Инициализация тренажёра...');
    
    // ========== ЖДЁМ ЗАГРУЗКУ ВОПРОСОВ ==========
    async function waitForQuestions() {
        console.log('Ожидание загрузки вопросов...');
        let attempts = 0;
        const maxAttempts = 50; // 5 секунд максимум
        
        while (attempts < maxAttempts) {
            // Проверяем, загрузились ли данные
            if (typeof questionsData !== 'undefined' && !isLoading) {
                // Дополнительная проверка: есть ли хоть какие-то вопросы
                const hasQuestions = Object.values(questionsData).some(arr => arr && arr.length > 0);
                if (hasQuestions) {
                    console.log('✅ Вопросы успешно загружены!');
                    return true;
                }
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        console.error('❌ Таймаут загрузки вопросов');
        return false;
    }
    
    // Ждём загрузки вопросов
    const questionsLoaded = await waitForQuestions();
    
    if (!questionsLoaded) {
        alert('Ошибка: вопросы не загружены! Попробуйте обновить страницу (F5)');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }
    
    // ========== РЕЖИМ ИЗБРАННОГО ==========
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');

    if (mode === 'favourites') {
        console.log('Запуск режима избранного');

        const fav = JSON.parse(localStorage.getItem('favourites_test') || '[]');

        if (!fav.length) {
            alert('Нет избранных вопросов');
            window.location.href = 'favourites.html';
            return;
        }

        currentBlock = 'Избранное';
        const blockNameElem = document.getElementById('current-block-name');
        if (blockNameElem) blockNameElem.textContent = 'Избранные вопросы';

        currentQuestions = fav.map(q => ({
            question: q.question,
            options: q.options,
            correctAnswers: q.correctAnswers,
            comment: q.comment,
            image: q.image,
            block: q.block
        }));

        userAnswers = new Array(currentQuestions.length).fill(null);

        updateProgress();
        displayQuestion();
        return;
    }
    
    // ========== ОБЫЧНЫЙ РЕЖИМ ==========
    currentBlock = localStorage.getItem('selectedBlock');
    
    if (!currentBlock) {
        alert('Блок не выбран! Возвращаем на главную страницу.');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }

    console.log(`Выбран блок: ${currentBlock}`);
    const blockNameElem = document.getElementById('current-block-name');
    if (blockNameElem) blockNameElem.textContent = currentBlock;
    
    if (!questionsData[currentBlock]) {
        alert(`Вопросы для блока "${currentBlock}" не найдены! Возвращаем на главную.`);
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }
    
    const blockQuestions = questionsData[currentBlock];
    
    if (!blockQuestions || blockQuestions.length === 0) {
        alert(`Для блока "${currentBlock}" нет вопросов! Возвращаем на главную.`);
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }
    
    console.log(`Загружено вопросов: ${blockQuestions.length}`);
    
    currentQuestions = [...blockQuestions];
    userAnswers = new Array(currentQuestions.length).fill(null);
    
    const progressFill = document.getElementById('progress-fill');
    if (progressFill) progressFill.style.width = '0%';
    
    const progressPercentage = document.getElementById('progress-percentage');
    if (progressPercentage) progressPercentage.textContent = '0%';
    
    loadProgress();
    updateProgress();
    displayQuestion();
    
    console.log('Тренажёр инициализирован:', {
        блок: currentBlock,
        вопросов: currentQuestions.length,
        отвеченных: userAnswers.filter(a => a !== null).length
    });
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
        // Отображение изображения (с поддержкой разных форматов)
    const imageContainer = document.getElementById('question-image');
    imageContainer.innerHTML = '';
    
    // Проверяем разные возможные названия поля с картинкой
    let imageUrl = question.картинки || question.image || question.pictures || question.img;
    
    if (imageUrl) {
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = 'Иллюстрация к вопросу';
        img.style.cssText = `
            max-width: 100%;
            max-height: 300px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            display: block;
            margin: 10px auto;
        `;
        // Добавляем обработчик ошибки для отладки
        img.onerror = function() {
            console.error('❌ Не загрузилась картинка:', imageUrl);
        };
        img.onload = function() {
            console.log('✅ Картинка загружена:', imageUrl);
        };
        imageContainer.appendChild(img);
    }
    
    // Отображение вариантов ответа
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';
    
    if (!question.options || question.options.length === 0) {
        optionsContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">Нет вариантов ответа</p>';
        return;
    }
    
    // Сбрасываем выбранные ответы для текущего вопроса
    const currentUserAnswer = userAnswers[currentQuestionIndex] || [];
    const hasBeenAnswered = currentUserAnswer.length > 0 && userAnswers[currentQuestionIndex] !== null;
    let isCorrect = false;
    
    if (hasBeenAnswered) {
        isCorrect = checkSingleAnswer(question, currentUserAnswer);
    }
    
    question.options.forEach((option, index) => {
        const optionElement = document.createElement('div');
        optionElement.className = 'option';
        
        // Кириллические буквы
        const cyrillicLetters = ['А', 'Б', 'В', 'Г', 'Д', 'Е','Ж'];
        const letter = cyrillicLetters[index];
        
        // Определяем состояние варианта
        const isSelected = currentUserAnswer.includes(letter);
        const isCorrectOption = question.correctAnswers.includes(letter);
        
        // Настройка стилей в зависимости от состояния
        let style = `
            padding: 15px 20px;
            margin: 10px 0;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.3s ease;
            background: white;
            display: flex;
            align-items: center;
            font-size: 16px;
            line-height: 1.5;
        `;
        
        if (hasBeenAnswered) {
            // После проверки подсвечиваем варианты
            if (isSelected && isCorrectOption) {
                // Правильно выбранный вариант
                style += 'background: #e8f5e8; border-color: #4FA532; color: #64D23F;';
            } else if (isSelected && !isCorrectOption) {
                // Неправильно выбранный вариант
                style += 'background: #ffebee; border-color: #9C2C2C; color: #D23F3F;';
            } else if (!isSelected && isCorrectOption) {
                // Правильный вариант, но не выбранный
                style += 'background: #fff8e1; border-color: #ff8f00; color: #ffc107;';
            } else {
                // Нейтральный вариант
                style += 'background: #f5f5f5; border-color: #666; color:#ddd ; cursor: default;';
            }
        } else {
            // До проверки - обычные стили
            style += isSelected ? 'background: #e3f2fd; border-color: #2196F3;' : '';
        }
        
        optionElement.style.cssText = style;
        
        const input = document.createElement('input');
        input.type = question.correctAnswers.length > 1 ? 'checkbox' : 'radio';
        input.name = 'answer';
        input.value = letter;
        input.checked = isSelected;
        input.disabled = hasBeenAnswered;
        input.style.cssText = `
            margin-right: 15px;
            transform: scale(1.3);
            cursor: ${hasBeenAnswered ? 'default' : 'pointer'};
            accent-color: ${hasBeenAnswered ? '#666' : '#2196F3'};
        `;
        
        const label = document.createElement('label');
        // Убрали жирные буквы, оставляем только букву и текст
        let cleanOption = option.replace(/^[А-Ж][\)\.]\s*/, '');
        label.textContent = `${letter}) ${cleanOption}`;
        label.style.cssText = `
            cursor: ${hasBeenAnswered ? 'default' : 'pointer'};
            flex: 1;
            font-size: 16px;
            line-height: 1.4;
            display: block;
            user-select: none;
        `;
        
        // Обработчики только для непроверенных вопросов
        if (!hasBeenAnswered) {
            optionElement.addEventListener('click', function(e) {
                if (e.target !== input && !input.disabled) {
                    if (question.correctAnswers.length > 1) {
                        // Множественный выбор
                        input.checked = !input.checked;
                        updateSelectedAnswers();
                    } else {
                        // Одиночный выбор
                        document.querySelectorAll('input[name="answer"]').forEach(inp => {
                            inp.checked = false;
                        });
                        input.checked = true;
                        updateSelectedAnswers();
                    }
                }
            });
            
            input.addEventListener('change', function() {
                updateSelectedAnswers();
            });
        }
        
        optionElement.appendChild(input);
        optionElement.appendChild(label);
        optionsContainer.appendChild(optionElement);
    });
    
    // Обновляем выбранные ответы для текущего вопроса
    function updateSelectedAnswers() {
        const selected = Array.from(document.querySelectorAll('input[name="answer"]:checked'))
            .map(input => input.value);
        userAnswers[currentQuestionIndex] = selected.length > 0 ? selected : null;
        
        // Сохраняем прогресс при выборе ответа
        setTimeout(saveProgress, 300);
    }
    
    // Управление кнопками
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const checkBtn = document.getElementById('check-btn');
    
    if (prevBtn) {
        prevBtn.style.display = currentQuestionIndex > 0 ? 'inline-block' : 'none';
    }
    
    if (nextBtn) {
        nextBtn.style.display = currentQuestionIndex < currentQuestions.length - 1 ? 'inline-block' : 'none';
    }
    
    if (checkBtn) {
        checkBtn.style.display = !hasBeenAnswered ? 'inline-block' : 'none';
    }
    
    // Если ответ уже проверен, показываем кнопку "Следующий вопрос"
    if (hasBeenAnswered && checkBtn) {
        checkBtn.style.display = 'none';
        if (nextBtn) {
            nextBtn.style.display = 'inline-block';
        }
    }
    // Обновляем состояние кнопки избранного
    updateFavButton();
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
    
    // Обновляем отображение вопроса с подсветкой
    setTimeout(() => {
        displayQuestion();
    }, 100);
}

// Проверка одного ответа
function checkSingleAnswer(question, userAnswer) {
    if (!question || !userAnswer || !question.correctAnswers) return false;
    
    // Приводим к массивам и сортируем
    const userArray = Array.isArray(userAnswer) ? [...userAnswer] : [userAnswer];
    const correctArray = Array.isArray(question.correctAnswers) 
        ? [...question.correctAnswers] 
        : [question.correctAnswers];
    
    // Сортируем и сравниваем
    const userSorted = userArray.sort().join(',');
    const correctSorted = correctArray.sort().join(',');
    
    return userSorted === correctSorted;
}

// Показ модального окна с результатом
function showResultModal(question, userAnswer, isCorrect) {
    const modal = document.getElementById('result-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    
    modalTitle.textContent = isCorrect ? 'ВЕРНО!' : 'НЕВЕРНО!';
    modalTitle.style.color = isCorrect ? '#64D23F' : '#D23F3F';
    modalTitle.style.fontSize = '24px';
    
    let content = `
        <div class="result-summary" style="margin-bottom: 20px; padding: 15px; border-radius: 10px; background: ${isCorrect ? '#e8f5e8' : '#ffebee'};">
            <div style="font-size: 16px; margin-bottom: 8px;">
                <strong>Ваш ответ:</strong> <span style="color: ${isCorrect ? '#64D23F' : '#D23F3F'}">${userAnswer.join(', ')}</span>
            </div>
            <div style="font-size: 16px;">
                <strong>Правильный ответ:</strong> <span style="color: #64D23F">${question.correctAnswers.join(', ')}</span>
            </div>
        </div>
    `;
    
    if (question.comment) {
        content += `
            <div class="comment" style="margin-bottom: 20px; padding: 15px; background: #e3f2fd; border-radius: 10px; border-left: 4px solid #2196F3;">
                <div style="font-weight: bold; margin-bottom: 5px; color: #0d47a1;">Комментарий:</div>
                <div style="color: #1565c0;">${question.comment}</div>
            </div>
        `;
    }
    
    // Показываем все варианты с подсветкой
    content += `<div style="margin-bottom: 15px; font-weight: bold; color: #333;">Все варианты ответа:</div>`;
    
    question.options.forEach((option, index) => {
        const letter = String.fromCharCode(1040 + index);
        const isUserSelected = userAnswer.includes(letter);
        const isCorrectOption = question.correctAnswers.includes(letter);
        
        // Убираем старую букву из текста варианта
        const cleanOption = option.replace(/^[А-Ж][\)\.]\s*/, '');
        
        let style = 'padding: 12px 15px; margin: 8px 0; border-radius: 8px; font-size: 15px;';
        
        if (isUserSelected && isCorrectOption) {
            style += 'background: #c8e6c9; color: #2e7d32; border-left: 4px solid #4CAF50;';
        } else if (isUserSelected && !isCorrectOption) {
            style += 'background: #ffcdd2; color: #c62828; border-left: 4px solid #f44336;';
        } else if (!isUserSelected && isCorrectOption) {
            style += 'background: #fff9c4; color: #f57f17; border-left: 4px solid #ffc107;';
        } else {
            style += 'background: #f5f5f5; color: #666; border-left: 4px solid #ddd;';
        }
        
        content += `<div style="${style}">${letter}. ${cleanOption}</div>`;
});
    
    // Статистика по текущему блоку - СЧИТАЕМ ВСЕ ОТВЕЧЕННЫЕ ВОПРОСЫ
    const answeredCount = countAnsweredQuestions();
    const totalCount = currentQuestions.length;
    const percentage = Math.round((answeredCount / totalCount) * 100);
    
    content += `
        <div style="margin-top: 25px; padding: 15px; background: #f8f9fa; border-radius: 10px; border: 1px solid #e9ecef;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="color: #666;">Прогресс по блоку:</span>
                <span style="font-weight: bold; color: #2196F3;">${answeredCount}/${totalCount} (${percentage}%)</span>
            </div>
            <div style="height: 10px; background: #e0e0e0; border-radius: 5px; overflow: hidden; margin-top: 8px;">
                <div style="height: 100%; width: ${percentage}%; background: ${percentage >= 70 ? '#64D23F' : percentage >= 40 ? '#FF9800' : '#D23F3F'}; transition: width 0.5s;"></div>
            </div>
            <div style="margin-top: 10px; font-size: 14px; color: #666;">
                Прогресс: ${answeredCount} из ${totalCount} вопросов пройдено
            </div>
        </div>
    `;
    
    modalContent.innerHTML = content;
    modal.style.display = 'block';
}

// Закрытие модального окна
function closeModal() {
    const modal = document.getElementById('result-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // НЕ перескакиваем автоматически на следующий вопрос
    // Пользователь сам решит, когда нажать "Следующий вопрос"
}

// Подсчет ОТВЕЧЕННЫХ вопросов (не правильных, а просто отвеченных)
function countAnsweredQuestions() {
    let answeredCount = 0;
    
    for (let i = 0; i < userAnswers.length; i++) {
        const answer = userAnswers[i];
        if (answer !== null && answer !== undefined && answer.length > 0) {
            answeredCount++;
        }
    }
    
    return answeredCount;
}

// Подсчет правильных ответов (для информации, но не для прогресса)
function countCorrectAnswers() {
    let correctCount = 0;
    
    for (let i = 0; i < currentQuestions.length; i++) {
        const answer = userAnswers[i];
        if (answer !== null && answer !== undefined && answer.length > 0) {
            const question = currentQuestions[i];
            if (checkSingleAnswer(question, answer)) {
                correctCount++;
            }
        }
    }
    
    return correctCount;
}

// Навигация по вопросам
function nextQuestion() {
    // Ищем следующий НЕотвеченный вопрос
    let nextIndex = -1;
    
    for (let i = currentQuestionIndex + 1; i < currentQuestions.length; i++) {
        if (userAnswers[i] === null || userAnswers[i].length === 0) {
            nextIndex = i;
            break;
        }
    }
    
    // Если все следующие вопросы отвечены, ищем просто следующий
    if (nextIndex === -1 && currentQuestionIndex < currentQuestions.length - 1) {
        nextIndex = currentQuestionIndex + 1;
    }
    
    if (nextIndex !== -1) {
        currentQuestionIndex = nextIndex;
        displayQuestion();
        
        // Сохраняем позицию
        saveProgress();
    } else {
        // Если это последний вопрос
        const answeredCount = countAnsweredQuestions();
        const totalCount = currentQuestions.length;
        
        if (answeredCount === totalCount) {
            alert(`🎉 Вы ответили на все ${totalCount} вопросов в этом блоке!`);
        } else {
            // Переходим к следующему вопросу (даже если все отвечены)
            if (currentQuestionIndex < currentQuestions.length - 1) {
                currentQuestionIndex++;
                displayQuestion();
                saveProgress();
            }
        }
    }
}

function prevQuestion() {
    // Ищем предыдущий вопрос
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        displayQuestion();
        
        // Сохраняем позицию
        saveProgress();
    }
}

// Обновление прогресса - теперь считаем ОТВЕЧЕННЫЕ вопросы
function updateProgress() {
    if (currentQuestions.length === 0) {
        console.log('Нет вопросов для расчета прогресса');
        return;
    }
    
    const answeredCount = countAnsweredQuestions();
    const totalCount = currentQuestions.length;
    const percentage = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;
    
    // Обновляем UI элементы
    const progressElement = document.getElementById('progress');
    const totalElement = document.getElementById('total-questions');
    const progressFill = document.getElementById('progress-fill');
    const progressPercentage = document.getElementById('progress-percentage');
    
    if (progressElement) {
        progressElement.textContent = answeredCount;
    }
    
    if (totalElement) {
        totalElement.textContent = totalCount;
    }
    
    if (progressFill) {
        progressFill.style.width = `${percentage}%`;
        
        // Динамическое изменение цвета
        if (percentage >= 80) {
            progressFill.style.background = 'linear-gradient(90deg, #3F8FD2, #3F8FD2)';
        } else if (percentage >= 50) {
            progressFill.style.background = 'linear-gradient(90deg, #3F8FD2, #3F8FD2)';
        } else {
            progressFill.style.background = 'linear-gradient(90deg, #3F8FD2, #3F8FD2)';
        }
        
        progressFill.style.transition = 'width 0.5s ease-in-out, background 0.5s ease-in-out';
    }
    
    if (progressPercentage) {
        progressPercentage.textContent = `${percentage}%`;
        progressPercentage.style.color = percentage >= 50 ? '#333' : '#fff';
        progressPercentage.style.textShadow = percentage >= 50 ? 'none' : '0 1px 2px rgba(0,0,0,0.5)';
    }
    
    // Обновляем номер текущего вопроса
    const questionNumber = document.getElementById('question-number');
    if (questionNumber) {
        questionNumber.textContent = `Вопрос ${currentQuestionIndex + 1} из ${totalCount}`;
    }
    
    console.log(`Прогресс обновлен: ${answeredCount}/${totalCount} отвечено (${percentage}%)`);
    
    // Сохраняем прогресс в статистику
    saveProgressForStatsPage(answeredCount, totalCount);
}

// Сохранение прогресса для страницы статистики
function saveProgressForStatsPage(answeredCount, totalCount) {
    try {
        const user = window.localProgress ? window.localProgress.getUser() : null;
        if (!user) {
            console.log('Пользователь не найден для сохранения статистики');
            return;
        }
        
        const statsKey = `trainerProgress_${user.id || 'guest'}`;
        
        // Загружаем существующий прогресс
        let allProgress = {};
        try {
            const existing = localStorage.getItem(statsKey);
            if (existing) {
                allProgress = JSON.parse(existing);
            }
        } catch (e) {
            console.warn('Ошибка загрузки существующего прогресса:', e);
            allProgress = {};
        }
        
        // Рассчитываем процент выполнения
        const percentage = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;
        
        // Сохраняем данные для текущего блока
        allProgress[currentBlock] = {
            userAnswers: userAnswers,
            currentQuestionIndex: currentQuestionIndex,
            completed: answeredCount, // Теперь это ОТВЕЧЕННЫЕ вопросы
            total: totalCount,
            percentage: percentage,
            timestamp: new Date().toISOString(),
            userId: user.id || 'guest',
            userName: user.name || 'Гость',
            block: currentBlock,
            savedAt: Date.now()
        };
        
        // Сохраняем в localStorage
        localStorage.setItem(statsKey, JSON.stringify(allProgress));
        
        console.log('Прогресс сохранен для статистики:', {
            блок: currentBlock,
            отвечено: answeredCount,
            всего: totalCount,
            процент: percentage
        });
        
        // Дополнительно сохраняем для страницы прогресса
        const progressPageKey = `progress_page_${user.id || 'guest'}_${currentBlock}`;
        localStorage.setItem(progressPageKey, JSON.stringify({
            completed: answeredCount,
            total: totalCount,
            percentage: percentage,
            lastUpdated: new Date().toISOString()
        }));
        
    } catch (error) {
        console.error('Ошибка сохранения для статистики:', error);
    }
}

async function saveProgress() {
    console.log('Сохраняем прогресс...');
    
    try {
        // 1. Сохраняем в локальный менеджер тренажёра
        const result = window.localProgress.saveTrainerProgress(
            currentBlock, 
            userAnswers, 
            currentQuestionIndex
        );
        
        // 2. СИНХРОНИЗИРУЕМ ДЛЯ СТРАНИЦЫ ПРОГРЕССА
        syncProgressForStatsPage();
        
        // 3. Обновляем UI прогресса
        updateProgress();
        
        if (result.success) {
            console.log('Прогресс сохранен локально');
        } else {
            console.warn('Ошибка сохранения:', result.error);
        }
    } catch (error) {
        console.error('Критическая ошибка при сохранении:', error);
    }
}
// СИНХРОНИЗАЦИЯ ДЛЯ СТРАНИЦЫ ПРОГРЕССА
// Эта функция гарантированно сохраняет данные в формате, понятном progress.html
function syncProgressForStatsPage() {
    try {
        if (!currentBlock || !userAnswers) {
            console.log('Нет данных для синхронизации');
            return;
        }
        
        const user = window.localProgress ? window.localProgress.getUser() : null;
        if (!user) {
            console.log('Пользователь не найден');
            return;
        }
        
        // Ключ, который будет искать страница прогресса
        const progressKey = `trainerProgress_${user.id || 'guest'}`;
        
        // Считаем отвеченные вопросы
        const answeredCount = userAnswers.filter(answer => 
            answer !== null && 
            answer !== undefined && 
            answer.length > 0
        ).length;
        
        const totalCount = currentQuestions.length;
        const percentage = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;
        
        // Создаём данные в ПРАВИЛЬНОМ формате для страницы прогресса
        const progressData = {
            block: currentBlock,
            completed: answeredCount,
            total: totalCount,
            percentage: percentage,
            userAnswers: userAnswers,
            timestamp: new Date().toISOString(),
            lastUpdated: Date.now()
        };
        
        console.log('Синхронизация для страницы прогресса:', {
            блок: currentBlock,
            отвечено: answeredCount,
            всего: totalCount,
            процент: percentage,
            ключ: progressKey
        });
        
        // Сохраняем несколькими способами для надёжности
        
        // Способ 1: Основной ключ (объект с блоками)
        let allBlocksData = {};
        const existingAllData = localStorage.getItem(progressKey);
        if (existingAllData) {
            try {
                allBlocksData = JSON.parse(existingAllData);
            } catch (e) {
                console.warn('Ошибка парсинга существующих данных:', e);
            }
        }
        
        allBlocksData[currentBlock] = progressData;
        localStorage.setItem(progressKey, JSON.stringify(allBlocksData));
        console.log('Данные сохранены в основной формат');
        
        // Способ 2: Отдельный ключ для каждого блока (для совместимости)
        const blockKey = `progress_${user.id || 'guest'}_${currentBlock}`;
        localStorage.setItem(blockKey, JSON.stringify(progressData));
        console.log('Данные сохранены в отдельный ключ:', blockKey);
        
        // Способ 3: Простой ключ для быстрого доступа
        const simpleKey = `simpleProgress_${currentBlock}`;
        const simpleData = {
            completed: answeredCount,
            total: totalCount,
            percentage: percentage,
            updated: Date.now()
        };
        localStorage.setItem(simpleKey, JSON.stringify(simpleData));
        
    } catch (error) {
        console.error('Ошибка синхронизации для страницы прогресса:', error);
    }
}

// Синхронная загрузка прогресса (для getBlockProgress)
function loadTrainerProgressSync() {
    try {
        const user = window.examAPI ? window.examAPI.getUserFromStorage() : null;
        if (!user) return {};
        
        const mainKey = user.userType === 'guest' 
            ? 'trainerProgress_guest' 
            : `trainerProgress_${user.id}`;
        
        const savedProgress = localStorage.getItem(mainKey);
        if (savedProgress) {
            return JSON.parse(savedProgress);
        }
        
        return {};
    } catch (error) {
        console.error('Ошибка синхронной загрузки:', error);
        return {};
    }
}

// Загрузка прогресса
async function loadProgress() {
    console.log('Загружаем прогресс...');
    
    try {
        const result = window.localProgress.getTrainerProgress(currentBlock);
        
        if (result.success && result.progress) {
            // Проверяем совпадение количества вопросов
            if (result.progress.userAnswers && result.progress.userAnswers.length === currentQuestions.length) {
                userAnswers = result.progress.userAnswers;
                currentQuestionIndex = result.progress.currentQuestionIndex || 0;
                console.log('Прогресс загружен локально');
                console.log('Состояние:', {
                    вопросов: userAnswers.length,
                    отвечено: countAnsweredQuestions(),
                    текущий: currentQuestionIndex
                });
            } else {
                console.warn('Несовпадение количества вопросов, начинаем заново');
                resetToDefault();
            }
        } else {
            console.log('Прогресс не найден, начинаем с нуля');
            resetToDefault();
        }
    } catch (error) {
        console.error('Ошибка загрузки прогресса:', error);
        resetToDefault();
    }
}

// Сброс к начальному состоянию
function resetToDefault() {
    userAnswers = new Array(currentQuestions.length).fill(null);
    currentQuestionIndex = 0;
    console.log('Прогресс сброшен к начальному состоянию');
}

// Сброс прогресса
async function resetProgress() {
    if (confirm('Вы уверены, что хотите начать тренажёр заново? Весь прогресс по этому блоку будет потерян.')) {
        try {
            // Сбрасываем в локальном менеджере
            const result = window.localProgress.resetTrainerProgress(currentBlock);
            
            // Сбрасываем в основном формате для страницы прогресса
            const user = window.localProgress.getUser();
            if (user) {
                const statsKey = `trainerProgress_${user.id || 'guest'}`;
                let allProgress = {};
                try {
                    const existing = localStorage.getItem(statsKey);
                    if (existing) {
                        allProgress = JSON.parse(existing);
                    }
                } catch (e) {
                    console.warn('Ошибка загрузки прогресса:', e);
                }
                
                // Удаляем прогресс для текущего блока
                delete allProgress[currentBlock];
                localStorage.setItem(statsKey, JSON.stringify(allProgress));
                console.log('Прогресс удален из статистики');
            }
            
            if (result.success) {
                console.log('Прогресс сброшен');
            }
        } catch (error) {
            console.error('Ошибка сброса:', error);
        }
        
        // Сбрасываем текущую сессию
        resetToDefault();
        displayQuestion();
        updateProgress();
        
        alert('Прогресс сброшен! Начинаем заново.');
    }
}

// Переход на главную
function goToMain() {
    // Сохраняем прогресс перед выходом
    saveProgress();
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 300);
}

// Автосохранение при изменении
function setupAutoSave() {
    // Сохраняем при смене вопроса
    const originalNextQuestion = nextQuestion;
    const originalPrevQuestion = prevQuestion;
    
    nextQuestion = function() {
        originalNextQuestion();
        setTimeout(saveProgress, 100);
    }
    
    prevQuestion = function() {
        originalPrevQuestion();
        setTimeout(saveProgress, 100);
    }
    
    // Сохраняем при выборе ответа
    document.addEventListener('change', function(e) {
        if (e.target.name === 'answer') {
            setTimeout(saveProgress, 500);
        }
    });
    
    // Сохраняем перед закрытием страницы
    window.addEventListener('beforeunload', function() {
        saveProgress();
    });
    
    // Автосохранение каждые 30 секунд
    setInterval(saveProgress, 30000);
    
    console.log('Автосохранение настроено');
}

// Запускаем тренажёр при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('Страница тренажёра загружена');
    
    // Запускаем автосохранение
    setupAutoSave();
    
    // Запускаем тренажёр
    setTimeout(initTrainer, 600);
    
    // Закрытие модального окна по клику вне его
    const modal = document.getElementById('result-modal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });
        
        // Закрытие по ESC
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal.style.display === 'block') {
                closeModal();
            }
        });
    }
    
    // Кнопка "Продолжить" в модальном окне
    const continueButton = document.querySelector('.continue-button');
    if (continueButton) {
        continueButton.addEventListener('click', closeModal);
    }

// ==================== ИЗБРАННОЕ ====================

// Получить ключ для хранения избранного
function getFavouritesKey() {
    const user = window.localProgress.getUser();
    return `user_favourites_${user.id || 'guest'}`;
}

// Загрузить избранное
function loadFavourites() {
    const key = getFavouritesKey();
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
}

// Сохранить избранное
function saveFavourites(favourites) {
    const key = getFavouritesKey();
    localStorage.setItem(key, JSON.stringify(favourites));
}

// Проверить, в избранном ли текущий вопрос
function isCurrentInFavourites() {
    if (!currentQuestions.length || !currentQuestions[currentQuestionIndex]) return false;
    const q = currentQuestions[currentQuestionIndex];
    const id = `${currentBlock}_${q.question}`;
    return loadFavourites().some(f => f.id === id);
}

// Добавить/удалить из избранного
window.toggleFavourite = function() {
    if (!currentQuestions.length || !currentQuestions[currentQuestionIndex]) {
        showToast('Нет активного вопроса');
        return;
    }
    
    const q = currentQuestions[currentQuestionIndex];
    const id = `${currentBlock}_${q.question}`;
    let favs = loadFavourites();
    const exists = favs.some(f => f.id === id);
    
    if (exists) {
        favs = favs.filter(f => f.id !== id);
        saveFavourites(favs);
    } else {
        favs.push({
            id: id,
            block: currentBlock,
            question: q.question,
            options: q.options,
            correctAnswers: q.correctAnswers,
            comment: q.comment || '',
            image: q.image || q.картинки || null,
            timestamp: Date.now()
        });
        saveFavourites(favs);
    }
    
    updateFavButton();
}

// Обновить внешний вид кнопки избранного
function updateFavButton() {
    const btn = document.getElementById('fav-btn');
    if (!btn) return;
    
    if (isCurrentInFavourites()) {
        btn.classList.add('active');
        btn.innerHTML = 'В избранном';
    } else {
        btn.classList.remove('active');
        btn.innerHTML = ' В избранное';
    }
}

// Показать всплывающее уведомление
function showToast(message) {
    let toast = document.getElementById('trainer-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'trainer-toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            background: #333;
            color: white;
            padding: 12px 24px;
            border-radius: 40px;
            font-family: 'Montserrat', sans-serif;
            z-index: 9999;
            opacity: 0;
            transition: opacity 0.3s;
            pointer-events: none;
        `;
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    setTimeout(() => {
        toast.style.opacity = '0';
    }, 2000);
}
});