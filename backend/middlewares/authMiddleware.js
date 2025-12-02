const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'replace-me';

async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header) return next(); 
    const parts = header.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return next();
    const token = parts[1];
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload || !payload.sub) return next();
    // fetch user or attach minimal info
    const user = await User.findById(payload.sub).lean();
    if (user) req.user = { id: user._id, email: user.email, username: user.username };
    next();
  } catch (err) {
    console.warn('authMiddleware error:', err && err.message ? err.message : err);
    // do not fail hard — allow route to handle auth if required
    next();
  }
}

module.exports = authMiddleware;
