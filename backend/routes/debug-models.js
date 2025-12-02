const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/models', async (req, res, next) => {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return res.status(400).json({ error: 'GEMINI_API_KEY not set' });
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
    const r = await axios.get(url);
    res.json(r.data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
