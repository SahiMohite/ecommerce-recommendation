import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productService, recommendationService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ProductCard';
import Loading from '../components/Loading';

const HomePage = () => {
  const { user, isAuthenticated } = useAuth();
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [isAuthenticated, user]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load featured products
      const featuredResponse = await productService.getProducts({ 
        limit: 8,
        sort: '-purchases'
      });
      setFeaturedProducts(featuredResponse.data.products);

      // Load personalized recommendations if authenticated
      if (isAuthenticated && user?._id) {
        try {
          const recsResponse = await recommendationService.getUserRecommendations(user._id);
          setRecommendations(recsResponse.data.recommendations);
        } catch (error) {
          console.error('Error loading recommendations:', error);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-4">
              Welcome to ShopAI
            </h1>
            <p className="text-xl mb-8">
              Experience personalized shopping with AI-powered recommendations
            </p>
            <Link
              to="/products"
              className="bg-white text-blue-600 px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors inline-block"
            >
              Shop Now
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="text-center">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold mb-2">AI Recommendations</h3>
            <p className="text-gray-600">
              Get personalized product suggestions based on your preferences
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold mb-2">Fast Delivery</h3>
            <p className="text-gray-600">
              Quick and reliable shipping to your doorstep
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-semibold mb-2">Secure Shopping</h3>
            <p className="text-gray-600">
              Your data is protected with enterprise-grade security
            </p>
          </div>
        </div>

        {/* Personalized Recommendations */}
        {isAuthenticated && recommendations.length > 0 && (
          <div className="mb-16">
            <h2 className="text-3xl font-bold mb-6">Recommended for You</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recommendations.slice(0, 4).map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          </div>
        )}

        {/* Featured Products */}
        <div>
          <h2 className="text-3xl font-bold mb-6">Popular Products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold mb-6">Shop by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {['electronics', 'clothing', 'books', 'home', 'sports'].map((category) => (
              <Link
                key={category}
                to={`/products?category=${category}`}
                className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow text-center"
              >
                <div className="text-4xl mb-2">
                  {category === 'electronics' && '💻'}
                  {category === 'clothing' && '👕'}
                  {category === 'books' && '📚'}
                  {category === 'home' && '🏠'}
                  {category === 'sports' && '⚽'}
                </div>
                <h3 className="font-semibold capitalize">{category}</h3>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;