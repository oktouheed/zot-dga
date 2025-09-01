const fs = require('fs');
const path = require('path');
const File = require('../models/File');

class FileController {
  static async getFiles(req, res) {
    try {
      const {
        folder,
        type,
        limit = 50,
        offset = 0,
        search,
        orderBy = 'created_at',
        orderDir = 'DESC'
      } = req.query;

      let files;

      if (search) {
        files = await File.search(req.user.id, search, {
          fileType: type,
          limit: parseInt(limit),
          offset: parseInt(offset)
        });
      } else {
        files = await File.findByUser(req.user.id, {
          folderId: folder === 'null' ? null : folder,
          fileType: type,
          limit: parseInt(limit),
          offset: parseInt(offset),
          orderBy,
          orderDir
        });
      }

      // Generate URLs for files
      const filesWithUrls = files.map(file => ({
        ...file,
        url: `/uploads/${req.user.id}/${file.filename}`,
        thumbnailUrl: file.thumbnail_path ? 
          `/uploads/${req.user.id}/${path.basename(file.thumbnail_path)}` : 
          null
      }));

      res.json({
        files: filesWithUrls,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: files.length
        }
      });

    } catch (error) {
      console.error('Get files error:', error);
      res.status(500).json({
        error: 'Unable to fetch files',
        message: error.message
      });
    }
  }

  static async getFile(req, res) {
    try {
      const { id } = req.params;
      
      const file = await File.findById(id, req.user.id);
      if (!file) {
        return res.status(404).json({
          error: 'File not found'
        });
      }

      // Generate URLs
      const fileWithUrl = {
        ...file,
        url: `/uploads/${req.user.id}/${file.filename}`,
        thumbnailUrl: file.thumbnail_path ? 
          `/uploads/${req.user.id}/${path.basename(file.thumbnail_path)}` : 
          null
      };

      res.json({
        file: fileWithUrl
      });

    } catch (error) {
      console.error('Get file error:', error);
      res.status(500).json({
        error: 'Unable to fetch file',
        message: error.message
      });
    }
  }

  static async updateFile(req, res) {
    try {
      const { id } = req.params;
      const { tags, description, isPublic } = req.body;

      const updateData = {};
      if (tags !== undefined) updateData.tags = tags;
      if (description !== undefined) updateData.description = description;
      if (isPublic !== undefined) updateData.is_public = isPublic;

      const updated = await File.update(id, req.user.id, updateData);
      
      if (!updated) {
        return res.status(404).json({
          error: 'File not found or no changes made'
        });
      }

      // Get updated file
      const file = await File.findById(id, req.user.id);
      
      res.json({
        message: 'File updated successfully',
        file: {
          ...file,
          url: `/uploads/${req.user.id}/${file.filename}`,
          thumbnailUrl: file.thumbnail_path ? 
            `/uploads/${req.user.id}/${path.basename(file.thumbnail_path)}` : 
            null
        }
      });

    } catch (error) {
      console.error('Update file error:', error);
      res.status(500).json({
        error: 'Unable to update file',
        message: error.message
      });
    }
  }

  static async deleteFile(req, res) {
    try {
      const { id } = req.params;
      
      const result = await File.delete(id, req.user.id);
      
      if (!result.success) {
        return res.status(404).json({
          error: 'File not found'
        });
      }

      // Delete physical files
      try {
        if (result.file.path && fs.existsSync(result.file.path)) {
          fs.unlinkSync(result.file.path);
        }
        
        if (result.file.thumbnail_path && fs.existsSync(result.file.thumbnail_path)) {
          fs.unlinkSync(result.file.thumbnail_path);
        }
      } catch (fileError) {
        console.error('Error deleting physical files:', fileError);
        // Continue even if file deletion fails - the database record is already deleted
      }

      res.json({
        message: 'File deleted successfully'
      });

    } catch (error) {
      console.error('Delete file error:', error);
      res.status(500).json({
        error: 'Unable to delete file',
        message: error.message
      });
    }
  }

  static async getFileStats(req, res) {
    try {
      const stats = await File.getStats(req.user.id);
      
      res.json({
        stats: {
          totalFiles: stats.total_files || 0,
          totalSize: stats.total_size || 0,
          imageCount: stats.image_count || 0,
          videoCount: stats.video_count || 0,
          lastUpload: stats.last_upload
        }
      });

    } catch (error) {
      console.error('Get file stats error:', error);
      res.status(500).json({
        error: 'Unable to fetch file statistics',
        message: error.message
      });
    }
  }

  static async downloadFile(req, res) {
    try {
      const { id } = req.params;
      
      const file = await File.findById(id, req.user.id);
      if (!file) {
        return res.status(404).json({
          error: 'File not found'
        });
      }

      if (!fs.existsSync(file.path)) {
        return res.status(404).json({
          error: 'Physical file not found'
        });
      }

      res.download(file.path, file.original_name, (err) => {
        if (err) {
          console.error('Download error:', err);
          if (!res.headersSent) {
            res.status(500).json({
              error: 'Download failed'
            });
          }
        }
      });

    } catch (error) {
      console.error('Download file error:', error);
      res.status(500).json({
        error: 'Unable to download file',
        message: error.message
      });
    }
  }
}

module.exports = FileController;
