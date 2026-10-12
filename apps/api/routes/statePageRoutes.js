const express = require('express');
const router = express.Router();
const statePageController = require('../controllers/stateRegionalPageController');
const { adminAuth } = require('../middleware/adminAuth');

// ============ ADMIN ROUTES (Protected) ============

// Get prefilled data for creating a state page
router.get('/admin/prefill/:stateId', adminAuth, statePageController.getPrefillDataForState);

// Get all state pages with filters and pagination
router.get('/admin/all', adminAuth, statePageController.getAllStatePagesAdmin);

// Get hierarchy of states with city counts
router.get('/admin/hierarchy', adminAuth, statePageController.getStatesHierarchy);

// Get specific state page by ID
router.get('/admin/:id', adminAuth, statePageController.getStatePageByIdAdmin);

// Create new state page
router.post('/admin', adminAuth, statePageController.createStatePage);

// Update state page
router.put('/admin/:id', adminAuth, statePageController.updateStatePage);

// Delete state page
router.delete('/admin/:id', adminAuth, statePageController.deleteStatePage);

// Refresh stats for a state page
router.post('/admin/:id/refresh-stats', adminAuth, statePageController.refreshStatePageStats);

// ============ PUBLIC ROUTES ============

// Get all published state pages
router.get('/', statePageController.getAllStatePages);

// Get state page by slug (must be last to avoid conflicts)
router.get('/:slug', statePageController.getStatePageBySlug);

module.exports = router;
