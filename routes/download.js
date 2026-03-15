/**
 * routes/download.js
 * POST /api/download
 * Body: { url: string, formatId: string }
 * 
 * Downloads the media via yt-dlp and streams it back to the client
 * so the browser triggers a "Save As" dialog.
 */

const express  = require('express');
const router   = express.Router();
const fs       = require('fs');
const path     = require('path');
const { downloadMedia } = require('../utils/ytdlp');
const { validateUrl, detectPlatform } = require('../utils/validate');

router.post('/', async (req, res) => {
  const { url, formatId = 'bestvideo+bestaudio/best', title = 'download' } = req.body;

  /* ── Validation ── */
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing "url" field.' });
  }

  const cleanUrl = url.trim();

  if (!validateUrl(cleanUrl)) {
    return res.status(400).json({ error: 'Invalid URL.' });
  }

  if (!detectPlatform(cleanUrl)) {
    return res.status(400).json({ error: 'Unsupported platform.' });
  }

  /* ── Download via yt-dlp ── */
  let result;
  try {
    result = await downloadMedia(cleanUrl, formatId);
  } catch (err) {
    console.error('[/api/download]', err.message);
    return res.status(422).json({
      error: 'Download failed. ' + friendlyError(err.message),
    });
  }

  const { filePath, mimeType, ext } = result;

  /* Build a safe filename */
  const safeName = sanitizeFilename(title) || 'media';
  const filename = `${safeName}.${ext}`;

  /* ── Stream to browser ── */
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const stat = fs.statSync(filePath);
  res.setHeader('Content-Length', stat.size);

  const stream = fs.createReadStream(filePath);

  stream.on('error', (err) => {
    console.error('[stream error]', err.message);
    if (!res.headersSent) res.status(500).json({ error: 'Stream error.' });
  });

  stream.on('end', () => {
    /* Delete temp file after streaming */
    fs.unlink(filePath, () => {});
  });

  stream.pipe(res);
});

function sanitizeFilename(name) {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 120);
}

function friendlyError(raw) {
  if (/private/i.test(raw))       return 'This media is private or unavailable.';
  if (/copyright/i.test(raw))     return 'Blocked due to copyright restrictions.';
  if (/login|cookies/i.test(raw)) return 'Login required to download this content.';
  if (/timeout/i.test(raw))       return 'Timed out — try again.';
  return 'The URL may be invalid or the content unavailable.';
}

module.exports = router;
