const express = require('express');
const ProcessController = require('../controllers/processController');

const router = express.Router();

// Image processing routes
router.get('/resize/:id', ProcessController.resizeImage);
router.get('/convert/:id', ProcessController.convertImage);
router.get('/thumbnail/:id', ProcessController.generateThumbnail);
router.get('/crop/:id', ProcessController.cropImage);
router.get('/info/:id', ProcessController.getImageInfo);

module.exports = router;
