const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs').promises;

/**
 * Video processing service
 */
class VideoProcessor {
  /**
   * Get video metadata
   * @param {string} videoPath - Video file path
   * @returns {Promise<object>} Video metadata
   */
  static async getMetadata(videoPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          const videoStream = metadata.streams.find(s => s.codec_type === 'video');
          const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
          
          resolve({
            duration: metadata.format.duration,
            size: metadata.format.size,
            bitRate: metadata.format.bit_rate,
            video: videoStream ? {
              codec: videoStream.codec_name,
              width: videoStream.width,
              height: videoStream.height,
              frameRate: eval(videoStream.r_frame_rate), // e.g., "30/1" -> 30
              aspectRatio: videoStream.display_aspect_ratio
            } : null,
            audio: audioStream ? {
              codec: audioStream.codec_name,
              bitRate: audioStream.bit_rate,
              sampleRate: audioStream.sample_rate,
              channels: audioStream.channels
            } : null
          });
        }
      });
    });
  }

  /**
   * Generate video thumbnail
   * @param {string} videoPath - Video file path
   * @param {string} outputPath - Output thumbnail path
   * @param {object} options - Thumbnail options
   * @returns {Promise<void>}
   */
  static async generateThumbnail(videoPath, outputPath, options = {}) {
    const {
      timeOffset = '00:00:01',
      width = 320,
      height = 240,
      quality = 80
    } = options;

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .seekInput(timeOffset)
        .outputOptions([
          '-vframes 1',
          `-s ${width}x${height}`,
          `-q:v ${Math.floor((100 - quality) / 10)}`
        ])
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });
  }

  /**
   * Convert video format
   * @param {string} inputPath - Input video path
   * @param {string} outputPath - Output video path
   * @param {object} options - Conversion options
   * @returns {Promise<void>}
   */
  static async convert(inputPath, outputPath, options = {}) {
    const {
      format = 'mp4',
      codec = 'libx264',
      quality = 'medium',
      resolution
    } = options;

    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath)
        .videoCodec(codec)
        .format(format);

      // Set quality preset
      switch (quality) {
        case 'high':
          command = command.videoBitrate('2000k').audioBitrate('192k');
          break;
        case 'low':
          command = command.videoBitrate('500k').audioBitrate('128k');
          break;
        case 'medium':
        default:
          command = command.videoBitrate('1000k').audioBitrate('160k');
          break;
      }

      // Set resolution if specified
      if (resolution) {
        command = command.size(resolution);
      }

      command
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .on('progress', (progress) => {
          console.log(`Processing: ${progress.percent}% done`);
        })
        .run();
    });
  }

  /**
   * Extract audio from video
   * @param {string} videoPath - Video file path
   * @param {string} audioPath - Output audio path
   * @param {string} format - Audio format (mp3, wav, etc.)
   * @returns {Promise<void>}
   */
  static async extractAudio(videoPath, audioPath, format = 'mp3') {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .noVideo()
        .audioCodec(format === 'mp3' ? 'libmp3lame' : 'pcm_s16le')
        .format(format)
        .output(audioPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });
  }

  /**
   * Compress video
   * @param {string} inputPath - Input video path
   * @param {string} outputPath - Output video path
   * @param {object} options - Compression options
   * @returns {Promise<void>}
   */
  static async compress(inputPath, outputPath, options = {}) {
    const {
      crf = 23, // Constant Rate Factor (0-51, lower = better quality)
      preset = 'medium', // Encoding speed preset
      maxWidth = 1920,
      maxHeight = 1080
    } = options;

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec('libx264')
        .outputOptions([
          `-crf ${crf}`,
          `-preset ${preset}`,
          `-vf scale='min(${maxWidth},iw)':'min(${maxHeight},ih)':force_original_aspect_ratio=decrease`,
          '-movflags +faststart' // Optimize for web streaming
        ])
        .format('mp4')
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .on('progress', (progress) => {
          console.log(`Compressing: ${progress.percent}% done`);
        })
        .run();
    });
  }

  /**
   * Create video from images
   * @param {string[]} imagePaths - Array of image paths
   * @param {string} outputPath - Output video path
   * @param {object} options - Video creation options
   * @returns {Promise<void>}
   */
  static async createFromImages(imagePaths, outputPath, options = {}) {
    const {
      frameRate = 30,
      duration = null,
      resolution = '1920x1080'
    } = options;

    // Create a temporary file list for ffmpeg
    const listPath = path.join(path.dirname(outputPath), 'image_list.txt');
    const listContent = imagePaths.map(img => `file '${img}'`).join('\n');
    await fs.writeFile(listPath, listContent);

    return new Promise(async (resolve, reject) => {
      try {
        let command = ffmpeg()
          .input(listPath)
          .inputOptions(['-f concat', '-safe 0'])
          .videoCodec('libx264')
          .fps(frameRate)
          .size(resolution);

        if (duration) {
          command = command.duration(duration);
        }

        command
          .output(outputPath)
          .on('end', async () => {
            // Clean up temporary file
            try {
              await fs.unlink(listPath);
            } catch (e) {
              console.warn('Could not delete temporary file:', e.message);
            }
            resolve();
          })
          .on('error', async (err) => {
            // Clean up temporary file on error
            try {
              await fs.unlink(listPath);
            } catch (e) {
              console.warn('Could not delete temporary file:', e.message);
            }
            reject(err);
          })
          .run();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Add watermark to video
   * @param {string} videoPath - Input video path
   * @param {string} watermarkPath - Watermark image path
   * @param {string} outputPath - Output video path
   * @param {object} options - Watermark options
   * @returns {Promise<void>}
   */
  static async addWatermark(videoPath, watermarkPath, outputPath, options = {}) {
    const {
      position = 'bottom-right',
      opacity = 0.5,
      margin = 10
    } = options;

    let overlayFilter;
    switch (position) {
      case 'top-left':
        overlayFilter = `${margin}:${margin}`;
        break;
      case 'top-right':
        overlayFilter = `main_w-overlay_w-${margin}:${margin}`;
        break;
      case 'bottom-left':
        overlayFilter = `${margin}:main_h-overlay_h-${margin}`;
        break;
      case 'bottom-right':
      default:
        overlayFilter = `main_w-overlay_w-${margin}:main_h-overlay_h-${margin}`;
        break;
    }

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .input(watermarkPath)
        .complexFilter([
          `[1:v]format=rgba,colorchannelmixer=aa=${opacity}[watermark]`,
          `[0:v][watermark]overlay=${overlayFilter}[out]`
        ])
        .map('[out]')
        .videoCodec('libx264')
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .on('progress', (progress) => {
          console.log(`Adding watermark: ${progress.percent}% done`);
        })
        .run();
    });
  }
}

module.exports = VideoProcessor;
