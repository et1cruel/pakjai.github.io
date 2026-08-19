const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const authHandler = require('../api/auth.js');

// Load environment variables
const envPath = path.join(__dirname, '../config/.env');
dotenv.config({ path: envPath });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static(path.join(__dirname, '..')));

// Auth API Route
app.all('/api/auth', (req, res) => authHandler(req, res));
app.all('/api/users', (req, res) => authHandler(req, res));
app.all('/api/data', (req, res) => require('../api/data.js')(req, res));
app.all('/api/upload', (req, res) => require('../api/upload.js')(req, res));

// Redirect root to pakjai
app.get('/', (req, res) => {
  res.redirect('/pakjai/index.html');
});

// Fallback for spa / static routes
app.get('/pakjai', (req, res) => {
  res.sendFile(path.join(__dirname, '../pakjai/index.html'));
});

async function startServer() {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('[Warning] Supabase environment variables are not defined. Auth API will be unavailable.');
    }
    app.listen(PORT, () => {
      console.log(`\n========================================`);
      console.log(`🌲 Pakjai Server running at: http://localhost:${PORT}`);
      console.log(`🌐 Open http://localhost:${PORT}/pakjai/index.html`);
      console.log(`========================================\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();