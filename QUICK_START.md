# ZOT-DGA Image Library API - Quick Start Guide

## 🎉 Project Successfully Created!

Your image library API similar to Cloudinary is now ready to use! Here's everything you need to know:

## 📋 What's Included

### Core Features
- ✅ **User Authentication** - Register, login, API key management
- ✅ **File Upload** - Images and videos with folder organization
- ✅ **Image Processing** - Resize, convert, crop, thumbnails
- ✅ **Folder Management** - Create and organize files in folders
- ✅ **Database** - SQLite with comprehensive models
- ✅ **Security** - Rate limiting, CORS, Helmet protection
- ✅ **API Documentation** - Built-in endpoint documentation

### File Structure
```
zot-dga/
├── src/
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Authentication & error handling
│   ├── models/          # Database models (User, File, Folder)
│   ├── routes/          # API routes
│   ├── services/        # Image/video processing services
│   ├── utils/           # Utility functions
│   ├── database/        # Database setup & migrations
│   └── server.js        # Main server file
├── uploads/             # File storage (auto-created)
├── data/                # Database storage (auto-created)
├── tests/               # Test files
├── package.json         # Dependencies
├── .env                 # Environment configuration
├── docker-compose.yml   # Docker setup
└── README.md           # Documentation
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Database
```bash
npm run migrate
npm run seed
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Test the API
- Health Check: http://localhost:3000/health
- Documentation: http://localhost:3000/api/docs

## 🔑 Admin Credentials

**Default admin user created:**
- Email: `admin@zot-dga.com`
- Password: `admin123`
- API Key: `8c70b11f-3df5-4783-ae56-c105d98dced5`

⚠️ **Change these credentials in production!**

## 📝 API Usage Examples

### 1. Register New User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123","name":"John Doe"}'
```

### 2. Upload Image
```bash
curl -X POST http://localhost:3000/api/upload/image \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "file=@image.jpg" \
  -F "folder=my-photos"
```

### 3. Resize Image
```bash
curl "http://localhost:3000/api/process/resize/FILE_ID?width=300&height=200" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### 4. List Files
```bash
curl http://localhost:3000/api/files \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## 🐳 Docker Deployment

### Build and Run
```bash
docker-compose up -d
```

### Or build manually
```bash
docker build -t zot-dga .
docker run -p 3000:3000 -v $(pwd)/uploads:/app/uploads zot-dga
```

## 🌐 VPS Deployment

### 1. Clone on VPS
```bash
git clone <your-repo-url>
cd zot-dga
```

### 2. Install Dependencies
```bash
npm install --production
```

### 3. Set Up Environment
```bash
cp .env.example .env
# Edit .env with production settings
```

### 4. Initialize Database
```bash
npm run migrate
npm run seed
```

### 5. Install PM2 (Process Manager)
```bash
npm install -g pm2
```

### 6. Start with PM2
```bash
pm2 start src/server.js --name zot-dga
pm2 save
pm2 startup
```

### 7. Set up Nginx (Optional)
```bash
sudo cp nginx.conf /etc/nginx/sites-available/zot-dga
sudo ln -s /etc/nginx/sites-available/zot-dga /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 📊 Supported Features

### File Types
- **Images**: JPEG, PNG, GIF, WebP, SVG
- **Videos**: MP4, AVI, MOV, WMV, FLV, WebM

### Image Processing
- Resize (width, height, quality)
- Format conversion (JPEG, PNG, WebP)
- Thumbnail generation
- Cropping
- Metadata extraction

### Video Processing (with FFmpeg)
- Thumbnail generation
- Format conversion
- Compression
- Metadata extraction

## 🔧 Configuration

### Environment Variables
Key settings in `.env`:
- `PORT` - Server port (default: 3000)
- `JWT_SECRET` - JWT signing secret
- `DATABASE_PATH` - SQLite database path
- `UPLOAD_PATH` - File storage directory
- `MAX_FILE_SIZE` - Maximum upload size
- `ALLOWED_IMAGE_TYPES` - Supported image formats
- `ALLOWED_VIDEO_TYPES` - Supported video formats

### File Size Limits
- Default: 50MB per file
- Configurable via `MAX_FILE_SIZE` in .env

### Rate Limiting
- Default: 100 requests per 15 minutes
- Configurable via environment variables

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Manual Testing
1. Start server: `npm run dev`
2. Register user: Use `/api/auth/register`
3. Upload file: Use `/api/upload/image`
4. Process image: Use `/api/process/resize/:id`

## 📈 Monitoring

### Health Check
- Endpoint: `/health`
- Returns: Server status, uptime, environment

### Logs
- Development: Console output
- Production: PM2 logs (`pm2 logs`)

## 🔒 Security Features

- API key authentication
- JWT tokens for sessions
- Rate limiting
- CORS protection
- Helmet security headers
- Input validation
- File type restrictions

## 🚧 Production Checklist

- [ ] Change default admin credentials
- [ ] Update JWT_SECRET in .env
- [ ] Set up HTTPS/SSL
- [ ] Configure proper file storage (AWS S3, etc.)
- [ ] Set up database backups
- [ ] Configure monitoring
- [ ] Set up log rotation
- [ ] Review rate limits
- [ ] Test file upload limits

## 📞 Support

For issues and questions:
1. Check the logs: `pm2 logs zot-dga`
2. Review the documentation: http://localhost:3000/api/docs
3. Test endpoints: http://localhost:3000/health

## 🎯 Next Steps

1. **Customize for your needs** - Modify upload limits, file types
2. **Add features** - Watermarks, advanced processing
3. **Scale** - Move to cloud storage, load balancers
4. **Monitor** - Set up proper logging and metrics
5. **Backup** - Regular database and file backups

---

🎉 **Your ZOT-DGA Image Library API is ready to use!**

Start building amazing applications with your new image processing API! 🚀
