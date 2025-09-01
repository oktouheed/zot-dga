const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const mime = require('mime-types');
const File = require('../models/File');
const Folder = require('../models/Folder');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    const userPath = path.join(uploadPath, req.user.id.toString());
    
    // Create user directory if it doesn't exist
    if (!fs.existsSync(userPath)) {
      fs.mkdirSync(userPath, { recursive: true });
    }

    // If folder is specified, create folder path
    if (req.body.folder) {
      const folderPath = path.join(userPath, req.body.folder);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
      cb(null, folderPath);
    } else {
      cb(null, userPath);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = (process.env.ALLOWED_IMAGE_TYPES || 'jpeg,jpg,png,gif,webp,svg').split(',');
  const allowedVideoTypes = (process.env.ALLOWED_VIDEO_TYPES || 'mp4,avi,mov,wmv,flv,webm').split(',');
  
  const fileExt = path.extname(file.originalname).toLowerCase().substring(1);
  const isImage = allowedImageTypes.includes(fileExt);
  const isVideo = allowedVideoTypes.includes(fileExt);

  if (isImage || isVideo) {
    file.fileType = isImage ? 'image' : 'video';
    cb(null, true);
  } else {
    cb(new Error(`File type .${fileExt} is not allowed`), false);
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB default
    files: 10 // Maximum 10 files at once
  }
});

