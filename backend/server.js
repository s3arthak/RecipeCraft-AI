require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');

const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const recipesRoutes = require('./routes/recipes');
const uploadRoutes = require('./routes/upload');
const debugRoutes = require('./routes/debug-models');
const usersRoutes = require('./routes/users');
const mealPlansRoutes = require("./routes/mealplans");

const app = express();

const PORT = Number(process.env.PORT || 4000);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

const helmetOptions = {
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
};

app.use(helmet(helmetOptions));


if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

const uploadsDir = path.join(__dirname, 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Created uploads directory at', uploadsDir);
  }
} catch (err) {
  console.warn('Could not ensure uploads directory exists:', err && err.stack ? err.stack : err);
}

app.use('/uploads', function (req, res, next) {
 
  const origin = FRONTEND_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Vary', 'Origin');
  next();
});

app.use('/uploads', express.static(uploadsDir, {
  maxAge: process.env.NODE_ENV === 'production' ? '30d' : 0
}));


app.use(cors({
  origin: FRONTEND_ORIGIN,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','Accept'],
  credentials: true
}));


app.use((req, res, next) => {
  const type = (req.headers['content-type'] || '').toLowerCase();
  if (type.startsWith('multipart/form-data')) {
    return next();
  }
  express.json({ limit: '3mb' })(req, res, next);
});

app.use((req, res, next) => {
  const type = (req.headers['content-type'] || '').toLowerCase();
  if (type.startsWith('multipart/form-data')) return next();
  express.urlencoded({ extended: true, limit: '6mb' })(req, res, next);
});


if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    try {
      const bodyPreview = req.body ? JSON.stringify(req.body).slice(0, 2000) : '<no-body>';
      console.log(`>> ${req.method} ${req.originalUrl} - body:`, bodyPreview);
    } catch (e) {
     
    }
    next();
  });
}

app.use('/api/auth', authRoutes);
app.use('/api/recipes', recipesRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/user', usersRoutes);
app.use("/api/mealplans", mealPlansRoutes);

// app.get('/health', (req, res) => res.json({ ok: true, env: process.env.NODE_ENV || 'development' }));

app.use((err, req, res, next) => {
  console.error('==== SERVER ERROR ====');
  if (err && err.stack) console.error(err.stack);
  else console.error(err);

  const payload = { error: err && err.message ? err.message : 'Internal Server Error' };
  if (process.env.NODE_ENV !== 'production') payload.stack = err && err.stack ? err.stack : null;
  res.status(err && err.status ? err.status : 500).json(payload);
});

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log('✅ MongoDB connected (or connectDB resolved)');
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to start server: DB connect failed.');
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  });

module.exports = app;     