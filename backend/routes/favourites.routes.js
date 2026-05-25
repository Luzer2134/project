const express = require('express');
const router = express.Router();
const { getFavourites, addFavourite, removeFavourite, clearFavourites } = require('../controllers/favourites.controller');

router.delete('/all/:userId', clearFavourites);
router.get('/:userId', getFavourites);
router.post('/', addFavourite);
router.delete('/:userId/:questionId', removeFavourite);

module.exports = router;
