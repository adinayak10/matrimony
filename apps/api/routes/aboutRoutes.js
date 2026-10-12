// routes/aboutRoutes.js
const express = require('express');
const router = express.Router();
const AboutController = require('../controllers/AboutController');

router.post('/about/options', AboutController.fetchOptions);
router.post('/about/generate', AboutController.generateAbout);

module.exports = router;
