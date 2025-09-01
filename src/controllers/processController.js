const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const File = require('../models/File');

class ProcessController {
  static async resizeImage(req, res) {
    try {
      const { id } = req.params;
      const { width, height, quality = 80, format } = req.query;

      // Validate parameters
      if (!width && !height) {
        return res.status(400).json({
          error: 'Missing parameters',
          message: 'At least width or height must be specified'
        });
      }

      const w = width ? parseInt(width) : null;
      const h = height ? parseInt(height) : null;
      const q = parseInt(quality);

      if ((w && (w < 1 || w > 4096)) || (h && (h < 1 || h > 4096))) {
        return res.status(400).json({
          error: 'Invalid dimensions',
          message: 'Width and height must be between 1 and 4096 pixels'
        });
      }

      if (q < 1 || q > 100) {
        return res.status(400).json({
          error: 'Invalid quality',
          message: 'Quality must be between 1 and 100'
        });
      }

      // Find the file
      const file = await File.findById(id, req.user.id);
      if (!file) {
        return res.status(404).json({
          error: 'File not found'
        });
      }

      if (file.file_type !== 'image') {
        return res.status(400).json({
          error: 'Invalid file type',
          message: 'Only image files can be resized'
        });
      }

      if (!fs.existsSync(file.path)) {
        return res.status(404).json({
          error: 'Physical file not found'
        });
      }

      // Generate cache filename
      const ext = format || 'jpeg';
      const cacheFilename = `${path.parse(file.filename).name}_${w || 'auto'}x${h || 'auto'}_q${q}.${ext}`;
      const cacheDir = path.join(path.dirname(file.path), 'cache');
      const cachePath = path.join(cacheDir, cacheFilename);

      // Create cache directory if it doesn't exist
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }

      // Check if cached version exists
      if (fs.existsSync(cachePath)) {
        return res.sendFile(path.resolve(cachePath));
      }

      // Process the image
      let sharpInstance = sharp(file.path);

      // Resize
      if (w || h) {
        sharpInstance = sharpInstance.resize(w, h, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      // Set format and quality
      switch (format) {
        case 'png':
          sharpInstance = sharpInstance.png({ quality: q });
          break;
        case 'webp':
          sharpInstance = sharpInstance.webp({ quality: q });
          break;
        case 'jpeg':
        case 'jpg':
        default:
          sharpInstance = sharpInstance.jpeg({ quality: q });
          break;
      }

      // Save to cache and send
      await sharpInstance.toFile(cachePath);
      res.sendFile(path.resolve(cachePath));

    } catch (error) {
      console.error('Resize error:', error);
      res.status(500).json({
        error: 'Image processing failed',
        message: error.message
      });
    }
  }

  static async convertImage(req, res) {
    try {
      const { id } = req.params;
      const { format, quality = 80 } = req.query;

      if (!format) {
        return res.status(400).json({
          error: 'Missing format',
          message: 'Target format must be specified'
        });
      }

      const supportedFormats = ['jpeg', 'jpg', 'png', 'webp', 'gif'];
      if (!supportedFormats.includes(format.toLowerCase())) {
        return res.status(400).json({
          error: 'Unsupported format',
          message: `Supported formats: ${supportedFormats.join(', ')}`
        });
      }

      const q = parseInt(quality);
      if (q < 1 || q > 100) {
        return res.status(400).json({
          error: 'Invalid quality',
          message: 'Quality must be between 1 and 100'
        });
      }

      // Find the file
      const file = await File.findById(id, req.user.id);
      if (!file) {
        return res.status(404).json({
          error: 'File not found'
        });
      }

      if (file.file_type !== 'image') {
        return res.status(400).json({
          error: 'Invalid file type',
          message: 'Only image files can be converted'
        });
      }

      if (!fs.existsSync(file.path)) {
        return res.status(404).json({
          error: 'Physical file not found'
        });
      }

      // Generate cache filename
      const cacheFilename = `${path.parse(file.filename).name}_converted_q${q}.${format}`;
      const cacheDir = path.join(path.dirname(file.path), 'cache');
      const cachePath = path.join(cacheDir, cacheFilename);

      // Create cache directory if it doesn't exist
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }

      // Check if cached version exists
      if (fs.existsSync(cachePath)) {
        return res.sendFile(path.resolve(cachePath));
      }

      // Process the image
      let sharpInstance = sharp(file.path);

      // Set format and quality
      switch (format.toLowerCase()) {
        case 'png':
          sharpInstance = sharpInstance.png({ quality: q });
          break;
        case 'webp':
          sharpInstance = sharpInstance.webp({ quality: q });
          break;
        case 'gif':
          sharpInstance = sharpInstance.gif();
          break;
        case 'jpeg':
        case 'jpg':
        default:
          sharpInstance = sharpInstance.jpeg({ quality: q });
          break;
      }

      // Save to cache and send
      await sharpInstance.toFile(cachePath);
      res.sendFile(path.resolve(cachePath));

    } catch (error) {
      console.error('Convert error:', error);
      res.status(500).json({
        error: 'Image conversion failed',
        message: error.message
      });
    }
  }

