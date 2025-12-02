// backend/routes/users.js
'use strict';

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware'); // must set req.user.id
const User = require('../models/User');
const Recipe = require('../models/Recipe');

/**
 * GET /api/user/favorites
 * Protected: returns populated favorite recipes for the logged-in user
 */
router.get('/favorites', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const user = await User.findById(userId).populate({
      path: 'favorites',
      select: 'title thumb prepTimeMin cuisine difficulty'
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    return res.json({ favorites: user.favorites || [] });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/user/favorite
 * Body: { recipeId }
 * Toggles favorite add/remove and returns { added: boolean, favoritesCount }
 */
router.post('/favorite', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { recipeId } = req.body;
    if (!recipeId) return res.status(400).json({ error: 'recipeId required' });

    const recipe = await Recipe.findById(recipeId).select('_id title');
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const idx = (user.favorites || []).findIndex(id => id.toString() === recipeId.toString());
    let added = false;
    if (idx === -1) {
      user.favorites.push(recipe._id);
      added = true;
    } else {
      user.favorites.splice(idx, 1);
      added = false;
    }

    await user.save();
    return res.json({ added, favoritesCount: user.favorites.length });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/user/preferences
 * Body: { dietPreferences: [ "Vegan", "Low-Carb", ... ] }
 * Protected: updates user's dietPreferences and returns updated user
 */
router.patch('/preferences', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { dietPreferences } = req.body;
    if (!Array.isArray(dietPreferences)) {
      return res.status(400).json({ error: 'dietPreferences must be an array' });
    }

    const updated = await User.findByIdAndUpdate(
      userId,
      { dietPreferences },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) return res.status(404).json({ error: 'User not found' });

    return res.json({ user: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
