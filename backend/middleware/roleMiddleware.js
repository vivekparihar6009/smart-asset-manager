const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized: Authentication required.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access Denied: Insufficient authorization rights for this operation.'
      });
    }

    next();
  };
};

const requireAdmin = requireRole('admin');

module.exports = {
  requireRole,
  requireAdmin
};
