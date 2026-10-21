const express = require('express');
const router = express.Router();
const CompatibilityController = require('../controllers/CompatibilityController');
const { authenticate } = require('../middleware/identity');

// Caller comes from the token (feature expansion A2); body my_user_id is ignored.
router.post('/guna-milan', authenticate, CompatibilityController.getGunaMilan);

module.exports = router;
