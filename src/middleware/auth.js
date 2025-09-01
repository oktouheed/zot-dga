const jwt = require('jsonwebtoken');
const { db } = require('../database/init');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const authenticateApiKey = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const apiKey = authHeader && authHeader.split(' ')[1];

  if (!apiKey) {
    return res.status(401).json({ 
      error: 'API key required',
      message: 'Please provide API key in Authorization header: Bearer YOUR_API_KEY' 
    });
  }

  db.get(
    'SELECT id, email, name, is_active FROM users WHERE api_key = ? AND is_active = 1',
    [apiKey],
    (err, user) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid API key' });
      }

      req.user = user;
      
      // Log API usage
      logApiUsage(req, user.id, 200);
      
      next();
    }
  );
};

const logApiUsage = (req, userId, statusCode, responseTime = 0, fileSize = 0) => {
  const endpoint = req.path;
  const method = req.method;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent') || '';

  db.run(
    `INSERT INTO api_usage (user_id, endpoint, method, ip_address, user_agent, 
     response_status, response_time, file_size) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, endpoint, method, ipAddress, userAgent, statusCode, responseTime, fileSize],
    (err) => {
      if (err) {
        console.error('Error logging API usage:', err);
      }
    }
  );
};

const isAdmin = (req, res, next) => {
  // For now, we'll check if user email contains 'admin'
  // In production, you might want a dedicated admin role system
  if (req.user && req.user.email && req.user.email.includes('admin')) {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
};

module.exports = {
  authenticateToken,
  authenticateApiKey,
  logApiUsage,
  isAdmin
};
