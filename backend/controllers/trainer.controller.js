const { dbQuery, dbRun } = require('../config/database');

// Сохранить прогресс тренажера
async function saveProgress(req, res) {
    try {
        const { userId, block, userAnswers, currentQuestionIndex } = req.body;

        if (!userId || !block) {
            return res.status(400).json({ success: false, error: 'Неверные данные' });
        }

        const existing = await dbQuery(
            'SELECT * FROM trainer_progress WHERE user_id = ? AND block = ?',
            [userId, block]
        );

        if (existing.length > 0) {
            await dbRun(
                `UPDATE trainer_progress SET question_index = ?, user_answers = ?, updated_at = ? WHERE user_id = ? AND block = ?`,
                [currentQuestionIndex || 0, JSON.stringify(userAnswers || []), new Date().toISOString(), userId, block]
            );
        } else {
            await dbRun(
                `INSERT INTO trainer_progress (user_id, block, question_index, user_answers) VALUES (?, ?, ?, ?)`,
                [userId, block, currentQuestionIndex || 0, JSON.stringify(userAnswers || [])]
            );
        }

        console.log(`💾 Сохранен прогресс тренажера: ${userId}, блок ${block}`);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка сохранения прогресса тренажера:', error);
        res.status(500).json({ success: false, error: 'Ошибка сохранения прогресса тренажера' });
    }
}

// Получить прогресс для конкретного блока
async function getProgressByBlock(req, res) {
    try {
        const { userId, block } = req.params;

        const progress = await dbQuery(
            'SELECT * FROM trainer_progress WHERE user_id = ? AND block = ?',
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
            res.json({ success: true, progress: { userAnswers: [], currentQuestionIndex: 0 } });
        }
    } catch (error) {
        console.error('❌ Ошибка получения прогресса тренажера:', error);
        res.status(500).json({ success: false, error: 'Ошибка получения прогресса тренажера' });
    }
}

// Получить весь прогресс пользователя
async function getAllProgress(req, res) {
    try {
        const { userId } = req.params;

        const progress = await dbQuery(
            'SELECT * FROM trainer_progress WHERE user_id = ?',
            [userId]
        );

        const result = {};
        progress.forEach((item) => {
            result[item.block] = {
                userAnswers: JSON.parse(item.user_answers || '[]'),
                currentQuestionIndex: item.question_index,
                updatedAt: item.updated_at,
            };
        });

        res.json({ success: true, progress: result });
    } catch (error) {
        console.error('❌ Ошибка получения прогресса:', error);
        res.status(500).json({ success: false, error: 'Ошибка получения прогресса' });
    }
}

// Удалить прогресс для конкретного блока
async function deleteProgressByBlock(req, res) {
    try {
        const { userId, block } = req.params;
        const decodedBlock = decodeURIComponent(block);

        console.log(`🗑️ Удаление прогресса: user=${userId}, block=${decodedBlock}`);

        const result = await dbRun(
            'DELETE FROM trainer_progress WHERE user_id = ? AND block = ?',
            [userId, decodedBlock]
        );

        if (result.changes > 0) {
            console.log(`✅ Удален прогресс для блока: ${decodedBlock}`);
        } else {
            console.log(`⚠️ Прогресс не найден для блока: ${decodedBlock}`);
        }

        res.json({ success: true, deleted: result.changes });
    } catch (error) {
        console.error('❌ Ошибка удаления прогресса:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// Удалить весь прогресс пользователя
async function deleteAllProgress(req, res) {
    try {
        const { userId } = req.params;

        console.log(`🗑️ Удаление ВСЕГО прогресса для user=${userId}`);

        const result = await dbRun('DELETE FROM trainer_progress WHERE user_id = ?', [userId]);

        console.log(`✅ Удалено ${result.changes} записей прогресса`);
        res.json({ success: true, deletedCount: result.changes });
    } catch (error) {
        console.error('❌ Ошибка удаления всего прогресса:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

module.exports = { saveProgress, getProgressByBlock, getAllProgress, deleteProgressByBlock, deleteAllProgress };