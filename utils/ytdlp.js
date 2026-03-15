/**
 * utils/ytdlp.js
 * Wrapper around the yt-dlp CLI.
 * All platform support (YouTube, Instagram, TikTok, Facebook, Twitter/X)
 * comes from yt-dlp out of the box.
 */

const { execFile } = require('child_process');
const path         = require('path');
const os           = require('os');
const fs           = require('fs');

/* ── Locate yt-dlp binary ── */
const YTDLP_BIN = process.env.YTDLP_PATH || 'yt-dlp';  // assumes it's on PATH

/* ── Temp download directory ── */
const TMP_DIR = process.env.DOWNLOAD_TMP || path.join(os.tmpdir(), 'snapload');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

/**
 * Run yt-dlp with given args and return stdout as string.
 */
function runYtdlp(args, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    execFile(YTDLP_BIN, args, { timeout: timeoutMs }, (err, stdout, stderr) => {
      if (err) {
        // yt-dlp writes errors to stderr
        const msg = stderr?.trim() || err.message;
        return reject(new Error(msg));
      }
      resolve(stdout.trim());
    });
  });
}

/**
 * Fetch media metadata (title, thumbnail, formats, duration).
 * Returns a structured object ready for the frontend.
 */
async function getInfo(url) {
const args = [
    '--dump-json',
    '--no-playlist',
    '--no-warnings',
    '--geo-bypass',
    '--user-agent', 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36',
    url,
  ];

  const raw  = await runYtdlp(args, 20000);
  const data = JSON.parse(raw);

  /* Build a clean list of available formats */
  const formats = (data.formats || [])
    .filter(f => f.url && (f.vcodec !== 'none' || f.acodec !== 'none'))
    .map(f => ({
      format_id : f.format_id,
      ext       : f.ext,
      quality   : f.format_note || f.quality || '',
      resolution: f.resolution || (f.height ? `${f.height}p` : 'audio'),
      filesize  : f.filesize || f.filesize_approx || null,
      vcodec    : f.vcodec,
      acodec    : f.acodec,
      fps       : f.fps || null,
      isAudio   : f.vcodec === 'none',
      isVideo   : f.vcodec !== 'none',
    }))
    .sort((a, b) => {
      // videos first, then by height descending
      if (a.isAudio && !b.isAudio) return 1;
      if (!a.isAudio && b.isAudio) return -1;
      const ha = parseInt(a.resolution) || 0;
      const hb = parseInt(b.resolution) || 0;
      return hb - ha;
    });

  /* Deduplicate by resolution label so the UI isn't cluttered */
  const seen = new Set();
  const dedupedFormats = formats.filter(f => {
    const key = f.isAudio ? `audio-${f.ext}` : `video-${f.resolution}-${f.ext}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    id          : data.id,
    title       : data.title || 'Untitled',
    thumbnail   : data.thumbnail || null,
    duration    : data.duration || null,    // seconds
    uploader    : data.uploader || data.channel || null,
    view_count  : data.view_count || null,
    webpage_url : data.webpage_url || url,
    platform    : data.extractor_key || detectPlatformName(url),
    formats     : dedupedFormats,
  };
}

/**
 * Download a specific format to a temp file.
 * Returns { filePath, filename, mimeType }
 * 
 * formatId: pass a yt-dlp format string like '137+140' or 'bestvideo+bestaudio'
 * If formatId is 'mp3', we download best audio and convert to mp3 via ffmpeg.
 */
async function downloadMedia(url, formatId = 'bestvideo+bestaudio/best') {
  const { v4: uuidv4 } = require('uuid');
  const id        = uuidv4();
  const outputTpl = path.join(TMP_DIR, `${id}.%(ext)s`);

  let args;

  if (formatId === 'mp3') {
    // Extract audio and convert to MP3
args = [
      '--no-playlist',
      '--no-warnings',
      '--geo-bypass',
      '--user-agent', 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36',
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', '0',
      '-o', outputTpl,
      url,
    ];
  } else {
args = [
      '--no-playlist',
      '--no-warnings',
      '--geo-bypass',
      '--user-agent', 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36',
      '-f', formatId,
      '--merge-output-format', 'mp4',
      '-o', outputTpl,
      url,
    ];
  }

  await runYtdlp(args, 120000);  // 2-minute timeout

  /* Find the output file (extension unknown until after download) */
  const files = fs.readdirSync(TMP_DIR).filter(f => f.startsWith(id));
  if (!files.length) throw new Error('Download produced no output file.');

  const filePath = path.join(TMP_DIR, files[0]);
  const ext      = path.extname(files[0]).slice(1);
  const mimeMap  = { mp4: 'video/mp4', webm: 'video/webm', mp3: 'audio/mpeg', m4a: 'audio/mp4', ogg: 'audio/ogg' };

  return {
    filePath,
    filename : files[0],
    mimeType : mimeMap[ext] || 'application/octet-stream',
    ext,
  };
}

/**
 * Clean up old temp files (older than 1 hour).
 * Call periodically — e.g. setInterval(cleanTmp, 60 * 60 * 1000)
 */
function cleanTmp() {
  const ONE_HOUR = 60 * 60 * 1000;
  try {
    const files = fs.readdirSync(TMP_DIR);
    const now   = Date.now();
    files.forEach(f => {
      const fp   = path.join(TMP_DIR, f);
      const stat = fs.statSync(fp);
      if (now - stat.mtimeMs > ONE_HOUR) {
        fs.unlinkSync(fp);
      }
    });
  } catch (e) {
    console.warn('[cleanTmp]', e.message);
  }
}

/* Run cleanup every hour */
setInterval(cleanTmp, 60 * 60 * 1000);

function detectPlatformName(url) {
  if (/youtube|youtu\.be/.test(url))  return 'YouTube';
  if (/instagram/.test(url))          return 'Instagram';
  if (/tiktok/.test(url))             return 'TikTok';
  if (/facebook|fb\.watch/.test(url)) return 'Facebook';
  if (/twitter|x\.com/.test(url))     return 'Twitter/X';
  return 'Unknown';
}

module.exports = { getInfo, downloadMedia, cleanTmp, TMP_DIR };
