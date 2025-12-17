const axios = require('axios');
const Product = require('../models/Product');
const { getCache, setCache } = require('../utils/redis');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://ml-service:8000';

exports.getUserRecommendations = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Check if requesting user matches or is admin
    if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check cache
    const cacheKey = `recommendations:user:${userId}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Call ML service
    const response = await axios.get(`${ML_SERVICE_URL}/recommendations/user/${userId}`);
    const productIds = response.data.recommendations;

    // Fetch product details
    const products = await Product.find({ _id: { $in: productIds } });

    // Sort by recommendation order
    const sortedProducts = productIds.map(id =>
      products.find(p => p._id.toString() === id)
    ).filter(Boolean);

    const result = { success: true, recommendations: sortedProducts };

    // Cache for 1 hour
    await setCache(cacheKey, result, 3600);

    res.json(result);
  } catch (error) {
    console.error('Recommendation error:', error.message);
    // Fallback to popular products
    const products = await Product.find()
      .sort('-purchases -ratings.average')
      .limit(10);
    res.json({ success: true, recommendations: products, fallback: true });
  }
};

exports.getSimilarProducts = async (req, res) => {
  try {
    const productId = req.params.productId;

    const cacheKey = `recommendations:product:${productId}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Call ML service
    const response = await axios.get(`${ML_SERVICE_URL}/recommendations/product/${productId}`);
    const productIds = response.data.similar_products;

    const products = await Product.find({ _id: { $in: productIds } });

    const result = { success: true, similarProducts: products };
    await setCache(cacheKey, result, 3600);

    res.json(result);
  } catch (error) {
    console.error('Similar products error:', error.message);
    // Fallback: same category
    const product = await Product.findById(req.params.productId);
    if (product) {
      const similar = await Product.find({
        category: product.category,
        _id: { $ne: product._id }
      }).limit(6);
      return res.json({ success: true, similarProducts: similar, fallback: true });
    }
    res.json({ success: true, similarProducts: [] });
  }
};

exports.getFrequentlyBoughtTogether = async (req, res) => {
  try {
    const productId = req.params.productId;
    
    // This would use order history to find products frequently bought together
    // For now, return similar products
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const products = await Product.find({
      category: product.category,
      _id: { $ne: productId }
    })
      .sort('-purchases')
      .limit(4);

    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
