const express = require('express');
const router = express.Router();
const cityPageController = require('../controllers/cityRegionalPageController');
const { adminAuth } = require('../middleware/adminAuth');

// ============ ADMIN ROUTES (Protected) ============

// Get prefilled data for creating a city page
router.get('/admin/prefill/:cityId', adminAuth, cityPageController.getPrefillDataForCity);

// Get all city pages with filters and pagination
router.get('/admin/all', adminAuth, cityPageController.getAllCityPagesAdmin);

// Get specific city page by ID
router.get('/admin/:id', adminAuth, cityPageController.getCityPageByIdAdmin);

// Create new city page
router.post('/admin', adminAuth, cityPageController.createCityPage);

// Bulk-create city pages for multiple cities at once
router.post('/admin/bulk-create', adminAuth, cityPageController.bulkCreateCityPages);

// Update city page
router.put('/admin/:id', adminAuth, cityPageController.updateCityPage);

// Delete city page
router.delete('/admin/:id', adminAuth, cityPageController.deleteCityPage);

// Refresh stats for a city page
router.post('/admin/:id/refresh-stats', adminAuth, cityPageController.refreshCityPageStats);

// ============ PUBLIC ROUTES ============

// Get all published city pages
router.get('/', cityPageController.getAllCityPages);

// Get city pages by state
router.get('/state/:stateId', cityPageController.getCityPagesByState);

// Get city page by slug (must be last to avoid conflicts)
router.get('/:slug', cityPageController.getCityPageBySlug);

module.exports = router;
