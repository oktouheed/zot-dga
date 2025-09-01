// example-backend.js
// This is an example of how to integrate ZOT-DGA API into your Express.js backend

const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const cors = require('cors');
require('dotenv').config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Configuration
const ZOT_DGA_CONFIG = {
  baseURL: process.env.ZOT_DGA_URL || 'http://localhost:3000',
  apiKey: process.env.ZOT_DGA_API_KEY || 'your-api-key-here'
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve static files

// ZOT-DGA API Client
class ZotDGAClient {
  constructor(baseURL, apiKey) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
  }

  async uploadImage(fileBuffer, filename, options = {}) {
    const formData = new FormData();
    formData.append('file', fileBuffer, filename);
    
    Object.keys(options).forEach(key => {
      formData.append(key, options[key]);
    });

    const response = await this.client.post('/api/upload/image', formData, {
      headers: formData.getHeaders()
    });
    
    return response.data;
  }

  async getFiles(params = {}) {
    const response = await this.client.get('/api/files', { params });
    return response.data;
  }

  async deleteFile(fileId) {
    const response = await this.client.delete(`/api/files/${fileId}`);
    return response.data;
  }

  getImageUrl(fileId, options = {}) {
    const { width, height, quality = 80 } = options;
    let url = `${this.client.defaults.baseURL}/uploads/${fileId}`;
    
    if (width || height) {
      const params = new URLSearchParams({ quality });
      if (width) params.append('width', width);
      if (height) params.append('height', height);
      url = `${this.client.defaults.baseURL}/api/process/resize/${fileId}?${params}`;
    }
    
    return url;
  }
}

const zotClient = new ZotDGAClient(ZOT_DGA_CONFIG.baseURL, ZOT_DGA_CONFIG.apiKey);

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'Example Backend with ZOT-DGA Integration' });
});

// Upload endpoint with user authentication simulation
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    // In real app, you'd get user from authentication middleware
    const userId = req.headers['x-user-id'] || 'anonymous';
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Upload to ZOT-DGA with user-specific folder
    const result = await zotClient.uploadImage(
      req.file.buffer,
      req.file.originalname,
      {
        folder: `user-${userId}`,
        tags: req.body.tags || 'web-upload',
        description: req.body.description || `Uploaded by user ${userId}`
      }
    );

    // You could save additional metadata to your own database here
    // await saveFileMetadata(userId, result.file);

    res.json({
      success: true,
      file: {
        id: result.file.id,
        url: result.file.url,
        thumbnail: zotClient.getImageUrl(result.file.id, { width: 300, height: 300 }),
        originalName: result.file.originalName,
        size: result.file.size
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: 'Upload failed',
      message: error.response?.data?.message || error.message
    });
  }
});

// Get user's images
app.get('/api/images', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'anonymous';
    
    // Get images from user's folder
    const data = await zotClient.getFiles({
      folder: `user-${userId}`,
      type: 'image',
      limit: req.query.limit || 50
    });

    // Add generated URLs
    const imagesWithUrls = data.files.map(file => ({
      ...file,
      thumbnail: zotClient.getImageUrl(file.id, { width: 300, height: 300 }),
      fullsize: zotClient.getImageUrl(file.id)
    }));

    res.json({
      images: imagesWithUrls,
      pagination: data.pagination
    });

  } catch (error) {
    console.error('Get images error:', error);
    res.status(500).json({
      error: 'Failed to get images',
      message: error.response?.data?.message || error.message
    });
  }
});

// Delete image
app.delete('/api/images/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] || 'anonymous';
    
    // In a real app, you'd verify the user owns this image
    await zotClient.deleteFile(id);
    
    res.json({ success: true, message: 'Image deleted successfully' });

  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      error: 'Failed to delete image',
      message: error.response?.data?.message || error.message
    });
  }
});

