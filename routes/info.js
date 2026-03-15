/**
 * routes/info.js
 * POST /api/info
 * Body: { url: string }
 * Returns metadata + available formats for the given media URL.
 */

const express = require('express');
const router  = express.Router();
const { getInfo } = require('../utils/ytdlp');
const { validateUrl, detectPlatform } = require('../utils/validate');

router.post('/', async (req, res) => {
  const { url } = req.body;

  /* ── Input validation ── */
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid "url" field.' });
  }

  const cleanUrl = url.trim();

  if (!validateUrl(cleanUrl)) {
    return res.status(400).json({ error: 'Invalid URL. Please enter a valid http/https link.' });
  }

  const platform = detectPlatform(cleanUrl);
  if (!platform) {
    return res.status(400).json({
      error: 'Unsupported platform. Supported: YouTube, Instagram, Facebook, TikTok, Twitter/X.',
    });
  }

  /* ── Fetch info via yt-dlp ── */
  try {
    const info = await getInfo(cleanUrl);
    return res.json({ success: true, platform, ...info });
  } catch (err) {
    console.error('[/api/info]', err.message);

    /* Parse common yt-dlp error messages into user-friendly text */
    const msg = friendlyError(err.message);
    return res.status(422).json({ error: msg });
  }
});

function friendlyError(raw) {
  if (/private/i.test(raw))       return 'This media is private or unavailable.';
  if (/not found|404/i.test(raw)) return 'Media not found. Check the URL and try again.';
  if (/login|cookies/i.test(raw)) return 'This platform requires login to access this content.';
  if (/copyright/i.test(raw))     return 'This media is blocked due to copyright restrictions.';
  if (/geo.?block/i.test(raw))    return 'This media is geo-restricted in your region.';
  if (/rate.?limit/i.test(raw))   return 'Platform is rate-limiting requests. Try again in a minute.';
  if (/timeout/i.test(raw))       return 'Request timed out. The platform may be slow — try again.';
  return 'Could not fetch media info. The URL may be invalid or the content unavailable.';
}

module.exports = router;
