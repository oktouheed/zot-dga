const express = require('express');
const FileController = require('../controllers/fileController');

const router = express.Router();

// File management routes
router.get('/', FileController.getFiles);
router.get('/stats', FileController.getFileStats);
router.get('/:id', FileController.getFile);
router.put('/:id', FileController.updateFile);
router.delete('/:id', FileController.deleteFile);
router.get('/:id/download', FileController.downloadFile);

module.exports = router;
