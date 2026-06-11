const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  // Extract token from header: "Bearer <token>"
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'Access Denied: No credentials or token provided.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_key_change_me_in_production_987654321');
    req.user = decoded; // Attach user info ({ id, email, role }) to request
    next();
  } catch (error) {
    return res.status(403).json({
      status: 'error',
      message: 'Access Denied: Invalid or expired authentication token.'
    });
  }
};

module.exports = {
  verifyToken
};
