// imageUrl(path, fallback) — resolves the relative paths the API stores
// ("uploads/profile_images/x.jpg") against the public API origin from
// <body data-api-public-url>, leaves absolute http(s)/data: URLs alone, and
// returns the inline SVG placeholder for empty values. Never a third-party
// placeholder host.

export const AVATAR_FALLBACK = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="50" height="50"%3E%3Crect width="50" height="50" fill="%23e5e2dc"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="20" fill="%2378716c"%3E?%3C/text%3E%3C/svg%3E';

export const IMAGE_FALLBACK = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect width="200" height="200" fill="%23f3f4f6"/%3E%3Cpath d="M60 130l35-45 30 38 20-24 25 31H60z" fill="%23cfc9bf"/%3E%3Ccircle cx="70" cy="70" r="12" fill="%23cfc9bf"/%3E%3C/svg%3E';

function apiOrigin() {
  const v = document.body && document.body.dataset ? document.body.dataset.apiPublicUrl : '';
  return (v || '').replace(/\/+$/, '');
}

export function imageUrl(p, fallback = AVATAR_FALLBACK) {
  if (!p || typeof p !== 'string') return fallback;
  const s = p.trim();
  if (!s) return fallback;
  if (/^(https?:)?\/\//i.test(s) || /^data:image\//i.test(s)) return s;
  if (/^(javascript|vbscript|file):/i.test(s)) return fallback;
  const origin = apiOrigin();
  const path = s.startsWith('/') ? s : `/${s}`;
  return origin ? `${origin}${path}` : path;
}

/** Attach to an <img> after insertion so a broken URL falls back without inline handlers. */
export function bindImageFallbacks(root = document, fallback = AVATAR_FALLBACK) {
  root.querySelectorAll('img[data-fallback]').forEach((img) => {
    if (img.dataset.fallbackBound) return;
    img.dataset.fallbackBound = '1';
    img.addEventListener('error', () => {
      if (img.src !== (img.dataset.fallback || fallback)) img.src = img.dataset.fallback || fallback;
    }, { once: true });
  });
}
