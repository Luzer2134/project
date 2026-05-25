const { dbQuery } = require('../config/database');

// Получить статистику пользователя
async function getStats(req, res) {
    try {
        const { userId } = req.params;

        const user = await dbQuery('SELECT * FROM users WHERE id = ?', [userId]);
        const trainerProgress = await dbQuery('SELECT * FROM trainer_progress WHERE user_id = ?', [userId]);
        const examAttempts = await dbQuery('SELECT * FROM exam_attempts WHERE user_id = ?', [userId]);

        let completedTrainerQuestions = 0;
        trainerProgress.forEach((progress) => {
            const userAnswers = JSON.parse(progress.user_answers || '[]');
            completedTrainerQuestions += userAnswers.filter((a) => a !== null && a !== undefined).length;
        });

        const totalExamAttempts = examAttempts.length;
        const passedExamAttempts = examAttempts.filter((a) => a.is_passed).length;
        const averagePercentage =
            examAttempts.length > 0
                ? examAttempts.reduce((sum, a) => sum + a.percentage, 0) / examAttempts.length
                : 0;

        res.json({
            success: true,
            stats: {
                user: user[0]
                    ? { id: user[0].id, name: user[0].name, email: user[0].email, type: user[0].user_type }
                    : null,
                trainer: {
                    completedQuestions: completedTrainerQuestions,
                    totalQuestions: 0,
                    correctAnswers: 0,
                },
                exams: {
                    totalAttempts: totalExamAttempts,
                    passedAttempts: passedExamAttempts,
                    successRate: totalExamAttempts > 0 ? (passedExamAttempts / totalExamAttempts) * 100 : 0,
                    averagePercentage,
                },
            },
        });
    } catch (error) {
        console.error('❌ Ошибка получения статистики:', error);
        res.status(500).json({ success: false, error: 'Ошибка получения статистики' });
    }
}

module.exports = { getStats };