// simulation.js
let currentQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let timer;
let timeLeft = 60 * 60;
let currentBlock = '';

// Инициализация экзамена
async function initExam() {
  // Получаем выбранный блок из URL или localStorage
  const urlParams = new URLSearchParams(window.location.search);
  currentBlock = urlParams.get('block') || localStorage.getItem('selectedBlock');
  
  if (!currentBlock) {
    alert('Сначала выберите блок обучения');
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('current-block-name').textContent = currentBlock;
  
  // Загружаем вопросы
  try {
    const response = await fetch('questions.json');
    const allQuestions = await response.json();
    const blockQuestions = allQuestions[currentBlock];
    
    // Выбираем 30 случайных вопросов
    currentQuestions = getRandomQuestions(blockQuestions, 30);
    userAnswers = new Array(currentQuestions.length).fill(null);
    
    startTimer();
    displayQuestion();
  } catch (error) {
    console.error('Ошибка загрузки вопросов:', error);
    alert('Ошибка загрузки вопросов');
  }
}

// Выбор случайных вопросов
function getRandomQuestions(questions, count) {
  const shuffled = [...questions].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Таймер
function startTimer() {
  timer = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    
    if (timeLeft <= 0) {
      finishExam();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  document.getElementById('timer').textContent = 
    `Осталось времени: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Отображение вопроса
function displayQuestion() {
  const question = currentQuestions[currentQuestionIndex];
  const questionNumber = currentQuestionIndex + 1;
  
  document.getElementById('question-number').textContent = `Вопрос ${questionNumber} из ${currentQuestions.length}`;
  document.getElementById('question-text').textContent = question.question;
  
  // Отображение изображения (если есть)
  const imageContainer = document.getElementById('question-image');
  imageContainer.innerHTML = '';
  if (question.image) {
    const img = document.createElement('img');
    img.src = question.image;
    img.alt = 'Иллюстрация к вопросу';
    img.style.maxWidth = '100%';
    imageContainer.appendChild(img);
  }
  
  // Отображение вариантов ответа
  const optionsContainer = document.getElementById('options-container');
  optionsContainer.innerHTML = '';
  
  question.options.forEach((option, index) => {
    const optionElement = document.createElement('div');
    optionElement.className = 'option';
    
    const input = document.createElement('input');
    input.type = question.correctAnswers.length > 1 ? 'checkbox' : 'radio';
    input.name = 'answer';
    input.value = String.fromCharCode(65 + index); // A, B, C, D
    input.checked = userAnswers[currentQuestionIndex]?.includes(input.value) || false;
    
    const label = document.createElement('label');
    label.textContent = option;
    
    optionElement.appendChild(input);
    optionElement.appendChild(label);
    optionsContainer.appendChild(optionElement);
  });
  
  // Показываем/скрываем кнопки
  document.getElementById('next-btn').style.display = 
    currentQuestionIndex < currentQuestions.length - 1 ? 'block' : 'none';
  document.getElementById('finish-btn').style.display = 
    currentQuestionIndex === currentQuestions.length - 1 ? 'block' : 'none';
}

// Следующий вопрос
function nextQuestion() {
  saveCurrentAnswer();
  currentQuestionIndex++;
  displayQuestion();
}

// Сохранение текущего ответа
function saveCurrentAnswer() {
  const selectedOptions = Array.from(document.querySelectorAll('input[name="answer"]:checked'))
    .map(input => input.value);
  userAnswers[currentQuestionIndex] = selectedOptions;
}

// Завершение экзамена
function finishExam() {
  clearInterval(timer);
  saveCurrentAnswer();
  
  // Подсчёт результатов
  const results = calculateResults();
  
  // Показываем результаты
  document.getElementById('exam-container').style.display = 'none';
  document.getElementById('results-container').style.display = 'block';
  
  document.getElementById('correct-answers').textContent = results.correct;
  document.getElementById('total-questions').textContent = currentQuestions.length;
  document.getElementById('grade').textContent = results.grade;
  
  // Сохраняем попытку
  saveAttemptToStorage(results);
}

// Подсчёт результатов
function calculateResults() {
  let correctCount = 0;
  
  currentQuestions.forEach((question, index) => {
    const userAnswer = userAnswers[index] || [];
    const correctAnswer = question.correctAnswers;
    
    // Сравниваем массивы ответов (порядок не важен)
    const isCorrect = 
      userAnswer.length === correctAnswer.length &&
      userAnswer.every(answer => correctAnswer.includes(answer));
    
    if (isCorrect) correctCount++;
  });
  
  const percentage = (correctCount / currentQuestions.length) * 100;
  const grade = percentage >= 80 ? '5' : 
                percentage >= 60 ? '4' : 
                percentage >= 40 ? '3' : '2';
  
  return {
    correct: correctCount,
    total: currentQuestions.length,
    percentage: percentage,
    grade: grade
  };
}

// Сохранение попытки
function saveAttemptToStorage(results) {
  const attempt = {
    block: currentBlock,
    date: new Date().toISOString(),
    correctAnswers: results.correct,
    totalQuestions: results.total,
    grade: results.grade,
    timeSpent: (60 * 60 - timeLeft),
    userAnswers: userAnswers,
    questions: currentQuestions
  };
  
  // Получаем существующие попытки из localStorage
  const existingAttempts = JSON.parse(localStorage.getItem('examAttempts') || '[]');
  existingAttempts.push(attempt);
  localStorage.setItem('examAttempts', JSON.stringify(existingAttempts));
}

function saveAttempt() {
  window.location.href = 'history.html';
}

function confirmExit() {
  if (confirm('Вы уверены, что хотите завершить экзамен досрочно? Результаты будут сохранены.')) {
    finishExam();
  }
}

// Запускаем экзамен при загрузке страницы
document.addEventListener('DOMContentLoaded', initExam);