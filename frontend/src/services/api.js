import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth service
export const authService = {
  register: (name, email, password) => 
    api.post('/auth/register', { name, email, password }),
  login: (email, password) => 
    api.post('/auth/login', { email, password }),
  getProfile: () => 
    api.get('/auth/profile')
};

// Product service
export const productService = {
  getProducts: (params) => 
    api.get('/products', { params }),
  getProduct: (id) => 
    api.get(`/products/${id}`),
  searchProducts: (query) => 
    api.get('/products/search', { params: { q: query } }),
  createProduct: (data) => 
    api.post('/products', data),
  updateProduct: (id, data) => 
    api.put(`/products/${id}`, data),
  deleteProduct: (id) => 
    api.delete(`/products/${id}`)
};

// Cart service
export const cartService = {
  getCart: () => 
    api.get('/cart'),
  addToCart: (productId, quantity) => 
    api.post('/cart/add', { productId, quantity }),
  updateCart: (productId, quantity) => 
    api.put('/cart/update', { productId, quantity }),
  removeFromCart: (productId) => 
    api.delete(`/cart/remove/${productId}`)
};

// Order service
export const orderService = {
  createOrder: (data) => 
    api.post('/orders', data),
  getOrders: (params) => 
    api.get('/orders', { params }),
  getOrder: (id) => 
    api.get(`/orders/${id}`)
};

// Recommendation service
export const recommendationService = {
  getUserRecommendations: (userId) => 
    api.get(`/recommendations/user/${userId}`),
  getSimilarProducts: (productId) => 
    api.get(`/recommendations/product/${productId}`),
  getFrequentlyBought: (productId) => 
    api.get(`/recommendations/frequently-bought/${productId}`)
};

// Analytics service
export const analyticsService = {
  getDashboardMetrics: () => 
    api.get('/analytics')
};

export default api;
