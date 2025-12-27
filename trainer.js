// trainer.js
let currentQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let currentBlock = '';

// ПРОСТАЯ ЛОКАЛЬНАЯ СИСТЕМА СОХРАНЕНИЯ
class LocalProgressManager {
    constructor() {
        console.log('🚀 Локальный менеджер прогресса инициализирован');
    }

    // Сохранить прогресс тренажера
    saveTrainerProgress(block, answers, index) {
        try {
            const user = this.getUser();
            if (!user) return { success: false, error: 'Пользователь не найден' };
            
            // Создаем ключ для хранения
            const key = `trainer_${user.id || 'guest'}_${block}`;
            
            // Сохраняем данные
            const data = {
                block: block,
                userAnswers: answers,
                currentQuestionIndex: index,
                timestamp: new Date().toISOString(),
                userId: user.id || 'guest',
                userName: user.name || 'Гость'
            };
            
            localStorage.setItem(key, JSON.stringify(data));
            
            // Также сохраняем в общий список прогресса
            this.updateTrainerProgressList(block, key);
            
            console.log('💾 Прогресс сохранен локально:', key);
            return { success: true, local: true };
        } catch (error) {
            console.error('❌ Ошибка сохранения:', error);
            return { success: false, error: error.message };
        }
    }

    // Загрузить прогресс тренажера
    getTrainerProgress(block) {
        try {
            const user = this.getUser();
            if (!user) return { success: false, error: 'Пользователь не найден' };
            
            // Пробуем несколько вариантов ключей
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
                        console.warn('⚠️ Ошибка парсинга данных для ключа', key, e);
                    }
                }
            }
            
            // Если не нашли по ключу с блоком, ищем все данные
            if (!progress) {
                for (const key of keys) {
                    const data = localStorage.getItem(key);
                    if (data) {
                        try {
                            const parsed = JSON.parse(data);
                            // Проверяем все сохраненные прогрессы
                            if (typeof parsed === 'object' && parsed !== null) {
                                // Если это объект с несколькими блоками
                                if (parsed[block]) {
                                    progress = parsed[block];
                                    usedKey = key;
                                    break;
                                }
                            }
                        } catch (e) {
                            // Пропускаем
                        }
                    }
                }
            }
            
            if (progress) {
                console.log('📥 Прогресс загружен локально из ключа:', usedKey);
                return { 
                    success: true, 
                    progress: progress,
                    local: true 
                };
            } else {
                console.log('📭 Прогресс не найден для блока:', block);
                return { 
                    success: true, 
                    progress: { userAnswers: [], currentQuestionIndex: 0 },
                    local: true 
                };
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки:', error);
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
            console.warn('⚠️ Ошибка обновления списка:', error);
        }
    }

    // Получить пользователя
    getUser() {
        try {
            const userJson = localStorage.getItem('currentUser');
            if (userJson) {
                return JSON.parse(userJson);
            }
            
            // Если пользователя нет, создаем гостя
            return {
                id: 'guest_' + Date.now(),
                name: 'Гость',
                email: 'guest@example.com',
                userType: 'guest',
                isAuthorized: false,
                createdAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Ошибка получения пользователя:', error);
            return null;
        }
    }

    // Отладка localStorage
    debugStorage() {
        console.log('🔍 ДЕБАГ LOCALSTORAGE:');
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.includes('trainer') || key.includes('progress')) {
                try {
                    const value = JSON.parse(localStorage.getItem(key));
                    console.log(`📁 ${key}:`, value);
                } catch {
                    console.log(`📁 ${key}:`, localStorage.getItem(key));
                }
            }
        }
    }

    // Сбросить прогресс
    resetTrainerProgress(block) {
        try {
            const user = this.getUser();
            if (!user) return { success: false, error: 'Пользователь не найден' };
            
            // Удаляем основной прогресс
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
                            // Если это объект с несколькими блоками
                            if (data[block]) {
                                delete data[block];
                                localStorage.setItem(key, JSON.stringify(data));
                            } else if (data.block === block) {
                                localStorage.removeItem(key);
                            }
                        }
                    } catch (e) {
                        // Просто удаляем ключ
                        localStorage.removeItem(key);
                    }
                }
            });
            
            console.log('🧹 Прогресс сброшен для блока:', block);
            return { success: true };
        } catch (error) {
            console.error('❌ Ошибка сброса:', error);
            return { success: false, error: error.message };
        }
    }
}

// Создаем глобальный экземпляр
window.localProgress = new LocalProgressManager();

