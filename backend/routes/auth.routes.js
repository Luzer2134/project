const express = require('express');
const router = express.Router();
const { startYandexAuth, yandexLogout } = require('../controllers/auth.controller');

router.get('/yandex', startYandexAuth);
router.get('/yandex/logout', yandexLogout);

module.exports = router;
