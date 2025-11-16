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
        console.log('🔄 Начинаю загрузку вопросов...');
        
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
        
        console.log('✅ Все вопросы загружены!');
        showLoadingStats();
        
    } catch (error) {
        isLoading = false;
        console.error('❌ Ошибка загрузки вопросов:', error);
    }
}

// Функция загрузки одного блока
async function loadBlock(filename, blockName) {
    try {
        console.log(`📥 Загружаю ${blockName} из ${filename}...`);
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
                return {
                    id: (index + 1).toString(),
                    question: item['Вопрос'].toString().trim(),
                    options: item['Варианты ответа'].toString().split('\r\n')
                        .filter(opt => opt && opt.trim() !== '')
                        .map(opt => opt.trim()),
                    correctAnswers: extractLetters(item['Правильный вариант']),
                    comment: item['Комментарий'] ? item['Комментарий'].toString() : '',
                    image: item['Картинка'] || ''
                };
            } catch (error) {
                console.warn(`Ошибка обработки вопроса ${index + 1} в ${blockName}:`, error);
                return null;
            }
        }).filter(question => question !== null); // Убираем null вопросы
        
        console.log(`✅ ${blockName}: загружено ${questions.length} вопросов`);
        return questions;
        
    } catch (error) {
        console.warn(`❌ Ошибка загрузки ${blockName}:`, error.message);
        return [];
    }
}

// Функция для извлечения букв из правильных ответов
function extractLetters(text) {
    if (!text) return [];
    try {
        const matches = text.toString().match(/[А-Г]/g);
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
    console.log('📊 Статистика загрузки:');
    Object.keys(questionsData).forEach(block => {
        console.log(`   ${block}: ${questionsData[block].length} вопросов`);
    });
}

// Загружаем все блоки
loadAllBlocks();