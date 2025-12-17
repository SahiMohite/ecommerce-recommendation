import React, { useState, useEffect } from 'react';
import { analyticsService } from '../services/api';
import Loading from '../components/Loading';

const AdminDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const response = await analyticsService.getDashboardMetrics();
      setMetrics(response.data.metrics);
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Revenue</p>
                <p className="text-3xl font-bold text-green-600">
                  ${metrics?.totalRevenue?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div className="text-4xl">💰</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Orders</p>
                <p className="text-3xl font-bold text-blue-600">
                  {metrics?.totalOrders || 0}
                </p>
              </div>
              <div className="text-4xl">📦</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Users</p>
                <p className="text-3xl font-bold text-purple-600">
                  {metrics?.totalUsers || 0}
                </p>
              </div>
              <div className="text-4xl">👥</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Products</p>
                <p className="text-3xl font-bold text-orange-600">
                  {metrics?.totalProducts || 0}
                </p>
              </div>
              <div className="text-4xl">🛍️</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Popular Products */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Top Products</h2>
            <div className="space-y-3">
              {metrics?.popularProducts?.slice(0, 5).map((product, index) => (
                <div key={product._id} className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-400">#{index + 1}</span>
                    <div>
                      <p className="font-semibold">{product.name}</p>
                      <p className="text-sm text-gray-600">{product.purchases} sales</p>
                    </div>
                  </div>
                  <span className="font-bold text-blue-600">${product.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Category Performance</h2>
            <div className="space-y-3">
              {metrics?.categoryData?.slice(0, 5).map((category) => (
                <div key={category._id} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <p className="font-semibold capitalize">{category._id}</p>
                    <p className="text-sm text-gray-600">{category.count} products</p>
                  </div>
                  <span className="font-bold text-purple-600">{category.totalSales} sales</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Recent Orders</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Order ID</th>
                  <th className="text-left py-2">Customer</th>
                  <th className="text-left py-2">Amount</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {metrics?.recentOrders?.map((order) => (
                  <tr key={order._id} className="border-b">
                    <td className="py-3">#{order._id.slice(-8)}</td>
                    <td className="py-3">{order.user?.name || 'N/A'}</td>
                    <td className="py-3 font-semibold">${order.totalAmount.toFixed(2)}</td>
                    <td className="py-3">
                      <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3">{new Date(order.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
