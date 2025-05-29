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

        // Create puzzles table
        await db.run(`
            CREATE TABLE IF NOT EXISTS puzzles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                difficulty TEXT NOT NULL CHECK(difficulty IN ('easy', 'medium', 'hard')),
                puzzle TEXT NOT NULL,
                solution TEXT NOT NULL,
                created_by INTEGER,
                created_at TEXT NOT NULL,
                FOREIGN KEY (created_by) REFERENCES users (id)
            )
        `);

        // Create indexes for better performance
        await db.run('CREATE INDEX IF NOT EXISTS idx_puzzles_difficulty ON puzzles(difficulty)');
        await db.run('CREATE INDEX IF NOT EXISTS idx_puzzles_created_at ON puzzles(created_at)');
        await db.run('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');

        console.log('Database initialized successfully!');
        console.log('Tables created: users, puzzles');
        
        return true;
        
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    initDatabase();
}

module.exports = initDatabase;