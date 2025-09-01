const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const fileRoutes = require('./routes/files');
const folderRoutes = require('./routes/folders');
const processRoutes = require('./routes/process');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const { authenticateApiKey } = require('./middleware/auth');

// Import database
const { initializeDatabase } = require('./database/init');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
const initApp = async () => {
  try {
    await initializeDatabase();
    console.log('🗄️  Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
};

// Only initialize database if not already done
if (process.env.NODE_ENV !== 'test') {
  initApp();
}

// Create uploads directory if it doesn't exist
const uploadsDir = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create data directory if it doesn't exist
const dataDir = './data';
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Security middleware
app.use(helmet());
app.use(cors());

// Logging
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (uploaded files)
app.use('/uploads', express.static(uploadsDir));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', authenticateApiKey, uploadRoutes);
app.use('/api/files', authenticateApiKey, fileRoutes);
app.use('/api/folders', authenticateApiKey, folderRoutes);
app.use('/api/process', authenticateApiKey, processRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to ZOT-DGA Image Library API',
    version: '1.0.0',
    documentation: '/api/docs',
    health: '/health'
  });
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    name: 'ZOT-DGA Image Library API',
    version: '1.0.0',
    description: 'A powerful image and video library API similar to Cloudinary',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Register new user',
        'POST /api/auth/login': 'Login user',
        'GET /api/auth/profile': 'Get user profile',
        'POST /api/auth/generate-key': 'Generate new API key'
      },
      upload: {
        'POST /api/upload/image': 'Upload single image',
        'POST /api/upload/video': 'Upload single video',
        'POST /api/upload/multiple': 'Upload multiple files'
      },
      files: {
        'GET /api/files': 'List all files',
        'GET /api/files/:id': 'Get file details',
        'DELETE /api/files/:id': 'Delete file',
        'PUT /api/files/:id': 'Update file metadata'
      },
      folders: {
        'POST /api/folders': 'Create folder',
        'GET /api/folders': 'List folders',
        'GET /api/folders/:id/files': 'Get files in folder',
        'DELETE /api/folders/:id': 'Delete folder'
      },
      process: {
        'GET /api/process/resize/:id': 'Resize image',
        'GET /api/process/convert/:id': 'Convert image format',
        'GET /api/process/thumbnail/:id': 'Generate thumbnail'
      }
    },
    authentication: 'API Key required in Authorization header: Bearer YOUR_API_KEY'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 ZOT-DGA API Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📖 Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
