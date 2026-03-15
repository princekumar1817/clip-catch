/**
 * SnapLoad — Media Downloader Server
 * Stack: Node.js + Express + yt-dlp
 * 
 * Prerequisites:
 *   - Node.js >= 18
 *   - yt-dlp:  pip install yt-dlp  (or: brew install yt-dlp)
 *   - ffmpeg:  brew install ffmpeg  (or: apt install ffmpeg)
 * 
 * Run: npm install && npm start
 */

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const path       = require('path');

const downloadRoutes = require('./routes/download');
const infoRoutes     = require('./routes/info');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── Security ── */
app.use(helmet({
  contentSecurityPolicy: false,   // allow inline scripts in the frontend
}));
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
}));

/* ── Rate limiting ── */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 30,                      // max 30 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again in 15 minutes.' },
});
app.use('/api/', limiter);

/* ── General middleware ── */
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

/* ── Static frontend ── */
app.use(express.static(path.join(__dirname, 'public')));

/* ── API routes ── */
app.use('/api/info',     infoRoutes);
app.use('/api/download', downloadRoutes);

/* ── Health check ── */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/* ── Catch-all → serve index.html (SPA) ── */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* ── Global error handler ── */
app.use((err, req, res, next) => {
  console.error('[error]', err.message);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`\n✅  SnapLoad running → http://localhost:${PORT}`);
  console.log(`📦  Make sure yt-dlp is installed: pip install yt-dlp`);
  console.log(`🎬  Make sure ffmpeg is installed: brew/apt install ffmpeg\n`);
});

module.exports = app;
