const express = require('express');
const router = express.Router();
const CallController = require('../controllers/CallController');

router.post('/token', CallController.generateCallToken);
router.get('/history', CallController.getCallHistory);

module.exports = router;
