# ZOT-DGA API Integration Guide

This guide shows how to integrate the ZOT-DGA Image Library API into your applications across different platforms and frameworks.

## Table of Contents

1. [Quick Start](#quick-start)
2. [JavaScript/Node.js Integration](#javascriptnodejs)
3. [React Frontend Integration](#react-frontend)
4. [Vue.js Integration](#vuejs-integration)
5. [Python Integration](#python-integration)
6. [PHP Integration](#php-integration)
7. [Mobile App Integration](#mobile-integration)
8. [WordPress Plugin](#wordpress-integration)
9. [API Client Libraries](#api-client-libraries)

## Quick Start

### 1. Get Your API Key

First, register a user or use the admin credentials:

```bash
# Register a new user
curl -X POST http://your-domain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "your-password",
    "name": "Your Name"
  }'
```

Response includes your API key:
```json
{
  "user": {
    "apiKey": "your-api-key-here"
  }
}
```

### 2. Basic Usage Pattern

All API requests require authentication:
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  http://your-domain.com/api/endpoint
```

---

## JavaScript/Node.js

### Basic Setup

```javascript
// config.js
const API_CONFIG = {
  baseURL: 'http://localhost:3000', // or your production URL
  apiKey: 'your-api-key-here'
};

// api-client.js
class ZotDGAClient {
  constructor(baseURL, apiKey) {
    this.baseURL = baseURL;
    this.apiKey = apiKey;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        ...options.headers
      },
      ...options
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  // Upload single image
  async uploadImage(file, options = {}) {
    const formData = new FormData();
    formData.append('file', file);
    
    if (options.folder) formData.append('folder', options.folder);
    if (options.tags) formData.append('tags', options.tags);
    if (options.description) formData.append('description', options.description);
    
    return this.request('/api/upload/image', {
      method: 'POST',
      body: formData
    });
  }

  // Get all files
  async getFiles(params = {}) {
    const searchParams = new URLSearchParams(params);
    return this.request(`/api/files?${searchParams}`);
  }

  // Resize image
  getResizedImageUrl(fileId, width, height, quality = 80) {
    return `${this.baseURL}/api/process/resize/${fileId}?width=${width}&height=${height}&quality=${quality}`;
  }

  // Get thumbnail
  getThumbnailUrl(fileId, size = 300) {
    return `${this.baseURL}/api/process/thumbnail/${fileId}?size=${size}`;
  }

  // Delete file
  async deleteFile(fileId) {
    return this.request(`/api/files/${fileId}`, {
      method: 'DELETE'
    });
  }

  // Create folder
  async createFolder(name, description = '') {
    return this.request('/api/folders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, description })
    });
  }
}

// Usage
const client = new ZotDGAClient(API_CONFIG.baseURL, API_CONFIG.apiKey);
```

### Node.js Example

```javascript
// server.js - Express.js backend
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Middleware to proxy uploads to ZOT-DGA
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });
    
    if (req.body.folder) formData.append('folder', req.body.folder);

    const response = await axios.post(
      'http://localhost:3000/api/upload/image',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${process.env.ZOT_DGA_API_KEY}`,
          ...formData.getHeaders()
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001);
```

---

## React Frontend

### Setup

```bash
npm install axios
```

### React Hook for Image Management

```jsx
// hooks/useZotDGA.js
import { useState, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_ZOT_DGA_URL || 'http://localhost:3000';
const API_KEY = process.env.REACT_APP_ZOT_DGA_API_KEY;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${API_KEY}`
  }
});

export const useZotDGA = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const uploadImage = useCallback(async (file, options = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      Object.keys(options).forEach(key => {
        formData.append(key, options[key]);
      });

      const response = await api.post('/api/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setLoading(false);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setLoading(false);
      throw err;
    }
  }, []);

  const getFiles = useCallback(async (params = {}) => {
    try {
      const response = await api.get('/api/files', { params });
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      throw err;
    }
  }, []);

  const deleteFile = useCallback(async (fileId) => {
    try {
      await api.delete(`/api/files/${fileId}`);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      throw err;
    }
  }, []);

  const getImageUrl = useCallback((fileId, options = {}) => {
    const { width, height, quality = 80 } = options;
    if (width || height) {
      return `${API_BASE_URL}/api/process/resize/${fileId}?width=${width || 'auto'}&height=${height || 'auto'}&quality=${quality}`;
    }
    return `${API_BASE_URL}/uploads/${fileId}`;
  }, []);

  return {
    uploadImage,
    getFiles,
    deleteFile,
    getImageUrl,
    loading,
    error
  };
};
```

### React Components

```jsx
// components/ImageUploader.jsx
import React, { useState } from 'react';
import { useZotDGA } from '../hooks/useZotDGA';

const ImageUploader = ({ onUploadSuccess, folder = '' }) => {
  const [dragOver, setDragOver] = useState(false);
  const { uploadImage, loading, error } = useZotDGA();

  const handleFileUpload = async (files) => {
    for (const file of files) {
      try {
        const result = await uploadImage(file, { folder });
        onUploadSuccess?.(result);
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files);
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    handleFileUpload(files);
  };

  return (
    <div
      className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
    >
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileInput}
        style={{ display: 'none' }}
        id="file-input"
      />
      <label htmlFor="file-input">
        {loading ? 'Uploading...' : 'Click or drag images here'}
      </label>
      {error && <div className="error">{error}</div>}
    </div>
  );
};

// components/ImageGallery.jsx
import React, { useState, useEffect } from 'react';
import { useZotDGA } from '../hooks/useZotDGA';

const ImageGallery = () => {
  const [images, setImages] = useState([]);
  const { getFiles, deleteFile, getImageUrl } = useZotDGA();

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      const data = await getFiles({ type: 'image' });
      setImages(data.files);
    } catch (err) {
      console.error('Failed to load images:', err);
    }
  };

  const handleDelete = async (fileId) => {
    try {
      await deleteFile(fileId);
      setImages(images.filter(img => img.id !== fileId));
    } catch (err) {
      console.error('Failed to delete image:', err);
    }
  };

  return (
    <div className="image-gallery">
      {images.map(image => (
        <div key={image.id} className="image-item">
          <img
            src={getImageUrl(image.id, { width: 300, height: 300 })}
            alt={image.original_name}
            loading="lazy"
          />
          <div className="image-actions">
            <button onClick={() => handleDelete(image.id)}>
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// App.jsx
import React from 'react';
import ImageUploader from './components/ImageUploader';
import ImageGallery from './components/ImageGallery';

const App = () => {
  const handleUploadSuccess = (result) => {
    console.log('Upload successful:', result);
    // Refresh gallery or update state
  };

  return (
    <div className="App">
      <h1>My Image Gallery</h1>
      <ImageUploader onUploadSuccess={handleUploadSuccess} />
      <ImageGallery />
    </div>
  );
};

export default App;
```

---

## Vue.js Integration

### Composable for Vue 3

```javascript
// composables/useZotDGA.js
import { ref, reactive } from 'vue';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_ZOT_DGA_URL || 'http://localhost:3000';
const API_KEY = import.meta.env.VITE_ZOT_DGA_API_KEY;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${API_KEY}`
  }
});

export function useZotDGA() {
  const loading = ref(false);
  const error = ref(null);

  const uploadImage = async (file, options = {}) => {
    loading.value = true;
    error.value = null;
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      Object.keys(options).forEach(key => {
        formData.append(key, options[key]);
      });

      const response = await api.post('/api/upload/image', formData);
      loading.value = false;
      return response.data;
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      loading.value = false;
      throw err;
    }
  };

  const getFiles = async (params = {}) => {
    try {
      const response = await api.get('/api/files', { params });
      return response.data;
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      throw err;
    }
  };

  const getImageUrl = (fileId, options = {}) => {
    const { width, height, quality = 80 } = options;
    if (width || height) {
      return `${API_BASE_URL}/api/process/resize/${fileId}?width=${width || 'auto'}&height=${height || 'auto'}&quality=${quality}`;
    }
    return `${API_BASE_URL}/uploads/${fileId}`;
  };

  return {
    uploadImage,
    getFiles,
    getImageUrl,
    loading,
    error
  };
}
```

### Vue Component

```vue
<!-- components/ImageManager.vue -->
<template>
  <div class="image-manager">
    <div class="upload-section">
      <input
        ref="fileInput"
        type="file"
        multiple
        accept="image/*"
        @change="handleFileSelect"
        style="display: none"
      />
      <button @click="$refs.fileInput.click()" :disabled="loading">
        {{ loading ? 'Uploading...' : 'Select Images' }}
      </button>
    </div>

    <div v-if="error" class="error">{{ error }}</div>

    <div class="image-grid">
      <div
        v-for="image in images"
        :key="image.id"
        class="image-item"
      >
        <img
          :src="getImageUrl(image.id, { width: 300, height: 300 })"
          :alt="image.original_name"
          loading="lazy"
        />
        <div class="image-info">
          <p>{{ image.original_name }}</p>
          <button @click="deleteImage(image.id)">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useZotDGA } from '../composables/useZotDGA';

const { uploadImage, getFiles, getImageUrl, loading, error } = useZotDGA();

const images = ref([]);

const handleFileSelect = async (event) => {
  const files = Array.from(event.target.files);
  
  for (const file of files) {
    try {
      await uploadImage(file, { folder: 'gallery' });
      await loadImages(); // Refresh the gallery
    } catch (err) {
      console.error('Upload failed:', err);
    }
  }
};

const loadImages = async () => {
  try {
    const data = await getFiles({ type: 'image' });
    images.value = data.files;
  } catch (err) {
    console.error('Failed to load images:', err);
  }
};

const deleteImage = async (fileId) => {
  try {
    await api.delete(`/api/files/${fileId}`);
    images.value = images.value.filter(img => img.id !== fileId);
  } catch (err) {
    console.error('Failed to delete image:', err);
  }
};

onMounted(() => {
  loadImages();
});
</script>
```

---

## Python Integration

### Using Requests Library

```python
# zot_dga_client.py
import requests
import os
from typing import Optional, Dict, List

class ZotDGAClient:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {api_key}'
        })

    def upload_image(self, file_path: str, folder: Optional[str] = None, 
                    tags: Optional[str] = None, description: Optional[str] = None) -> Dict:
        """Upload an image file"""
        url = f"{self.base_url}/api/upload/image"
        
        with open(file_path, 'rb') as f:
            files = {'file': (os.path.basename(file_path), f)}
            data = {}
            
            if folder:
                data['folder'] = folder
            if tags:
                data['tags'] = tags
            if description:
                data['description'] = description
            
            response = self.session.post(url, files=files, data=data)
            response.raise_for_status()
            return response.json()

    def get_files(self, folder: Optional[str] = None, 
                  file_type: Optional[str] = None) -> Dict:
        """Get list of files"""
        url = f"{self.base_url}/api/files"
        params = {}
        
        if folder:
            params['folder'] = folder
        if file_type:
            params['type'] = file_type
            
        response = self.session.get(url, params=params)
        response.raise_for_status()
        return response.json()

    def delete_file(self, file_id: int) -> bool:
        """Delete a file"""
        url = f"{self.base_url}/api/files/{file_id}"
        response = self.session.delete(url)
        response.raise_for_status()
        return True

    def get_resized_image_url(self, file_id: int, width: Optional[int] = None, 
                             height: Optional[int] = None, quality: int = 80) -> str:
        """Get URL for resized image"""
        url = f"{self.base_url}/api/process/resize/{file_id}"
        params = {'quality': quality}
        
        if width:
            params['width'] = width
        if height:
            params['height'] = height
            
        return f"{url}?{'&'.join(f'{k}={v}' for k, v in params.items())}"

    def create_folder(self, name: str, description: Optional[str] = None) -> Dict:
        """Create a new folder"""
        url = f"{self.base_url}/api/folders"
        data = {'name': name}
        
        if description:
            data['description'] = description
            
        response = self.session.post(url, json=data)
        response.raise_for_status()
        return response.json()

# Usage example
if __name__ == "__main__":
    client = ZotDGAClient(
        base_url="http://localhost:3000",
        api_key="your-api-key-here"
    )
    
    # Upload an image
    result = client.upload_image(
        file_path="path/to/image.jpg",
        folder="my-gallery",
        tags="nature, landscape",
        description="Beautiful sunset photo"
    )
    print(f"Uploaded: {result}")
    
    # Get all images
    files = client.get_files(file_type="image")
    print(f"Found {len(files['files'])} images")
    
    # Get resized image URL
    if files['files']:
        file_id = files['files'][0]['id']
        resized_url = client.get_resized_image_url(file_id, width=300, height=200)
        print(f"Resized image URL: {resized_url}")
```

### Django Integration

```python
# django_app/services.py
from django.conf import settings
from django.core.files.storage import default_storage
import requests

class ZotDGAService:
    def __init__(self):
        self.base_url = settings.ZOT_DGA_BASE_URL
        self.api_key = settings.ZOT_DGA_API_KEY
        
    def upload_user_avatar(self, user, image_file):
        """Upload user avatar to ZOT-DGA"""
        url = f"{self.base_url}/api/upload/image"
        
        files = {'file': image_file}
        data = {
            'folder': f'avatars/{user.id}',
            'tags': 'avatar, profile',
            'description': f'Avatar for user {user.username}'
        }
        headers = {'Authorization': f'Bearer {self.api_key}'}
        
        response = requests.post(url, files=files, data=data, headers=headers)
        response.raise_for_status()
        
        result = response.json()
        
        # Save the file info to user model
        user.avatar_file_id = result['file']['id']
        user.avatar_url = result['file']['url']
        user.save()
        
        return result

# django_app/models.py
from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    avatar_file_id = models.IntegerField(null=True, blank=True)
    avatar_url = models.URLField(null=True, blank=True)
    
    def get_avatar_url(self, width=150, height=150):
        if self.avatar_file_id:
            return f"{settings.ZOT_DGA_BASE_URL}/api/process/resize/{self.avatar_file_id}?width={width}&height={height}"
        return None

# django_app/views.py
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from .services import ZotDGAService

@login_required
def upload_avatar(request):
    if request.method == 'POST' and request.FILES.get('avatar'):
        service = ZotDGAService()
        try:
            result = service.upload_user_avatar(request.user, request.FILES['avatar'])
            return JsonResponse({'success': True, 'file': result['file']})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})
    
    return render(request, 'upload_avatar.html')
```

---

## PHP Integration

```php
<?php
// ZotDGAClient.php

class ZotDGAClient {
    private $baseUrl;
    private $apiKey;
    
    public function __construct($baseUrl, $apiKey) {
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->apiKey = $apiKey;
    }
    
    private function makeRequest($endpoint, $method = 'GET', $data = null, $files = null) {
        $url = $this->baseUrl . $endpoint;
        $headers = [
            'Authorization: Bearer ' . $this->apiKey
        ];
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        
        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            if ($files) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, $files);
            } elseif ($data) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
                $headers[] = 'Content-Type: application/json';
                curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
            }
        } elseif ($method === 'DELETE') {
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
        }
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode >= 400) {
            throw new Exception("API Error: HTTP $httpCode - $response");
        }
        
        return json_decode($response, true);
    }
    
    public function uploadImage($filePath, $folder = null, $tags = null, $description = null) {
        $postData = [
            'file' => new CURLFile($filePath)
        ];
        
        if ($folder) $postData['folder'] = $folder;
        if ($tags) $postData['tags'] = $tags;
        if ($description) $postData['description'] = $description;
        
        return $this->makeRequest('/api/upload/image', 'POST', null, $postData);
    }
    
    public function getFiles($params = []) {
        $query = http_build_query($params);
        $endpoint = '/api/files' . ($query ? '?' . $query : '');
        return $this->makeRequest($endpoint);
    }
    
    public function deleteFile($fileId) {
        return $this->makeRequest("/api/files/$fileId", 'DELETE');
    }
    
    public function getResizedImageUrl($fileId, $width = null, $height = null, $quality = 80) {
        $params = ['quality' => $quality];
        if ($width) $params['width'] = $width;
        if ($height) $params['height'] = $height;
        
        $query = http_build_query($params);
        return $this->baseUrl . "/api/process/resize/$fileId?$query";
    }
}

// Usage example
$client = new ZotDGAClient('http://localhost:3000', 'your-api-key-here');

// Upload image
if ($_FILES['image']) {
    $result = $client->uploadImage($_FILES['image']['tmp_name'], 'gallery');
    echo "Uploaded: " . json_encode($result);
}

// WordPress integration
function zot_dga_handle_upload($attachment_id) {
    $client = new ZotDGAClient(
        get_option('zot_dga_url'),
        get_option('zot_dga_api_key')
    );
    
    $file_path = get_attached_file($attachment_id);
    $result = $client->uploadImage($file_path, 'wordpress');
    
    // Store the ZOT-DGA file ID as post meta
    update_post_meta($attachment_id, '_zot_dga_file_id', $result['file']['id']);
}

add_action('add_attachment', 'zot_dga_handle_upload');
?>
```

---

## Mobile Integration

### React Native

```javascript
// services/ZotDGAService.js
import {Platform} from 'react-native';

class ZotDGAService {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async uploadImage(imageUri, options = {}) {
    const formData = new FormData();
    
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: options.filename || 'image.jpg',
    });
    
    if (options.folder) formData.append('folder', options.folder);
    if (options.tags) formData.append('tags', options.tags);

    const response = await fetch(`${this.baseUrl}/api/upload/image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return response.json();
  }
}

// components/ImagePicker.js
import React, {useState} from 'react';
import {View, Button, Image, Alert} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import ZotDGAService from '../services/ZotDGAService';

const ImagePicker = () => {
  const [imageUri, setImageUri] = useState(null);
  const [uploading, setUploading] = useState(false);

  const service = new ZotDGAService(
    'http://your-domain.com',
    'your-api-key'
  );

  const selectImage = () => {
    launchImageLibrary({mediaType: 'photo'}, (response) => {
      if (response.assets && response.assets[0]) {
        setImageUri(response.assets[0].uri);
      }
    });
  };

  const uploadImage = async () => {
    if (!imageUri) return;

    setUploading(true);
    try {
      const result = await service.uploadImage(imageUri, {
        folder: 'mobile-uploads',
        tags: 'mobile, photo'
      });
      Alert.alert('Success', 'Image uploaded successfully!');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View>
      <Button title="Select Image" onPress={selectImage} />
      {imageUri && (
        <View>
          <Image source={{uri: imageUri}} style={{width: 200, height: 200}} />
          <Button 
            title={uploading ? "Uploading..." : "Upload"} 
            onPress={uploadImage}
            disabled={uploading}
          />
        </View>
      )}
    </View>
  );
};
```

### Flutter (Dart)

```dart
// lib/services/zot_dga_service.dart
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'dart:convert';

class ZotDGAService {
  final String baseUrl;
  final String apiKey;

  ZotDGAService({required this.baseUrl, required this.apiKey});

  Future<Map<String, dynamic>> uploadImage(
    File imageFile, {
    String? folder,
    String? tags,
    String? description,
  }) async {
    var uri = Uri.parse('$baseUrl/api/upload/image');
    var request = http.MultipartRequest('POST', uri);
    
    request.headers['Authorization'] = 'Bearer $apiKey';
    
    var multipartFile = await http.MultipartFile.fromPath(
      'file',
      imageFile.path,
      contentType: MediaType('image', 'jpeg'),
    );
    
    request.files.add(multipartFile);
    
    if (folder != null) request.fields['folder'] = folder;
    if (tags != null) request.fields['tags'] = tags;
    if (description != null) request.fields['description'] = description;

    var response = await request.send();
    var responseData = await response.stream.bytesToString();

    if (response.statusCode == 200 || response.statusCode == 201) {
      return json.decode(responseData);
    } else {
      throw Exception('Upload failed: ${response.statusCode}');
    }
  }

  String getResizedImageUrl(int fileId, {int? width, int? height, int quality = 80}) {
    var params = <String, String>{'quality': quality.toString()};
    if (width != null) params['width'] = width.toString();
    if (height != null) params['height'] = height.toString();
    
    var query = Uri(queryParameters: params).query;
    return '$baseUrl/api/process/resize/$fileId?$query';
  }
}

// lib/widgets/image_uploader.dart
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../services/zot_dga_service.dart';

class ImageUploader extends StatefulWidget {
  @override
  _ImageUploaderState createState() => _ImageUploaderState();
}

class _ImageUploaderState extends State<ImageUploader> {
  File? _selectedImage;
  bool _uploading = false;
  final _service = ZotDGAService(
    baseUrl: 'http://your-domain.com',
    apiKey: 'your-api-key',
  );

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.gallery);
    
    if (pickedFile != null) {
      setState(() {
        _selectedImage = File(pickedFile.path);
      });
    }
  }

  Future<void> _uploadImage() async {
    if (_selectedImage == null) return;

    setState(() {
      _uploading = true;
    });

    try {
      final result = await _service.uploadImage(
        _selectedImage!,
        folder: 'flutter-uploads',
        tags: 'mobile, flutter',
      );
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Image uploaded successfully!')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Upload failed: $e')),
      );
    } finally {
      setState(() {
        _uploading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        ElevatedButton(
          onPressed: _pickImage,
          child: Text('Select Image'),
        ),
        if (_selectedImage != null) ...[
          Image.file(_selectedImage!, height: 200),
          ElevatedButton(
            onPressed: _uploading ? null : _uploadImage,
            child: Text(_uploading ? 'Uploading...' : 'Upload'),
          ),
        ],
      ],
    );
  }
}
```

---

## Environment Variables

Create a `.env` file in your client applications:

```bash
# Frontend (.env)
REACT_APP_ZOT_DGA_URL=http://localhost:3000
REACT_APP_ZOT_DGA_API_KEY=your-api-key-here

# Backend (.env)
ZOT_DGA_BASE_URL=http://localhost:3000
ZOT_DGA_API_KEY=your-api-key-here

# Production
ZOT_DGA_BASE_URL=https://your-domain.com
ZOT_DGA_API_KEY=your-production-api-key
```

---

## Best Practices

### 1. Security
- Never expose API keys in frontend code
- Use backend proxy for sensitive operations
- Implement rate limiting on your end
- Validate file types before upload

### 2. Performance
- Use thumbnails for listings
- Implement lazy loading
- Cache resized images
- Use CDN for better performance

### 3. Error Handling
- Always handle network errors
- Provide user feedback
- Implement retry logic
- Log errors for debugging

### 4. User Experience
- Show upload progress
- Display loading states
- Provide image previews
- Allow bulk operations

This guide covers the most common integration scenarios. The ZOT-DGA API is designed to be flexible and can be integrated into any application that can make HTTP requests!
