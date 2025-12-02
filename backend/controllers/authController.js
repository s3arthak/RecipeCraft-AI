const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET || 'replace-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';


async function loginGoogle(req, res, next) {
  try {
    const { idToken } = req.body || {};
    if (!idToken) return res.status(400).json({ error: 'idToken required' });
    const ticket = await client.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload(); //user info
    const email = payload.email;
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        provider: 'google',
        providerId: payload.sub,
        email,
        username: payload.name || email.split('@')[0],
        avatar: payload.picture || ''
      });
    }
    const token = jwt.sign({ sub: user._id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.json({ token, user: { id: user._id, email: user.email, username: user.username, avatar: user.avatar } });
  } catch (err) {
    next(err);
  }
}

// curent user profile

async function me(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    const user = await User.findById(req.user.id).populate('favorites').lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

module.exports = { loginGoogle, me };
