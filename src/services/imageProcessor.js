const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

/**
 * Image processing service
 */
class ImageProcessor {
  /**
   * Resize image
   * @param {string} inputPath - Input image path
   * @param {string} outputPath - Output image path
   * @param {object} options - Resize options
   * @returns {Promise<void>}
   */
  static async resize(inputPath, outputPath, options = {}) {
    const {
      width,
      height,
      quality = 80,
      format = 'jpeg',
      fit = 'inside',
      withoutEnlargement = true
    } = options;

    let sharpInstance = sharp(inputPath);

    if (width || height) {
      sharpInstance = sharpInstance.resize(width, height, {
        fit,
        withoutEnlargement
      });
    }

    switch (format.toLowerCase()) {
      case 'png':
        sharpInstance = sharpInstance.png({ quality });
        break;
      case 'webp':
        sharpInstance = sharpInstance.webp({ quality });
        break;
      case 'jpeg':
      case 'jpg':
      default:
        sharpInstance = sharpInstance.jpeg({ quality });
        break;
    }

    await sharpInstance.toFile(outputPath);
  }

  /**
   * Generate thumbnail
   * @param {string} inputPath - Input image path
   * @param {string} outputPath - Output thumbnail path
   * @param {object} options - Thumbnail options
   * @returns {Promise<void>}
   */
  static async generateThumbnail(inputPath, outputPath, options = {}) {
    const {
      size = 300,
      quality = 80,
      fit = 'cover'
    } = options;

    await sharp(inputPath)
      .resize(size, size, {
        fit,
        position: 'center'
      })
      .jpeg({ quality })
      .toFile(outputPath);
  }

  /**
   * Convert image format
   * @param {string} inputPath - Input image path
   * @param {string} outputPath - Output image path
   * @param {string} format - Target format
   * @param {number} quality - Image quality (1-100)
   * @returns {Promise<void>}
   */
  static async convert(inputPath, outputPath, format, quality = 80) {
    let sharpInstance = sharp(inputPath);

    switch (format.toLowerCase()) {
      case 'png':
        sharpInstance = sharpInstance.png({ quality });
        break;
      case 'webp':
        sharpInstance = sharpInstance.webp({ quality });
        break;
      case 'gif':
        sharpInstance = sharpInstance.gif();
        break;
      case 'jpeg':
      case 'jpg':
      default:
        sharpInstance = sharpInstance.jpeg({ quality });
        break;
    }

    await sharpInstance.toFile(outputPath);
  }

  /**
   * Crop image
   * @param {string} inputPath - Input image path
   * @param {string} outputPath - Output image path
   * @param {object} cropData - Crop parameters
   * @returns {Promise<void>}
   */
  static async crop(inputPath, outputPath, cropData) {
    const { x, y, width, height, quality = 80 } = cropData;

    await sharp(inputPath)
      .extract({
        left: x,
        top: y,
        width,
        height
      })
      .jpeg({ quality })
      .toFile(outputPath);
  }

  /**
   * Get image metadata
   * @param {string} imagePath - Image path
   * @returns {Promise<object>} Image metadata
   */
  static async getMetadata(imagePath) {
    return await sharp(imagePath).metadata();
  }

  /**
   * Apply watermark to image
   * @param {string} inputPath - Input image path
   * @param {string} watermarkPath - Watermark image path
   * @param {string} outputPath - Output image path
   * @param {object} options - Watermark options
   * @returns {Promise<void>}
   */
  static async applyWatermark(inputPath, watermarkPath, outputPath, options = {}) {
    const {
      position = 'bottom-right',
      opacity = 0.5,
      margin = 10
    } = options;

    const image = sharp(inputPath);
    const { width, height } = await image.metadata();
    
    const watermark = await sharp(watermarkPath)
      .resize(Math.floor(width * 0.2)) // 20% of image width
      .composite([{
        input: Buffer.from([255, 255, 255, Math.floor(255 * opacity)]),
        raw: { width: 1, height: 1, channels: 4 },
        tile: true,
        blend: 'multiply'
      }])
      .toBuffer();

    let left, top;
    switch (position) {
      case 'top-left':
        left = margin;
        top = margin;
        break;
      case 'top-right':
        left = width - watermark.width - margin;
        top = margin;
        break;
      case 'bottom-left':
        left = margin;
        top = height - watermark.height - margin;
        break;
      case 'bottom-right':
      default:
        left = width - watermark.width - margin;
        top = height - watermark.height - margin;
        break;
    }

    await image
      .composite([{
        input: watermark,
        left,
        top
      }])
      .toFile(outputPath);
  }

  /**
   * Optimize image for web
   * @param {string} inputPath - Input image path
   * @param {string} outputPath - Output image path
   * @param {object} options - Optimization options
   * @returns {Promise<void>}
   */
  static async optimizeForWeb(inputPath, outputPath, options = {}) {
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 85,
      format = 'jpeg'
    } = options;

    let sharpInstance = sharp(inputPath);
    const metadata = await sharpInstance.metadata();

    // Resize if too large
    if (metadata.width > maxWidth || metadata.height > maxHeight) {
      sharpInstance = sharpInstance.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // Apply format-specific optimizations
    switch (format.toLowerCase()) {
      case 'webp':
        sharpInstance = sharpInstance.webp({
          quality,
          effort: 6 // Higher compression effort
        });
        break;
      case 'png':
        sharpInstance = sharpInstance.png({
          compressionLevel: 9,
          progressive: true
        });
        break;
      case 'jpeg':
      case 'jpg':
      default:
        sharpInstance = sharpInstance.jpeg({
          quality,
          progressive: true,
          mozjpeg: true
        });
        break;
    }

    await sharpInstance.toFile(outputPath);
  }
}

module.exports = ImageProcessor;
