const { db } = require('../database/init');

class Folder {
  static async create(folderData) {
    return new Promise((resolve, reject) => {
      const { name, path, userId, parentId, description } = folderData;
      
      db.run(
        'INSERT INTO folders (name, path, user_id, parent_id, description) VALUES (?, ?, ?, ?, ?)',
        [name, path, userId, parentId, description],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  static async findById(id, userId = null) {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM folders WHERE id = ?';
      let params = [id];

      if (userId) {
        query += ' AND user_id = ?';
        params.push(userId);
      }

      db.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  static async findByPath(path, userId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM folders WHERE path = ? AND user_id = ?',
        [path, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  static async findByUser(userId, parentId = null) {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM folders WHERE user_id = ?';
      let params = [userId];

      if (parentId === null) {
        query += ' AND parent_id IS NULL';
      } else {
        query += ' AND parent_id = ?';
        params.push(parentId);
      }

      query += ' ORDER BY name ASC';

      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  static async getTree(userId, parentId = null) {
    return new Promise(async (resolve, reject) => {
      try {
        const folders = await this.findByUser(userId, parentId);
        
        // Get child folders for each folder
        for (let folder of folders) {
          folder.children = await this.getTree(userId, folder.id);
        }

        resolve(folders);
      } catch (error) {
        reject(error);
      }
    });
  }

  static async update(id, userId, updateData) {
    return new Promise((resolve, reject) => {
      const allowedFields = ['name', 'description'];
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

      // Update path if name is being changed
      if (updateData.name) {
        updates.push('path = ?');
        // This is a simplified path update - in production you might want more sophisticated path handling
        params.push(updateData.name.toLowerCase().replace(/[^a-z0-9]/g, '-'));
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id, userId);

      const query = `UPDATE folders SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`;

      db.run(query, params, function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }

  static async delete(id, userId) {
    return new Promise((resolve, reject) => {
      // First check if folder has any files or subfolders
      db.get(
        `SELECT 
          (SELECT COUNT(*) FROM files WHERE folder_id = ?) as file_count,
          (SELECT COUNT(*) FROM folders WHERE parent_id = ?) as subfolder_count`,
        [id, id],
        (err, counts) => {
          if (err) {
            reject(err);
            return;
          }

          if (counts.file_count > 0 || counts.subfolder_count > 0) {
            reject(new Error('Cannot delete folder that contains files or subfolders'));
            return;
          }

          db.run(
            'DELETE FROM folders WHERE id = ? AND user_id = ?',
            [id, userId],
            function(err) {
              if (err) reject(err);
              else resolve(this.changes > 0);
            }
          );
        }
      );
    });
  }

  static async getStats(folderId, userId) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT 
          COUNT(*) as file_count,
          SUM(size) as total_size,
          COUNT(CASE WHEN file_type = 'image' THEN 1 END) as image_count,
          COUNT(CASE WHEN file_type = 'video' THEN 1 END) as video_count
         FROM files 
         WHERE folder_id = ? AND user_id = ?`,
        [folderId, userId],
        (err, stats) => {
          if (err) reject(err);
          else resolve(stats);
        }
      );
    });
  }

  static async getFiles(folderId, userId, options = {}) {
    return new Promise((resolve, reject) => {
      const { limit = 50, offset = 0, fileType } = options;
      
      let query = 'SELECT * FROM files WHERE folder_id = ? AND user_id = ?';
      let params = [folderId, userId];

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

  static generatePath(name) {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }
}

module.exports = Folder;
