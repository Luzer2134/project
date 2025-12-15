/// progress.js - основные функции статистики

async function calculateTrainerStats() {
    const user = window.examAPI ? window.examAPI.getUserFromStorage() : null;
    
    if (!user) {
        console.log('👤 Пользователь не найден');
        displayEmptyStats('trainer');
        return;
    }
    
    console.log(`📊 Расчет статистики тренажера для: ${user.name} (${user.userType})`);
    
    if (user.userType === 'guest') {
        calculateLocalTrainerStats(user);
        return;
    }
    
    // Для зарегистрированного - пробуем загрузить с сервера
    try {
        const result = await window.examAPI.getTrainerProgress();
        
        if (result.success && result.progress) {
            calculateServerTrainerStats(result.progress);
        } else {
            console.log('⚠️ Нет данных на сервере, пробуем локально');
            calculateLocalTrainerStats(user);
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки статистики с сервера:', error);
        calculateLocalTrainerStats(user);
    }
}

// Статистика с сервера
function calculateServerTrainerStats(serverProgress) {
    const blocks = ['Блок 1', 'Блок 2', 'Блок 3', 'Блок 4'];
    let totalCompleted = 0;
    let totalCorrect = 0;
    let totalQuestionsCount = 0;
    
    blocks.forEach(block => {
        const blockProgress = serverProgress[block];
        
        if (blockProgress) {
            const userAnswers = blockProgress.userAnswers || [];
            const completed = userAnswers.filter(answer => answer !== null).length;
            totalCompleted += completed;
            
            // Считаем правильные ответы
            if (questionsData && questionsData[block]) {
                const blockQuestions = questionsData[block];
                totalQuestionsCount += blockQuestions.length;
                
                let correctInBlock = 0;
                userAnswers.forEach((answer, index) => {
                    if (answer !== null && blockQuestions[index]) {
                        const question = blockQuestions[index];
                        const isCorrect = checkSingleAnswer(question, answer);
                        if (isCorrect) correctInBlock++;
                    }
                });
                
                totalCorrect += correctInBlock;
            }
        }
    });
    
    const percentage = totalCompleted > 0 ? Math.round((totalCorrect / totalCompleted) * 100) : 0;
    
    document.getElementById('trainer-completed').textContent = totalCompleted;
    document.getElementById('trainer-correct').textContent = totalCorrect;
    document.getElementById('trainer-percentage').textContent = `${percentage}%`;
    
    console.log(`✅ Статистика тренажера: ${totalCompleted} пройдено, ${totalCorrect} правильно (${percentage}%)`);
}

// Локальная статистика
function calculateLocalTrainerStats(user) {
    const blocks = ['Блок 1', 'Блок 2', 'Блок 3', 'Блок 4'];
    let totalCompleted = 0;
    let totalCorrect = 0;
    let totalQuestionsCount = 0;
    
    // Определяем ключ для localStorage
    const storageKey = user.userType === 'guest' 
        ? 'trainerProgress_guest' 
        : `trainerProgress_${user.id}`;
    
    const savedProgress = localStorage.getItem(storageKey);
    const allProgress = savedProgress ? JSON.parse(savedProgress) : {};
    
    blocks.forEach(block => {
        const blockProgress = allProgress[block];
        
        if (blockProgress) {
            // Проверяем принадлежность данных
            if (blockProgress.userId === user.id || user.userType === 'guest') {
                const userAnswers = blockProgress.userAnswers || [];
                const completed = userAnswers.filter(answer => answer !== null).length;
                totalCompleted += completed;
                
                // Считаем правильные ответы
                if (questionsData && questionsData[block]) {
                    const blockQuestions = questionsData[block];
                    totalQuestionsCount += blockQuestions.length;
                    
                    let correctInBlock = 0;
                    userAnswers.forEach((answer, index) => {
                        if (answer !== null && blockQuestions[index]) {
                            const question = blockQuestions[index];
                            const isCorrect = checkSingleAnswer(question, answer);
                            if (isCorrect) correctInBlock++;
                        }
                    });
                    
                    totalCorrect += correctInBlock;
                }
            }
        }
    });
    
    const percentage = totalCompleted > 0 ? Math.round((totalCorrect / totalCompleted) * 100) : 0;
    
    document.getElementById('trainer-completed').textContent = totalCompleted;
    document.getElementById('trainer-correct').textContent = totalCorrect;
    document.getElementById('trainer-percentage').textContent = `${percentage}%`;
    
    console.log(`✅ Локальная статистика тренажера: ${totalCompleted} пройдено`);
}

async function calculateExamStats() {
    const user = window.examAPI ? window.examAPI.getUserFromStorage() : null;
    
    if (!user) {
        displayEmptyStats('exam');
        return;
    }
    
    console.log(`📊 Расчет статистики экзаменов для: ${user.name} (${user.userType})`);
    
    try {
        const result = await window.examAPI.getExamAttempts();
        
        if (result.success) {
            const attempts = result.attempts || [];
            
            document.getElementById('exam-attempts').textContent = attempts.length;
            
            const passedAttempts = attempts.filter(attempt => attempt.isPassed).length;
            document.getElementById('exam-passed').textContent = passedAttempts;
            
            if (attempts.length > 0) {
                const totalPercentage = attempts.reduce((sum, attempt) => sum + attempt.percentage, 0);
                const averagePercentage = Math.round(totalPercentage / attempts.length);
                document.getElementById('exam-average').textContent = `${averagePercentage}%`;
                
                console.log(`✅ Статистика экзаменов: ${attempts.length} попыток, ${passedAttempts} сдано`);
            } else {
                document.getElementById('exam-average').textContent = '0%';
                console.log('📭 Нет попыток экзамена');
            }
        } else {
            displayEmptyStats('exam');
        }
    } catch (error) {
        console.error('❌ Ошибка расчета статистики экзаменов:', error);
        displayEmptyStats('exam');
    }
}

function displayEmptyStats(type) {
    if (type === 'trainer') {
        document.getElementById('trainer-completed').textContent = '0';
        document.getElementById('trainer-correct').textContent = '0';
        document.getElementById('trainer-percentage').textContent = '0%';
    } else if (type === 'exam') {
        document.getElementById('exam-attempts').textContent = '0';
        document.getElementById('exam-passed').textContent = '0';
        document.getElementById('exam-average').textContent = '0%';
    }
}