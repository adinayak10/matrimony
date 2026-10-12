const express = require('express');
const router = express.Router();
const BetaTesterController = require('../controllers/BetaTesterController');
const { adminAuth } = require('../middleware/adminAuth');

// Public route
router.post('/submit', BetaTesterController.submitApplication);

// Admin routes
router.get('/all', adminAuth, BetaTesterController.getAllApplications);
router.get('/stats', adminAuth, BetaTesterController.getStats);
router.patch('/:id/status', adminAuth, BetaTesterController.updateStatus);
router.patch('/:id/read', adminAuth, BetaTesterController.markAsRead);
router.delete('/:id', adminAuth, BetaTesterController.deleteApplication);

module.exports = router;
