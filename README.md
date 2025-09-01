# ZOT-DGA Image Library API

A powerful image and video library API similar to Cloudinary, built with Node.js and Express.js.

## Features

- 🔐 **API Key Authentication** - Secure access with API keys
- 📁 **Folder Organization** - Upload and organize files in custom folders
- 🖼️ **Image Processing** - Resize, format conversion, and thumbnail generation
- 🎥 **Video Support** - Upload and process video files
- 📊 **Database Management** - SQLite for local development, easily scalable
- 🚀 **Production Ready** - Configured for VPS deployment
- 🔒 **Security** - Rate limiting, CORS, helmet protection
- 📝 **Comprehensive API** - RESTful endpoints for all operations

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- FFmpeg (for video processing)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd zot-dga
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Initialize database:
```bash
npm run migrate
```

5. Create admin user (optional):
```bash
npm run seed
```

6. Start development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## API Documentation

### Authentication

All API requests require an API key in the header:
```
Authorization: Bearer YOUR_API_KEY
```

### Endpoints

#### User Management

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/generate-key` - Generate new API key

#### File Upload

- `POST /api/upload/image` - Upload single image
- `POST /api/upload/video` - Upload single video
- `POST /api/upload/multiple` - Upload multiple files

#### File Management

- `GET /api/files` - List all files
- `GET /api/files/:id` - Get file details
- `DELETE /api/files/:id` - Delete file
- `PUT /api/files/:id` - Update file metadata

#### Folder Management

- `POST /api/folders` - Create folder
- `GET /api/folders` - List folders
- `GET /api/folders/:id/files` - Get files in folder
- `DELETE /api/folders/:id` - Delete folder

#### Image Processing

- `GET /api/process/resize/:id` - Resize image
- `GET /api/process/convert/:id` - Convert image format
- `GET /api/process/thumbnail/:id` - Generate thumbnail

### Request Examples

#### Upload Image
```bash
curl -X POST http://localhost:3000/api/upload/image \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "file=@image.jpg" \
  -F "folder=my-folder"
```

#### Resize Image
```bash
curl "http://localhost:3000/api/process/resize/file-id?width=300&height=200" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Project Structure

```
zot-dga/
├── src/
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Custom middleware
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   ├── database/        # Database setup and migrations
│   └── server.js        # Main server file
├── uploads/             # File storage directory
├── data/                # Database files
├── tests/               # Test files
└── docs/                # Documentation
```

## Configuration

### Environment Variables

See `.env.example` for all available configuration options.

### Database

The project uses SQLite for local development. For production, you can easily switch to PostgreSQL or MySQL by updating the database configuration.

### File Storage

Files are stored locally in the `uploads` directory. For production, consider using cloud storage like AWS S3.

## Deployment

### VPS Deployment

1. Clone repository on your VPS
2. Install dependencies: `npm install --production`
3. Set up environment variables
4. Install PM2: `npm install -g pm2`
5. Start application: `pm2 start src/server.js --name zot-dga`

### Docker Deployment

```bash
docker build -t zot-dga .
docker run -p 3000:3000 -v $(pwd)/uploads:/app/uploads zot-dga
```

## Security

- API key authentication
- Rate limiting
- CORS protection
- Helmet security headers
- Input validation
- File type restrictions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support and questions, please open an issue on GitHub.
