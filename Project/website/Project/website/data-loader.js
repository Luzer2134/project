// data-loader.js
let questionsData = {
  "Блок 1": [],
  "Блок 2": [], 
  "Блок 3": [],
  "Блок 4": []
};

let isLoading = true;

async function loadAllBlocks() {
    try {
        console.log('Начинаю загрузку вопросов...');
        
        // Загружаем все блоки
        const [block1, block2, block3, block4] = await Promise.all([
            loadBlock('data/block1.json', 'Блок 1'),
            loadBlock('data/block2.json', 'Блок 2'),
            loadBlock('data/block3.json', 'Блок 3'),
            loadBlock('data/block4.json', 'Блок 4')
        ]);
        
        questionsData["Блок 1"] = block1;
        questionsData["Блок 2"] = block2;
        questionsData["Блок 3"] = block3;
        questionsData["Блок 4"] = block4;
        
        isLoading = false;
        
        console.log('Все вопросы загружены!');
        showLoadingStats();
        
    } catch (error) {
        isLoading = false;
        console.error('Ошибка загрузки вопросов:', error);
    }
}

// Функция загрузки одного блока
async function loadBlock(filename, blockName) {
    try {
        console.log(`Загружаю ${blockName} из ${filename}...`);
        const response = await fetch(filename);
        
        if (!response.ok) {
            console.warn(`Файл ${filename} не найден`);
            return [];
        }
        
        const rawData = await response.json();
        
        // Проверяем что rawData не null и является массивом
        if (!rawData || !Array.isArray(rawData)) {
            console.warn(`Некорректные данные в ${filename}`);
            return [];
        }
        
        // Преобразуем ваш формат в нужный
        const questions = rawData.map((item, index) => {
            // Проверяем наличие обязательных полей
            if (!item || !item['Вопрос'] || !item['Варианты ответа']) {
                console.warn(`Пропущен вопрос ${index + 1} в ${blockName} - нет обязательных полей`);
                return null;
            }
            
            try {
                // Обрабатываем варианты ответов - поддерживаем разные форматы переносов
                const optionsText = item['Варианты ответа'].toString();
                let options = [];
                
                // Пробуем разные разделители
                if (optionsText.includes('\r\n')) {
                    options = optionsText.split('\r\n');
                } else if (optionsText.includes('\n')) {
                    options = optionsText.split('\n');
                } else if (optionsText.includes(';')) {
                    // Если варианты разделены точкой с запятой
                    options = optionsText.split(';').filter(opt => opt.trim() !== '');
                } else {
                    // Если всё в одной строке, пробуем разделить по буквам вариантов
                    options = splitOptionsByLetters(optionsText);
                }
                
                // Очищаем и форматируем варианты
                options = options
                    .filter(opt => opt && opt.trim() !== '')
                    .map(opt => cleanOptionText(opt.trim()));
                
                return {
                    id: (index + 1).toString(),
                    question: item['Вопрос'].toString().trim(),
                    options: options,
                    correctAnswers: extractLetters(item['Правильный вариант']),
                    comment: item['Комментарий'] ? item['Комментарий'].toString() : '',
                    image: item['Картинка'] || ''
                };
            } catch (error) {
                console.warn(`Ошибка обработки вопроса ${index + 1} в ${blockName}:`, error);
                return null;
            }
        }).filter(question => question !== null); // Убираем null вопросы
        
        console.log(`${blockName}: загружено ${questions.length} вопросов`);
        return questions;
        
    } catch (error) {
        console.warn(`Ошибка загрузки ${blockName}:`, error.message);
        return [];
    }

    return {
        id: (index + 1).toString(),
        question: item['Вопрос'].toString().trim(),
        options: options,
        correctAnswers: extractLetters(item['Правильный вариант']),
        comment: item['Комментарий'] ? item['Комментарий'].toString() : '',
        image: processImagePath(item['Картинка'])  // ← ОБРАБОТКА ПУТИ
    };
}

// Функция для очистки текста варианта
function cleanOptionText(text) {
    if (!text) return '';
    
    let cleaned = text
        .replace(/^[-—]\s*/, '') // Убираем дефисы в начале
        .replace(/\s+/g, ' ')    // Убираем лишние пробелы
        .trim();
    
    // Добавляем точку с запятой если её нет в конце
    if (!cleaned.endsWith(';') && !cleaned.endsWith('.') && !cleaned.endsWith('.;')) {
        cleaned += ';';
    }
    
    return cleaned;
}

// Функция для разделения вариантов по буквам (если всё в одной строке)
function splitOptionsByLetters(text) {
    const options = [];
    const regex = /([А-Г])\)/g;
    let lastIndex = 0;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
        if (lastIndex !== match.index) {
            const option = text.substring(lastIndex, match.index).trim();
            if (option) options.push(option);
        }
        lastIndex = match.index;
    }
    
    // Добавляем последний вариант
    if (lastIndex < text.length) {
        const lastOption = text.substring(lastIndex).trim();
        if (lastOption) options.push(lastOption);
    }
    
    return options;
}

// Функция для извлечения букв из правильных ответов
// data-loader.js - исправленная функция extractLetters
function extractLetters(text) {
    if (!text) return [];
    try {
        // ИСПРАВЛЕНИЕ: ищем кириллические буквы А-Е
        const matches = text.toString().match(/[А-Е]/g);
        console.log(`Извлечение букв из "${text}":`, matches);
        return matches ? matches : [];
    } catch (error) {
        console.warn('Ошибка извлечения букв:', error);
        return [];
    }
}

// Проверка готовности данных
function isQuestionsReady() {
    return !isLoading;
}

// Получить вопросы блока
function getBlockQuestions(blockName) {
    return questionsData[blockName] || [];
}

// Статистика
function showLoadingStats() {
    console.log('Статистика загрузки:');
    Object.keys(questionsData).forEach(block => {
        console.log(`   ${block}: ${questionsData[block].length} вопросов`);
    });
}

// Функция для обработки пути к изображению
function processImagePath(imageData) {
    if (!imageData || imageData === 'null' || imageData === null) {
        return '';
    }
    
    const str = imageData.toString().trim();
    
    if (str.toLowerCase().startsWith('да')) {
        // Извлекаем номер из строки типа "да 1414"
        const match = str.match(/да\s*(\d+)/i);
        if (match && match[1]) {
            return `pictures/pictogram_${match[1]}.jpg`;
        }
        return '';
    }
    
    // Если это уже путь или имя файла
    if (str.includes('.jpg') || str.includes('.png') || str.includes('.gif')) {
        // Если нет пути, добавляем папку pictures
        if (!str.includes('/')) {
            return `pictures/${str}`;
        }
        return str;
    }
    
    // Если это просто число
    if (/^\d+$/.test(str)) {
        return `pictures/pictogram_${str}.jpg`;
    }
    
    return '';
}

// Загружаем все блоки
loadAllBlocks();