// authMiddleware.js — kept as a re-export so older requires keep working.
// The real implementation (authenticate/optionalAuth/resolveCaller/selfOnly)
// lives in middleware/identity.js (A1.1).
module.exports = require('./identity');
