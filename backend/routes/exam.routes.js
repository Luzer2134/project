const express = require('express');
const router = express.Router();
const { saveAttempt, getAttempts, deleteAttempt } = require('../controllers/exam.controller');

router.post('/', saveAttempt);
router.get('/:userId', getAttempts);
router.delete('/:userId/:attemptId', deleteAttempt);

module.exports = router;
