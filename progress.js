// progress.js - упрощенная версия только для отображения прогресса

let trainerProgressData = null;

// Количество вопросов в каждом блоке (фиксированные значения)
const BLOCK_QUESTIONS = {
    'Блок 1': 458,
    'Блок 2': 1192,
    'Блок 3': 711,
    'Блок 4': 343
};

// Загружаем прогресс тренажера
async function loadTrainerProgress() {
    try {
        const user = window.examAPI ? window.examAPI.getUserFromStorage() : null;
        
        if (!user) {
            console.log('👤 Пользователь не найден');
            return {};
        }
        
        console.log('📥 Загружаем прогресс для пользователя:', user.name);
        
        // Для локального хранения
        const storageKey = user.userType === 'guest' 
            ? 'trainerProgress_guest' 
            : `trainerProgress_${user.id}`;
        
        const savedProgress = localStorage.getItem(storageKey);
        
        if (savedProgress) {
            try {
                trainerProgressData = JSON.parse(savedProgress);
                console.log('✅ Прогресс загружен из localStorage:', storageKey);
                console.log('📊 Данные:', trainerProgressData);
                
                // Проверяем структуру данных
                const blocks = ['Блок 1', 'Блок 2', 'Блок 3', 'Блок 4'];
                blocks.forEach(block => {
                    if (trainerProgressData[block]) {
                        console.log(`${block}:`, trainerProgressData[block]);
                    }
                });
                
            } catch (error) {
                console.error('❌ Ошибка парсинга:', error);
                trainerProgressData = {};
            }
        } else {
            console.log('📭 Прогресс не найден в основном формате, ищем устаревшие данные');
            trainerProgressData = {};
        }
        
        await migrateLegacyProgress(user);
        
        return trainerProgressData;
        
    } catch (error) {
        console.error('Ошибка загрузки прогресса:', error);
        trainerProgressData = {};
        return trainerProgressData;
    }
}

async function migrateLegacyProgress(user) {
    console.log('Проверяем устаревшие данные для миграции...');
    
    const blocks = ['Блок 1', 'Блок 2', 'Блок 3', 'Блок 4'];
    let migratedCount = 0;
    
    for (const block of blocks) {
        const legacyProgress = findLegacyProgress(block);
        if (legacyProgress && legacyProgress.userAnswers) {
            console.log(`🔄 Мигрируем данные для ${block}`);
            
            // Добавляем в основной прогресс
            if (!trainerProgressData[block]) {
                const userAnswers = legacyProgress.userAnswers;
                const completed = userAnswers.filter(a => a !== null && a !== undefined && a !== '').length;
                const total = BLOCK_QUESTIONS[block];
                const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
                
                trainerProgressData[block] = {
                    userAnswers: userAnswers,
                    currentQuestionIndex: legacyProgress.currentQuestionIndex || 0,
                    completed: completed,
                    total: total,
                    percentage: percentage,
                    timestamp: legacyProgress.timestamp || new Date().toISOString(),
                    migrated: true
                };
                
                migratedCount++;
            }
        }
    }
    
    if (migratedCount > 0) {
        // Сохраняем мигрированные данные
        const storageKey = user.userType === 'guest' 
            ? 'trainerProgress_guest' 
            : `trainerProgress_${user.id}`;
        localStorage.setItem(storageKey, JSON.stringify(trainerProgressData));
        console.log(`✅ Мигрировано ${migratedCount} блоков`);
    }
}
function findLegacyProgress(block) {
    console.log(`Ищем устаревший прогресс для ${block}`);
    
    const user = window.examAPI ? window.examAPI.getUserFromStorage() : null;
    if (!user) return null;
    
    // Ключи, которые может использовать trainer.js
    const legacyKeys = [
        `trainer_${user.id}_${block}`,
        `trainer_guest_${block}`,
        `trainer_${user.id}_${block.replace(' ', '_')}`,
        `trainer_guest_${block.replace(' ', '_')}`
    ];
    
    for (const key of legacyKeys) {
        const data = localStorage.getItem(key);
        if (data) {
            try {
                const parsed = JSON.parse(data);
                if (parsed.userAnswers && Array.isArray(parsed.userAnswers)) {
                    console.log(`Найден устаревший прогресс в ключе: ${key}`);
                    return parsed;
                }
            } catch (e) {
                // Пропускаем некорректные данные
            }
        }
    }
    
    return null;
}

