// backend/models/MealPlan.js
const mongoose = require('mongoose');

const mealPlanSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  entries: [
    {
      day: { type: String, default: 'Unassigned' },
      recipe: { type: mongoose.Schema.Types.ObjectId, ref: "Recipe", default: null },
      notes: { type: String, default: '' }
    }
  ]
}, {
  timestamps: true // adds createdAt & updatedAt
});

// optional index for faster lookups by user + createdAt
mealPlanSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("MealPlan", mealPlanSchema);
