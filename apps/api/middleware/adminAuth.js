// Admin Authentication Middleware
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

/**
 * Verify that the user is authenticated and has admin role
 */
const adminAuth = async (req, res, next) => {
  try {
    // Get token from cookie or Authorization header
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
    
    console.log('🔐 [adminAuth] Path:', req.path);
    console.log('🔐 [adminAuth] Cookies:', req.cookies);
    console.log('🔐 [adminAuth] Token:', token ? 'Present' : 'Missing');

    if (!token) {
      console.log('❌ [adminAuth] No token provided');
      return res.status(401).json({ 
        status: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Find user and check if they exist
    const user = await User.findById(decoded._id).select('_id email role full_name');
    
    if (!user) {
      return res.status(401).json({ 
        status: false, 
        message: 'Access denied. User not found.' 
      });
    }

    // Check if user has admin role
    if (user.role !== 'admin') {
      return res.status(403).json({ 
        status: false, 
        message: 'Access denied. Admin privileges required.' 
      });
    }

    // Attach user to request
    req.user = user;
    req.userId = user._id;
    
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        status: false, 
        message: 'Invalid token.' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        status: false, 
        message: 'Token expired.' 
      });
    }
    
    return res.status(500).json({ 
      status: false, 
      message: 'Server error during authentication.' 
    });
  }
};

module.exports = { adminAuth };
