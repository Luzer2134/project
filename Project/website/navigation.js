// navigation.js
function updateSimulationButton() {
    const simulationBtn = document.getElementById('simulation-btn');
    const selectedBlock = localStorage.getItem('selectedBlock');
    
    if (simulationBtn) {
        if (selectedBlock && isQuestionsReady()) {
            const blockQuestions = getBlockQuestions(selectedBlock);
            if (blockQuestions && blockQuestions.length > 0) {
                // Блок выбран и есть вопросы - кнопка активна
                simulationBtn.disabled = false;
                simulationBtn.style.opacity = '1';
                simulationBtn.style.cursor = 'pointer';
                simulationBtn.title = 'Начать симуляцию экзамена';
            } else {
                // Блок выбран, но нет вопросов
                simulationBtn.disabled = true;
                simulationBtn.style.opacity = '0.5';
                simulationBtn.style.cursor = 'not-allowed';
                simulationBtn.title = 'Для выбранного блока нет вопросов';
            }
        } else {
            // Блок не выбран
            simulationBtn.disabled = true;
            simulationBtn.style.opacity = '0.5';
            simulationBtn.style.cursor = 'not-allowed';
            simulationBtn.title = 'Сначала выберите блок для обучения';
        }
    }
}
// Функция для выбора блока
function selectBlock(blockName) {
    // Проверяем, что вопросы загружены
    if (typeof questionsData === 'undefined') {
        alert('Вопросы еще загружаются... Пожалуйста, подождите.');
        return;
    }
    
    const blockQuestions = questionsData[blockName];
    
    if (!blockQuestions || blockQuestions.length === 0) {
        alert(`Для блока "${blockName}" пока нет вопросов.`);
        return;
    }
    
    // Сохраняем выбранный блок
    localStorage.setItem('selectedBlock', blockName);
    
    // Показываем информацию о выбранном блоке
    showSelectedBlockInfo(blockName, blockQuestions.length);
    
    // Обновляем стили кнопок
    updateBlockButtons(blockName);
    
    // Обновляем состояние кнопки симуляции
    updateSimulationButton();

    updateSimulationButton();
    updateTrainerButton();
    
    console.log(`Блок "${blockName}" выбран! Вопросов: ${blockQuestions.length}`);
}

// Показать информацию о выбранном блоке
function showSelectedBlockInfo(blockName, questionCount) {
    const infoElement = document.getElementById('selected-block-info');
    const blockNameElement = document.getElementById('current-selected-block');
    
    if (infoElement && blockNameElement) {
        infoElement.style.display = 'block';
        blockNameElement.textContent = `${blockName} (${questionCount} вопросов)`;
        console.log(`Информация о блоке обновлена: ${blockName} - ${questionCount} вопросов`);
    }
}

// Обновить стили кнопок
function updateBlockButtons(selectedBlock) {
    const buttons = document.querySelectorAll('.select-block-btn');
    
    buttons.forEach(btn => {
        const blockName = btn.getAttribute('data-block');
        
        if (blockName === selectedBlock) {
            btn.style.backgroundColor = '#4CAF50';
            btn.textContent = '✓ Выбран';
        } else {
            btn.style.backgroundColor = '#dd2222';
            btn.textContent = 'Выбрать блок';
        }
    });
}

// Проверить выбран ли блок
function checkBlockSelected() {
    const selectedBlock = localStorage.getItem('selectedBlock');
    console.log('Проверяю выбранный блок:', selectedBlock);
    
    if (!selectedBlock) {
        alert('Пожалуйста, сначала выберите блок для обучения!');
        return false;
    }
    
    if (!isQuestionsReady()) {
        alert('Вопросы еще загружаются... Пожалуйста, подождите.');
        return false;
    }
    
    const blockQuestions = getBlockQuestions(selectedBlock);
    
    if (blockQuestions.length === 0) {
        alert(`Для блока "${selectedBlock}" нет вопросов!`);
        return false;
    }
    
    return true;
}

// Запуск симуляции
function startSimulation() {
    console.log('Запуск симуляции...');
    
    const selectedBlock = localStorage.getItem('selectedBlock');
    
    if (!selectedBlock) {
        alert('Пожалуйста, сначала выберите блок для обучения!');
        return;
    }
    
    // Проверяем что вопросы загружены и в блоке есть вопросы
    if (typeof questionsData === 'undefined') {
        alert('Вопросы еще загружаются... Пожалуйста, подождите.');
        return;
    }
    
    const blockQuestions = questionsData[selectedBlock];
    
    if (!blockQuestions || blockQuestions.length === 0) {
        alert(`Для блока "${selectedBlock}" нет вопросов! Выберите другой блок.`);
        return;
    }
    
    console.log(`Запуск симуляции для блока: ${selectedBlock}`);
    window.location.href = 'simulation.html';
}