  static async generateThumbnail(req, res) {
    try {
      const { id } = req.params;
      const { size = 300, quality = 80 } = req.query;

      const s = parseInt(size);
      const q = parseInt(quality);

      if (s < 50 || s > 1000) {
        return res.status(400).json({
          error: 'Invalid size',
          message: 'Thumbnail size must be between 50 and 1000 pixels'
        });
      }

      if (q < 1 || q > 100) {
        return res.status(400).json({
          error: 'Invalid quality',
          message: 'Quality must be between 1 and 100'
        });
      }

      // Find the file
      const file = await File.findById(id, req.user.id);
      if (!file) {
        return res.status(404).json({
          error: 'File not found'
        });
      }

      if (file.file_type !== 'image') {
        return res.status(400).json({
          error: 'Invalid file type',
          message: 'Only image files can have thumbnails generated'
        });
      }

      if (!fs.existsSync(file.path)) {
        return res.status(404).json({
          error: 'Physical file not found'
        });
      }

      // Check if default thumbnail exists and matches requested size
      if (file.thumbnail_path && fs.existsSync(file.thumbnail_path) && s === 300) {
        return res.sendFile(path.resolve(file.thumbnail_path));
      }

      // Generate cache filename
      const cacheFilename = `${path.parse(file.filename).name}_thumb_${s}x${s}_q${q}.jpg`;
      const cacheDir = path.join(path.dirname(file.path), 'cache');
      const cachePath = path.join(cacheDir, cacheFilename);

      // Create cache directory if it doesn't exist
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }

      // Check if cached version exists
      if (fs.existsSync(cachePath)) {
        return res.sendFile(path.resolve(cachePath));
      }

      // Generate thumbnail
      await sharp(file.path)
        .resize(s, s, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: q })
        .toFile(cachePath);

      res.sendFile(path.resolve(cachePath));

    } catch (error) {
      console.error('Thumbnail error:', error);
      res.status(500).json({
        error: 'Thumbnail generation failed',
        message: error.message
      });
    }
  }

  static async getImageInfo(req, res) {
    try {
      const { id } = req.params;

      // Find the file
      const file = await File.findById(id, req.user.id);
      if (!file) {
        return res.status(404).json({
          error: 'File not found'
        });
      }

      if (file.file_type !== 'image') {
        return res.status(400).json({
          error: 'Invalid file type',
          message: 'Only image files have detailed information'
        });
      }

      if (!fs.existsSync(file.path)) {
        return res.status(404).json({
          error: 'Physical file not found'
        });
      }

      // Get detailed image information
      const metadata = await sharp(file.path).metadata();

      res.json({
        file: {
          id: file.id,
          filename: file.filename,
          originalName: file.original_name,
          size: file.size,
          mimeType: file.mime_type
        },
        imageInfo: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          space: metadata.space,
          channels: metadata.channels,
          depth: metadata.depth,
          density: metadata.density,
          hasProfile: metadata.hasProfile,
          hasAlpha: metadata.hasAlpha,
          orientation: metadata.orientation
        }
      });

    } catch (error) {
      console.error('Image info error:', error);
      res.status(500).json({
        error: 'Unable to get image information',
        message: error.message
      });
    }
  }

  static async cropImage(req, res) {
    try {
      const { id } = req.params;
      const { x, y, width, height, quality = 80 } = req.query;

      // Validate parameters
      if (!x || !y || !width || !height) {
        return res.status(400).json({
          error: 'Missing parameters',
          message: 'x, y, width, and height must be specified for cropping'
        });
      }

      const cropX = parseInt(x);
      const cropY = parseInt(y);
      const cropWidth = parseInt(width);
      const cropHeight = parseInt(height);
      const q = parseInt(quality);

      if (cropX < 0 || cropY < 0 || cropWidth < 1 || cropHeight < 1) {
        return res.status(400).json({
          error: 'Invalid crop parameters',
          message: 'Crop parameters must be positive numbers'
        });
      }

      if (q < 1 || q > 100) {
        return res.status(400).json({
          error: 'Invalid quality',
          message: 'Quality must be between 1 and 100'
        });
      }

      // Find the file
      const file = await File.findById(id, req.user.id);
      if (!file) {
        return res.status(404).json({
          error: 'File not found'
        });
      }

      if (file.file_type !== 'image') {
        return res.status(400).json({
          error: 'Invalid file type',
          message: 'Only image files can be cropped'
        });
      }

      if (!fs.existsSync(file.path)) {
        return res.status(404).json({
          error: 'Physical file not found'
        });
      }

      // Generate cache filename
      const cacheFilename = `${path.parse(file.filename).name}_crop_${cropX}_${cropY}_${cropWidth}_${cropHeight}_q${q}.jpg`;
      const cacheDir = path.join(path.dirname(file.path), 'cache');
      const cachePath = path.join(cacheDir, cacheFilename);

      // Create cache directory if it doesn't exist
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }

      // Check if cached version exists
      if (fs.existsSync(cachePath)) {
        return res.sendFile(path.resolve(cachePath));
      }

      // Crop the image
      await sharp(file.path)
        .extract({
          left: cropX,
          top: cropY,
          width: cropWidth,
          height: cropHeight
        })
        .jpeg({ quality: q })
        .toFile(cachePath);

      res.sendFile(path.resolve(cachePath));

    } catch (error) {
      console.error('Crop error:', error);
      res.status(500).json({
        error: 'Image cropping failed',
        message: error.message
      });
    }
  }
}

module.exports = ProcessController;
