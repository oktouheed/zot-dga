const Joi = require('joi');
const Folder = require('../models/Folder');

// Validation schemas
const createFolderSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional(),
  parentId: Joi.number().integer().positive().optional()
});

const updateFolderSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  description: Joi.string().max(500).optional()
});

class FolderController {
  static async createFolder(req, res) {
    try {
      const { error } = createFolderSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation error',
          message: error.details[0].message
        });
      }

      const { name, description, parentId } = req.body;
      
      // Generate path from name
      const path = Folder.generatePath(name);
      
      // Check if folder with this path already exists for the user
      const existingFolder = await Folder.findByPath(path, req.user.id);
      if (existingFolder) {
        return res.status(400).json({
          error: 'Folder already exists',
          message: 'A folder with this name already exists'
        });
      }

      // If parentId is provided, verify parent folder exists and belongs to user
      if (parentId) {
        const parentFolder = await Folder.findById(parentId, req.user.id);
        if (!parentFolder) {
          return res.status(400).json({
            error: 'Parent folder not found',
            message: 'The specified parent folder does not exist'
          });
        }
      }

      const folderId = await Folder.create({
        name,
        path,
        userId: req.user.id,
        parentId: parentId || null,
        description: description || null
      });

      const folder = await Folder.findById(folderId);

      res.status(201).json({
        message: 'Folder created successfully',
        folder
      });

    } catch (error) {
      console.error('Create folder error:', error);
      res.status(500).json({
        error: 'Unable to create folder',
        message: error.message
      });
    }
  }

  static async getFolders(req, res) {
    try {
      const { parentId, tree } = req.query;

      let folders;
      
      if (tree === 'true') {
        // Return folder tree structure
        folders = await Folder.getTree(req.user.id, parentId || null);
      } else {
        // Return flat list of folders
        folders = await Folder.findByUser(req.user.id, parentId || null);
      }

      res.json({
        folders
      });

    } catch (error) {
      console.error('Get folders error:', error);
      res.status(500).json({
        error: 'Unable to fetch folders',
        message: error.message
      });
    }
  }

  static async getFolder(req, res) {
    try {
      const { id } = req.params;
      
      const folder = await Folder.findById(id, req.user.id);
      if (!folder) {
        return res.status(404).json({
          error: 'Folder not found'
        });
      }

      // Get folder statistics
      const stats = await Folder.getStats(id, req.user.id);

      res.json({
        folder: {
          ...folder,
          stats
        }
      });

    } catch (error) {
      console.error('Get folder error:', error);
      res.status(500).json({
        error: 'Unable to fetch folder',
        message: error.message
      });
    }
  }

  static async updateFolder(req, res) {
    try {
      const { id } = req.params;
      
      const { error } = updateFolderSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation error',
          message: error.details[0].message
        });
      }

      const { name, description } = req.body;
      
      // Check if folder exists
      const existingFolder = await Folder.findById(id, req.user.id);
      if (!existingFolder) {
        return res.status(404).json({
          error: 'Folder not found'
        });
      }

      // If name is being changed, check for conflicts
      if (name && name !== existingFolder.name) {
        const path = Folder.generatePath(name);
        const conflictFolder = await Folder.findByPath(path, req.user.id);
        if (conflictFolder && conflictFolder.id !== parseInt(id)) {
          return res.status(400).json({
            error: 'Folder name conflict',
            message: 'A folder with this name already exists'
          });
        }
      }

      const updated = await Folder.update(id, req.user.id, { name, description });
      
      if (!updated) {
        return res.status(404).json({
          error: 'Folder not found or no changes made'
        });
      }

      const folder = await Folder.findById(id, req.user.id);
      
      res.json({
        message: 'Folder updated successfully',
        folder
      });

    } catch (error) {
      console.error('Update folder error:', error);
      res.status(500).json({
        error: 'Unable to update folder',
        message: error.message
      });
    }
  }

  static async deleteFolder(req, res) {
    try {
      const { id } = req.params;
      
      const deleted = await Folder.delete(id, req.user.id);
      
      if (!deleted) {
        return res.status(404).json({
          error: 'Folder not found'
        });
      }

      res.json({
        message: 'Folder deleted successfully'
      });

    } catch (error) {
      console.error('Delete folder error:', error);
      
      if (error.message.includes('contains files or subfolders')) {
        return res.status(400).json({
          error: 'Cannot delete folder',
          message: error.message
        });
      }
      
      res.status(500).json({
        error: 'Unable to delete folder',
        message: error.message
      });
    }
  }

  static async getFolderFiles(req, res) {
    try {
      const { id } = req.params;
      const { limit = 50, offset = 0, type } = req.query;
      
      // Verify folder exists and belongs to user
      const folder = await Folder.findById(id, req.user.id);
      if (!folder) {
        return res.status(404).json({
          error: 'Folder not found'
        });
      }

      const files = await Folder.getFiles(id, req.user.id, {
        limit: parseInt(limit),
        offset: parseInt(offset),
        fileType: type
      });

      // Generate URLs for files
      const filesWithUrls = files.map(file => ({
        ...file,
        url: `/uploads/${req.user.id}/${file.filename}`,
        thumbnailUrl: file.thumbnail_path ? 
          `/uploads/${req.user.id}/${path.basename(file.thumbnail_path)}` : 
          null
      }));

      res.json({
        folder,
        files: filesWithUrls,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: files.length
        }
      });

    } catch (error) {
      console.error('Get folder files error:', error);
      res.status(500).json({
        error: 'Unable to fetch folder files',
        message: error.message
      });
    }
  }
}

module.exports = FolderController;
