const { dbQuery, dbRun } = require('../config/database');

// Сохранить прогресс симуляции
async function saveProgress(req, res) {
    try {
        const { userId, block, userAnswers, currentQuestionIndex } = req.body;

        if (!userId || !block) {
            return res.status(400).json({ success: false, error: 'Неверные данные' });
        }

        const existing = await dbQuery(
            'SELECT * FROM simulation_progress WHERE user_id = ? AND block = ?',
            [userId, block]
        );

        if (existing.length > 0) {
            await dbRun(
                `UPDATE simulation_progress SET question_index = ?, user_answers = ?, updated_at = ? WHERE user_id = ? AND block = ?`,
                [currentQuestionIndex || 0, JSON.stringify(userAnswers || []), new Date().toISOString(), userId, block]
            );
        } else {
            await dbRun(
                `INSERT INTO simulation_progress (user_id, block, question_index, user_answers) VALUES (?, ?, ?, ?)`,
                [userId, block, currentQuestionIndex || 0, JSON.stringify(userAnswers || [])]
            );
        }

        console.log(`💾 Сохранен прогресс симуляции: ${userId}, блок ${block}`);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка сохранения прогресса симуляции:', error);
        res.status(500).json({ success: false, error: 'Ошибка сохранения прогресса симуляции' });
    }
}

// Получить прогресс симуляции
async function getProgress(req, res) {
    try {
        const { userId, block } = req.params;

        const progress = await dbQuery(
            'SELECT * FROM simulation_progress WHERE user_id = ? AND block = ?',
            [userId, block]
        );

        if (progress.length > 0) {
            const data = progress[0];
            res.json({
                success: true,
                progress: {
                    userAnswers: JSON.parse(data.user_answers || '[]'),
                    currentQuestionIndex: data.question_index,
                },
            });
        } else {
            res.json({ success: true, progress: null });
        }
    } catch (error) {
        console.error('❌ Ошибка получения прогресса симуляции:', error);
        res.status(500).json({ success: false, error: 'Ошибка получения прогресса симуляции' });
    }
}

// Удалить прогресс симуляции
async function deleteProgress(req, res) {
    try {
        const { userId, block } = req.params;

        const result = await dbRun(
            'DELETE FROM simulation_progress WHERE user_id = ? AND block = ?',
            [userId, block]
        );

        if (result.changes > 0) {
            console.log(`🗑️ Удален прогресс симуляции: ${userId}, блок ${block}`);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка удаления прогресса симуляции:', error);
        res.status(500).json({ success: false, error: 'Ошибка удаления прогресса симуляции' });
    }
}

module.exports = { saveProgress, getProgress, deleteProgress };