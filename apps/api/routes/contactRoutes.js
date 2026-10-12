const express = require('express');
const router = express.Router();
const ContactController = require('../controllers/ContactController');
const { adminAuth } = require('../middleware/adminAuth');

// Public routes
router.post('/submit', ContactController.submitContact);

// Admin routes
router.get('/all', adminAuth, ContactController.getAllContacts);
router.get('/stats', adminAuth, ContactController.getStats);
router.get('/:id', adminAuth, ContactController.getContactById);
router.patch('/:id/read', adminAuth, ContactController.markAsRead);
router.patch('/:id/status', adminAuth, ContactController.updateStatus);
router.delete('/:id', adminAuth, ContactController.deleteContact);

module.exports = router;
