function goToMain() {
    window.location.href = 'index.html';
}
// В начало файла history.js, перед функцией loadHistory
async function checkAndMigrateData() {
    const user = examAPI.getUserFromStorage();
    
    if (user && user.userType === 'registered') {
        // Проверяем есть ли локальные данные в старом формате
        const oldLocalData = JSON.parse(localStorage.getItem('examAttempts') || '[]');
        
        if (oldLocalData.length > 0) {
            console.log(`Обнаружено ${oldLocalData.length} неперенесенных попыток`);
            
            // Автоматически переносим
            try {
                const result = await examAPI.migrateLocalAttemptsToServer();
                if (result.migratedCount > 0) {
                    console.log(`Автоматически перенесено ${result.migratedCount} попыток`);
                    return true; 
                }
            } catch (error) {
                console.error('Ошибка автоматического переноса:', error);
            }
        }
    }
    return false;
}


async function loadHistory() {
    console.log('ЗАГРУЗКА ИСТОРИИ ПОПЫТОК');
    
    const user = examAPI.getUserFromStorage();
    
    if (!user) {
        console.log('Пользователь не найден!');
        alert('Пожалуйста, войдите в систему!');
        window.location.href = 'login.html';
        return;
    }
    
    document.getElementById('user-name').textContent = user.name;
    
    console.log('Пользователь:', user.name, 'Тип:', user.userType);
    
    try {
        const result = await examAPI.getExamAttempts();
        
        if (!result.success) {
            console.log('Ошибка загрузки:', result.error);
            showEmptyHistory();
            return;
        }
        
        const attempts = result.attempts || [];
        console.log(`Загружено попыток: ${attempts.length}`);
        
        if (result.local) {
            console.log('Данные загружены из localStorage');
        } else {
            console.log('Данные загружены с сервера');
        }
        
        displayHistory(attempts);
        
    } catch (error) {
        console.error('Критическая ошибка при загрузке истории:', error);
        showEmptyHistory();
    }
}

function displayHistory(attempts) {
    console.log('Отображение истории...');
    
    document.getElementById('total-attempts').textContent = attempts.length;
    
    const passedAttempts = attempts.filter(attempt => attempt.isPassed).length;
    document.getElementById('passed-attempts').textContent = passedAttempts;
    
    const successRate = attempts.length > 0 ? 
        Math.round((passedAttempts / attempts.length) * 100) : 0;
    document.getElementById('success-rate').textContent = `${successRate}%`;
    
    if (attempts.length === 0) {
        document.getElementById('attempts-container').style.display = 'none';
        document.getElementById('no-attempts').style.display = 'block';
        console.log('Нет попыток для отображения');
    } else {
        document.getElementById('attempts-container').style.display = 'block';
        document.getElementById('no-attempts').style.display = 'none';
        displayAttempts(attempts);
        console.log('Попытки отображены');
    }
}

