
const User = require('../models/User');
const Recipe = require('../models/Recipe');

/**
 * POST /api/user/favorite
 * body: { recipeId }
 * toggles add (if not present) or remove (if present). Returns { added: boolean, favoritesCount }
 */
async function toggleFavorite(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { recipeId } = req.body;
    if (!recipeId) return res.status(400).json({ error: 'recipeId required' });

    // ensure recipe exists
    const recipe = await Recipe.findById(recipeId).select('_id title');
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const idx = (user.favorites || []).findIndex(id => id.toString() === recipeId.toString());
    let added = false;
    if (idx === -1) {
      // add
      user.favorites.push(recipe._id);
      added = true;
    } else {
      // remove
      user.favorites.splice(idx, 1);
      added = false;
    }

    await user.save();

    return res.json({
      added,
      favoritesCount: user.favorites.length,
      favorites: user.favorites
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/user/favorites
 * returns populated list: [{ _id, title, thumb, prepTimeMin }]
 */
async function getFavorites(req, res, next) {
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
}

module.exports = { toggleFavorite, getFavorites };
