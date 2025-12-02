

const path = require('path');
const fs = require('fs');
const streamifier = require('streamifier');
const cloudinary = require('cloudinary').v2;

const Upload = require('../models/Upload');
const Recipe = require('../models/Recipe');

let generateRecipe = null;
try {
  const llm = require('../utils/llm');
  if (llm && typeof llm.generateRecipe === 'function') generateRecipe = llm.generateRecipe;
} catch (e) {
  console.warn('LLM util not available; generateRecipe will fallback if implemented in utils/llm.');
}

/**
 * Cloudinary configuration
 * - Supports CLOUDINARY_URL (single string) OR separate env vars.
 */

if (process.env.CLOUDINARY_URL) {
  cloudinary.config({ cloudinary_url: process.env.CLOUDINARY_URL });
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

const CLOUD_FOLDER = process.env.CLOUDINARY_UPLOAD_FOLDER || 'recipe_uploads';

/**
 * Helper: best-effort parse JSON-like strings
 */
function tryParseMaybeJson(s) {
  if (s === null || typeof s === 'undefined') return null;
  if (typeof s !== 'string') return s;
  const t = s.trim();
  if (!(t.startsWith('{') || t.startsWith('['))) return s;
  try {
    return JSON.parse(t);
  } catch (e1) {
    try {
      const replaced = t
        .replace(/[\u2018\u2019\u201C\u201D]/g, '"')
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/([{,]\s*)([A-Za-z0-9_\$\-]+)\s*:/g, '$1"$2":');
      return JSON.parse(replaced);
    } catch (e2) {
      return s;
    }
  }
}

/**
 * Normalize simple parsed LLM output to our recipe shape (minimal)
 */

function normalizeParsedRecipe(parsed = {}, filename, url, userId) {
  const p = parsed || {};
  return {
    title: String(p.title || p.recipeName || `Recipe from ${filename}`),
    cuisine: p.cuisine || 'International',
    difficulty: p.difficulty || 'easy',
    ingredients: Array.isArray(p.ingredients)
      ? p.ingredients.map(i => (typeof i === 'string' ? i : JSON.stringify(i)))
      : (typeof p.ingredients === 'string' ? p.ingredients.split(/\r?\n/).filter(Boolean) : []),
    steps: Array.isArray(p.steps)
      ? p.steps.map(s => (typeof s === 'string' ? s : JSON.stringify(s)))
      : (typeof p.steps === 'string' ? p.steps.split(/\r?\n/).filter(Boolean) : []),
    thumb: p.thumb || url,
    prepTimeMin: Number(p.prepTimeMin || p.prep_time_min || 10) || 10,
    cookTimeMin: Number(p.cookTimeMin || p.cook_time_min || 20) || 20,
    servings: Number(p.servings || 2) || 2,
    nutrition: p.nutrition || { calories: null, protein: null, carbs: null, fat: null },
    video: p.video || p.videoUrl || null,
    createdBy: userId || null
  };
}

/**
 * Upload buffer to Cloudinary via upload_stream. Returns result object.
 */

function uploadBufferToCloudinary(buffer, publicIdHint = null) {
  return new Promise((resolve, reject) => {
    const opts = {
      folder: CLOUD_FOLDER,
      resource_type: 'image',
      quality: 'auto',
      fetch_format: 'auto'
    };
    if (publicIdHint) opts.public_id = String(publicIdHint).slice(0, 200);

    const uploadStream = cloudinary.uploader.upload_stream(opts, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });

    // stream the buffer
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

/**
 * Main controller: POST /api/upload/image
**/

async function uploadImage(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const originalName = req.file.originalname || 'upload.jpg';
    const ext = path.extname(originalName) || '.jpg';
    const filenameHint = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // prepare buffer: either multer memory buffer or read file path
    let buffer = null;
    if (req.file.buffer && Buffer.isBuffer(req.file.buffer)) {
      buffer = req.file.buffer;
    } else if (req.file.path && fs.existsSync(req.file.path)) {
      buffer = fs.readFileSync(req.file.path);
    } else {
      return res.status(500).json({ error: 'Uploaded file not available on server' });
    }

    // Upload to Cloudinary
    let cloudRes;
    try {
      cloudRes = await uploadBufferToCloudinary(buffer, filenameHint);
    } catch (cloudErr) {
      console.error('Cloudinary upload failed:', cloudErr && cloudErr.message ? cloudErr.message : cloudErr);
      return res.status(500).json({ error: 'Image upload to cloud storage failed' });
    }

    // canonical https url
    const fullUrl = cloudRes.secure_url || cloudRes.url || null;
    const publicId = cloudRes.public_id || null;

    // Save Upload doc (store absolute URL and cloud path)
    const uploadDoc = await Upload.create({
      filename: publicId || filenameHint,
      originalName,
      path: publicId ? `cloudinary://${publicId}` : (cloudRes.url || ''),
      url: fullUrl,
      mimeType: req.file.mimetype || 'image/*',
      size: req.file.size || (buffer ? buffer.length : null),
      createdBy: req.user ? req.user.id : null
    });

    // Build LLM prompt (strict JSON output)
    const promptParts = [];
    promptParts.push('You are a helpful recipe assistant.');
    promptParts.push('Generate a single recipe in strict JSON (no extra commentary).');
    promptParts.push('Return a JSON object with keys: title (string), cuisine (string), difficulty (string), ingredients (array of strings), steps (array of strings), prepTimeMin (number), cookTimeMin (number), servings (number), nutrition (object with calories, protein, carbs, fat), video (string URL or null).');
    promptParts.push(`Use the image at: ${fullUrl} as the primary source of inspiration. If the image is not fetchable, infer a reasonable dish from the filename: ${originalName}.`);
    promptParts.push('Keep the response concise and return only valid JSON.');
    
    const prompt = promptParts.join('\n\n');

    // Call LLM if available (generateRecipe should fallback if no API)
    let parsed = {};
    if (generateRecipe) {
      try {
        const llmResp = await generateRecipe({ prompt, imageUrl: fullUrl });
        let llmText = null;
        if (typeof llmResp === 'string') llmText = llmResp;
        else if (llmResp && typeof llmResp === 'object') {
          // prefer .text, then .output, then .raw
          llmText = llmResp.text || llmResp.output || llmResp.raw || JSON.stringify(llmResp);
        }

        if (llmText) {
          const cleaned = String(llmText).replace(/^\s*```(?:json)?\s*|\s*```$/g, '').trim();
          try {
            const maybe = tryParseMaybeJson(cleaned);
            if (maybe && typeof maybe === 'object') parsed = maybe;
            else {
              const m = cleaned.match(/\{[\s\S]*\}/);
              if (m) {
                const p2 = tryParseMaybeJson(m[0]);
                if (p2 && typeof p2 === 'object') parsed = p2;
              }
            }
          } catch (e) {
            parsed = {};
            console.warn('LLM parse error:', e && e.message ? e.message : e);
          }
        }
      } catch (llmErr) {
        console.warn('LLM generateRecipe failed (continuing):', llmErr && llmErr.message ? llmErr.message : llmErr);
        parsed = {};
      }
    } else {
      // minimal fallback if LLM is unavailable
      parsed = {
        title: `Recipe from ${originalName}`,
        ingredients: ['1 tbsp oil', 'Salt & pepper'],
        steps: ['Heat oil', 'Mix and serve'],
        prepTimeMin: 10,
        cookTimeMin: 10,
        servings: 2,
        nutrition: { calories: null, protein: null, carbs: null, fat: null }
      };
    }

    // Normalize and create recipe doc
    const recipeData = normalizeParsedRecipe(parsed || {}, originalName, fullUrl, req.user ? req.user.id : null);

    let recipeDoc = null;
    try {
      recipeDoc = await Recipe.create(recipeData);
      uploadDoc.recipe = recipeDoc._id;
      await uploadDoc.save();
    } catch (createErr) {
      console.warn('Recipe creation failed (continuing):', createErr && createErr.message ? createErr.message : createErr);
    }

    return res.status(201).json({
      upload: uploadDoc,
      recipe: recipeDoc || null,
      message: recipeDoc ? 'Upload and recipe created' : 'Upload saved; recipe not generated'
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { uploadImage };
