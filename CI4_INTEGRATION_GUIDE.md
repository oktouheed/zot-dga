# ZOT-DGA API Integration with CodeIgniter 4

This guide shows you how to integrate the ZOT-DGA Image Library API into your CodeIgniter 4 project.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation & Setup](#installation--setup)
3. [Configuration](#configuration)
4. [ZOT-DGA Service Library](#zot-dga-service-library)
5. [Controller Examples](#controller-examples)
6. [View Examples](#view-examples)
7. [Model Integration](#model-integration)
8. [Helper Functions](#helper-functions)
9. [Error Handling](#error-handling)
10. [Security Best Practices](#security-best-practices)
11. [Production Deployment](#production-deployment)

## 🔧 Prerequisites

- CodeIgniter 4.x
- PHP 7.4 or higher
- cURL extension enabled
- ZOT-DGA API running (locally or on server)

## 📦 Installation & Setup

### 1. Environment Configuration

Add ZOT-DGA configuration to your `.env` file:

```env
#--------------------------------------------------------------------
# ZOT-DGA API Configuration
#--------------------------------------------------------------------
ZOTDGA_BASE_URL = http://localhost:3000
ZOTDGA_API_KEY = 8c70b11f-3df5-4783-ae56-c105d98dced5
ZOTDGA_TIMEOUT = 30
ZOTDGA_MAX_FILE_SIZE = 52428800
```

### 2. Update Config Files

Create or update `app/Config/ZotDGA.php`:

```php
<?php

namespace Config;

use CodeIgniter\Config\BaseConfig;

class ZotDGA extends BaseConfig
{
    /**
     * ZOT-DGA API Base URL
     */
    public string $baseUrl;

    /**
     * API Key for authentication
     */
    public string $apiKey;

    /**
     * Request timeout in seconds
     */
    public int $timeout = 30;

    /**
     * Maximum file size in bytes (50MB default)
     */
    public int $maxFileSize = 52428800;

    /**
     * Allowed file types
     */
    public array $allowedTypes = [
        'image' => ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'],
        'video' => ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm']
    ];

    /**
     * Default folder for uploads
     */
    public string $defaultFolder = 'ci4-uploads';

    public function __construct()
    {
        parent::__construct();

        $this->baseUrl = env('ZOTDGA_BASE_URL', 'http://localhost:3000');
        $this->apiKey = env('ZOTDGA_API_KEY', '');
        $this->timeout = (int) env('ZOTDGA_TIMEOUT', 30);
        $this->maxFileSize = (int) env('ZOTDGA_MAX_FILE_SIZE', 52428800);
    }
}
```

## 🔧 ZOT-DGA Service Library

Create `app/Libraries/ZotDGAService.php`:

```php
<?php

namespace App\Libraries;

use Config\ZotDGA as ZotDGAConfig;
use CodeIgniter\HTTP\CURLRequest;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

class ZotDGAService
{
    protected ZotDGAConfig $config;
    protected CURLRequest $client;

    public function __construct()
    {
        $this->config = config('ZotDGA');
        $this->client = \Config\Services::curlrequest([
            'baseURI' => $this->config->baseUrl,
            'timeout' => $this->config->timeout,
            'headers' => [
                'Authorization' => 'Bearer ' . $this->config->apiKey,
                'User-Agent' => 'CodeIgniter4-ZotDGA-Client/1.0'
            ]
        ]);
    }

    /**
     * Upload an image file
     */
    public function uploadImage(string $filePath, array $options = []): array
    {
        $multipart = [
            [
                'name' => 'file',
                'contents' => fopen($filePath, 'r'),
                'filename' => basename($filePath)
            ]
        ];

        // Add optional fields
        if (!empty($options['folder'])) {
            $multipart[] = ['name' => 'folder', 'contents' => $options['folder']];
        }
        if (!empty($options['tags'])) {
            $multipart[] = ['name' => 'tags', 'contents' => $options['tags']];
        }
        if (!empty($options['description'])) {
            $multipart[] = ['name' => 'description', 'contents' => $options['description']];
        }

        try {
            $response = $this->client->post('/api/upload/image', [
                'multipart' => $multipart
            ]);

            return $this->handleResponse($response);
        } catch (\Exception $e) {
            log_message('error', 'ZOT-DGA Upload Error: ' . $e->getMessage());
            throw new \RuntimeException('Failed to upload image: ' . $e->getMessage());
        }
    }

    /**
     * Upload from uploaded file
     */
    public function uploadFromRequest(\CodeIgniter\Files\File $file, array $options = []): array
    {
        if (!$file->isValid()) {
            throw new \InvalidArgumentException('Invalid file upload');
        }

        // Validate file type
        $extension = $file->getExtension();
        $allowedTypes = array_merge(
            $this->config->allowedTypes['image'],
            $this->config->allowedTypes['video']
        );

        if (!in_array($extension, $allowedTypes)) {
            throw new \InvalidArgumentException('File type not allowed: ' . $extension);
        }

        // Validate file size
        if ($file->getSize() > $this->config->maxFileSize) {
            throw new \InvalidArgumentException('File size exceeds limit');
        }

        return $this->uploadImage($file->getTempName(), array_merge([
            'folder' => $this->config->defaultFolder
        ], $options));
    }

    /**
     * Get list of files
     */
    public function getFiles(array $params = []): array
    {
        try {
            $response = $this->client->get('/api/files', [
                'query' => $params
            ]);

            return $this->handleResponse($response);
        } catch (\Exception $e) {
            log_message('error', 'ZOT-DGA Get Files Error: ' . $e->getMessage());
            throw new \RuntimeException('Failed to get files: ' . $e->getMessage());
        }
    }

    /**
     * Delete a file
     */
    public function deleteFile(int $fileId): array
    {
        try {
            $response = $this->client->delete("/api/files/{$fileId}");
            return $this->handleResponse($response);
        } catch (\Exception $e) {
            log_message('error', 'ZOT-DGA Delete Error: ' . $e->getMessage());
            throw new \RuntimeException('Failed to delete file: ' . $e->getMessage());
        }
    }

    /**
     * Get image URL with optional resizing
     */
    public function getImageUrl(int $fileId, array $options = []): string
    {
        if (empty($options)) {
            return $this->config->baseUrl . "/uploads/{$fileId}";
        }

        $params = http_build_query(array_filter($options));
        return $this->config->baseUrl . "/api/process/resize/{$fileId}?" . $params;
    }

    /**
     * Get thumbnail URL
     */
    public function getThumbnailUrl(int $fileId, int $size = 300): string
    {
        return $this->getImageUrl($fileId, [
            'width' => $size,
            'height' => $size,
            'quality' => 80
        ]);
    }

    /**
     * Create folder
     */
    public function createFolder(string $name, ?int $parentId = null): array
    {
        $data = ['name' => $name];
        if ($parentId) {
            $data['parent_id'] = $parentId;
        }

        try {
            $response = $this->client->post('/api/folders', [
                'json' => $data
            ]);

            return $this->handleResponse($response);
        } catch (\Exception $e) {
            log_message('error', 'ZOT-DGA Create Folder Error: ' . $e->getMessage());
            throw new \RuntimeException('Failed to create folder: ' . $e->getMessage());
        }
    }

    /**
     * Get folders
     */
    public function getFolders(?int $parentId = null): array
    {
        $params = $parentId ? ['parent_id' => $parentId] : [];

        try {
            $response = $this->client->get('/api/folders', [
                'query' => $params
            ]);

            return $this->handleResponse($response);
        } catch (\Exception $e) {
            log_message('error', 'ZOT-DGA Get Folders Error: ' . $e->getMessage());
            throw new \RuntimeException('Failed to get folders: ' . $e->getMessage());
        }
    }

    /**
     * Check API health
     */
    public function healthCheck(): array
    {
        try {
            $response = $this->client->get('/health');
            return $this->handleResponse($response);
        } catch (\Exception $e) {
            log_message('error', 'ZOT-DGA Health Check Error: ' . $e->getMessage());
            throw new \RuntimeException('API health check failed: ' . $e->getMessage());
        }
    }

    /**
     * Handle API response
     */
    private function handleResponse(ResponseInterface $response): array
    {
        $statusCode = $response->getStatusCode();
        $body = $response->getBody();

        if ($statusCode >= 200 && $statusCode < 300) {
            return json_decode($body, true) ?? [];
        }

        $error = json_decode($body, true);
        $message = $error['message'] ?? 'Unknown API error';
        
        log_message('error', "ZOT-DGA API Error [{$statusCode}]: {$message}");
        throw new \RuntimeException("API Error: {$message}", $statusCode);
    }
}
```

## 🎮 Controller Examples

### Gallery Controller

Create `app/Controllers/Gallery.php`:

```php
<?php

namespace App\Controllers;

use App\Libraries\ZotDGAService;
use CodeIgniter\Files\File;

class Gallery extends BaseController
{
    protected ZotDGAService $zotDGA;

    public function __construct()
    {
        $this->zotDGA = new ZotDGAService();
    }

    /**
     * Display gallery page
     */
    public function index()
    {
        try {
            // Get images from ZOT-DGA
            $data['images'] = $this->zotDGA->getFiles([
                'type' => 'image',
                'limit' => 20,
                'folder' => 'ci4-gallery'
            ]);

            // Get folders for organization
            $data['folders'] = $this->zotDGA->getFolders();

            return view('gallery/index', $data);
        } catch (\Exception $e) {
            return redirect()->to('/gallery')->with('error', $e->getMessage());
        }
    }

    /**
     * Upload form
     */
    public function upload()
    {
        if ($this->request->getMethod() === 'POST') {
            return $this->processUpload();
        }

        // Get folders for dropdown
        try {
            $data['folders'] = $this->zotDGA->getFolders();
            return view('gallery/upload', $data);
        } catch (\Exception $e) {
            return redirect()->to('/gallery')->with('error', 'Could not load upload form');
        }
    }

    /**
     * Process file upload
     */
    private function processUpload()
    {
        $validation = \Config\Services::validation();

        $rules = [
            'image' => [
                'label' => 'Image File',
                'rules' => 'uploaded[image]|max_size[image,51200]|ext_in[image,jpg,jpeg,png,gif,webp]'
            ],
            'title' => 'required|min_length[3]|max_length[100]',
            'description' => 'permit_empty|max_length[500]'
        ];

        if (!$this->validate($rules)) {
            return view('gallery/upload', [
                'validation' => $this->validator,
                'folders' => $this->zotDGA->getFolders()
            ]);
        }

        try {
            $file = $this->request->getFile('image');
            $title = $this->request->getPost('title');
            $description = $this->request->getPost('description');
            $folder = $this->request->getPost('folder') ?: 'ci4-gallery';

            // Upload to ZOT-DGA
            $result = $this->zotDGA->uploadFromRequest($file, [
                'folder' => $folder,
                'tags' => 'ci4,gallery,' . $title,
                'description' => $description
            ]);

            // Save to local database if needed
            $this->saveToDatabase($result, $title, $description);

            return redirect()->to('/gallery')->with('success', 'Image uploaded successfully!');

        } catch (\Exception $e) {
            log_message('error', 'Upload failed: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Upload failed: ' . $e->getMessage());
        }
    }

    /**
     * Delete image
     */
    public function delete($fileId)
    {
        try {
            $this->zotDGA->deleteFile($fileId);
            
            // Remove from local database if needed
            $this->removeFromDatabase($fileId);

            return redirect()->to('/gallery')->with('success', 'Image deleted successfully!');
        } catch (\Exception $e) {
            return redirect()->to('/gallery')->with('error', 'Delete failed: ' . $e->getMessage());
        }
    }

    /**
     * AJAX endpoint for file list
     */
    public function api()
    {
        try {
            $page = (int) ($this->request->getGet('page') ?? 1);
            $limit = (int) ($this->request->getGet('limit') ?? 12);
            $folder = $this->request->getGet('folder');

            $params = [
                'type' => 'image',
                'page' => $page,
                'limit' => $limit
            ];

            if ($folder) {
                $params['folder'] = $folder;
            }

            $files = $this->zotDGA->getFiles($params);

            // Add thumbnail URLs
            foreach ($files['files'] as &$file) {
                $file['thumbnail_url'] = $this->zotDGA->getThumbnailUrl($file['id']);
                $file['full_url'] = $this->zotDGA->getImageUrl($file['id']);
            }

            return $this->response->setJSON($files);
        } catch (\Exception $e) {
            return $this->response->setStatusCode(500)->setJSON([
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Save file info to local database (optional)
     */
    private function saveToDatabase(array $fileData, string $title, string $description): void
    {
        // Example: Save to local images table
        $model = model('ImageModel');
        $model->insert([
            'zot_dga_id' => $fileData['file']['id'],
            'title' => $title,
            'description' => $description,
            'original_name' => $fileData['file']['originalName'],
            'file_size' => $fileData['file']['size'],
            'mime_type' => $fileData['file']['mimeType'],
            'url' => $fileData['file']['url'],
            'created_at' => date('Y-m-d H:i:s')
        ]);
    }

    /**
     * Remove from local database (optional)
     */
    private function removeFromDatabase(int $fileId): void
    {
        $model = model('ImageModel');
        $model->where('zot_dga_id', $fileId)->delete();
    }
}
```

### User Profile Controller (with image upload)

Create `app/Controllers/Profile.php`:

```php
<?php

namespace App\Controllers;

use App\Libraries\ZotDGAService;

class Profile extends BaseController
{
    protected ZotDGAService $zotDGA;

    public function __construct()
    {
        $this->zotDGA = new ZotDGAService();
    }

    /**
     * Update user avatar
     */
    public function updateAvatar()
    {
        if ($this->request->getMethod() !== 'POST') {
            return redirect()->back();
        }

        $validation = \Config\Services::validation();
        $rules = [
            'avatar' => 'uploaded[avatar]|max_size[avatar,2048]|ext_in[avatar,jpg,jpeg,png]'
        ];

        if (!$this->validate($rules)) {
            return redirect()->back()->with('error', 'Invalid avatar file');
        }

        try {
            $userId = session()->get('user_id'); // Assuming you have user session
            $file = $this->request->getFile('avatar');

            // Upload to ZOT-DGA
            $result = $this->zotDGA->uploadFromRequest($file, [
                'folder' => "user-{$userId}/avatars",
                'tags' => 'avatar,profile',
                'description' => "Avatar for user {$userId}"
            ]);

            // Get optimized avatar URLs
            $avatarUrls = [
                'thumbnail' => $this->zotDGA->getThumbnailUrl($result['file']['id'], 150),
                'medium' => $this->zotDGA->getImageUrl($result['file']['id'], ['width' => 400, 'height' => 400]),
                'original' => $this->zotDGA->getImageUrl($result['file']['id'])
            ];

            // Update user record
            $userModel = model('UserModel');
            $userModel->update($userId, [
                'avatar_zot_id' => $result['file']['id'],
                'avatar_urls' => json_encode($avatarUrls),
                'updated_at' => date('Y-m-d H:i:s')
            ]);

            return redirect()->back()->with('success', 'Avatar updated successfully!');

        } catch (\Exception $e) {
            log_message('error', 'Avatar upload failed: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to update avatar');
        }
    }
}
```

## 🎨 View Examples

### Gallery Index View

Create `app/Views/gallery/index.php`:

```php
<?= $this->extend('layouts/main') ?>

<?= $this->section('title') ?>Gallery<?= $this->endSection() ?>

<?= $this->section('content') ?>
<div class="container mt-4">
    <div class="row">
        <div class="col-md-12">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2>Gallery</h2>
                <a href="<?= base_url('gallery/upload') ?>" class="btn btn-primary">
                    <i class="fas fa-plus"></i> Upload Image
                </a>
            </div>

            <?php if (session()->getFlashdata('success')): ?>
                <div class="alert alert-success"><?= session()->getFlashdata('success') ?></div>
            <?php endif; ?>

            <?php if (session()->getFlashdata('error')): ?>
                <div class="alert alert-danger"><?= session()->getFlashdata('error') ?></div>
            <?php endif; ?>

            <!-- Folder Filter -->
            <div class="mb-3">
                <select id="folderFilter" class="form-select" style="width: 200px;">
                    <option value="">All Folders</option>
                    <?php if (isset($folders['folders'])): ?>
                        <?php foreach ($folders['folders'] as $folder): ?>
                            <option value="<?= esc($folder['name']) ?>">
                                <?= esc($folder['name']) ?>
                            </option>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </select>
            </div>

            <!-- Image Grid -->
            <div id="imageGrid" class="row g-3">
                <!-- Images will be loaded here via AJAX -->
            </div>

            <!-- Loading indicator -->
            <div id="loading" class="text-center mt-4 d-none">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>

            <!-- Load More Button -->
            <div class="text-center mt-4">
                <button id="loadMore" class="btn btn-outline-primary">Load More</button>
            </div>
        </div>
    </div>
</div>

<!-- Image Modal -->
<div class="modal fade" id="imageModal" tabindex="-1">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="imageTitle"></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body text-center">
                <img id="modalImage" src="" class="img-fluid" alt="">
                <p id="imageDescription" class="mt-3"></p>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-danger" id="deleteImage">Delete</button>
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
</div>

<script>
class GalleryManager {
    constructor() {
        this.currentPage = 1;
        this.loading = false;
        this.hasMore = true;
        this.currentFolder = '';
        this.currentImageId = null;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadImages();
    }

    bindEvents() {
        // Folder filter
        document.getElementById('folderFilter').addEventListener('change', (e) => {
            this.currentFolder = e.target.value;
            this.resetAndLoad();
        });

        // Load more button
        document.getElementById('loadMore').addEventListener('click', () => {
            this.loadImages();
        });

        // Delete image
        document.getElementById('deleteImage').addEventListener('click', () => {
            this.deleteCurrentImage();
        });
    }

    resetAndLoad() {
        this.currentPage = 1;
        this.hasMore = true;
        document.getElementById('imageGrid').innerHTML = '';
        this.loadImages();
    }

    async loadImages() {
        if (this.loading || !this.hasMore) return;

        this.loading = true;
        this.showLoading();

        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: 12
            });

            if (this.currentFolder) {
                params.append('folder', this.currentFolder);
            }

            const response = await fetch(`<?= base_url('gallery/api') ?>?${params}`);
            const data = await response.json();

            if (data.files && data.files.length > 0) {
                this.renderImages(data.files);
                this.currentPage++;
                
                // Check if there are more images
                this.hasMore = data.files.length === 12;
            } else {
                this.hasMore = false;
            }

            this.updateLoadMoreButton();
        } catch (error) {
            console.error('Failed to load images:', error);
            this.showError('Failed to load images');
        } finally {
            this.loading = false;
            this.hideLoading();
        }
    }

    renderImages(images) {
        const grid = document.getElementById('imageGrid');

        images.forEach(image => {
            const col = document.createElement('div');
            col.className = 'col-md-3 col-sm-6';
            col.innerHTML = `
                <div class="card h-100">
                    <img src="${image.thumbnail_url}" 
                         class="card-img-top" 
                         style="height: 200px; object-fit: cover; cursor: pointer;"
                         onclick="gallery.showImage(${image.id}, '${image.original_name}', '${image.full_url}', '${image.description || ''}')"
                         alt="${image.original_name}">
                    <div class="card-body p-2">
                        <h6 class="card-title small">${image.original_name}</h6>
                        <small class="text-muted">${this.formatFileSize(image.file_size)}</small>
                    </div>
                </div>
            `;
            grid.appendChild(col);
        });
    }

    showImage(id, title, url, description) {
        this.currentImageId = id;
        document.getElementById('imageTitle').textContent = title;
        document.getElementById('modalImage').src = url;
        document.getElementById('imageDescription').textContent = description || 'No description';
        
        new bootstrap.Modal(document.getElementById('imageModal')).show();
    }

    async deleteCurrentImage() {
        if (!this.currentImageId) return;

        if (!confirm('Are you sure you want to delete this image?')) return;

        try {
            const response = await fetch(`<?= base_url('gallery/delete') ?>/${this.currentImageId}`, {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (response.ok) {
                bootstrap.Modal.getInstance(document.getElementById('imageModal')).hide();
                this.resetAndLoad();
                this.showSuccess('Image deleted successfully');
            } else {
                throw new Error('Delete failed');
            }
        } catch (error) {
            this.showError('Failed to delete image');
        }
    }

    showLoading() {
        document.getElementById('loading').classList.remove('d-none');
    }

    hideLoading() {
        document.getElementById('loading').classList.add('d-none');
    }

    updateLoadMoreButton() {
        const button = document.getElementById('loadMore');
        button.style.display = this.hasMore ? 'block' : 'none';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showSuccess(message) {
        // Implement your success notification
        alert(message);
    }

    showError(message) {
        // Implement your error notification
        alert(message);
    }
}

// Initialize gallery
const gallery = new GalleryManager();
</script>
<?= $this->endSection() ?>
```

### Upload Form View

Create `app/Views/gallery/upload.php`:

```php
<?= $this->extend('layouts/main') ?>

<?= $this->section('title') ?>Upload Image<?= $this->endSection() ?>

<?= $this->section('content') ?>
<div class="container mt-4">
    <div class="row justify-content-center">
        <div class="col-md-8">
            <div class="card">
                <div class="card-header">
                    <h4>Upload New Image</h4>
                </div>
                <div class="card-body">
                    <?= form_open_multipart('gallery/upload', ['id' => 'uploadForm']) ?>
                    
                    <?php if (isset($validation)): ?>
                        <div class="alert alert-danger">
                            <?= $validation->listErrors() ?>
                        </div>
                    <?php endif; ?>

                    <?php if (session()->getFlashdata('error')): ?>
                        <div class="alert alert-danger"><?= session()->getFlashdata('error') ?></div>
                    <?php endif; ?>

                    <div class="mb-3">
                        <label for="image" class="form-label">Image File *</label>
                        <input type="file" 
                               class="form-control" 
                               id="image" 
                               name="image" 
                               accept="image/*" 
                               required>
                        <div class="form-text">
                            Allowed: JPG, PNG, GIF, WebP (Max: 50MB)
                        </div>
                    </div>

                    <div class="mb-3">
                        <label for="title" class="form-label">Title *</label>
                        <input type="text" 
                               class="form-control" 
                               id="title" 
                               name="title" 
                               value="<?= old('title') ?>" 
                               required>
                    </div>

                    <div class="mb-3">
                        <label for="description" class="form-label">Description</label>
                        <textarea class="form-control" 
                                  id="description" 
                                  name="description" 
                                  rows="3"><?= old('description') ?></textarea>
                    </div>

                    <div class="mb-3">
                        <label for="folder" class="form-label">Folder</label>
                        <select class="form-select" id="folder" name="folder">
                            <option value="ci4-gallery">Default Gallery</option>
                            <?php if (isset($folders['folders'])): ?>
                                <?php foreach ($folders['folders'] as $folder): ?>
                                    <option value="<?= esc($folder['name']) ?>">
                                        <?= esc($folder['name']) ?>
                                    </option>
                                <?php endforeach; ?>
                            <?php endif; ?>
                            <option value="" data-custom="true">Create New Folder...</option>
                        </select>
                    </div>

                    <div class="mb-3 d-none" id="newFolderGroup">
                        <label for="newFolder" class="form-label">New Folder Name</label>
                        <input type="text" class="form-control" id="newFolder" name="new_folder">
                    </div>

                    <!-- Image Preview -->
                    <div class="mb-3">
                        <div id="imagePreview" class="d-none">
                            <img id="previewImg" src="" class="img-thumbnail" style="max-width: 300px;">
                        </div>
                    </div>

                    <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                        <a href="<?= base_url('gallery') ?>" class="btn btn-secondary">Cancel</a>
                        <button type="submit" class="btn btn-primary" id="submitBtn">
                            <span id="submitText">Upload Image</span>
                            <span id="submitSpinner" class="spinner-border spinner-border-sm d-none" role="status">
                                <span class="visually-hidden">Uploading...</span>
                            </span>
                        </button>
                    </div>

                    <?= form_close() ?>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
    const imageInput = document.getElementById('image');
    const folderSelect = document.getElementById('folder');
    const newFolderGroup = document.getElementById('newFolderGroup');
    const previewDiv = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    const uploadForm = document.getElementById('uploadForm');
    const submitBtn = document.getElementById('submitBtn');
    const submitText = document.getElementById('submitText');
    const submitSpinner = document.getElementById('submitSpinner');

    // Image preview
    imageInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                alert('Please select a valid image file (JPG, PNG, GIF, WebP)');
                this.value = '';
                previewDiv.classList.add('d-none');
                return;
            }

            // Validate file size (50MB)
            if (file.size > 52428800) {
                alert('File size must be less than 50MB');
                this.value = '';
                previewDiv.classList.add('d-none');
                return;
            }

            // Show preview
            const reader = new FileReader();
            reader.onload = function(e) {
                previewImg.src = e.target.result;
                previewDiv.classList.remove('d-none');
            };
            reader.readAsDataURL(file);

            // Auto-fill title if empty
            const titleInput = document.getElementById('title');
            if (!titleInput.value) {
                titleInput.value = file.name.replace(/\.[^/.]+$/, "");
            }
        } else {
            previewDiv.classList.add('d-none');
        }
    });

    // Folder selection
    folderSelect.addEventListener('change', function() {
        const selected = this.options[this.selectedIndex];
        if (selected.dataset.custom === 'true') {
            newFolderGroup.classList.remove('d-none');
            document.getElementById('newFolder').required = true;
        } else {
            newFolderGroup.classList.add('d-none');
            document.getElementById('newFolder').required = false;
        }
    });

    // Form submission
    uploadForm.addEventListener('submit', function() {
        submitBtn.disabled = true;
        submitText.classList.add('d-none');
        submitSpinner.classList.remove('d-none');
    });
});
</script>
<?= $this->endSection() ?>
```

## 🗄️ Model Integration

Create `app/Models/ImageModel.php` (optional, for local database storage):

```php
<?php

namespace App\Models;

use CodeIgniter\Model;

class ImageModel extends Model
{
    protected $table = 'images';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'zot_dga_id',
        'user_id',
        'title',
        'description',
        'original_name',
        'file_size',
        'mime_type',
        'url',
        'thumbnail_url',
        'folder',
        'tags',
        'is_active'
    ];

    protected $useTimestamps = true;
    protected $dateFormat = 'datetime';
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $validationRules = [
        'zot_dga_id' => 'required|integer',
        'title' => 'required|min_length[3]|max_length[255]',
        'original_name' => 'required|max_length[255]',
        'file_size' => 'required|integer',
        'mime_type' => 'required|max_length[100]',
        'url' => 'required|valid_url'
    ];

    /**
     * Get images with ZOT-DGA URLs
     */
    public function getImagesWithUrls(int $limit = 20, int $offset = 0): array
    {
        $zotDGA = new \App\Libraries\ZotDGAService();
        
        $images = $this->where('is_active', 1)
                       ->orderBy('created_at', 'DESC')
                       ->findAll($limit, $offset);

        // Add current URLs from ZOT-DGA
        foreach ($images as &$image) {
            $image['current_url'] = $zotDGA->getImageUrl($image['zot_dga_id']);
            $image['thumbnail_url'] = $zotDGA->getThumbnailUrl($image['zot_dga_id']);
        }

        return $images;
    }

    /**
     * Sync with ZOT-DGA API
     */
    public function syncWithZotDGA(): array
    {
        $zotDGA = new \App\Libraries\ZotDGAService();
        
        try {
            $apiFiles = $zotDGA->getFiles(['type' => 'image', 'limit' => 1000]);
            $synced = 0;
            $errors = [];

            foreach ($apiFiles['files'] as $file) {
                $existing = $this->where('zot_dga_id', $file['id'])->first();
                
                if (!$existing) {
                    try {
                        $this->insert([
                            'zot_dga_id' => $file['id'],
                            'title' => $file['original_name'],
                            'original_name' => $file['original_name'],
                            'file_size' => $file['file_size'],
                            'mime_type' => $file['mime_type'],
                            'url' => $file['url'],
                            'folder' => $file['folder'] ?? 'default',
                            'is_active' => 1
                        ]);
                        $synced++;
                    } catch (\Exception $e) {
                        $errors[] = "Failed to sync file {$file['id']}: " . $e->getMessage();
                    }
                }
            }

            return [
                'synced' => $synced,
                'errors' => $errors,
                'total_api_files' => count($apiFiles['files'])
            ];

        } catch (\Exception $e) {
            throw new \RuntimeException('Sync failed: ' . $e->getMessage());
        }
    }
}
```

## 🔧 Helper Functions

Create `app/Helpers/zotdga_helper.php`:

```php
<?php

if (!function_exists('zot_image_url')) {
    /**
     * Get ZOT-DGA image URL with optional resizing
     */
    function zot_image_url(int $fileId, array $options = []): string
    {
        $zotDGA = new \App\Libraries\ZotDGAService();
        return $zotDGA->getImageUrl($fileId, $options);
    }
}

if (!function_exists('zot_thumbnail')) {
    /**
     * Get ZOT-DGA thumbnail URL
     */
    function zot_thumbnail(int $fileId, int $size = 300): string
    {
        $zotDGA = new \App\Libraries\ZotDGAService();
        return $zotDGA->getThumbnailUrl($fileId, $size);
    }
}

if (!function_exists('zot_responsive_image')) {
    /**
     * Generate responsive image HTML
     */
    function zot_responsive_image(int $fileId, string $alt = '', array $options = []): string
    {
        $zotDGA = new \App\Libraries\ZotDGAService();
        
        $small = $zotDGA->getImageUrl($fileId, ['width' => 480, 'quality' => 80]);
        $medium = $zotDGA->getImageUrl($fileId, ['width' => 768, 'quality' => 85]);
        $large = $zotDGA->getImageUrl($fileId, ['width' => 1200, 'quality' => 90]);
        $original = $zotDGA->getImageUrl($fileId);
        
        $class = $options['class'] ?? 'img-fluid';
        $loading = $options['loading'] ?? 'lazy';
        
        return sprintf(
            '<img src="%s" srcset="%s 480w, %s 768w, %s 1200w" sizes="(max-width: 480px) 480px, (max-width: 768px) 768px, 1200px" alt="%s" class="%s" loading="%s">',
            esc($small),
            esc($small),
            esc($medium),
            esc($large),
            esc($alt),
            esc($class),
            esc($loading)
        );
    }
}

if (!function_exists('zot_upload_widget')) {
    /**
     * Generate upload widget HTML
     */
    function zot_upload_widget(array $options = []): string
    {
        $id = $options['id'] ?? 'zot-upload-' . uniqid();
        $multiple = $options['multiple'] ?? false;
        $accept = $options['accept'] ?? 'image/*';
        $maxSize = $options['maxSize'] ?? '50MB';
        
        return sprintf(
            '<div class="zot-upload-widget" id="%s">
                <div class="upload-area border-2 border-dashed p-4 text-center">
                    <i class="fas fa-cloud-upload-alt fa-3x text-muted mb-3"></i>
                    <p class="mb-2">Drag & drop files here or click to browse</p>
                    <small class="text-muted">Max size: %s</small>
                    <input type="file" class="d-none" accept="%s" %s>
                </div>
                <div class="upload-progress mt-3 d-none">
                    <div class="progress">
                        <div class="progress-bar" role="progressbar" style="width: 0%%"></div>
                    </div>
                </div>
            </div>',
            esc($id),
            esc($maxSize),
            esc($accept),
            $multiple ? 'multiple' : ''
        );
    }
}
```

Load the helper in `app/Config/Autoload.php`:

```php
public $helpers = ['zotdga'];
```

## 🚨 Error Handling

Create `app/Controllers/ZotDGAController.php` for centralized error handling:

```php
<?php

namespace App\Controllers;

use App\Libraries\ZotDGAService;

class ZotDGAController extends BaseController
{
    protected ZotDGAService $zotDGA;

    public function __construct()
    {
        $this->zotDGA = new ZotDGAService();
    }

    /**
     * Health check endpoint
     */
    public function health()
    {
        try {
            $health = $this->zotDGA->healthCheck();
            
            return $this->response->setJSON([
                'status' => 'success',
                'zot_dga' => $health,
                'ci4' => [
                    'version' => \CodeIgniter\CodeIgniter::CI_VERSION,
                    'environment' => ENVIRONMENT
                ]
            ]);
        } catch (\Exception $e) {
            return $this->response
                ->setStatusCode(503)
                ->setJSON([
                    'status' => 'error',
                    'message' => 'ZOT-DGA API unavailable',
                    'error' => $e->getMessage()
                ]);
        }
    }

    /**
     * Test upload functionality
     */
    public function test()
    {
        // Create a test image
        $testImage = WRITEPATH . 'uploads/test-image.png';
        
        if (!file_exists($testImage)) {
            // Create a simple test image
            $image = imagecreate(200, 200);
            $bgColor = imagecolorallocate($image, 255, 255, 255);
            $textColor = imagecolorallocate($image, 0, 0, 0);
            imagestring($image, 5, 50, 90, 'TEST', $textColor);
            imagepng($image, $testImage);
            imagedestroy($image);
        }

        try {
            $result = $this->zotDGA->uploadImage($testImage, [
                'folder' => 'ci4-test',
                'description' => 'CI4 Integration Test'
            ]);

            // Clean up
            unlink($testImage);

            return $this->response->setJSON([
                'status' => 'success',
                'message' => 'Upload test successful',
                'result' => $result
            ]);

        } catch (\Exception $e) {
            // Clean up on error
            if (file_exists($testImage)) {
                unlink($testImage);
            }

            return $this->response
                ->setStatusCode(500)
                ->setJSON([
                    'status' => 'error',
                    'message' => 'Upload test failed',
                    'error' => $e->getMessage()
                ]);
        }
    }
}
```

## 🔐 Security Best Practices

### 1. Environment Security

```php
// app/Config/ZotDGA.php - Add validation
public function __construct()
{
    parent::__construct();

    $this->baseUrl = env('ZOTDGA_BASE_URL', 'http://localhost:3000');
    $this->apiKey = env('ZOTDGA_API_KEY', '');

    // Validate configuration
    if (empty($this->apiKey)) {
        throw new \InvalidArgumentException('ZOT-DGA API key is required');
    }

    if (!filter_var($this->baseUrl, FILTER_VALIDATE_URL)) {
        throw new \InvalidArgumentException('Invalid ZOT-DGA base URL');
    }
}
```

### 2. File Upload Security

```php
// Add to ZotDGAService.php
private function validateFile(string $filePath): void
{
    // Check file exists
    if (!file_exists($filePath)) {
        throw new \InvalidArgumentException('File does not exist');
    }

    // Check file size
    $fileSize = filesize($filePath);
    if ($fileSize > $this->config->maxFileSize) {
        throw new \InvalidArgumentException('File too large');
    }

    // Check MIME type
    $finfo = new \finfo(FILEINFO_MIME_TYPE);
    $mimeType = $finfo->file($filePath);
    
    $allowedMimes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/avi', 'video/quicktime'
    ];

    if (!in_array($mimeType, $allowedMimes)) {
        throw new \InvalidArgumentException('Invalid file type: ' . $mimeType);
    }
}
```

### 3. Rate Limiting

Create `app/Filters/ZotDGARateLimit.php`:

```php
<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

class ZotDGARateLimit implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        $session = session();
        $key = 'zot_dga_uploads_' . $request->getIPAddress();
        $limit = 10; // uploads per hour
        $window = 3600; // 1 hour

        $attempts = $session->get($key) ?? [];
        $now = time();

        // Clean old attempts
        $attempts = array_filter($attempts, function($time) use ($now, $window) {
            return ($now - $time) < $window;
        });

        if (count($attempts) >= $limit) {
            return service('response')
                ->setStatusCode(429)
                ->setJSON(['error' => 'Rate limit exceeded']);
        }

        // Record this attempt
        $attempts[] = $now;
        $session->set($key, $attempts);
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        // Nothing to do here
    }
}
```

## 🚀 Production Deployment

### 1. Environment Configuration

```env
# Production .env
CI_ENVIRONMENT = production

# ZOT-DGA Production Settings
ZOTDGA_BASE_URL = https://your-api-domain.com
ZOTDGA_API_KEY = your-production-api-key
ZOTDGA_TIMEOUT = 60
ZOTDGA_MAX_FILE_SIZE = 104857600

# Security
security.csrfProtection = cookie
security.tokenRandomize = true
security.tokenName = csrf_token_name
security.headerName = X-CSRF-TOKEN
security.cookieName = csrf_cookie_name
```

### 2. Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-ci4-domain.com;
    root /var/www/ci4-app/public;
    index index.php;

    # Large file uploads
    client_max_body_size 100M;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        
        # Increase timeouts for large uploads
        fastcgi_read_timeout 300;
        fastcgi_send_timeout 300;
    }

    # Deny access to system files
    location ~ ^/(\.user\.ini|\.htaccess|\.git) {
        deny all;
    }
}
```

### 3. Database Migration

Create `app/Database/Migrations/2024-01-01-000001_CreateImagesTable.php`:

```php
<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateImagesTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
                'auto_increment' => true,
            ],
            'zot_dga_id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
            ],
            'user_id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
                'null' => true,
            ],
            'title' => [
                'type' => 'VARCHAR',
                'constraint' => 255,
            ],
            'description' => [
                'type' => 'TEXT',
                'null' => true,
            ],
            'original_name' => [
                'type' => 'VARCHAR',
                'constraint' => 255,
            ],
            'file_size' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
            ],
            'mime_type' => [
                'type' => 'VARCHAR',
                'constraint' => 100,
            ],
            'url' => [
                'type' => 'TEXT',
            ],
            'thumbnail_url' => [
                'type' => 'TEXT',
                'null' => true,
            ],
            'folder' => [
                'type' => 'VARCHAR',
                'constraint' => 255,
                'null' => true,
            ],
            'tags' => [
                'type' => 'TEXT',
                'null' => true,
            ],
            'is_active' => [
                'type' => 'TINYINT',
                'constraint' => 1,
                'default' => 1,
            ],
            'created_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            'updated_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
        ]);

        $this->forge->addKey('id', true);
        $this->forge->addKey('zot_dga_id');
        $this->forge->addKey('user_id');
        $this->forge->addKey(['folder', 'is_active']);
        $this->forge->createTable('images');
    }

    public function down()
    {
        $this->forge->dropTable('images');
    }
}
```

Run migration:
```bash
php spark migrate
```

## 🧪 Testing

Create tests in `tests/app/Libraries/ZotDGAServiceTest.php`:

```php
<?php

