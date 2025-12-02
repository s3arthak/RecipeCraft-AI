require('dotenv').config();

const API_KEY = process.env.GEMMA_API_KEY || process.env.GEMINI_API_KEY;
const MODEL_ENV = (process.env.GEMMA_MODEL || process.env.GEMINI_MODEL || '').trim();
const DEFAULT_MODELS = [
  'models/gemini-2.5-flash',
  'models/gemini-2.5-pro',
  'models/gemini-2.0-flash',
  'models/gemini-flash-latest'
];


function localFallbackGenerate(prompt, imageUrl) {
  const title = 'Simple Healthy Recipe (fallback)';
  const recipe = {
    title,
    cuisine: 'International',
    difficulty: 'easy',
    ingredients: ['1 tbsp olive oil', '2 cloves garlic, minced', '2 cups mixed vegetables', 'Salt and pepper to taste'],
    steps: ['Heat oil, saute garlic.', 'Add vegetables and cook until tender.', 'Season and serve.'],
    prepTimeMin: 10,
    cookTimeMin: 15,
    servings: 2,
    nutrition: { calories: 400, protein: 10, carbs: 40, fat: 20 }
  };
  return { text: JSON.stringify(recipe, null, 2), raw: null, usedModel: 'local-fallback', multimodalUsed: false };
}

async function getGenerativeClient() {
  if (!API_KEY) throw new Error('GEMMA_API_KEY / GEMINI_API_KEY not set');
  try {
    const mod = await import('@google/generative-ai');
    const { GoogleGenerativeAI } = mod;
    return new GoogleGenerativeAI(API_KEY);
  } catch (err) {
    throw new Error(`SDK import failed: ${err?.message || err}`);
  }
}

function buildContents(prompt, imageUrl) {
  const contents = [];
  if (imageUrl) {
    contents.push({ parts: [{ image: { uri: imageUrl } }] });
  }
  if (prompt && prompt.length) {
    contents.push({ parts: [{ text: prompt }] });
  }
  return contents;
}

function extractTextFromResult(raw) {
  if (!raw) return '';
  try {
    const resp = raw.response ?? raw;
    if (!resp) return JSON.stringify(raw).slice(0, 2000);

    if (typeof resp.text === 'function') return resp; // wrapper that offers .text()

    if (raw?.candidates && Array.isArray(raw.candidates)) {
      let out = '';
      for (const c of raw.candidates) {
        if (c?.content && Array.isArray(c.content)) {
          for (const part of c.content) {
            if (Array.isArray(part.parts)) {
              for (const p of part.parts) {
                if (p?.text) out += p.text + '\n';
              }
            } else if (part?.text) out += part.text + '\n';
          }
        } else if (typeof c?.output === 'string') {
          out += c.output + '\n';
        }
      }
      if (out) return out.trim();
    }


    return JSON.stringify(raw).slice(0, 2000);
  } catch (e) {
    return String(raw).slice(0, 2000);
  }
}

async function tryModels(client, modelsToTry, payload) {
  const attempts = [];
  for (const m of modelsToTry) {
    try {
      console.log('➡ Calling model:', m);
      const model = client.getGenerativeModel({ model: m });
      let raw;
      try {
        raw = await model.generateContent(payload);
      } catch (innerErr) {
        // If payload is string, try again with string
        if (typeof payload === 'string') raw = await model.generateContent(payload);
        else throw innerErr;
      }
      return { model: m, raw };
    } catch (err) {
      console.warn(`Model attempt failed: ${m} — ${err?.message || err}`);
      attempts.push({ model: m, error: err?.response?.data || err?.message || String(err) });
      continue;
    }
  }
  const err = new Error('No available model succeeded. See attempts in error.attempts');
  err.attempts = attempts;
  throw err;
}