// Запуск тренажёра
function startTraining() {
    console.log('Запуск тренажёра...');
    
    const selectedBlock = localStorage.getItem('selectedBlock');
    
    if (!selectedBlock) {
        alert('Пожалуйста, сначала выберите блок для обучения!');
        return;
    }
    
    // Проверяем что вопросы загружены и в блоке есть вопросы
    if (typeof questionsData === 'undefined') {
        alert('Вопросы еще загружаются... Пожалуйста, подождите.');
        return;
    }
    
    const blockQuestions = questionsData[selectedBlock];
    
    if (!blockQuestions || blockQuestions.length === 0) {
        alert(`Для блока "${selectedBlock}" нет вопросов! Выберите другой блок.`);
        return;
    }
    
    console.log(`Запуск тренажёра для блока: ${selectedBlock}`);
    window.location.href = 'trainer.html';
}

// Общая навигация
function navigateTo(page) {
    switch(page) {
        case 'simulation.html':
            startSimulation();
            break;
        case 'trainer.html':
            startTraining();
            break;
        default:
            window.location.href = page;
    }
}
// Выход из системы
function logout() {
    if (confirm('Вы уверены, что хотите выйти?')) {
        localStorage.removeItem('selectedBlock');
        window.location.href = 'login.html';
    }
}

// Функция для обновления интерфейса после загрузки данных
function updateUIAfterLoad() {
    console.log('Обновляю интерфейс после загрузки данных...');
    
    // Показываем количество вопросов в блоках
    const blockElements = document.querySelectorAll('.block');
    blockElements.forEach(blockElement => {
        const header = blockElement.querySelector('h4');
        const blockName = header.textContent;
        const questionCount = getBlockQuestions(blockName).length;
        
        // Добавляем количество вопросов в описание
        const description = blockElement.querySelector('p');
        if (description) {
            // Убираем старое количество если есть
            const oldText = description.innerHTML.replace(/<strong>\(\d+ вопросов\)<\/strong>/, '');
            description.innerHTML = oldText + ` <strong>(${questionCount} вопросов)</strong>`;
        }
    });
    
    // Восстанавливаем выбранный блок если был
    const selectedBlock = localStorage.getItem('selectedBlock');
    if (selectedBlock) {
        const questionCount = getBlockQuestions(selectedBlock).length;
        showSelectedBlockInfo(selectedBlock, questionCount);
        updateBlockButtons(selectedBlock);
    }
    
    console.log('Интерфейс обновлен');
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM загружен, инициализирую навигацию...');
    
    // Добавляем обработчики на кнопки выбора блоков
    const blockButtons = document.querySelectorAll('.select-block-btn');
    blockButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const blockName = this.getAttribute('data-block');
            selectBlock(blockName);
        });
    });
    
    // Если данные уже загружены, обновляем интерфейс
    if (isQuestionsReady()) {
        updateUIAfterLoad();
        updateSimulationButton();
    } else {
        // Иначе ждем загрузки данных
        window.onQuestionsLoaded = function() {
            updateUIAfterLoad();
            updateSimulationButton();
        };
    }
    
    // Восстанавливаем выбранный блок если есть
    const selectedBlock = localStorage.getItem('selectedBlock');
    if (selectedBlock) {
        const questionCount = getBlockQuestions(selectedBlock).length;
        showSelectedBlockInfo(selectedBlock, questionCount);
        updateBlockButtons(selectedBlock);
        updateSimulationButton();
    }
    
    console.log('Навигация инициализирована');
});

//Функция   для обновления кнопки тренажёра
function updateTrainerButton() {
    const trainerBtn = document.getElementById('trainer-btn');
    const selectedBlock = localStorage.getItem('selectedBlock');
    
    if (trainerBtn) {
        if (selectedBlock && isQuestionsReady()) {
            const blockQuestions = getBlockQuestions(selectedBlock);
            if (blockQuestions && blockQuestions.length > 0) {
                trainerBtn.disabled = false;
                trainerBtn.style.opacity = '1';
                trainerBtn.style.cursor = 'pointer';
                trainerBtn.title = 'Открыть тренажёр';
            } else {
                trainerBtn.disabled = true;
                trainerBtn.style.opacity = '0.5';
                trainerBtn.style.cursor = 'not-allowed';
                trainerBtn.title = 'Для выбранного блока нет вопросов';
            }
        } else {
            trainerBtn.disabled = true;
            trainerBtn.style.opacity = '0.5';
            trainerBtn.style.cursor = 'not-allowed';
            trainerBtn.title = 'Сначала выберите блок для обучения';
        }
    }
}
