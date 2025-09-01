# ZOT-DGA API Integration Examples

This folder contains practical examples of how to integrate the ZOT-DGA API into various applications and frameworks.

## 📁 Example Files

### 1. **demo.html** - Browser-based Demo
A complete HTML demo with drag-and-drop file upload functionality.

**To run:**
```bash
# Make sure ZOT-DGA API is running on http://localhost:3000
# Open demo.html in any web browser
open demo.html
```

**Features:**
- Drag and drop file uploads
- Image gallery with thumbnails
- File management (delete, view)
- Real-time upload progress
- Error handling

### 2. **backend-integration.js** - Express.js Proxy Example
Shows how to integrate ZOT-DGA into an existing Express.js backend.

**To run:**
```bash
cd examples
npm install
npm start
```

**Features:**
- User authentication simulation
- Proxy pattern for API integration
- File organization by user
- Secure API key handling

### 3. **flask-example.py** - Flask Integration
Complete Flask application with ZOT-DGA integration.

**To run:**
```bash
cd examples
pip install -r requirements.txt
export ZOT_DGA_API_KEY="your-api-key-here"
python flask-example.py
```

**Features:**
- Image upload form
- Gallery display
- File management
- Error handling
- Python requests integration

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the examples directory:

```env
# ZOT-DGA API Configuration
ZOT_DGA_URL=http://localhost:3000
ZOT_DGA_API_KEY=8c70b11f-3df5-4783-ae56-c105d98dced5

# For Flask example
FLASK_ENV=development

# For Node.js examples
NODE_ENV=development
PORT=3001
```

### API Keys
Make sure to replace the example API key with your actual API key from the ZOT-DGA admin panel.

## 🚀 Quick Start

1. **Start ZOT-DGA API:**
   ```bash
   cd /path/to/zot-dga
   npm start
   ```

2. **Choose an example:**
   - **Simple Demo:** Open `demo.html` in browser
   - **Node.js Backend:** Run `node backend-integration.js`
   - **Flask App:** Run `python flask-example.py`

3. **Access the examples:**
   - Demo page: `file://path/to/demo.html`
   - Express.js: `http://localhost:3001`
   - Flask: `http://localhost:5000`

## 📚 Integration Patterns

### 1. Direct API Calls (Frontend)
```javascript
// Upload image directly from frontend
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('http://localhost:3000/api/upload/image', {
    method: 'POST',
    headers: {
        'Authorization': 'Bearer YOUR_API_KEY'
    },
    body: formData
});
```

### 2. Backend Proxy Pattern
```javascript
// Your backend acts as proxy to ZOT-DGA
app.post('/upload', async (req, res) => {
    // Add user authentication
    const user = authenticateUser(req);
    
    // Forward to ZOT-DGA with user context
    const result = await zotClient.upload(req.file, {
        folder: `user-${user.id}`,
        metadata: { userId: user.id }
    });
    
    res.json(result);
});
```

### 3. Server-Side Processing
```python
# Process images on your server before storing
def process_and_store_image(file):
    # Your custom processing
    processed_file = custom_image_processing(file)
    
    # Store in ZOT-DGA
    result = zot_client.upload_image(
        processed_file,
        folder='processed-images',
        tags='processed,custom'
    )
    
    return result
```

## 🔐 Security Best Practices

1. **Never expose API keys in frontend code**
2. **Use environment variables for configuration**
3. **Implement proper user authentication**
4. **Validate file types and sizes**
5. **Use HTTPS in production**

## 📖 API Reference

For complete API documentation, visit: `http://localhost:3000/api/docs` when your ZOT-DGA server is running.

## 🐛 Troubleshooting

### Common Issues:

1. **"Connection refused"**
   - Make sure ZOT-DGA API is running on port 3000
   - Check if the URL in configuration is correct

2. **"Unauthorized"**
   - Verify your API key is correct
   - Make sure API key is included in Authorization header

3. **"File upload failed"**
   - Check file size limits (default: 50MB)
   - Verify file type is supported
   - Ensure proper multipart/form-data encoding

4. **CORS errors**
   - ZOT-DGA API includes CORS support
   - Make sure your frontend origin is allowed

### Debug Mode:

Enable debug logging in your examples:

```javascript
// Node.js
process.env.DEBUG = 'zot-dga:*';

// Python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## 🤝 Contributing

Feel free to add more integration examples for different frameworks:
- Django
- Ruby on Rails
- ASP.NET Core
- FastAPI
- Svelte/SvelteKit
- Nuxt.js

## 📄 License

These examples are provided as-is for educational purposes. Use and modify as needed for your projects.
