// backend/models/Recipe.js
'use strict';

const mongoose = require('mongoose');

const recipeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  cuisine: String,
  difficulty: String,

  ingredients: [String],
  steps: [String],

  // local uploaded image or remote URL
  thumb: { type: String, default: null },

  prepTimeMin: Number,
  cookTimeMin: Number,
  servings: Number,

  nutrition: {
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number
  },

  video: { type: String, default: null },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Recipe', recipeSchema);
