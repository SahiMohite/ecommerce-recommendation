const express = require('express');
const { getDashboardMetrics } = require('../controllers/analyticsController');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, admin, getDashboardMetrics);

module.exports = router;