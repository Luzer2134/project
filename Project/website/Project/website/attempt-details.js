// attempt-details.js
let attemptData = null;

function goToHistory() {
    window.location.href = 'history.html';
}

function loadAttemptDetails() {
    const savedAttempt = localStorage.getItem('viewingAttempt');
    
    if (!savedAttempt) {
        alert('Данные о попытке не найдены!');
        goToHistory();
        return;
    }
    
    try {
        attemptData = JSON.parse(savedAttempt);
        displayAttemptDetails();
    } catch (error) {
        console.error('Ошибка загрузки данных попытки:', error);
        alert('Ошибка загрузки данных попытки');
        goToHistory();
    }
}

function displayAttemptDetails() {
    if (!attemptData) return;
    
    const date = new Date(attemptData.date);
    const formattedDate = date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const timeSpentMinutes = Math.floor(attemptData.timeSpent / 60);
    const timeSpentSeconds = attemptData.timeSpent % 60;
    
    document.getElementById('attempt-title').textContent = 
        `Попытка экзамена - ${attemptData.block}`;
    
    document.getElementById('attempt-summary').innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-top: 10px;">
            <div>
                <strong>Дата:</strong><br>
                ${formattedDate}
            </div>
            <div>
                <strong>Результат:</strong><br>
                <span style="color: ${attemptData.isPassed ? '#4CAF50' : '#f44336'}; font-weight: bold;">
                    ${attemptData.grade}
                </span>
            </div>
            <div>
                <strong>Правильных ответов:</strong><br>
                ${attemptData.correctAnswers}/${attemptData.totalQuestions}
            </div>
            <div>
                <strong>Процент:</strong><br>
                ${attemptData.percentage.toFixed(1)}%
            </div>
            <div>
                <strong>Время:</strong><br>
                ${timeSpentMinutes.toString().padStart(2, '0')}:${timeSpentSeconds.toString().padStart(2, '0')}
            </div>
        </div>
    `;
    
    displayQuestionsReview();
}

function displayQuestionsReview() {
    const container = document.getElementById('questions-review');
    
    if (!attemptData.questions || attemptData.questions.length === 0) {
        container.innerHTML = '<p>Детальная информация о вопросах не найдена</p>';
        return;
    }
    
    let html = '<h3>Детальный разбор вопросов:</h3>';
    
    attemptData.questions.forEach((question, index) => {
        const userAnswer = attemptData.userAnswers[index] || [];
        const correctAnswer = question.correctAnswers || [];
        const isCorrect = checkSingleAnswer(question, userAnswer);
        
        html += `
            <div class="question-review" style="
                margin: 20px 0;
                padding: 15px;
                border-radius: 8px;
                border-left: 5px solid ${isCorrect ? '#4CAF50' : '#f44336'};
                background: ${isCorrect ? '#f1f8e9' : '#ffebee'};
            ">
                <div style="display: flex; align-items: center; margin-bottom: 10px;">
                    <span style="font-size: 18px; font-weight: bold; margin-right: 10px;">
                        Вопрос ${index + 1}
                    </span>
                    <span style="color: ${isCorrect ? '#4CAF50' : '#f44336'}; font-weight: bold;">
                        ${isCorrect ? 'ВЕРНО' : 'НЕВЕРНО'}
                    </span>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <strong>Вопрос:</strong> ${question.question}
                </div>
                
                <div style="margin-bottom: 10px;">
                    <strong>Ваш ответ:</strong> 
                    <span style="color: ${isCorrect ? '#4CAF50' : '#f44336'}">
                        ${userAnswer.join(', ') || 'Нет ответа'}
                    </span>
                </div>
                
                <div style="margin-bottom: 10px;">
                    <strong>Правильный ответ:</strong> 
                    <span style="color: #4CAF50">${correctAnswer.join(', ')}</span>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function checkSingleAnswer(question, userAnswer) {
    if (!question || !userAnswer) return false;
    const userSorted = [...userAnswer].sort().join('');
    const correctSorted = [...question.correctAnswers].sort().join('');
    return userSorted === correctSorted;
}

// Загружаем детали при загрузке страницы
document.addEventListener('DOMContentLoaded', loadAttemptDetails);