class UploadController {
  static async uploadImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No file uploaded',
          message: 'Please select a file to upload'
        });
      }

      const file = req.file;
      let folderId = null;

      // Handle folder creation/lookup
      if (req.body.folder) {
        const folderPath = Folder.generatePath(req.body.folder);
        let folder = await Folder.findByPath(folderPath, req.user.id);
        
        if (!folder) {
          folderId = await Folder.create({
            name: req.body.folder,
            path: folderPath,
            userId: req.user.id,
            parentId: null,
            description: `Auto-created folder for ${req.body.folder}`
          });
        } else {
          folderId = folder.id;
        }
      }

      // Get image metadata using Sharp
      let width = null;
      let height = null;
      let metadata = {};

      if (file.fileType === 'image') {
        try {
          const imageInfo = await sharp(file.path).metadata();
          width = imageInfo.width;
          height = imageInfo.height;
          metadata = {
            format: imageInfo.format,
            space: imageInfo.space,
            channels: imageInfo.channels,
            density: imageInfo.density
          };

          // Generate thumbnail
          const thumbnailPath = file.path.replace(path.extname(file.path), '_thumb.jpg');
          await sharp(file.path)
            .resize(300, 300, {
              fit: 'inside',
              withoutEnlargement: true
            })
            .jpeg({ quality: 80 })
            .toFile(thumbnailPath);

          file.thumbnailPath = thumbnailPath;
        } catch (error) {
          console.error('Error processing image:', error);
        }
      }

      // Save file record to database
      const fileId = await File.create({
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        size: file.size,
        mimeType: file.mimetype,
        fileType: file.fileType,
        userId: req.user.id,
        folderId,
        width,
        height,
        duration: null,
        thumbnailPath: file.thumbnailPath || null,
        metadata,
        tags: req.body.tags || null,
        description: req.body.description || null,
        isPublic: req.body.isPublic === 'true',
        uploadIp: req.ip
      });

      // Generate file URL
      const fileUrl = `/uploads/${req.user.id}${req.body.folder ? `/${req.body.folder}` : ''}/${file.filename}`;
      const thumbnailUrl = file.thumbnailPath ? 
        `/uploads/${req.user.id}${req.body.folder ? `/${req.body.folder}` : ''}/${path.basename(file.thumbnailPath)}` : 
        null;

      res.status(201).json({
        message: 'File uploaded successfully',
        file: {
          id: fileId,
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
          fileType: file.fileType,
          width,
          height,
          url: fileUrl,
          thumbnailUrl,
          folder: req.body.folder || null,
          tags: req.body.tags || null,
          description: req.body.description || null,
          isPublic: req.body.isPublic === 'true'
        }
      });

    } catch (error) {
      console.error('Upload error:', error);
      
      // Clean up uploaded file if database save failed
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        error: 'Upload failed',
        message: error.message || 'Unable to upload file'
      });
    }
  }

  static async uploadVideo(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No file uploaded',
          message: 'Please select a video file to upload'
        });
      }

      const file = req.file;
      let folderId = null;

      // Handle folder creation/lookup
      if (req.body.folder) {
        const folderPath = Folder.generatePath(req.body.folder);
        let folder = await Folder.findByPath(folderPath, req.user.id);
        
        if (!folder) {
          folderId = await Folder.create({
            name: req.body.folder,
            path: folderPath,
            userId: req.user.id,
            parentId: null,
            description: `Auto-created folder for ${req.body.folder}`
          });
        } else {
          folderId = folder.id;
        }
      }

      // TODO: Add video processing with FFmpeg for duration, thumbnail generation
      // For now, we'll save the video file without processing
      const metadata = {
        originalSize: file.size,
        uploadedAt: new Date().toISOString()
      };

      // Save file record to database
      const fileId = await File.create({
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        size: file.size,
        mimeType: file.mimetype,
        fileType: file.fileType,
        userId: req.user.id,
        folderId,
        width: null,
        height: null,
        duration: null, // TODO: Extract from video
        thumbnailPath: null, // TODO: Generate video thumbnail
        metadata,
        tags: req.body.tags || null,
        description: req.body.description || null,
        isPublic: req.body.isPublic === 'true',
        uploadIp: req.ip
      });

      // Generate file URL
      const fileUrl = `/uploads/${req.user.id}${req.body.folder ? `/${req.body.folder}` : ''}/${file.filename}`;

      res.status(201).json({
        message: 'Video uploaded successfully',
        file: {
          id: fileId,
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
          fileType: file.fileType,
          url: fileUrl,
          folder: req.body.folder || null,
          tags: req.body.tags || null,
          description: req.body.description || null,
          isPublic: req.body.isPublic === 'true'
        }
      });

    } catch (error) {
      console.error('Video upload error:', error);
      
      // Clean up uploaded file if database save failed
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        error: 'Video upload failed',
        message: error.message || 'Unable to upload video'
      });
    }
  }

  static async uploadMultiple(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          error: 'No files uploaded',
          message: 'Please select files to upload'
        });
      }

      const results = [];
      const errors = [];

      for (const file of req.files) {
        try {
          // Process each file similar to single upload
          req.file = file;
          
          if (file.fileType === 'image') {
            // Process as image
            await this.processImage(req, file);
          } else {
            // Process as video
            await this.processVideo(req, file);
          }

          results.push({
            filename: file.filename,
            originalName: file.originalname,
            size: file.size,
            status: 'success'
          });

        } catch (error) {
          errors.push({
            filename: file.originalname,
            error: error.message
          });
          
          // Clean up failed upload
          if (file.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        }
      }

      res.status(results.length > 0 ? 201 : 400).json({
        message: `${results.length} files uploaded successfully`,
        results,
        errors: errors.length > 0 ? errors : undefined
      });

    } catch (error) {
      console.error('Multiple upload error:', error);
      res.status(500).json({
        error: 'Multiple upload failed',
        message: error.message || 'Unable to upload files'
      });
    }
  }

  static async processImage(req, file) {
    // Helper method for processing images in multiple upload
    // Similar logic to uploadImage but without response handling
    // Implementation would go here...
  }

  static async processVideo(req, file) {
    // Helper method for processing videos in multiple upload
    // Similar logic to uploadVideo but without response handling
    // Implementation would go here...
  }
}

// Export both the controller and multer middleware
module.exports = {
  UploadController,
  uploadSingle: upload.single('file'),
  uploadMultiple: upload.array('files', 10)
};
