// Updated initDatabase.js - Fix the schema to include updated_at
const db = require('../database/config');

async function initDatabase() {
    try {
        // Don't connect here if already connected (for tests)
        if (!db.db) {
            await db.connect();
        }
        
        // Create users table
        await db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
                created_at TEXT NOT NULL
            )
        `);

        // Create puzzles table WITH updated_at column
        await db.run(`
            CREATE TABLE IF NOT EXISTS puzzles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                difficulty TEXT NOT NULL CHECK(difficulty IN ('easy', 'medium', 'hard')),
                puzzle TEXT NOT NULL,
                solution TEXT NOT NULL,
                created_by INTEGER,
                created_at TEXT NOT NULL,
                updated_at TEXT DEFAULT NULL,
                FOREIGN KEY (created_by) REFERENCES users (id)
            )
        `);

        // Check if updated_at column exists (for existing databases)
        const tableInfo = await db.all(`PRAGMA table_info(puzzles)`);
        const hasUpdatedAt = tableInfo.some(column => column.name === 'updated_at');
        
        if (!hasUpdatedAt) {
            console.log('🔄 Adding missing updated_at column...');
            await db.run(`ALTER TABLE puzzles ADD COLUMN updated_at TEXT DEFAULT NULL`);
            
            // Update existing records
            await db.run(`UPDATE puzzles SET updated_at = created_at WHERE updated_at IS NULL`);
            console.log('✅ updated_at column added successfully');
        }

        // Create indexes for better performance
        await db.run('CREATE INDEX IF NOT EXISTS idx_puzzles_difficulty ON puzzles(difficulty)');
        await db.run('CREATE INDEX IF NOT EXISTS idx_puzzles_created_at ON puzzles(created_at)');
        await db.run('CREATE INDEX IF NOT EXISTS idx_puzzles_updated_at ON puzzles(updated_at)');
        await db.run('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');

        console.log('Database initialized successfully!');
        console.log('Tables created: users, puzzles (with updated_at column)');
        
        // Log current table structure
        const finalTableInfo = await db.all(`PRAGMA table_info(puzzles)`);
        console.log('📋 Puzzles table structure:');
        finalTableInfo.forEach(column => {
            console.log(`  - ${column.name}: ${column.type}`);
        });
        
        return true;
        
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    initDatabase()
        .then(() => {
            console.log('🎉 Database initialization completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Database initialization failed:', error);
            process.exit(1);
        });
}

module.exports = initDatabase;