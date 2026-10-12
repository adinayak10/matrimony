'use strict';
// Last middleware in app.js (after the 404 handler) (D1.9).
//
//   UpstreamError (API down, no stale copy)  -> 503 + Retry-After, pages/503
//   body-parser / client errors (4xx)         -> that status, no page body
//   anything else                             -> 500, pages/500
//
// The response never carries a stack or the error message; the log gets the
// message (and the stack outside production). JSON for /api, /auth, /csp-report
// and XHR callers so a fetch() never has to parse an HTML error page.

const isProd = process.env.NODE_ENV === 'production';

function wantsJson(req) {
  const p = req.path || '';
  if (p.startsWith('/api') || p.startsWith('/auth') || p === '/csp-report') return true;
  if (req.xhr) return true;
  const accept = req.get('accept') || '';
  return accept.includes('application/json') && !accept.includes('text/html');
}

function renderOr(res, view, locals, fallbackText) {
  res.render(view, locals, (renderErr, html) => {
    if (renderErr) {
      console.error('[errorHandler] failed to render', view, renderErr.message);
      return res.type('text/plain').send(fallbackText);
    }
    res.send(html);
  });
}

module.exports = function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const isUpstream = err && err.name === 'UpstreamError';
  const clientStatus = err && Number(err.status || err.statusCode);
  const isClientError = Number.isInteger(clientStatus) && clientStatus >= 400 && clientStatus < 500;

  if (isUpstream) console.warn('[web] upstream unavailable:', err.message);
  else if (isClientError) console.warn('[web] client error', clientStatus, req.method, req.originalUrl, err.message);
  else console.error('[web] unhandled error', req.method, req.originalUrl, isProd ? err && err.message : err);

  res.set('Cache-Control', 'no-store');

  if (isClientError) {
    const message = clientStatus === 413 ? 'Request too large' : 'Bad request';
    if (wantsJson(req)) return res.status(clientStatus).json({ status: false, message });
    return res.status(clientStatus).type('text/plain').send(message);
  }

  if (isUpstream) {
    res.status(503).set('Retry-After', '120');
    if (wantsJson(req)) return res.json({ status: false, message: 'Service temporarily unavailable' });
    return renderOr(res, 'pages/503', { title: 'Temporarily unavailable | BanjaraMatch', user: null }, 'Service temporarily unavailable. Please retry in a few minutes.');
  }

  res.status(500);
  if (wantsJson(req)) return res.json({ status: false, message: 'Something went wrong' });
  return renderOr(res, 'pages/500', { title: 'Something went wrong | BanjaraMatch', user: null }, 'Something went wrong. Please try again.');
};
