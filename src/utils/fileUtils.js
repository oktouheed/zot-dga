const path = require('path');

/**
 * Format file size in human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Generate unique filename with timestamp
 * @param {string} originalName - Original filename
 * @returns {string} Unique filename
 */
const generateUniqueFilename = (originalName) => {
  const timestamp = Date.now();
  const ext = path.extname(originalName);
  const name = path.basename(originalName, ext);
  const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '_');
  
  return `${sanitizedName}_${timestamp}${ext}`;
};

/**
 * Validate file type
 * @param {string} mimetype - File MIME type
 * @param {string} filename - Original filename
 * @returns {object} Validation result with type and isValid
 */
const validateFileType = (mimetype, filename) => {
  const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  const videoTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm'];
  
  const isImage = imageTypes.includes(mimetype.toLowerCase());
  const isVideo = videoTypes.includes(mimetype.toLowerCase());
  
  if (isImage) {
    return { type: 'image', isValid: true };
  } else if (isVideo) {
    return { type: 'video', isValid: true };
  } else {
    return { type: 'unknown', isValid: false };
  }
};

/**
 * Sanitize folder name
 * @param {string} folderName - Folder name to sanitize
 * @returns {string} Sanitized folder name
 */
const sanitizeFolderName = (folderName) => {
  return folderName
    .replace(/[^a-zA-Z0-9\s-_]/g, '')
    .replace(/\s+/g, '_')
    .toLowerCase();
};

/**
 * Check if file exists and is accessible
 * @param {string} filePath - Path to file
 * @returns {Promise<boolean>} Whether file exists and is accessible
 */
const fileExists = async (filePath) => {
  const fs = require('fs').promises;
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

/**
 * Get file extension from filename
 * @param {string} filename - Filename
 * @returns {string} File extension without dot
 */
const getFileExtension = (filename) => {
  return path.extname(filename).toLowerCase().substring(1);
};

/**
 * Convert bytes to megabytes
 * @param {number} bytes - Size in bytes
 * @returns {number} Size in megabytes
 */
const bytesToMB = (bytes) => {
  return bytes / (1024 * 1024);
};

/**
 * Parse file size string (e.g., "50MB") to bytes
 * @param {string} sizeStr - Size string
 * @returns {number} Size in bytes
 */
const parseSizeString = (sizeStr) => {
  const units = {
    'B': 1,
    'KB': 1024,
    'MB': 1024 * 1024,
    'GB': 1024 * 1024 * 1024
  };
  
  const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)$/i);
  if (!match) {
    throw new Error('Invalid size format');
  }
  
  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  
  return Math.floor(value * units[unit]);
};

/**
 * Generate file URL
 * @param {number} userId - User ID
 * @param {string} filename - Filename
 * @param {string} folder - Folder name (optional)
 * @returns {string} File URL
 */
const generateFileUrl = (userId, filename, folder = null) => {
  const basePath = `/uploads/${userId}`;
  return folder ? `${basePath}/${folder}/${filename}` : `${basePath}/${filename}`;
};

/**
 * Extract metadata from file path
 * @param {string} filePath - File path
 * @returns {object} File metadata
 */
const extractFileMetadata = (filePath) => {
  const stats = require('fs').statSync(filePath);
  return {
    size: stats.size,
    created: stats.birthtime,
    modified: stats.mtime,
    accessed: stats.atime
  };
};

module.exports = {
  formatFileSize,
  generateUniqueFilename,
  validateFileType,
  sanitizeFolderName,
  fileExists,
  getFileExtension,
  bytesToMB,
  parseSizeString,
  generateFileUrl,
  extractFileMetadata
};
