'use strict';
// Public success stories at /api/success-stories (feature expansion A3). Published rows only.
const express = require('express');
const SuccessStoryController = require('../controllers/SuccessStoryController');

const router = express.Router();

router.get('/', SuccessStoryController.listPublished);
router.get('/:id', SuccessStoryController.getPublished);

module.exports = router;
