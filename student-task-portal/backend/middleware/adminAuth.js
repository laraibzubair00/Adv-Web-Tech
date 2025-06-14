const adminAuth = (req, res, next) => {
  try {
    console.log('Admin auth check:', {
      user: req.user,
      role: req.user?.role
    });

    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (req.user.role !== 'admin') {
      console.log('Access denied - not an admin:', req.user);
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    console.log('Admin access granted:', req.user);
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({ message: 'Error checking admin privileges' });
  }
};

module.exports = adminAuth; 