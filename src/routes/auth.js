const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const AuthController = require('../controllers/authController');

const router = express.Router();

// Public routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// Protected routes
router.get('/profile', authenticateToken, AuthController.getProfile);
router.post('/generate-key', authenticateToken, AuthController.generateApiKey);

module.exports = router;
