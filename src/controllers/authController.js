const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const User = require('../models/User');

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().min(2).max(50).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

class AuthController {
  static async register(req, res) {
    try {
      const { error } = registerSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation error',
          message: error.details[0].message
        });
      }

      const { email, password, name } = req.body;

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          error: 'User already exists',
          message: 'A user with this email already exists'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Generate API key
      const apiKey = uuidv4();

      // Create user
      const userId = await User.create({
        email,
        password: hashedPassword,
        name,
        apiKey
      });

      // Generate JWT token
      const token = jwt.sign(
        { userId, email, name },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: userId,
          email,
          name,
          apiKey
        },
        token
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        error: 'Registration failed',
        message: 'Unable to register user'
      });
    }
  }

  static async login(req, res) {
    try {
      const { error } = loginSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation error',
          message: error.details[0].message
        });
      }

      const { email, password } = req.body;

      // Find user
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect'
        });
      }

      // Check password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect'
        });
      }

      // Check if user is active
      if (!user.is_active) {
        return res.status(401).json({
          error: 'Account deactivated',
          message: 'Your account has been deactivated'
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email, name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          apiKey: user.api_key
        },
        token
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        error: 'Login failed',
        message: 'Unable to authenticate user'
      });
    }
  }

  static async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      // Get usage statistics
      const stats = await User.getUsageStats(user.id);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          apiKey: user.api_key,
          isActive: user.is_active,
          createdAt: user.created_at
        },
        usage: stats
      });

    } catch (error) {
      console.error('Profile error:', error);
      res.status(500).json({
        error: 'Unable to fetch profile'
      });
    }
  }

  static async generateApiKey(req, res) {
    try {
      const newApiKey = uuidv4();
      const updated = await User.updateApiKey(req.user.id, newApiKey);

      if (!updated) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      res.json({
        message: 'API key regenerated successfully',
        apiKey: newApiKey,
        warning: 'Your old API key is now invalid. Please update your applications.'
      });

    } catch (error) {
      console.error('API key generation error:', error);
      res.status(500).json({
        error: 'Unable to generate API key'
      });
    }
  }
}

module.exports = AuthController;
