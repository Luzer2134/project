// history.js
function goToMain() {
    window.location.href = 'index.html';
}

function loadHistory() {
    const userName = localStorage.getItem('userName') || 'Гость';
    const examAttempts = JSON.parse(localStorage.getItem('examAttempts') || '[]');
    
    document.getElementById('user-name').textContent = userName;
    document.getElementById('total-attempts').textContent = examAttempts.length;
    
    const passedAttempts = examAttempts.filter(attempt => attempt.isPassed).length;
    document.getElementById('passed-attempts').textContent = passedAttempts;
    
    const successRate = examAttempts.length > 0 ? 
        Math.round((passedAttempts / examAttempts.length) * 100) : 0;
    document.getElementById('success-rate').textContent = `${successRate}%`;
    
    if (examAttempts.length === 0) {
        document.getElementById('attempts-container').style.display = 'none';
        document.getElementById('no-attempts').style.display = 'block';
    } else {
        document.getElementById('attempts-container').style.display = 'block';
        document.getElementById('no-attempts').style.display = 'none';
        displayAttempts(examAttempts);
    }
}

function displayAttempts(attempts) {
    const container = document.getElementById('attempts-container');
    container.innerHTML = '';
    
    // Сортируем по дате (сначала новые)
    attempts.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    attempts.forEach((attempt, index) => {
        const attemptElement = createAttemptElement(attempt, index);
        container.appendChild(attemptElement);
    });
}

function createAttemptElement(attempt, index) {
    const element = document.createElement('div');
    element.className = 'attempt-card';
    element.style.cssText = `
        background: white;
        padding: 20px;
        margin: 15px 0;
        border-radius: 10px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        border-left: 5px solid ${attempt.isPassed ? '#4CAF50' : '#f44336'};
    `;
    
    const date = new Date(attempt.date);
    const formattedDate = date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const timeSpentMinutes = Math.floor(attempt.timeSpent / 60);
    const timeSpentSeconds = attempt.timeSpent % 60;
    
    element.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <h4 style="margin: 0;">Попытка #${index + 1} - ${attempt.block}</h4>
            <span style="font-size: 14px; color: #666;">${formattedDate}</span>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 15px 0;">
            <div>
                <strong>Результат:</strong>
                <div style="font-size: 24px; font-weight: bold; color: ${attempt.isPassed ? '#4CAF50' : '#f44336'}">
                    ${attempt.grade}
                </div>
            </div>
            
            <div>
                <strong>Правильных ответов:</strong>
                <div style="font-size: 24px; font-weight: bold;">
                    ${attempt.correctAnswers}/${attempt.totalQuestions}
                </div>
            </div>
            
            <div>
                <strong>Процент:</strong>
                <div style="font-size: 24px; font-weight: bold;">
                    ${attempt.percentage.toFixed(1)}%
                </div>
            </div>
            
            <div>
                <strong>Затраченное время:</strong>
                <div style="font-size: 20px;">
                    ${timeSpentMinutes.toString().padStart(2, '0')}:${timeSpentSeconds.toString().padStart(2, '0')}
                </div>
            </div>
        </div>
        
        <div style="margin-top: 15px;">
            <button class="button" onclick="viewAttemptDetails(${index})" style="background-color: #2196F3; padding: 8px 16px; font-size: 14px;">
                Показать детали
            </button>
            <button class="button" onclick="deleteAttempt(${index})" style="background-color: #ff9800; padding: 8px 16px; font-size: 14px;">
                Удалить
            </button>
        </div>
    `;
    
    return element;
}

function viewAttemptDetails(attemptIndex) {
    const examAttempts = JSON.parse(localStorage.getItem('examAttempts') || '[]');
    const attempt = examAttempts[attemptIndex];
    
    if (!attempt) {
        alert('Попытка не найдена!');
        return;
    }
    
    // Сохраняем выбранную попытку для просмотра деталей
    localStorage.setItem('viewingAttempt', JSON.stringify({
        index: attemptIndex,
        ...attempt
    }));
    
    // Открываем страницу с деталями попытки
    window.location.href = 'attempt-details.html';
}

function deleteAttempt(attemptIndex) {
    if (!confirm('Вы уверены, что хотите удалить эту попытку?')) {
        return;
    }
    
    const examAttempts = JSON.parse(localStorage.getItem('examAttempts') || '[]');
    examAttempts.splice(attemptIndex, 1);
    localStorage.setItem('examAttempts', JSON.stringify(examAttempts));
    
    alert('Попытка удалена!');
    loadHistory(); // Перезагружаем историю
}

function clearHistory() {
    const isAuthorized = localStorage.getItem('isAuthorized') === 'true';
    
    if (!isAuthorized) {
        alert('В гостевом режиме история автоматически очищается. Войдите через Яндекс для сохранения истории.');
        return;
    }
    
    if (!confirm('Вы уверены, что хотите очистить всю историю попыток?')) {
        return;
    }
    
    localStorage.removeItem('examAttempts');
    alert('История очищена!');
    loadHistory();
}

// Загружаем историю при загрузке страницы
document.addEventListener('DOMContentLoaded', loadHistory);