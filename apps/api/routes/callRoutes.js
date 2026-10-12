const express = require('express');
const router = express.Router();
const CallController = require('../controllers/CallController');
const { authenticate } = require('../middleware/identity');

router.post('/token', authenticate, CallController.generateCallToken);
router.get('/history', authenticate, CallController.getCallHistory);

module.exports = router;