// Получаем прогресс для блока
function getBlockProgress(block) {
    if (!trainerProgressData) {
        console.log('📭 Нет данных прогресса в основном формате');
        
        // Пробуем найти в устаревшем формате
        const legacyProgress = findLegacyProgress(block);
        if (legacyProgress) {
            const userAnswers = legacyProgress.userAnswers || [];
            const total = BLOCK_QUESTIONS[block];
            const completed = userAnswers.filter(answer => 
                answer !== null && 
                answer !== undefined && 
                answer !== ''
            ).length;
            
            const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
            
            console.log(`📊 Найден устаревший прогресс для ${block}: ${completed}/${total}`);
            
            return { 
                completed, 
                total, 
                percentage,
                hasProgress: completed > 0,
                source: 'legacy'
            };
        }
        
        return { completed: 0, total: BLOCK_QUESTIONS[block], percentage: 0 };
    }
    
    const blockProgress = trainerProgressData[block];
    
    // Если нет прогресса для этого блока
    if (!blockProgress) {
        console.log(`📭 Нет прогресса для блока: ${block} в основном формате`);
        
        // Пробуем найти в устаревшем формате
        const legacyProgress = findLegacyProgress(block);
        if (legacyProgress) {
            const userAnswers = legacyProgress.userAnswers || [];
            const total = BLOCK_QUESTIONS[block];
            const completed = userAnswers.filter(answer => 
                answer !== null && 
                answer !== undefined && 
                answer !== ''
            ).length;
            
            const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
            
            console.log(`📊 Найден устаревший прогресс для ${block}: ${completed}/${total}`);
            
            return { 
                completed, 
                total, 
                percentage,
                hasProgress: completed > 0,
                source: 'legacy'
            };
        }
        
        return { completed: 0, total: BLOCK_QUESTIONS[block], percentage: 0 };
    }
    
    console.log(`📊 Прогресс для ${block}:`, blockProgress);
    
    const userAnswers = blockProgress.userAnswers || [];
    const total = BLOCK_QUESTIONS[block];
    
    // Подсчитываем пройденные вопросы (не null/undefined)
    let completed = 0;
    
    if (Array.isArray(userAnswers)) {
        completed = userAnswers.filter(answer => 
            answer !== null && 
            answer !== undefined && 
            answer !== '' &&
            answer.length > 0
        ).length;
    } else if (typeof userAnswers === 'object' && userAnswers !== null) {
        // Если userAnswers это объект, считаем его ключи
        completed = Object.keys(userAnswers).length;
    }
    
    console.log(`${block}: ${completed} из ${total} вопросов`);
    
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { 
        completed, 
        total, 
        percentage,
        hasProgress: completed > 0,
        source: 'main'
    };
}

// Инициализация страницы
async function initProgressPage() {
    console.log('📊 Инициализация страницы прогресса');
    
    // Загружаем прогресс
    await loadTrainerProgress();
    
    // Отображаем 4 блока
    displayBlocks();
    
    console.log('✅ Страница прогресса инициализирована');
}

// Отображение 4 блоков
function displayBlocks() {
    const blocks = ['Блок 1', 'Блок 2', 'Блок 3', 'Блок 4'];
    const container = document.getElementById('blocks-container');
    
    if (!container) {
        console.error('❌ Контейнер блоков не найден');
        return;
    }
    
    container.innerHTML = '';
    
    blocks.forEach((block, index) => {
        const blockElement = createBlockElement(block, index + 1);
        container.appendChild(blockElement);
    });
    
    console.log('✅ Блоки отображены');
}

// Создание элемента блока
function createBlockElement(block, blockNumber) {
    const progress = getBlockProgress(block);
    
    console.log(`Создаем элемент для ${block}:`, progress);
    
    const element = document.createElement('div');
    element.className = `block-card block-${blockNumber}`;
    
    element.innerHTML = `
        <div class="block-title">${block}</div>
        
        <div class="progress-info">
            Пройдено: <span>${progress.completed}</span> из <span>${progress.total}</span> вопросов
            <span class="total-questions">Всего вопросов: ${progress.total}</span>
        </div>
        
        <div class="progress-bar-container">
            <div class="progress-bar-fill" style="width: ${progress.percentage}%">
                <div class="progress-percentage">${progress.percentage}%</div>
            </div>
        </div>
        
        <div class="progress-info">
            Прогресс: <span>${progress.percentage}%</span>
        </div>
    `;
    
    return element;
}

// Удалить весь прогресс
function clearAllProgress() {
    if (confirm('❌ ВЫ УВЕРЕНЫ, ЧТО ХОТИТЕ УДАЛИТЬ ВЕСЬ ПРОГРЕСС?\n\nЭто действие:\n• Удалит все ответы в тренажере\n• Сбросит прогресс по всем блокам\n• Нельзя будет отменить!')) {
        const user = window.examAPI ? window.examAPI.getUserFromStorage() : null;
        
        if (user) {
            // Удаляем прогресс тренажера
            const trainerKey = user.userType === 'guest' 
                ? 'trainerProgress_guest' 
                : `trainerProgress_${user.id}`;
            
            localStorage.removeItem(trainerKey);
            console.log('🗑️ Удален ключ:', trainerKey);
            
            // Удаляем другие возможные ключи прогресса
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.includes('trainer') || key.includes('progress')) {
                    keysToRemove.push(key);
                }
            }
            
            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
                console.log('🗑️ Удален ключ:', key);
            });
            
            // Обнуляем переменные
            trainerProgressData = {};
            
            // Показываем сообщение
            alert('✅ Весь прогресс успешно удален!');
            
            // Обновляем отображение
            displayBlocks();
        } else {
            alert('❌ Ошибка: пользователь не найден!');
        }
    }
}

// Вернуться на главную
function goToMain() {
    window.location.href = 'index.html';
}

// Проверяем, откуда берется прогресс
function debugProgress() {
    console.log('🔍 ДЕБАГ: Проверка прогресса');
    
    const user = window.examAPI ? window.examAPI.getUserFromStorage() : null;
    if (user) {
        console.log('👤 Текущий пользователь:', user);
        
        // Проверяем все ключи в localStorage
        console.log('📋 Все ключи в localStorage:');
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.includes('trainer') || key.includes('progress')) {
                try {
                    const value = JSON.parse(localStorage.getItem(key));
                    console.log(`  ${key}:`, value);
                } catch {
                    console.log(`  ${key}:`, localStorage.getItem(key));
                }
            }
        }
    }
}

// Загружаем при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('📊 Страница прогресса загружена');
    
    // Дебаг
    debugProgress();
    
    // Ждем инициализации API
    setTimeout(() => {
        if (window.examAPI) {
            initProgressPage();
        } else {
            console.error('❌ API не инициализирован');
            document.getElementById('blocks-container').innerHTML = 
                '<div class="loading" style="color: red;">Ошибка: API не загружен</div>';
        }
    }, 100);
});