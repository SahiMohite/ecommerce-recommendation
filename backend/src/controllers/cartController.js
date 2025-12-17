const { getCache, setCache, deleteCache } = require('../utils/redis');
const Product = require('../models/Product');
const Interaction = require('../models/Interaction');

exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const userId = req.user._id.toString();

    // Verify product exists and has stock
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ message: 'Insufficient stock' });
    }

    // Get cart from cache
    const cacheKey = `cart:${userId}`;
    let cart = await getCache(cacheKey) || { items: [] };

    // Check if product already in cart
    const existingItem = cart.items.find(item => item.productId === productId);
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({ productId, quantity });
    }

    // Save to cache
    await setCache(cacheKey, cart, 86400); // 24 hours

    // Track interaction
    await Interaction.create({
      user: userId,
      product: productId,
      type: 'cart'
    });

    res.json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getCart = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const cacheKey = `cart:${userId}`;
    
    let cart = await getCache(cacheKey) || { items: [] };

    // Populate product details
    const productIds = cart.items.map(item => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });

    const cartWithDetails = {
      items: cart.items.map(item => {
        const product = products.find(p => p._id.toString() === item.productId);
        return {
          product,
          quantity: item.quantity,
          subtotal: product ? product.price * item.quantity : 0
        };
      }).filter(item => item.product), // Remove items where product not found
      total: 0
    };

    cartWithDetails.total = cartWithDetails.items.reduce((sum, item) => sum + item.subtotal, 0);

    res.json({ success: true, cart: cartWithDetails });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user._id.toString();
    const cacheKey = `cart:${userId}`;

    let cart = await getCache(cacheKey) || { items: [] };

    const item = cart.items.find(item => item.productId === productId);
    if (item) {
      item.quantity = quantity;
      await setCache(cacheKey, cart, 86400);
    }

    res.json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user._id.toString();
    const cacheKey = `cart:${userId}`;

    let cart = await getCache(cacheKey) || { items: [] };
    cart.items = cart.items.filter(item => item.productId !== productId);

    await setCache(cacheKey, cart, 86400);

    res.json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};