async function generateRecipe(input) {
  let prompt = '';
  let imageUrl = undefined;
  if (typeof input === 'string') prompt = input;
  else if (input && typeof input === 'object') {
    prompt = (input.prompt || '').toString();
    imageUrl = input.imageUrl || undefined;
  } else {
    throw new Error('generateRecipe: invalid input. Pass string or { prompt, imageUrl }');
  }


  if (!API_KEY) {
    console.warn('GEMMA_API_KEY/GEMINI_API_KEY not set — using local fallback generateRecipe');
    return localFallbackGenerate(prompt, imageUrl);
  }

  let client;
  try {
    client = await getGenerativeClient();
  } catch (err) {
    console.warn('Generative SDK not available:', err.message || err);
    return localFallbackGenerate(prompt, imageUrl);
  }

  const primary = MODEL_ENV || 'gemma-2-vision';
  const modelsToTry = [primary, ...DEFAULT_MODELS.filter(m => m !== primary)];

  // First attempt: multimodal if imageUrl present
  const contents = buildContents(prompt, imageUrl);
  const payload = contents.length ? { contents } : prompt;

  try {
    const { model: usedModel, raw } = await tryModels(client, modelsToTry, payload);
    let extracted = extractTextFromResult(raw);
    if (extracted && typeof extracted === 'object' && typeof extracted.text === 'function') {
      try { extracted = await extracted.text(); } catch (e) { extracted = JSON.stringify(raw).slice(0, 2000); }
    }
    const text = typeof extracted === 'string' ? extracted : String(extracted || '');
    console.log('⬅ LLM response (trim):', text.slice(0, 1200));
    return { text, raw, usedModel, multimodalUsed: !!imageUrl };
  } catch (firstErr) {
    console.warn('Generative SDK multimodal failed:', firstErr.attempts || firstErr.message || firstErr);

    // Retry prompt-only
    try {
      console.log('➡ Retrying LLM calls without image (prompt-only)...');
      const { model: usedModel, raw } = await tryModels(client, modelsToTry, prompt);
      let extracted = extractTextFromResult(raw);
      if (extracted && typeof extracted === 'object' && typeof extracted.text === 'function') {
        try { extracted = await extracted.text(); } catch (e) { extracted = JSON.stringify(raw).slice(0, 2000); }
      }
      const text = typeof extracted === 'string' ? extracted : String(extracted || '');
      console.log('⬅ LLM response (prompt-only trim):', text.slice(0, 1200));
      return { text, raw, usedModel, multimodalUsed: false };
    } catch (secondErr) {
      console.error('LLM prompt-only retry also failed:', secondErr.attempts || secondErr.message || secondErr);
      // final fallback
      return localFallbackGenerate(prompt, imageUrl);
    }
  }
}


async function generateNutritionFromIngredients(ingredients) {
  // Build ingredients text
  const list = Array.isArray(ingredients) ? ingredients.join('\n') : String(ingredients || '');
  const nutritionPrompt = `
You are a helpful nutrition assistant.

Based ONLY on these ingredients (no other text), estimate the *total* nutrition for the whole recipe.
Return ONLY valid JSON in this exact shape (numbers, no nulls):

{
  "calories": <number>,
  "protein": <number>,   // grams
  "carbs": <number>,     // grams
  "fat": <number>        // grams
}

Ingredients:
${list}

Important: do not include any extra text. If uncertain, give a reasonable estimate.
`;

  try {
    const resp = await generateRecipe({ prompt: nutritionPrompt, imageUrl: undefined });
    let text = resp?.text || '';
    text = text.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
    // Try to parse
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object') {
        return {
          calories: Number(parsed.calories) || 0,
          protein: Number(parsed.protein) || 0,
          carbs: Number(parsed.carbs) || 0,
          fat: Number(parsed.fat) || 0
        };
      }
    } catch (e) {
      // try to extract first {...}
      const m = text.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          const p2 = JSON.parse(m[0]);
          if (p2 && typeof p2 === 'object') {
            return {
              calories: Number(p2.calories) || 0,
              protein: Number(p2.protein) || 0,
              carbs: Number(p2.carbs) || 0,
              fat: Number(p2.fat) || 0
            };
          }
        } catch (e2) {}
      }
    }
    // fallback: null
    return null;
  } catch (err) {
    console.warn('generateNutritionFromIngredients failed:', err?.message || err);
    return null;
  }
}

// Export as CommonJS
module.exports = {
  generateRecipe,
  generateNutritionFromIngredients
};