function showEmptyHistory() {
    document.getElementById('total-attempts').textContent = '0';
    document.getElementById('passed-attempts').textContent = '0';
    document.getElementById('success-rate').textContent = '0%';
    document.getElementById('attempts-container').style.display = 'none';
    document.getElementById('no-attempts').style.display = 'block';
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
    
    // Вычисляем процент, если он не указан
    const percentage = attempt.percentage !== null && attempt.percentage !== undefined 
        ? attempt.percentage 
        : (attempt.totalQuestions > 0 
            ? ((attempt.correctAnswers / attempt.totalQuestions) * 100).toFixed(1)
            : 0);
    
    element.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <h4 style="margin: 0;">Попытка № ${index + 1} - ${attempt.block}</h4>
            <span style="font-size: 14px; color: #666;">${formattedDate}</span>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 15px 0;">
            <div>
                <strong>Результат:</strong>
                <div style="font-size: 24px; font-weight: bold; color: ${attempt.isPassed ? '#64D23F' : '#D23F3F'}">
                    ${attempt.grade || (attempt.isPassed ? 'ЗАЧЕТ' : 'НЕЗАЧЕТ')}
                </div>
            </div>
            
            <div>
                <strong>Правильных ответов:</strong>
                <div style="font-size: 24px; font-weight: bold;">
                    ${attempt.correctAnswers || 0}/${attempt.totalQuestions || 0}
                </div>
            </div>
            
            <div>
                <strong>Процент:</strong>
                <div style="font-size: 24px; font-weight: bold;">
                    ${percentage}%
                </div>
            </div>
            
            <div>
                <strong>Время:</strong>
                <div style="font-size: 20px;">
                    ${timeSpentMinutes.toString().padStart(2, '0')}:${timeSpentSeconds.toString().padStart(2, '0')}
                </div>
            </div>
        </div>
        
        <div style="margin-top: 15px;">
            <button class="button" onclick="viewAttemptDetails(${index})" style="background-color: #2196F3; padding: 8px 16px; font-size: 14px;">
                Показать детали
            </button>
        </div>
    `;
    
    return element;
}

async function viewAttemptDetails(attemptIndex) {
    console.log('Просмотр деталей попытки #', attemptIndex);
    
    try {
        const result = await examAPI.getExamAttempts();
        
        if (result.success && result.attempts) {
            const attempts = result.attempts;
            if (attemptIndex >= 0 && attemptIndex < attempts.length) {
                const attempt = attempts[attemptIndex];
                
                // Сохраняем полные данные попытки в localStorage
                localStorage.setItem('viewingAttempt', JSON.stringify({
                    index: attemptIndex,
                    id: attempt.id,
                    ...attempt
                }));
                
                console.log('✅ Данные попытки сохранены для просмотра:', attempt.id);
                window.location.href = 'attempt-details.html';
            } else {
                alert('Попытка не найдена!');
            }
        } else {
            alert('Не удалось загрузить данные попытки');
        }
    } catch (error) {
        console.error('Ошибка при просмотре деталей:', error);
        alert('Ошибка при загрузке данных');
    }
}

async function deleteAttempt(attemptId) {
    console.log('Удаление попытки:', attemptId);
    
    if (!confirm('Вы уверены, что хотите удалить эту попытку?')) {
        return;
    }
    
    try {
        const result = await examAPI.deleteExamAttempt(attemptId);
        
        if (result.success) {
            alert('Попытка удалена!');
            loadHistory();
        } else {
            alert('Ошибка при удалении: ' + (result.error || 'Неизвестная ошибка'));
        }
    } catch (error) {
        console.error('Ошибка удаления:', error);
        alert('Ошибка при удалении попытки');
    }
}

async function clearHistory() {
    const user = examAPI.getUserFromStorage();
    
    if (!user) {
        alert('Пользователь не найден!');
        return;
    }
    
    if (user.userType === 'guest') {

        alert('В гостевом режиме история не очищается. Войдите через Яндекс для сохранения истории.');
        return;
    }
    
    if (!confirm('Вы уверены, что хотите очистить ВСЮ историю попыток? Это действие нельзя отменить!')) {
        return;
    }
    
    try {
        // Получаем все попытки пользователя
        const result = await examAPI.getExamAttempts();
        
        if (result.success && result.attempts && result.attempts.length > 0) {
            // Удаляем каждую попытку через API
            for (const attempt of result.attempts) {
                await fetch(`/api/exam-attempts/${user.id}/${attempt.id}`, {
                    method: 'DELETE'
                });
                console.log('🗑️ Удалена попытка:', attempt.id);
            }
            
            // Очищаем локальное хранилище
            localStorage.removeItem(`examAttempts_${user.id}`);
            localStorage.removeItem('examAttempts');
            
            alert(`✅ История очищена! Удалено ${result.attempts.length} попыток.`);
            
            // Перезагружаем страницу
            location.reload();
        } else {
            alert('История уже пуста');
        }
    } catch (error) {
        console.error('Ошибка очистки истории:', error);
        alert('Ошибка при очистке истории');
    }
}

// Загружаем историю при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('📜 Страница истории загружена');
    loadHistory();
});