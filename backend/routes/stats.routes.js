const express = require('express');
const router = express.Router();
const { getStats } = require('../controllers/stats.controller');

router.get('/:userId', getStats);

module.exports = router;
