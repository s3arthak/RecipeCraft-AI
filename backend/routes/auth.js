const express = require('express');
const router = express.Router();
const { loginGoogle, me } = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/login-google', loginGoogle);
router.get('/me', authMiddleware, me);

module.exports = router;
