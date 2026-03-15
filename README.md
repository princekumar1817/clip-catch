# SnapLoad — Free Media Downloader

A self-hosted media downloader supporting YouTube, Instagram, TikTok, Facebook,
and Twitter/X. Built with Node.js + Express + yt-dlp.

---

## Quick Start

### 1. Install prerequisites

**Node.js** (≥ 18):
```
https://nodejs.org
```

**yt-dlp** (the core download engine):
```bash
pip install yt-dlp

# or on macOS:
brew install yt-dlp

# or on Linux:
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

**ffmpeg** (for merging video+audio and MP3 conversion):
```bash
# macOS
brew install ffmpeg

# Ubuntu / Debian
sudo apt install ffmpeg

# Windows
https://ffmpeg.org/download.html  (add to PATH)
```

---

### 2. Install & run

```bash
git clone <your-repo>
cd snapload
npm install
npm start
```

Open → http://localhost:3000

---

### 3. Development (auto-restart)

```bash
npm run dev
```

---

## Project Structure

```
snapload/
├── server.js            # Express server entry point
├── package.json
├── .env.example         # Environment variables template
├── routes/
│   ├── info.js          # POST /api/info    — fetch metadata
│   └── download.js      # POST /api/download — stream file
├── utils/
│   ├── ytdlp.js         # yt-dlp wrapper (getInfo, downloadMedia)
│   └── validate.js      # URL validation + platform detection
└── public/
    └── index.html       # Full frontend (single file)
```

---

## API Reference

### `POST /api/info`

Fetch metadata and available formats for a URL.

**Request:**
```json
{ "url": "https://youtube.com/watch?v=..." }
```

**Response:**
```json
{
  "success": true,
  "platform": "YouTube",
  "title": "Video title",
  "thumbnail": "https://...",
  "duration": 243,
  "uploader": "Channel name",
  "view_count": 1500000,
  "formats": [
    {
      "format_id": "137",
      "ext": "mp4",
      "resolution": "1080p",
      "isVideo": true,
      "isAudio": false,
      "filesize": 120345678
    }
  ]
}
```

---

### `POST /api/download`

Download and stream a media file.

**Request:**
```json
{
  "url": "https://youtube.com/watch?v=...",
  "formatId": "bestvideo[height<=1080]+bestaudio/best",
  "title": "My Video"
}
```

Special `formatId` values:
- `"mp3"` — extract audio, convert to MP3 via ffmpeg
- `"bestvideo+bestaudio/best"` — best available quality
- `"bestvideo[height<=1080]+bestaudio/best[height<=1080]"` — max 1080p
- Any yt-dlp format string

**Response:** Binary file stream with `Content-Disposition: attachment`

---

## Free Hosting Options

### Railway (easiest)
1. Push to GitHub
2. Connect repo at railway.app
3. Add env vars in dashboard
4. Deploy — Railway detects Node.js automatically

**Note:** Install yt-dlp in Railway via a `Procfile` or `nixpacks.toml`:
```toml
# nixpacks.toml
[phases.setup]
nixPkgs = ["yt-dlp", "ffmpeg"]
```

### Render
Same as Railway. Add a `render.yaml`:
```yaml
services:
  - type: web
    name: snapload
    env: node
    buildCommand: npm install && pip install yt-dlp
    startCommand: npm start
```

### Fly.io
```bash
fly launch
fly deploy
```

### VPS (DigitalOcean, Hetzner, Vultr, etc.)
```bash
apt install nodejs npm python3-pip ffmpeg
pip install yt-dlp
npm install -g pm2
pm2 start server.js --name snapload
pm2 startup
```

---

## Keep yt-dlp Updated

Platforms change their APIs frequently. Update yt-dlp regularly:

```bash
pip install -U yt-dlp
# or
yt-dlp -U
```

---

## Rate Limiting

The server applies rate limiting by default:
- **30 requests** per IP per **15 minutes** on `/api/*`
- Adjust in `server.js` → `rateLimit({ windowMs, max })`

---

## Legal Notice

- For personal, non-commercial use only
- Respect copyright and platform Terms of Service
- Do not download content you don't have rights to
- YouTube's ToS prohibits downloading without explicit permission

---

## License

MIT — free to use, modify, and self-host.
