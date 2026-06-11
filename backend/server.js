const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const db = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware configuration
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP request logger
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Routes Configuration
const authRoutes = require('./routes/authRoutes');
const assetRoutes = require('./routes/assetRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const adminRoutes = require('./routes/adminRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const maintenanceRoutes = require('./routes/maintenanceRoutes');
const logRoutes = require('./routes/logRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api', logRoutes);

// Basic Health Check endpoint
app.get('/api/health', async (req, res, next) => {
  try {
    // Ping PostgreSQL connection pool
    const result = await db.query('SELECT NOW()');
    return res.status(200).json({
      status: 'success',
      message: 'Smart Asset Management API is online',
      dbTime: result.rows[0].now
    });
  } catch (error) {
    next(error);
  }
});

// 404 Error handler
app.use((req, res, next) => {
  return res.status(404).json({
    status: 'error',
    message: `Endpoint ${req.method} ${req.originalUrl} not found`
  });
});

// Global Centralized Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error Exception:', err);
  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start Server and verify Database connection
const startServer = async () => {
  try {
    console.log('Verifying PostgreSQL database connection...');
    await db.query('SELECT 1');
    console.log('PostgreSQL connection verified successfully.');

    app.listen(PORT, () => {
      console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
  } catch (error) {
    console.error('Database connection failed. Express server aborted:', error);
    process.exit(1);
  }
};

startServer();
