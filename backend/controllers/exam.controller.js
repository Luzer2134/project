const { dbQuery, dbRun } = require('../config/database');

// Сохранить попытку экзамена
async function saveAttempt(req, res) {
    try {
        const { userId, attempt } = req.body;

        if (!userId || !attempt) {
            return res.status(400).json({ success: false, error: 'Неверные данные' });
        }

        const attemptId = 'attempt_' + Date.now();

        await dbRun(
            `INSERT INTO exam_attempts 
            (user_id, attempt_id, block, score, total_questions, correct_answers, 
            percentage, is_passed, time_spent, user_answers, questions_data) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                attemptId,
                attempt.block || 'Неизвестный блок',
                attempt.score || 0,
                attempt.totalQuestions || 0,
                attempt.correctAnswers || 0,
                attempt.percentage || 0,
                attempt.isPassed ? 1 : 0,
                attempt.timeSpent || 0,
                JSON.stringify(attempt.userAnswers || []),
                JSON.stringify(attempt.questions || []),
            ]
        );

        console.log(`💾 Сохранена попытка: ${userId}, ID: ${attemptId}`);
        res.json({ success: true, attemptId });
    } catch (error) {
        console.error('❌ Ошибка сохранения попытки:', error);
        res.status(500).json({ success: false, error: 'Ошибка сохранения попытки' });
    }
}

// Получить все попытки пользователя
async function getAttempts(req, res) {
    console.log('📥 ЗАПРОС ПОПЫТОК ЭКЗАМЕНА для пользователя:', req.params.userId);

    try {
        const { userId } = req.params;

        const attempts = await dbQuery(
            'SELECT * FROM exam_attempts WHERE user_id = ? ORDER BY attempt_date DESC',
            [userId]
        );

        const formattedAttempts = attempts.map((attempt) => ({
            id: attempt.attempt_id,
            userId: attempt.user_id,
            block: attempt.block,
            score: attempt.score,
            totalQuestions: attempt.total_questions,
            correctAnswers: attempt.correct_answers,
            percentage: attempt.percentage,
            isPassed: Boolean(attempt.is_passed),
            timeSpent: attempt.time_spent,
            userAnswers: JSON.parse(attempt.user_answers || '[]'),
            questions: JSON.parse(attempt.questions_data || '[]'),
            date: attempt.attempt_date,
        }));

        console.log(`📊 Найдено попыток: ${formattedAttempts.length}`);
        res.json({ success: true, attempts: formattedAttempts });
    } catch (error) {
        console.error('❌ Ошибка получения попыток:', error);
        res.status(500).json({ success: false, error: 'Ошибка получения попыток', details: error.message });
    }
}

// Удалить конкретную попытку
async function deleteAttempt(req, res) {
    try {
        const { userId, attemptId } = req.params;

        const result = await dbRun(
            'DELETE FROM exam_attempts WHERE user_id = ? AND attempt_id = ?',
            [userId, attemptId]
        );

        if (result.changes > 0) {
            console.log(`🗑️ Удалена попытка: ${userId}, ID: ${attemptId}`);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка удаления попытки:', error);
        res.status(500).json({ success: false, error: 'Ошибка удаления попытки' });
    }
}

module.exports = { saveAttempt, getAttempts, deleteAttempt };