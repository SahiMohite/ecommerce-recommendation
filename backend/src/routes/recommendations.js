const express = require('express');
const {
  getUserRecommendations,
  getSimilarProducts,
  getFrequentlyBoughtTogether
} = require('../controllers/recommendationController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/user/:userId', protect, getUserRecommendations);
router.get('/product/:productId', getSimilarProducts);
router.get('/frequently-bought/:productId', getFrequentlyBoughtTogether);

module.exports = router;