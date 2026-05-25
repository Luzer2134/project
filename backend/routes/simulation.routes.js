const express = require('express');
const router = express.Router();
const { saveProgress, getProgress, deleteProgress } = require('../controllers/simulation.controller');

router.post('/', saveProgress);
router.get('/:userId/:block', getProgress);
router.delete('/:userId/:block', deleteProgress);

module.exports = router;
