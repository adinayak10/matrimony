'use strict';
// /api/admin/verifications/* (feature expansion A1). Every route needs adminAuth.
const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/adminAuth');
const ctrl = require('../controllers/admin/verificationController');

router.get('/verifications', adminAuth, ctrl.list);
router.get('/verifications/stats', adminAuth, ctrl.stats);
router.get('/verifications/:id', adminAuth, ctrl.getOne);
router.get('/verifications/:id/files/:kind', adminAuth, ctrl.streamFile);
router.post('/verifications/:id/approve', adminAuth, ctrl.approve);
router.post('/verifications/:id/reject', adminAuth, ctrl.reject);
router.delete('/verifications/:id/files', adminAuth, ctrl.deleteFiles);

module.exports = router;
