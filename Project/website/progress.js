// progress.js
function goToMain() {
    window.location.href = 'index.html';
}

function loadUserInfo() {
    const userName = localStorage.getItem('userName') || 'Гость';
    const userType = localStorage.getItem('userType') || 'guest';
    const isAuthorized = localStorage.getItem('isAuthorized') === 'true';
    
    document.getElementById('user-name').textContent = userName;
    document.getElementById('user-type').textContent = userType === 'yandex' ? 'Яндекс' : 'Гость';
    document.getElementById('progress-status').textContent = isAuthorized ? 
        'Включено' : 'Отключено (гостевой режим)';
}

function calculateTrainerStats() {
    let totalCompleted = 0;
    let totalCorrect = 0;
    let totalQuestions = 0;
    
    // Собираем статистику по всем блокам
    const blocks = ['Блок 1', 'Блок 2', 'Блок 3', 'Блок 4'];
    
    blocks.forEach(block => {
        const savedProgress = localStorage.getItem(`trainerProgress_${block}`);
        if (savedProgress) {
            try {
                const progressData = JSON.parse(savedProgress);
                const userAnswers = progressData.userAnswers || [];
                
                // Считаем пройденные вопросы
                const completed = userAnswers.filter(answer => answer !== null).length;
                totalCompleted += completed;
                
                // Считаем правильные ответы
                if (questionsData && questionsData[block]) {
                    const blockQuestions = questionsData[block];
                    let correctInBlock = 0;
                    
                    userAnswers.forEach((answer, index) => {
                        if (answer !== null && blockQuestions[index]) {
                            const question = blockQuestions[index];
                            const isCorrect = checkSingleAnswer(question, answer);
                            if (isCorrect) correctInBlock++;
                        }
                    });
                    
                    totalCorrect += correctInBlock;
                    totalQuestions += blockQuestions.length;
                }
            } catch (error) {
                console.error(`Ошибка загрузки прогресса для блока ${block}:`, error);
            }
        }
    });
    
    const percentage = totalCompleted > 0 ? Math.round((totalCorrect / totalCompleted) * 100) : 0;
    
    document.getElementById('trainer-completed').textContent = totalCompleted;
    document.getElementById('trainer-correct').textContent = totalCorrect;
    document.getElementById('trainer-percentage').textContent = `${percentage}%`;
}

function calculateExamStats() {
    const examAttempts = JSON.parse(localStorage.getItem('examAttempts') || '[]');
    
    document.getElementById('exam-attempts').textContent = examAttempts.length;
    
    const passedAttempts = examAttempts.filter(attempt => attempt.isPassed).length;
    document.getElementById('exam-passed').textContent = passedAttempts;
    
    if (examAttempts.length > 0) {
        const totalPercentage = examAttempts.reduce((sum, attempt) => sum + attempt.percentage, 0);
        const averagePercentage = Math.round(totalPercentage / examAttempts.length);
        document.getElementById('exam-average').textContent = `${averagePercentage}%`;
    } else {
        document.getElementById('exam-average').textContent = '0%';
    }
}

function calculateBlocksStats() {
    const blocks = ['Блок 1', 'Блок 2', 'Блок 3', 'Блок 4'];
    let studiedBlocks = 0;
    let totalQuestionsCount = 0;
    let bestBlock = '';
    let bestBlockPercentage = 0;
    
    blocks.forEach(block => {
        const savedProgress = localStorage.getItem(`trainerProgress_${block}`);
        if (savedProgress) {
            studiedBlocks++;
            
            // Считаем прогресс по блоку
            try {
                const progressData = JSON.parse(savedProgress);
                const userAnswers = progressData.userAnswers || [];
                
                if (questionsData && questionsData[block]) {
                    const blockQuestions = questionsData[block];
                    totalQuestionsCount += blockQuestions.length;
                    
                    // Считаем процент правильных ответов для этого блока
                    let correctInBlock = 0;
                    let answeredInBlock = 0;
                    
                    userAnswers.forEach((answer, index) => {
                        if (answer !== null && blockQuestions[index]) {
                            answeredInBlock++;
                            const question = blockQuestions[index];
                            if (checkSingleAnswer(question, answer)) {
                                correctInBlock++;
                            }
                        }
                    });
                    
                    if (answeredInBlock > 0) {
                        const blockPercentage = Math.round((correctInBlock / answeredInBlock) * 100);
                        if (blockPercentage > bestBlockPercentage) {
                            bestBlockPercentage = blockPercentage;
                            bestBlock = block;
                        }
                    }
                }
            } catch (error) {
                console.error(`Ошибка расчета статистики для блока ${block}:`, error);
            }
        }
    });
    
    document.getElementById('blocks-studied').textContent = studiedBlocks;
    document.getElementById('total-questions').textContent = totalQuestionsCount;
    document.getElementById('best-block').textContent = bestBlock ? 
        `${bestBlock} (${bestBlockPercentage}%)` : '-';
    
    // Показываем детальный прогресс по блокам
    displayBlocksProgress();
}

