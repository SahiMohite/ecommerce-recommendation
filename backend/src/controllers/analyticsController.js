const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Interaction = require('../models/Interaction');

exports.getDashboardMetrics = async (req, res) => {
  try {
    // Total revenue
    const revenueData = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueData[0]?.total || 0;

    // Total orders
    const totalOrders = await Order.countDocuments();

    // Total users
    const totalUsers = await User.countDocuments();

    // Total products
    const totalProducts = await Product.countDocuments();

    // Most popular products
    const popularProducts = await Product.find()
      .sort('-purchases')
      .limit(10)
      .select('name purchases price category');

    // Top categories
    const categoryData = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalSales: { $sum: '$purchases' }
        }
      },
      { $sort: { totalSales: -1 } }
    ]);

    // Recent orders
    const recentOrders = await Order.find()
      .populate('user', 'name email')
      .populate('items.product', 'name')
      .sort('-createdAt')
      .limit(10);

    // User engagement metrics
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const interactions = await Interaction.aggregate([
      { $match: { timestamp: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    // Sales over time (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const salesOverTime = await Order.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          sales: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      metrics: {
        totalRevenue,
        totalOrders,
        totalUsers,
        totalProducts,
        popularProducts,
        categoryData,
        recentOrders,
        userEngagement: interactions,
        salesOverTime
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};