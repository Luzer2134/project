// shuffler.js - сделал перемешивание вопросов 

function shuffleOptions(question) {
    if (!question.options || question.options.length === 0) return question;
    
    const cyrillicLetters = ['А', 'Б', 'В', 'Г', 'Д', 'Е'];
    
    // Создаём массив объектов: оригинальная буква + текст
    const optionsWithLetters = question.options.map((text, index) => ({
        originalLetter: cyrillicLetters[index],
        text: text
    }));
    
    // Перемешиваем алгоритмом Фишера-Йетса
    for (let i = optionsWithLetters.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [optionsWithLetters[i], optionsWithLetters[j]] = 
        [optionsWithLetters[j], optionsWithLetters[i]];
    }
    
    // Строим маппинг: старая буква → новая буква
    const letterMap = {};
    optionsWithLetters.forEach((item, newIndex) => {
        letterMap[item.originalLetter] = cyrillicLetters[newIndex];
    });
    
    // Пересчитываем правильные ответы
    const newCorrectAnswers = question.correctAnswers.map(
        letter => letterMap[letter] || letter
    );
    
    return {
        ...question,
        options: optionsWithLetters.map(item => item.text),
        correctAnswers: newCorrectAnswers
    };
}

function shuffleAllQuestions() {
    console.log('🔀 Перемешиваем варианты ответов...');
    Object.keys(questionsData).forEach(block => {
        questionsData[block] = questionsData[block].map(q => shuffleOptions(q));
    });
    console.log('✅ Варианты ответов перемешаны');
}

function waitAndShuffle() {
    if (typeof questionsData !== 'undefined' && !isLoading) {
        shuffleAllQuestions();
    } else {
        setTimeout(waitAndShuffle, 100);
    }
}

waitAndShuffle();