function displayBlocksProgress() {
    const container = document.getElementById('blocks-progress');
    const blocks = ['Блок 1', 'Блок 2', 'Блок 3', 'Блок 4'];
    
    let html = '<div class="blocks-progress-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px;">';
    
    blocks.forEach(block => {
        const savedProgress = localStorage.getItem(`trainerProgress_${block}`);
        let progressPercentage = 0;
        let correctPercentage = 0;
        let answeredCount = 0;
        let correctCount = 0;
        
        if (savedProgress) {
            try {
                const progressData = JSON.parse(savedProgress);
                const userAnswers = progressData.userAnswers || [];
                
                if (questionsData && questionsData[block]) {
                    const blockQuestions = questionsData[block];
                    answeredCount = userAnswers.filter(answer => answer !== null).length;
                    
                    // Считаем правильные ответы
                    userAnswers.forEach((answer, index) => {
                        if (answer !== null && blockQuestions[index]) {
                            const question = blockQuestions[index];
                            if (checkSingleAnswer(question, answer)) {
                                correctCount++;
                            }
                        }
                    });
                    
                    progressPercentage = Math.round((answeredCount / blockQuestions.length) * 100);
                    correctPercentage = answeredCount > 0 ? 
                        Math.round((correctCount / answeredCount) * 100) : 0;
                }
            } catch (error) {
                console.error(`Ошибка отображения прогресса для блока ${block}:`, error);
            }
        }
        
        html += `
            <div class="block-progress-card" style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h4>${block}</h4>
                <p>Прогресс: ${progressPercentage}%</p>
                <div style="background: #eee; height: 10px; border-radius: 5px; margin: 10px 0;">
                    <div style="background: #4CAF50; width: ${progressPercentage}%; height: 100%; border-radius: 5px;"></div>
                </div>
                <p>Правильные ответы: ${correctPercentage}%</p>
                <p>Отвечено: ${answeredCount} вопросов</p>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function checkSingleAnswer(question, userAnswer) {
    if (!question || !userAnswer) return false;
    const userSorted = [...userAnswer].sort().join('');
    const correctSorted = [...question.correctAnswers].sort().join('');
    return userSorted === correctSorted;
}

function exportProgress() {
    const isAuthorized = localStorage.getItem('isAuthorized') === 'true';
    
    if (!isAuthorized) {
        alert('В гостевом режиме экспорт прогресса недоступен. Войдите через Яндекс для сохранения прогресса.');
        return;
    }
    
    // Собираем все данные прогресса
    const progressData = {
        user: localStorage.getItem('userName'),
        type: localStorage.getItem('userType'),
        exportDate: new Date().toISOString(),
        selectedBlock: localStorage.getItem('selectedBlock'),
        examAttempts: JSON.parse(localStorage.getItem('examAttempts') || '[]'),
        trainerProgress: {}
    };
    
    // Собираем прогресс по тренажёру
    const blocks = ['Блок 1', 'Блок 2', 'Блок 3', 'Блок 4'];
    blocks.forEach(block => {
        const saved = localStorage.getItem(`trainerProgress_${block}`);
        if (saved) {
            progressData.trainerProgress[block] = JSON.parse(saved);
        }
    });
    
    // Создаем и скачиваем файл
    const dataStr = JSON.stringify(progressData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `progress_${localStorage.getItem('userName')}_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    alert('Прогресс успешно экспортирован!');
}

function clearProgress() {
    if (!confirm('Вы уверены, что хотите сбросить весь прогресс? Это действие нельзя отменить.')) {
        return;
    }
    
    const isAuthorized = localStorage.getItem('isAuthorized') === 'true';
    
    if (isAuthorized) {
        // У авторизованного пользователя очищаем только прогресс
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('trainerProgress_') || 
                key.startsWith('examProgress_') ||
                key === 'examAttempts') {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });
        
        alert('Прогресс успешно сброшен!');
        loadProgressData(); // Перезагружаем данные
    } else {
        // Гостю предлагаем перейти на страницу логина
        if (confirm('В гостевом режиме прогресс автоматически очищается. Хотите войти через Яндекс для сохранения прогресса?')) {
            window.location.href = 'login.html';
        }
    }
}

function loadProgressData() {
    loadUserInfo();
    calculateTrainerStats();
    calculateExamStats();
    calculateBlocksStats();
}

// Ждем загрузки вопросов
document.addEventListener('DOMContentLoaded', function() {
    if (typeof questionsData !== 'undefined') {
        loadProgressData();
    } else {
        // Если вопросы еще не загружены, ждем
        const checkInterval = setInterval(() => {
            if (typeof questionsData !== 'undefined') {
                clearInterval(checkInterval);
                loadProgressData();
            }
        }, 100);
    }
});