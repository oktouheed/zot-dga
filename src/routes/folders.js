const express = require('express');
const FolderController = require('../controllers/folderController');

const router = express.Router();

// Folder management routes
router.post('/', FolderController.createFolder);
router.get('/', FolderController.getFolders);
router.get('/:id', FolderController.getFolder);
router.put('/:id', FolderController.updateFolder);
router.delete('/:id', FolderController.deleteFolder);
router.get('/:id/files', FolderController.getFolderFiles);

module.exports = router;