// Generate different image sizes for responsive design
app.get('/api/images/:id/sizes', (req, res) => {
  const { id } = req.params;
  
  const sizes = {
    thumbnail: zotClient.getImageUrl(id, { width: 150, height: 150 }),
    small: zotClient.getImageUrl(id, { width: 400, height: 300 }),
    medium: zotClient.getImageUrl(id, { width: 800, height: 600 }),
    large: zotClient.getImageUrl(id, { width: 1200, height: 900 }),
    original: zotClient.getImageUrl(id)
  };
  
  res.json({ sizes });
});

// Create a gallery with optimized images
app.get('/api/gallery', async (req, res) => {
  try {
    const data = await zotClient.getFiles({
      type: 'image',
      limit: req.query.limit || 20
    });

    const gallery = data.files.map(file => ({
      id: file.id,
      title: file.original_name,
      description: file.description,
      tags: file.tags ? file.tags.split(',') : [],
      createdAt: file.created_at,
      sizes: {
        thumbnail: zotClient.getImageUrl(file.id, { width: 300, height: 300 }),
        medium: zotClient.getImageUrl(file.id, { width: 800, height: 600 }),
        large: zotClient.getImageUrl(file.id, { width: 1200, height: 900 })
      }
    }));

    res.json({ gallery });

  } catch (error) {
    console.error('Gallery error:', error);
    res.status(500).json({
      error: 'Failed to load gallery',
      message: error.response?.data?.message || error.message
    });
  }
});

// Serve a simple demo page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>ZOT-DGA Integration Example</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .upload-form { background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; }
            .image-item { background: white; padding: 15px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
            .image-item img { width: 100%; height: 150px; object-fit: cover; border-radius: 3px; }
        </style>
    </head>
    <body>
        <h1>🖼️ ZOT-DGA Integration Example</h1>
        <p>This example shows how to integrate ZOT-DGA API into your Express.js backend.</p>
        
        <div class="upload-form">
            <h3>Upload Image</h3>
            <form id="uploadForm" enctype="multipart/form-data">
                <input type="file" name="image" accept="image/*" required>
                <input type="text" name="tags" placeholder="Tags (optional)">
                <input type="text" name="description" placeholder="Description (optional)">
                <button type="submit">Upload</button>
            </form>
        </div>
        
        <div>
            <h3>Gallery</h3>
            <button onclick="loadGallery()">Refresh Gallery</button>
            <div id="gallery" class="gallery"></div>
        </div>

        <script>
            document.getElementById('uploadForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                
                try {
                    const response = await fetch('/api/upload', {
                        method: 'POST',
                        headers: { 'X-User-Id': 'demo-user' },
                        body: formData
                    });
                    
                    const result = await response.json();
                    if (result.success) {
                        alert('Upload successful!');
                        loadGallery();
                        e.target.reset();
                    } else {
                        alert('Upload failed: ' + result.message);
                    }
                } catch (error) {
                    alert('Upload failed: ' + error.message);
                }
            });

            async function loadGallery() {
                try {
                    const response = await fetch('/api/gallery');
                    const data = await response.json();
                    
                    const gallery = document.getElementById('gallery');
                    gallery.innerHTML = data.gallery.map(item => \`
                        <div class="image-item">
                            <img src="\${item.sizes.thumbnail}" alt="\${item.title}">
                            <h4>\${item.title}</h4>
                            <p>\${item.description || 'No description'}</p>
                            <small>\${new Date(item.createdAt).toLocaleDateString()}</small>
                        </div>
                    \`).join('');
                } catch (error) {
                    console.error('Failed to load gallery:', error);
                }
            }

            // Load gallery on page load
            loadGallery();
        </script>
    </body>
    </html>
  `);
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Example backend running on port ${PORT}`);
  console.log(`📖 Demo page: http://localhost:${PORT}`);
  console.log(`🔧 ZOT-DGA API: ${ZOT_DGA_CONFIG.baseURL}`);
});

module.exports = app;
