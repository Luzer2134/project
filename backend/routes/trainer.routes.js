const express = require('express');
const router = express.Router();
const { saveProgress, getProgressByBlock, getAllProgress, deleteProgressByBlock, deleteAllProgress } = require('../controllers/trainer.controller');

router.delete('/all/:userId', deleteAllProgress);
router.post('/', saveProgress);
router.get('/:userId/:block', getProgressByBlock);
router.get('/:userId', getAllProgress);
router.delete('/:userId/:block', deleteProgressByBlock);

module.exports = router;
