// navigation.js

// Функция для выбора блока
function selectBlock(blockName) {
    console.log(`Пытаюсь выбрать блок: ${blockName}`);
    
    // Проверяем готовность данных
    if (!isQuestionsReady()) {
        alert('Вопросы еще загружаются... Пожалуйста, подождите несколько секунд.');
        return;
    }
    
    const blockQuestions = getBlockQuestions(blockName);
    console.log(`Вопросов в блоке ${blockName}:`, blockQuestions.length);
    
    if (blockQuestions.length === 0) {
        alert(`Для блока "${blockName}" нет вопросов. Проверьте файл data/block${blockName.slice(-1)}.json`);
        return;
    }
    
    // Сохраняем выбранный блок
    localStorage.setItem('selectedBlock', blockName);
    console.log(`Блок "${blockName}" сохранен в localStorage`);
    
    // Показываем информацию о выбранном блоке
    showSelectedBlockInfo(blockName, blockQuestions.length);
    
    // Обновляем стили кнопок
    updateBlockButtons(blockName);
    
    console.log(`✅ Блок "${blockName}" выбран! Вопросов: ${blockQuestions.length}`);
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
    if (!checkBlockSelected()) {
        return;
    }
    window.location.href = 'simulation.html';
}

// Запуск тренажёра
function startTraining() {
    console.log('Запуск тренажёра...');
    if (!checkBlockSelected()) {
        return;
    }
    window.location.href = 'trainer.html';
}

// Общая навигация
function navigateTo(page) {
    console.log('Навигация на:', page);
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
    } else {
        // Иначе ждем загрузки данных
        window.onQuestionsLoaded = updateUIAfterLoad;
    }
    
    console.log('Навигация инициализирована');
});