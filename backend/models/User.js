const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  provider: { type: String, default: 'local' }, 
  providerId: { type: String },
  email: { type: String, required: true, unique: true },
  username: { type: String },
  avatar: { type: String },
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Recipe' }],
  dietPreferences: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