namespace Tests\App\Libraries;

use CodeIgniter\Test\CIUnitTestCase;
use App\Libraries\ZotDGAService;

class ZotDGAServiceTest extends CIUnitTestCase
{
    protected ZotDGAService $zotDGA;

    protected function setUp(): void
    {
        parent::setUp();
        $this->zotDGA = new ZotDGAService();
    }

    public function testHealthCheck()
    {
        try {
            $result = $this->zotDGA->healthCheck();
            $this->assertIsArray($result);
            $this->assertArrayHasKey('status', $result);
        } catch (\Exception $e) {
            $this->markTestSkipped('ZOT-DGA API not available: ' . $e->getMessage());
        }
    }

    public function testGetImageUrl()
    {
        $url = $this->zotDGA->getImageUrl(123);
        $this->assertStringContains('/uploads/123', $url);
    }

    public function testGetThumbnailUrl()
    {
        $url = $this->zotDGA->getThumbnailUrl(123, 150);
        $this->assertStringContains('width=150', $url);
        $this->assertStringContains('height=150', $url);
    }
}
```

Run tests:
```bash
vendor/bin/phpunit
```

---

## 🎉 Quick Start Summary

1. **Install**: Copy files to your CI4 project
2. **Configure**: Set up `.env` with your ZOT-DGA API details
3. **Routes**: Add routes to `app/Config/Routes.php`:
   ```php
   $routes->group('gallery', function($routes) {
       $routes->get('/', 'Gallery::index');
       $routes->match(['get', 'post'], 'upload', 'Gallery::upload');
       $routes->post('delete/(:num)', 'Gallery::delete/$1');
       $routes->get('api', 'Gallery::api');
   });
   ```
4. **Database**: Run migrations if using local storage
5. **Test**: Visit `/gallery` in your application

Your CodeIgniter 4 application is now fully integrated with ZOT-DGA! 🚀
