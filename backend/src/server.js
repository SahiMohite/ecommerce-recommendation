'use strict';

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const recommendationRoutes = require('./routes/recommendations');
const analyticsRoutes = require('./routes/analytics');

const { initRedis, closeRedis } = require('./utils/redis');
const errorHandler = require('./middleware/errorHandler');

const app = express();

/* =========================
   Trust Proxy (Render)
========================= */
app.set('trust proxy', 1);

/* =========================
   Security Middleware
========================= */
app.use(helmet());
app.use(compression());

/* =========================
   CORS (IMPORTANT)
========================= */
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://ecommerce-recommendation-nu.vercel.app'
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS not allowed'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

/* =========================
   Rate Limiting
========================= */
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false
  })
);

/* =========================
   Body Parsers
========================= */
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));

/* =========================
   Logging
========================= */
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

/* =========================
   Health Check
========================= */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

/* =========================
   Routes
========================= */
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/analytics', analyticsRoutes);

/* =========================
   404 Handler
========================= */
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

/* =========================
   Error Handler
========================= */
app.use(errorHandler);

/* =========================
   Database + Server Start
========================= */
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      autoIndex: false
    });

    console.log('✅ MongoDB connected');

    await initRedis();
    console.log('✅ Redis connected');

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

    /* =========================
       Graceful Shutdown
    ========================= */
    const shutdown = async () => {
      console.log('🛑 Shutting down gracefully...');
      server.close(async () => {
        await mongoose.connection.close(false);
        await closeRedis();
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (err) {
    console.error('❌ Server startup failed:', err);
    process.exit(1);
  }
}

startServer();
