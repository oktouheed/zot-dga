#!/bin/bash

echo "🚀 Setting up ZOT-DGA Image Library API..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="16.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please install Node.js 16 or higher."
    exit 1
fi

echo "✅ Node.js version $NODE_VERSION detected"

# Check if FFmpeg is installed (optional)
if command -v ffmpeg &> /dev/null; then
    echo "✅ FFmpeg detected - video processing will be available"
else
    echo "⚠️  FFmpeg not found - video processing will be limited"
    echo "   To install FFmpeg:"
    echo "   - macOS: brew install ffmpeg"
    echo "   - Ubuntu: sudo apt install ffmpeg"
    echo "   - Windows: Download from https://ffmpeg.org/"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Copy environment file
if [ ! -f .env ]; then
    echo "📝 Creating environment configuration..."
    cp .env.example .env
    echo "✅ Environment file created (.env)"
    echo "⚠️  Please review and update the .env file with your settings"
else
    echo "✅ Environment file already exists"
fi

# Initialize database
echo "🗄️  Initializing database..."
npm run migrate

if [ $? -ne 0 ]; then
    echo "❌ Failed to initialize database"
    exit 1
fi

# Create admin user
echo "👤 Creating admin user..."
npm run seed

if [ $? -ne 0 ]; then
    echo "⚠️  Failed to create admin user (may already exist)"
fi

# Create upload directories
echo "📁 Creating upload directories..."
mkdir -p uploads data
chmod 755 uploads data

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Review and update the .env file"
echo "2. Start the development server: npm run dev"
echo "3. Test the API: curl http://localhost:3000/health"
echo ""
echo "API Documentation: http://localhost:3000/api/docs"
echo "Health Check: http://localhost:3000/health"
echo ""
echo "Happy coding! 🚀"
