// Browser → same-origin /api proxy (routes/proxy.js) → API.
// No token ever touches JS: the admin_session cookie rides along
// (credentials: same-origin) and the proxy swaps it for a Bearer header.
//
//   const data = await api('/admin/users', { query: { page: 2 } });
//   await api('/admin/users/ID/block', { method: 'POST', body: { block: true, reason } });
//
// Success = res.ok && data.status !== false && data.success !== false (the API
// uses both conventions). Anything else throws ApiError{status, message, data}.
// A 401 means the session is gone: navigate to /login and keep the current URL.

export class ApiError extends Error {
  constructor(message, { status = 0, data = null, code = '' } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.code = code;
  }
}

const DEFAULT_TIMEOUT = 20000;

function toPath(path) {
  if (typeof path !== 'string' || !path.startsWith('/')) throw new ApiError(`Bad API path: ${path}`);
  return path.startsWith('/api/') ? path : `/api${path}`;
}

function withQuery(url, query) {
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${url}${url.includes('?') ? '&' : '?'}${qs}` : url;
}

function parseBody(text) {
  if (!text) return {};
  try { return JSON.parse(text); } catch (e) { return { raw: text }; }
}

export function redirectToLogin() {
  const next = `${location.pathname}${location.search}`;
  location.assign(`/login?next=${encodeURIComponent(next)}`);
}

function failure(status, data) {
  const message = (data && (data.message || data.error)) || (status === 404 ? 'Not found' : status >= 500 ? 'Server error' : `Request failed (${status})`);
  return new ApiError(String(message), { status, data });
}

export async function api(path, { method = 'GET', body, headers = {}, timeout = DEFAULT_TIMEOUT, signal, query } = {}) {
  const url = withQuery(toPath(path), query);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });

  const init = {
    method,
    credentials: 'same-origin',
    headers: { Accept: 'application/json', 'X-Requested-With': 'admin', ...headers },
    signal: controller.signal,
  };
  if (body !== undefined && body !== null) {
    if (body instanceof FormData) {
      init.body = body;
    } else {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
  }

  let res;
  try {
    res = await fetch(url, init);
  } catch (err) {
    clearTimeout(timer);
    if (err && err.name === 'AbortError') throw new ApiError('The request timed out. Check the connection and retry.', { code: 'timeout' });
    throw new ApiError('Network error. Check the connection and retry.', { code: 'network' });
  }
  clearTimeout(timer);

  const data = parseBody(await res.text());
  if (res.status === 401) {
    redirectToLogin();
    throw new ApiError('Session expired', { status: 401, data, code: 'unauthorized' });
  }
  const ok = res.ok && data.status !== false && data.success !== false;
  if (!ok) throw failure(res.status, data);
  return data;
}

/**
 * Multipart upload with progress (APK, blog image). XHR because fetch has no
 * upload progress. Same headers/credentials as api().
 */
export function apiUpload(path, formData, onProgress, { method = 'POST', timeout = 180000 } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, toPath(path));
    xhr.withCredentials = false; // same-origin: cookies are sent anyway
    xhr.timeout = timeout;
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.setRequestHeader('X-Requested-With', 'admin');
    if (typeof onProgress === 'function') {
      xhr.upload.addEventListener('progress', (ev) => {
        if (ev.lengthComputable) onProgress(Math.round((ev.loaded / ev.total) * 100), ev);
      });
    }
    xhr.addEventListener('load', () => {
      const data = parseBody(xhr.responseText);
      if (xhr.status === 401) { redirectToLogin(); reject(new ApiError('Session expired', { status: 401, code: 'unauthorized' })); return; }
      const ok = xhr.status >= 200 && xhr.status < 300 && data.status !== false && data.success !== false;
      if (ok) resolve(data); else reject(failure(xhr.status, data));
    });
    xhr.addEventListener('error', () => reject(new ApiError('Network error during upload.', { code: 'network' })));
    xhr.addEventListener('timeout', () => reject(new ApiError('The upload timed out.', { code: 'timeout' })));
    xhr.addEventListener('abort', () => reject(new ApiError('Upload cancelled.', { code: 'aborted' })));
    xhr.send(formData);
  });
}

/** Message for a toast: never a stack, never raw JSON. */
export function errorMessage(err, fallback = 'Something went wrong') {
  if (err instanceof ApiError) return err.message || fallback;
  return fallback;
}
