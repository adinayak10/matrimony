// routes/aboutRoutes.js
const express = require('express');
const router = express.Router();
const AboutController = require('../controllers/AboutController');
const { authenticate } = require('../middleware/identity');

router.post('/about/options', AboutController.fetchOptions);
router.post('/about/generate', authenticate, AboutController.generateAbout);

module.exports = router;
