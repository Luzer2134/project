// progress.js - ПРОСТАЯ версия для отображения прогресса

// Количество вопросов в каждом блоке
const BLOCK_QUESTIONS = {
    'Блок 1': 458,
    'Блок 2': 1192,
    'Блок 3': 711,
    'Блок 4': 343
};

// Цвета для блоков
const BLOCK_COLORS = {
    'Блок 1': '#4CAF50',
    'Блок 2': '#2196F3',
    'Блок 3': '#FF9800',
    'Блок 4': '#9C27B0'
};

// ГЛАВНАЯ ФУНКЦИЯ: Получаем прогресс для блока (очень простая)
function getBlockProgress(block) {
    console.log(`🔍 Ищем прогресс для: ${block}`);
    
    // Получаем пользователя
    let userId = 'guest';
    let user = null;
    
    try {
        user = window.examAPI ? window.examAPI.getUserFromStorage() : null;
        if (user && user.id) {
            userId = user.id;
        }
    } catch (e) {
        console.log('Ошибка получения пользователя, используем гостя');
    }
    
    // Пробуем ВСЕ возможные способы найти прогресс
    
    // Способ 1: Основной формат (из syncProgressForStatsPage)
    const mainKey = `trainerProgress_${userId}`;
    let completed = 0;
    let total = BLOCK_QUESTIONS[block];
    let percentage = 0;
    
    console.log(`Проверяем ключ: ${mainKey}`);
    const mainData = localStorage.getItem(mainKey);
    if (mainData) {
        try {
            const parsed = JSON.parse(mainData);
            console.log(`Данные из основного ключа:`, parsed);
            
            // Если данные в формате объекта с блоками
            if (parsed[block]) {
                const blockData = parsed[block];
                completed = blockData.completed || 0;
                total = blockData.total || total;
                percentage = blockData.percentage || 0;
                console.log(`✅ Найден прогресс для ${block}: ${completed}/${total}`);
            }
            // Если это массив (старый формат тренажёра)
            else if (Array.isArray(parsed)) {
                completed = parsed.filter(answer => 
                    answer !== null && 
                    answer !== undefined && 
                    answer.length > 0
                ).length;
                total = parsed.length || total;
                percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
                console.log(`🔄 Конвертирован старый формат: ${completed}/${total}`);
            }
        } catch (e) {
            console.warn(`Ошибка парсинга ${mainKey}:`, e);
        }
    }
    
    // Если не нашли в основном формате, пробуем другие ключи
    if (completed === 0) {
        console.log('Пробуем другие ключи...');
        
        // Ключ 2: Формат тренажёра
        const trainerKey = `trainer_${userId}_${block}`;
        const trainerData = localStorage.getItem(trainerKey);
        if (trainerData) {
            try {
                const parsed = JSON.parse(trainerData);
                if (parsed.userAnswers && Array.isArray(parsed.userAnswers)) {
                    completed = parsed.userAnswers.filter(answer => 
                        answer !== null && 
                        answer !== undefined && 
                        answer.length > 0
                    ).length;
                    total = BLOCK_QUESTIONS[block] || parsed.userAnswers.length;
                    percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
                    console.log(`Найден в формате тренажёра: ${completed}/${total}`);
                }
            } catch (e) {
                console.warn(`Ошибка парсинга ${trainerKey}:`, e);
            }
        }
        
        // Ключ 3: Отдельный ключ для блока
        if (completed === 0) {
            const blockKey = `progress_${userId}_${block}`;
            const blockData = localStorage.getItem(blockKey);
            if (blockData) {
                try {
                    const parsed = JSON.parse(blockData);
                    completed = parsed.completed || 0;
                    total = parsed.total || total;
                    percentage = parsed.percentage || 0;
                    console.log(`Найден в отдельном ключе: ${completed}/${total}`);
                } catch (e) {
                    console.warn(`Ошибка парсинга ${blockKey}:`, e);
                }
            }
        }
        
        // Ключ 4: Простой ключ
        if (completed === 0) {
            const simpleKey = `simpleProgress_${block}`;
            const simpleData = localStorage.getItem(simpleKey);
            if (simpleData) {
                try {
                    const parsed = JSON.parse(simpleData);
                    completed = parsed.completed || 0;
                    total = parsed.total || total;
                    percentage = parsed.percentage || 0;
                    console.log(`Найден в простом ключе: ${completed}/${total}`);
                } catch (e) {
                    console.warn(`Ошибка парсинга ${simpleKey}:`, e);
                }
            }
        }
    }
    
    // Рассчитываем процент если не нашли
    if (percentage === 0 && total > 0) {
        percentage = Math.round((completed / total) * 100);
    }
    
    console.log(`ИТОГ для ${block}: ${completed}/${total} (${percentage}%)`);
    
    return {
        completed: completed,
        total: total,
        percentage: percentage,
        hasProgress: completed > 0
    };
}

