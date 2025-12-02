// backend/routes/upload.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Choose memory vs disk with env flag. Default: memory (recommended for OCR).
const useDisk = !!process.env.UPLOAD_USE_DISK;
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Disk storage
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '') || '.jpg';
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  }
});

// Memory storage
const memoryStorage = multer.memoryStorage();
const storage = useDisk ? diskStorage : memoryStorage;

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed'), false);
    }
    cb(null, true);
  }
});

const { uploadImage } = require('../controllers/uploadController');

// Route with debug logging to help find multipart issues
router.post('/image', upload.single('image'), async (req, res, next) => {
  try {
    console.log('--- POST /api/upload/image ---');
    console.log('content-type header:', req.headers['content-type']);
    console.log('req.file present?:', !!req.file);
    if (req.file) {
      console.log('req.file summary:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        hasBuffer: !!req.file.buffer,
        path: req.file.path || null,
      });
    } else {
      console.log('No req.file — multer didn\'t parse a file.');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    return uploadImage(req, res, next);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
