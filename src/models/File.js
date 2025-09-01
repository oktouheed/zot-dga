const { db } = require('../database/init');

class File {
  static async create(fileData) {
    return new Promise((resolve, reject) => {
      const {
        filename, originalName, path, size, mimeType, fileType,
        userId, folderId, width, height, duration, thumbnailPath,
        metadata, tags, description, isPublic, uploadIp
      } = fileData;

      db.run(
        `INSERT INTO files (
          filename, original_name, path, size, mime_type, file_type,
          user_id, folder_id, width, height, duration, thumbnail_path,
          metadata, tags, description, is_public, upload_ip
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          filename, originalName, path, size, mimeType, fileType,
          userId, folderId, width, height, duration, thumbnailPath,
          JSON.stringify(metadata), tags, description, isPublic, uploadIp
        ],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  static async findById(id, userId = null) {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM files WHERE id = ?';
      let params = [id];

      if (userId) {
        query += ' AND user_id = ?';
        params.push(userId);
      }

      db.get(query, params, (err, row) => {
        if (err) reject(err);
        else {
          if (row && row.metadata) {
            try {
              row.metadata = JSON.parse(row.metadata);
            } catch (e) {
              row.metadata = {};
            }
          }
          resolve(row);
        }
      });
    });
  }

  static async findByUser(userId, options = {}) {
    return new Promise((resolve, reject) => {
      const { 
        folderId, 
        fileType, 
        limit = 50, 
        offset = 0,
        orderBy = 'created_at',
        orderDir = 'DESC'
      } = options;

      let query = 'SELECT * FROM files WHERE user_id = ?';
      let params = [userId];

      if (folderId !== undefined) {
        if (folderId === null) {
          query += ' AND folder_id IS NULL';
        } else {
          query += ' AND folder_id = ?';
          params.push(folderId);
        }
      }

      if (fileType) {
        query += ' AND file_type = ?';
        params.push(fileType);
      }

      query += ` ORDER BY ${orderBy} ${orderDir} LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else {
          rows.forEach(row => {
            if (row.metadata) {
              try {
                row.metadata = JSON.parse(row.metadata);
              } catch (e) {
                row.metadata = {};
              }
            }
          });
          resolve(rows);
        }
      });
    });
  }

  static async update(id, userId, updateData) {
    return new Promise((resolve, reject) => {
      const allowedFields = ['tags', 'description', 'is_public'];
      const updates = [];
      const params = [];

      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          updates.push(`${key} = ?`);
          params.push(updateData[key]);
        }
      });

      if (updates.length === 0) {
        return resolve(false);
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id, userId);

      const query = `UPDATE files SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`;

      db.run(query, params, function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }

  static async delete(id, userId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT path, thumbnail_path FROM files WHERE id = ? AND user_id = ?',
        [id, userId],
        (err, file) => {
          if (err) {
            reject(err);
            return;
          }

          if (!file) {
            resolve(false);
            return;
          }

          db.run(
            'DELETE FROM files WHERE id = ? AND user_id = ?',
            [id, userId],
            function(err) {
              if (err) reject(err);
              else resolve({ success: this.changes > 0, file });
            }
          );
        }
      );
    });
  }

  static async getStats(userId) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT 
          COUNT(*) as total_files,
          SUM(size) as total_size,
          COUNT(CASE WHEN file_type = 'image' THEN 1 END) as image_count,
          COUNT(CASE WHEN file_type = 'video' THEN 1 END) as video_count,
          MAX(created_at) as last_upload
         FROM files WHERE user_id = ?`,
        [userId],
        (err, stats) => {
          if (err) reject(err);
          else resolve(stats);
        }
      );
    });
  }

  static async search(userId, searchTerm, options = {}) {
    return new Promise((resolve, reject) => {
      const { fileType, limit = 50, offset = 0 } = options;
      
      let query = `
        SELECT * FROM files 
        WHERE user_id = ? AND (
          original_name LIKE ? OR 
          tags LIKE ? OR 
          description LIKE ?
        )
      `;
      
      let params = [userId, `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`];

      if (fileType) {
        query += ' AND file_type = ?';
        params.push(fileType);
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else {
          rows.forEach(row => {
            if (row.metadata) {
              try {
                row.metadata = JSON.parse(row.metadata);
              } catch (e) {
                row.metadata = {};
              }
            }
          });
          resolve(rows);
        }
      });
    });
  }
}

module.exports = File;
