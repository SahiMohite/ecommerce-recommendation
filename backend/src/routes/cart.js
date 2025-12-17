const express = require('express');
const { addToCart, getCart, updateCart, removeFromCart } = require('../controllers/cartController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/add', protect, addToCart);
router.get('/', protect, getCart);
router.put('/update', protect, updateCart);
router.delete('/remove/:productId', protect, removeFromCart);

module.exports = router;