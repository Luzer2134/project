const express = require('express');
const router = express.Router();
const { guestLogin, getUserById } = require('../controllers/user.controller');

router.post('/guest', guestLogin);
router.get('/user/:userId', getUserById);

module.exports = router;
