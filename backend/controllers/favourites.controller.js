const { dbQuery, dbRun } = require('../config/database');

// Получить избранное пользователя
async function getFavourites(req, res) {
    try {
        const { userId } = req.params;

        const favourites = await dbQuery(
            'SELECT * FROM favourites WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );

        const formatted = favourites.map((fav) => ({
            id: fav.question_id,
            block: fav.block,
            question: fav.question,
            options: JSON.parse(fav.options || '[]'),
            correctAnswers: JSON.parse(fav.correct_answers || '[]'),
            comment: fav.comment,
            image: fav.image,
            timestamp: new Date(fav.created_at).getTime(),
        }));

        res.json({ success: true, favourites: formatted });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

// Добавить в избранное
async function addFavourite(req, res) {
    try {
        const { userId, questionId, block, question, options, correctAnswers, comment, image } = req.body;

        await dbRun(
            `INSERT OR REPLACE INTO favourites 
            (user_id, question_id, block, question, options, correct_answers, comment, image) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                questionId,
                block,
                question,
                JSON.stringify(options),
                JSON.stringify(correctAnswers),
                comment || '',
                image || '',
            ]
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

// Удалить из избранного
async function removeFavourite(req, res) {
    try {
        const { userId, questionId } = req.params;
        await dbRun('DELETE FROM favourites WHERE user_id = ? AND question_id = ?', [userId, questionId]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

// Очистить всё избранное
async function clearFavourites(req, res) {
    try {
        const { userId } = req.params;

        const before = await dbQuery('SELECT COUNT(*) as count FROM favourites WHERE user_id = ?', [userId]);
        console.log(`📊 До очистки: ${before[0].count} записей`);

        const result = await dbRun('DELETE FROM favourites WHERE user_id = ?', [userId]);

        console.log(`🗑️ Удалено записей: ${result.changes}`);
        res.json({ success: true, deletedCount: result.changes, message: `Удалено ${result.changes} записей` });
    } catch (error) {
        console.error('❌ Ошибка очистки избранного:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

module.exports = { getFavourites, addFavourite, removeFavourite, clearFavourites };