const express = require('express');
const { UploadController, uploadSingle, uploadMultiple } = require('../controllers/uploadController');

const router = express.Router();

// Single file uploads
router.post('/image', uploadSingle, UploadController.uploadImage);
router.post('/video', uploadSingle, UploadController.uploadVideo);

// Multiple file upload
router.post('/multiple', uploadMultiple, UploadController.uploadMultiple);

module.exports = router;
