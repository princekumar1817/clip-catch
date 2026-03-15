/**
 * utils/validate.js
 * URL validation and platform detection.
 */

const SUPPORTED_PLATFORMS = {
  youtube: {
    name: 'YouTube',
    icon: '▶️',
    color: '#ff0000',
    patterns: [
      /^https?:\/\/(www\.)?youtube\.com\/watch\?.*v=/,
      /^https?:\/\/youtu\.be\//,
      /^https?:\/\/(www\.)?youtube\.com\/shorts\//,
      /^https?:\/\/(www\.)?youtube\.com\/@.+\/videos/,
    ],
  },
  instagram: {
    name: 'Instagram',
    icon: '📸',
    color: '#e1306c',
    patterns: [
      /^https?:\/\/(www\.)?instagram\.com\/reel\//,
      /^https?:\/\/(www\.)?instagram\.com\/p\//,
      /^https?:\/\/(www\.)?instagram\.com\/tv\//,
    ],
  },
  tiktok: {
    name: 'TikTok',
    icon: '🎵',
    color: '#010101',
    patterns: [
      /^https?:\/\/(www\.)?tiktok\.com\/@.+\/video\//,
      /^https?:\/\/vm\.tiktok\.com\//,
      /^https?:\/\/vt\.tiktok\.com\//,
    ],
  },
  facebook: {
    name: 'Facebook',
    icon: '📘',
    color: '#1877f2',
    patterns: [
      /^https?:\/\/(www\.)?facebook\.com\/.*\/videos\//,
      /^https?:\/\/(www\.)?facebook\.com\/watch/,
      /^https?:\/\/(www\.)?facebook\.com\/reel\//,
      /^https?:\/\/fb\.watch\//,
    ],
  },
  twitter: {
    name: 'Twitter / X',
    icon: '🐦',
    color: '#1da1f2',
    patterns: [
      /^https?:\/\/(www\.)?(twitter|x)\.com\/.+\/status\//,
    ],
  },
};

/**
 * Basic URL sanity check.
 */
function validateUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Returns platform metadata object or null if unsupported.
 */
function detectPlatform(url) {
  for (const [key, data] of Object.entries(SUPPORTED_PLATFORMS)) {
    if (data.patterns.some(p => p.test(url))) {
      return { key, ...data };
    }
  }
  return null;
}

module.exports = { validateUrl, detectPlatform, SUPPORTED_PLATFORMS };