// Инициализация тренажёра
function initTrainer() {
    console.log('🎮 Инициализация тренажёра...');
    
    // Получаем выбранный блок
    currentBlock = localStorage.getItem('selectedBlock');
    
    if (!currentBlock) {
        alert('❌ Блок не выбран! Возвращаем на главную страницу.');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }

    console.log(`📚 Выбран блок: ${currentBlock}`);
    document.getElementById('current-block-name').textContent = currentBlock;
    
    // Проверяем загружены ли вопросы
    if (typeof questionsData === 'undefined') {
        alert('❌ Ошибка: вопросы не загружены! Возвращаем на главную.');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }
    
    if (!questionsData[currentBlock]) {
        alert(`❌ Вопросы для блока "${currentBlock}" не найдены! Возвращаем на главную.`);
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }
    
    const blockQuestions = questionsData[currentBlock];
    
    if (blockQuestions.length === 0) {
        alert(`❌ Для блока "${currentBlock}" нет вопросов! Возвращаем на главную.`);
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }
    
    console.log(`📊 Загружено вопросов: ${blockQuestions.length}`);
    
    // Берем ВСЕ вопросы блока
    currentQuestions = [...blockQuestions];
    userAnswers = new Array(currentQuestions.length).fill(null);
    
    // Загружаем сохраненный прогресс (ИСПРАВЛЕНО)
    loadProgress();
    
    // Показываем первый вопрос
    displayQuestion();
    
    // Обновляем прогресс
    updateProgress();
    
    // Отладка хранилища
    console.log('🔍 Проверяем localStorage:');
    window.localProgress.debugStorage();
}

// Отображение вопроса (оставляем без изменений)
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
        alert('⚠️ Пожалуйста, выберите ответ!');
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
    if (!question || !userAnswer) return false;
    const userSorted = [...userAnswer].sort().join('');
    const correctSorted = [...question.correctAnswers].sort().join('');
    return userSorted === correctSorted;
}

// Показ модального окна с результатом
function showResultModal(question, userAnswer, isCorrect) {
    const modal = document.getElementById('result-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    
    modalTitle.textContent = isCorrect ? '✅ ВЕРНО' : '❌ НЕВЕРНО';
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
        
        content += `<div style="${style}">${letter}) ${option}</div>`;
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

// === СОХРАНЕНИЕ И ЗАГРУЗКА ПРОГРЕССА ===

// Сохранение прогресса (УПРОЩЕНО)
async function saveProgress() {
    console.log('💾 Сохраняем прогресс...');
    
    try {
        const result = window.localProgress.saveTrainerProgress(
            currentBlock, 
            userAnswers, 
            currentQuestionIndex
        );
        
        if (result.success) {
            console.log('✅ Прогресс сохранен локально');
        } else {
            console.warn('⚠️ Ошибка сохранения:', result.error);
            
            // Резервное сохранение в самый простой формат
            const backupKey = `trainer_backup_${currentBlock}`;
            const backupData = {
                block: currentBlock,
                answers: userAnswers,
                index: currentQuestionIndex,
                time: Date.now()
            };
            localStorage.setItem(backupKey, JSON.stringify(backupData));
            console.log('💾 Резервная копия сохранена');
        }
    } catch (error) {
        console.error('❌ Критическая ошибка при сохранении:', error);
    }
}

// Загрузка прогресса (УПРОЩЕНО)
async function loadProgress() {
    console.log('📥 Загружаем прогресс...');
    
    try {
        const result = window.localProgress.getTrainerProgress(currentBlock);
        
        if (result.success && result.progress) {
            // Проверяем совпадение количества вопросов
            if (result.progress.userAnswers && result.progress.userAnswers.length === currentQuestions.length) {
                userAnswers = result.progress.userAnswers;
                currentQuestionIndex = result.progress.currentQuestionIndex || 0;
                console.log('✅ Прогресс загружен локально');
                console.log('📊 Состояние:', {
                    вопросов: userAnswers.length,
                    отвечено: userAnswers.filter(a => a !== null).length,
                    текущий: currentQuestionIndex
                });
            } else {
                console.warn('⚠️ Несовпадение количества вопросов, начинаем заново');
                resetToDefault();
            }
        } else {
            console.log('📭 Прогресс не найден, начинаем с нуля');
            resetToDefault();
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки прогресса:', error);
        resetToDefault();
    }
}

// Сброс к начальному состоянию
function resetToDefault() {
    userAnswers = new Array(currentQuestions.length).fill(null);
    currentQuestionIndex = 0;
    console.log('🔄 Прогресс сброшен к начальному состоянию');
}

// Сброс прогресса
async function resetProgress() {
    if (confirm('⚠️ Вы уверены, что хотите начать тренажёр заново? Весь прогресс по этому блоку будет потерян.')) {
        try {
            const result = window.localProgress.resetTrainerProgress(currentBlock);
            if (result.success) {
                console.log('✅ Прогресс сброшен');
            }
        } catch (error) {
            console.error('❌ Ошибка сброса:', error);
        }
        
        // Сбрасываем текущую сессию
        resetToDefault();
        displayQuestion();
        updateProgress();
        
        console.log('🔄 Тренажёр сброшен');
    }
}

// Переход на главную
function goToMain() {
    // Сохраняем прогресс перед выходом
    saveProgress();
    window.location.href = 'index.html';
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
}

// Запускаем тренажёр при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎮 Страница тренажёра загружена');
    
    // Запускаем автосохранение
    setupAutoSave();
    
    // Запускаем тренажёр с небольшой задержкой
    setTimeout(initTrainer, 100);
});