# flask-example.py
# Example Flask application integrating with ZOT-DGA API

from flask import Flask, request, jsonify, render_template_string
import requests
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max file size

# Configuration
ZOT_DGA_CONFIG = {
    'base_url': os.getenv('ZOT_DGA_URL', 'http://localhost:3000'),
    'api_key': os.getenv('ZOT_DGA_API_KEY', 'your-api-key-here')
}

class ZotDGAClient:
    def __init__(self, base_url, api_key):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.headers = {'Authorization': f'Bearer {api_key}'}
    
    def upload_image(self, file, folder=None, tags=None, description=None):
        """Upload image to ZOT-DGA"""
        url = f"{self.base_url}/api/upload/image"
        
        files = {'file': (file.filename, file.stream, file.content_type)}
        data = {}
        
        if folder:
            data['folder'] = folder
        if tags:
            data['tags'] = tags
        if description:
            data['description'] = description
        
        response = requests.post(url, files=files, data=data, headers=self.headers)
        response.raise_for_status()
        return response.json()
    
    def get_files(self, **params):
        """Get list of files"""
        url = f"{self.base_url}/api/files"
        response = requests.get(url, params=params, headers=self.headers)
        response.raise_for_status()
        return response.json()
    
    def delete_file(self, file_id):
        """Delete a file"""
        url = f"{self.base_url}/api/files/{file_id}"
        response = requests.delete(url, headers=self.headers)
        response.raise_for_status()
        return response.json()
    
    def get_image_url(self, file_id, width=None, height=None, quality=80):
        """Get image URL with optional resizing"""
        if width or height:
            params = {'quality': quality}
            if width:
                params['width'] = width
            if height:
                params['height'] = height
            
            query_string = '&'.join(f'{k}={v}' for k, v in params.items())
            return f"{self.base_url}/api/process/resize/{file_id}?{query_string}"
        else:
            return f"{self.base_url}/uploads/{file_id}"

# Initialize client
zot_client = ZotDGAClient(ZOT_DGA_CONFIG['base_url'], ZOT_DGA_CONFIG['api_key'])

@app.route('/')
def index():
    """Serve demo page"""
    return render_template_string('''
<!DOCTYPE html>
<html>
<head>
    <title>Flask + ZOT-DGA Integration</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .upload-form { background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; }
        .image-item { background: white; padding: 15px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .image-item img { width: 100%; height: 150px; object-fit: cover; border-radius: 3px; }
        .message { padding: 10px; margin: 10px 0; border-radius: 5px; }
        .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
        .error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
    </style>
</head>
<body>
    <h1>🐍 Flask + ZOT-DGA Integration</h1>
    <p>This example shows how to integrate ZOT-DGA API into your Flask application.</p>
    
    <div class="upload-form">
        <h3>Upload Image</h3>
        <form id="uploadForm" enctype="multipart/form-data">
            <input type="file" name="image" accept="image/*" required><br><br>
            <input type="text" name="tags" placeholder="Tags (optional)" style="width: 200px;"><br><br>
            <input type="text" name="description" placeholder="Description (optional)" style="width: 300px;"><br><br>
            <button type="submit">Upload</button>
        </form>
        <div id="message"></div>
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
            const messageDiv = document.getElementById('message');
            
            try {
                messageDiv.innerHTML = '<div class="message">Uploading...</div>';
                
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                if (result.success) {
                    messageDiv.innerHTML = '<div class="message success">Upload successful!</div>';
                    loadGallery();
                    e.target.reset();
                } else {
                    messageDiv.innerHTML = `<div class="message error">Upload failed: ${result.message}</div>`;
                }
            } catch (error) {
                messageDiv.innerHTML = `<div class="message error">Upload failed: ${error.message}</div>`;
            }
            
            setTimeout(() => messageDiv.innerHTML = '', 3000);
        });

        async function loadGallery() {
            try {
                const response = await fetch('/api/gallery');
                const data = await response.json();
                
                const gallery = document.getElementById('gallery');
                gallery.innerHTML = data.images.map(item => `
                    <div class="image-item">
                        <img src="${item.thumbnail}" alt="${item.title}" loading="lazy">
                        <h4>${item.title}</h4>
                        <p>${item.description || 'No description'}</p>
                        <small>${new Date(item.created_at).toLocaleDateString()}</small>
                        <br><button onclick="deleteImage(${item.id}, '${item.title}')" style="margin-top: 10px; background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">Delete</button>
                    </div>
                `).join('');
            } catch (error) {
                console.error('Failed to load gallery:', error);
            }
        }

        async function deleteImage(id, title) {
            if (!confirm(`Delete "${title}"?`)) return;
            
            try {
                const response = await fetch(`/api/images/${id}`, { method: 'DELETE' });
                const result = await response.json();
                
                if (result.success) {
                    loadGallery();
                } else {
                    alert('Delete failed: ' + result.message);
                }
            } catch (error) {
                alert('Delete failed: ' + error.message);
            }
        }

        // Load gallery on page load
        loadGallery();
    </script>
</body>
</html>
    ''')

@app.route('/api/upload', methods=['POST'])
def upload_image():
    """Handle image upload"""
    try:
        if 'image' not in request.files:
            return jsonify({'success': False, 'message': 'No file uploaded'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'success': False, 'message': 'No file selected'}), 400
        
        # Upload to ZOT-DGA
        result = zot_client.upload_image(
            file,
            folder='flask-demo',
            tags=request.form.get('tags'),
            description=request.form.get('description')
        )
        
        return jsonify({
            'success': True,
            'file': {
                'id': result['file']['id'],
                'url': result['file']['url'],
                'thumbnail': zot_client.get_image_url(result['file']['id'], width=300, height=300),
                'originalName': result['file']['originalName'],
                'size': result['file']['size']
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/api/gallery')
def get_gallery():
    """Get gallery images"""
    try:
        data = zot_client.get_files(type='image', folder='flask-demo', limit=20)
        
        images = []
        for file in data['files']:
            images.append({
                'id': file['id'],
                'title': file['original_name'],
                'description': file.get('description'),
                'created_at': file['created_at'],
                'thumbnail': zot_client.get_image_url(file['id'], width=300, height=300),
                'fullsize': zot_client.get_image_url(file['id'])
            })
        
        return jsonify({'images': images})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/images/<int:file_id>', methods=['DELETE'])
def delete_image(file_id):
    """Delete an image"""
    try:
        zot_client.delete_file(file_id)
        return jsonify({'success': True, 'message': 'Image deleted successfully'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/health')
def health():
    """Health check"""
    return jsonify({
        'status': 'OK',
        'service': 'Flask + ZOT-DGA Integration',
        'zot_dga_url': ZOT_DGA_CONFIG['base_url']
    })

if __name__ == '__main__':
    print("🐍 Flask + ZOT-DGA Integration Example")
    print(f"🔧 ZOT-DGA API: {ZOT_DGA_CONFIG['base_url']}")
    print("📖 Demo page: http://localhost:5000")
    
    app.run(debug=True, port=5000)
