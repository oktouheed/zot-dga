const { initializeDatabase, db } = require('./init');

// Run database migration
const runMigration = async () => {
  console.log('🔄 Running database migration...');
  
  try {
    await initializeDatabase();
    console.log('✅ Database migration completed!');
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    setTimeout(() => {
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        } else {
          console.log('📊 Database connection closed');
        }
        process.exit(0);
      });
    }, 500);
  }
};

runMigration();
