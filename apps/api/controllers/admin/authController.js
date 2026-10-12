const User = require('../../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

/**
 * Admin Login with Email
 */
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 [Admin Login] Attempt:', email);

    if (!email || !password) {
      return res.status(400).json({ 
        status: false, 
        message: 'Email and password required' 
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('❌ [Admin Login] User not found:', email);
      return res.status(401).json({ 
        status: false, 
        message: 'Invalid email or password' 
      });
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      console.log('❌ [Admin Login] User is not admin:', email, 'Role:', user.role);
      return res.status(403).json({ 
        status: false, 
        message: 'Access denied. Admin privileges required.' 
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('❌ [Admin Login] Invalid password for:', email);
      return res.status(401).json({ 
        status: false, 
        message: 'Invalid email or password' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        _id: user._id, 
        email: user.email,
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ [Admin Login] Success:', email);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: false,
      secure: true,
      sameSite: 'Lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      domain: '.banjaramatch.com'
    });

    return res.status(200).json({
      status: true,
      message: 'Login successful',
      token,
      data: {
        _id: user._id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });

  } catch (err) {
    console.error('❌ [Admin Login] Error:', err.message);
    return res.status(500).json({ 
      status: false, 
      message: 'Server error' 
    });
  }
};

/**
 * Get Admin User Info
 */
exports.getAdminMe = async (req, res) => {
  try {
    console.log('🔍 [Admin GetMe] Fetching admin user info');

    // Token already verified by adminAuth middleware
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      console.log('❌ [Admin GetMe] No token provided');
      return res.status(401).json({ 
        status: false, 
        message: 'No token provided' 
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ [Admin GetMe] JWT decoded:', decoded);

    const user = await User.findById(decoded._id).select('-password');
    
    if (!user) {
      console.log('❌ [Admin GetMe] User not found');
      return res.status(404).json({ 
        status: false, 
        message: 'User not found' 
      });
    }

    if (user.role !== 'admin') {
      console.log('❌ [Admin GetMe] User is not admin');
      return res.status(403).json({ 
        status: false, 
        message: 'Access denied. Admin privileges required.' 
      });
    }

    console.log('✅ [Admin GetMe] Success:', user.email, 'Role:', user.role);

    return res.status(200).json({
      status: true,
      data: user
    });

  } catch (err) {
    console.error('❌ [Admin GetMe] Error:', err.message);
    return res.status(401).json({ 
      status: false, 
      message: 'Invalid token' 
    });
  }
};

/**
 * Admin Logout
 */
exports.adminLogout = (req, res) => {
  console.log('🚪 [Admin Logout] Logging out');
  
  res.clearCookie('token', {
    domain: '.banjaramatch.com'
  });
  
  return res.status(200).json({ 
    status: true, 
    message: 'Logged out successfully' 
  });
};
