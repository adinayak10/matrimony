const express = require('express');
const router = express.Router();
const CompatibilityController = require('../controllers/CompatibilityController');

router.post('/guna-milan', CompatibilityController.getGunaMilan);

module.exports = router;
