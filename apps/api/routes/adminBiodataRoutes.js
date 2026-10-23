'use strict';
// /api/admin/biodata/* (biodata maker admin). Every route needs adminAuth; every write is audited
// in controllers/admin/biodataAdminController.js. Admins see counts only, never member documents.
const express = require('express');
const { adminAuth } = require('../middleware/adminAuth');
const ctl = require('../controllers/admin/biodataAdminController');

const router = express.Router();

router.get('/biodata/stats', adminAuth, ctl.stats);

router.get('/biodata/templates', adminAuth, ctl.listTemplates);
router.post('/biodata/templates/reorder', adminAuth, ctl.reorderTemplates);
router.put('/biodata/templates/:templateId', adminAuth, ctl.updateTemplate);
router.delete('/biodata/templates/:templateId/overrides', adminAuth, ctl.resetTemplate);

router.get('/biodata/pages', adminAuth, ctl.listPages);
router.post('/biodata/pages', adminAuth, ctl.createPage);
router.get('/biodata/pages/:id', adminAuth, ctl.getPageById);
router.put('/biodata/pages/:id', adminAuth, ctl.updatePage);
router.delete('/biodata/pages/:id', adminAuth, ctl.deletePage);
router.post('/biodata/pages/:id/publish', adminAuth, ctl.publishPage);

module.exports = router;
