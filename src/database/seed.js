const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { db } = require('./init');

const seedDatabase = async () => {
  console.log('🌱 Seeding database...');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@zot-dga.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  try {
    // Wait a bit for database to be ready
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check if admin user already exists
    const existingAdmin = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM users WHERE email = ?', [adminEmail], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists, skipping seed...');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const apiKey = uuidv4();

    // Create admin user
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO users (email, password, name, api_key) VALUES (?, ?, ?, ?)',
        [adminEmail, hashedPassword, 'Administrator', apiKey],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    console.log('✅ Admin user created successfully!');
    console.log(`📧 Email: ${adminEmail}`);
    console.log(`🔑 Password: ${adminPassword}`);
    console.log(`🗝️  API Key: ${apiKey}`);
    console.log('⚠️  Please change the default password in production!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    // Close database connection
    setTimeout(() => {
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        }
        process.exit(0);
      });
    }, 1000);
  }
};

// Initialize database first, then seed
setTimeout(() => {
  seedDatabase();
}, 1000);
