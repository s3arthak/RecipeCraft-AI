
// handles two things:
// Generate a recipe using AI (LLM) → save to MongoDB
// Fetch a single recipe by ID

const Recipe = require('../models/Recipe');
const { generateRecipe } = require('../utils/llm');

function unsplashForTitle(title) {
  if (!title) return 'https://source.unsplash.com/featured/?food';
  const keyword = encodeURIComponent(String(title).split(/\s+/).slice(0,3).join(' '));
  return `https://source.unsplash.com/featured/?${keyword}`;
}

async function generateRecipeController(req, res, next) {
  try {
    const { dish, options } = req.body || {};
    const prompt = dish ? `Create a healthy recipe (JSON) for: ${dish}. Return structured JSON with fields: title, ingredients (array), steps (array), prepTimeMin, cookTimeMin, servings, nutrition (calories, protein, carbs, fat).` : 'Create a simple healthy recipe (JSON).';

    const gen = await generateRecipe(prompt);
    let text;
    if (typeof gen === 'string') text = gen;
    else text = gen.text || (typeof gen === 'object' ? JSON.stringify(gen) : String(gen));


    let parsed = null;
    try {
       const cleaned = String(text).replace(/^\s*```(?:json)?\s*|\s*```$/g, '').trim();
       parsed = JSON.parse(cleaned);
    } catch (e) {
      try {
        const m = String(text).match(/\{[\s\S]*\}/);
        if (m) parsed = JSON.parse(m[0]);
      } catch (e2) {
        parsed = null;
      }
    }

    let recipeData = {
      title: parsed?.title || (dish ? `Healthy ${dish}` : 'Healthy Recipe'),
      cuisine: parsed?.cuisine || 'International',
      difficulty: parsed?.difficulty || 'easy',
      ingredients: Array.isArray(parsed?.ingredients) ? parsed.ingredients.map(String) : (parsed?.ingredients ? [String(parsed.ingredients)] : []),
      steps: Array.isArray(parsed?.steps) ? parsed.steps.map(String) : (parsed?.steps ? [String(parsed.steps)] : []),
      prepTimeMin: parsed?.prepTimeMin || parsed?.prep_time_min || 10,
      cookTimeMin: parsed?.cookTimeMin || parsed?.cook_time_min || 10,
      servings: parsed?.servings || 2,
      nutrition: parsed?.nutrition || {},
      createdBy: req.user ? req.user.id : null
    };

    if (parsed?.thumb && /^https?:\/\//i.test(String(parsed.thumb).trim())) {
       recipeData.thumb = String(parsed.thumb).trim();
    } else {
       recipeData.thumb = unsplashForTitle(recipeData.title);
    }

    const recipeDoc = await Recipe.create(recipeData);

    return res.status(201).json(recipeDoc);
  } catch (err) {
    next(err);
  }
}

async function getRecipe(req, res, next) {
  try {
    const id = req.params.id;
    const recipe = await Recipe.findById(id);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    return res.json(recipe);
  } catch (err) {
    next(err);
  }
}

module.exports = { generateRecipeController, getRecipe };
