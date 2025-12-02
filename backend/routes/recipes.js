// backend/routes/recipes.js
'use strict';

const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/authMiddleware'); // keeps your existing protect
const { generateRecipeController, getRecipe } = require('../controllers/recipeController');
const Recipe = require('../models/Recipe');

// POST /api/recipes/generate  (requires auth in your original file)
router.post('/generate', authMiddleware, generateRecipeController);

// GET /api/recipes  -> return list (for Dashboard)
router.get('/', async (req, res, next) => {
  try {
    // basic pagination
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, parseInt(req.query.limit || '12', 10));
    const skip = (page - 1) * limit;

    // basic filter example (optional)
    const filter = {};
    if (req.query.q) {
      const q = req.query.q.trim();
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { cuisine: { $regex: q, $options: 'i' } }
      ];
    }

    const [items, total] = await Promise.all([
      Recipe.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Recipe.countDocuments(filter)
    ]);

    return res.json({
      ok: true,
      page,
      limit,
      total,
      recipes: items
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/recipes/:id
router.get('/:id', getRecipe);

module.exports = router;
