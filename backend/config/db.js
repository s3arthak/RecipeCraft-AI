const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || '';

function connectDB(opts = {}) {
  const maxAttempts = opts.maxAttempts || 5;
  const retryDelay = opts.retryDelay || 2000;
  if (!MONGO_URI) return Promise.reject(new Error('MONGO_URI not set'));

  let attempt = 0;
  return new Promise((resolve, reject) => {
    function tryConnect() {
      attempt++;
      console.log(`Connecting to MongoDB (attempt ${attempt}/${maxAttempts})...`);
      mongoose.connect(MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      }).then(() => {
        console.log('✅ MongoDB connected');
        resolve();
      }).catch(err => {
        console.warn('MongoDB connect attempt failed:', err.message || err);
        if (attempt >= maxAttempts) reject(err);
        else setTimeout(tryConnect, retryDelay);
      });
    }
    tryConnect();
  });
}

module.exports = connectDB;