// Инициализация страницы
function initProgressPage() {
    console.log('Инициализация страницы прогресса');
    
    // Отображаем блоки сразу
    displayBlocks();
    
    // Обновляем каждые 2 секунды (на случай, если тренажёр запущен в другой вкладке)
    setInterval(displayBlocks, 2000);
    
    console.log('Страница прогресса инициализирована');
}

// Отображение 4 блоков
function displayBlocks() {
    const blocks = ['Блок 1', 'Блок 2', 'Блок 3', 'Блок 4'];
    const container = document.getElementById('blocks-container');
    
    if (!container) {
        console.error('Контейнер блоков не найден');
        return;
    }
    
    container.innerHTML = '';
    
    blocks.forEach((block, index) => {
        const blockElement = createBlockElement(block, index + 1);
        container.appendChild(blockElement);
    });
    
    // Отладка: показываем все ключи localStorage
    debugLocalStorage();
}

// Создание элемента блока
function createBlockElement(block, blockNumber) {
    const progress = getBlockProgress(block);
    
    const element = document.createElement('div');
    element.className = `block-card block-${blockNumber}`;
    
    const borderColor = BLOCK_COLORS[block] || '#4CAF50';
    const progressColor = BLOCK_COLORS[block] || '#4CAF50';
    
    element.style.borderTopColor = borderColor;
    element.style.borderTopWidth = '6px';
    element.style.borderTopStyle = 'solid';
    
    element.innerHTML = `
        <div class="block-title">${block}</div>
        
        <div class="progress-info">
            Пройдено: <span style="font-weight: bold; color: #333; font-size: 20px;">${progress.completed}</span> 
            из <span style="font-weight: bold; color: #333; font-size: 20px;">${progress.total}</span> вопросов
            <div class="total-questions" style="margin-top: 5px; color: #666; font-size: 14px;">
                Всего вопросов: ${progress.total}
            </div>
        </div>
        
        <div class="progress-bar-container" style="height: 35px; background: #f0f0f0; border-radius: 18px; margin: 20px 0; overflow: hidden; position: relative; border: 2px solid #ddd;">
            <div class="progress-bar-fill" style="
                height: 100%; 
                width: ${progress.percentage}%; 
                background: ${progressColor}; 
                border-radius: 16px; 
                transition: width 0.5s ease;
                position: relative;">
                <div class="progress-percentage" style="
                    position: absolute; 
                    top: 50%; 
                    left: 50%; 
                    transform: translate(-50%, -50%); 
                    font-weight: bold; 
                    color: white; 
                    text-shadow: 1px 1px 3px rgba(0,0,0,0.7); 
                    font-size: 18px;">
                    ${progress.percentage}%
                </div>
            </div>
        </div>
        
        <div class="progress-info">
            Прогресс: <span style="font-weight: bold; color: #333; font-size: 20px;">${progress.percentage}%</span>
        </div>
    `;
    
    return element;
}

// Удалить весь прогресс
function clearAllProgress() {
    if (confirm('ВЫ УВЕРЕНЫ, ЧТО ХОТИТЕ УДАЛИТЬ ВЕСЬ ПРОГРЕСС?\n\nЭто действие:\n• Удалит все ответы в тренажере\n• Сбросит прогресс по всем блокам\n• Нельзя будет отменить!')) {
        // Удаляем ВСЕ ключи связанные с прогрессом
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.includes('trainer') || 
                key.includes('progress') || 
                key.includes('simpleProgress') ||
                key.includes('trainer_')) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            console.log('Удален ключ:', key);
        });
        
        alert('Весь прогресс успешно удален!');
        
        // Обновляем отображение
        displayBlocks();
    }
}

// Отладка: показываем все ключи в localStorage
function debugLocalStorage() {
    console.log('ДЕБАГ LOCALSTORAGE:');
    console.log('------------------');
    
    const progressKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.includes('trainer') || 
            key.includes('progress') || 
            key.includes('simpleProgress')) {
            
            progressKeys.push(key);
            
            try {
                const value = localStorage.getItem(key);
                let parsed;
                try {
                    parsed = JSON.parse(value);
                } catch {
                    parsed = value;
                }
                
                console.log(` ${key}:`, parsed);
            } catch (e) {
                console.log(` ${key}: [Ошибка чтения]`);
            }
        }
    }
    
    if (progressKeys.length === 0) {
        console.log('Нет ключей прогресса в localStorage');
    } else {
        console.log(`Всего ключей прогресса: ${progressKeys.length}`);
    }
    console.log('------------------');
}

// Загружаем при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('Страница прогресса загружена');
    
    // Даем время на загрузку API
    setTimeout(() => {
        try {
            initProgressPage();
            debugLocalStorage();
        } catch (error) {
            console.error('Ошибка инициализации:', error);
            document.getElementById('blocks-container').innerHTML = 
                '<div style="color: red; padding: 50px; text-align: center;">Ошибка загрузки прогресса</div>';
        }
    }, 200);
});