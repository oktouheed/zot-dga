FROM node:18-alpine

# Install FFmpeg for video processing
RUN apk add --no-cache ffmpeg

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY src/ ./src/

# Create required directories
RUN mkdir -p uploads data

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "start"]
