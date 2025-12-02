// backend/models/Upload.js
'use strict';

const mongoose = require('mongoose');

const uploadSchema = new mongoose.Schema({
  filename: String,
  originalName: String,
  path: String,

  // full absolute URL returned to frontend
  url: String,

  mimeType: String,
  size: Number,

  recipe: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Upload', uploadSchema);
