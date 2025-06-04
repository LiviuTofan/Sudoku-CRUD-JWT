const db = require('../database/config');

async function initDatabase() {
    try {
        if (!db.db) {
            await db.connect();
        }
        
        // Create users table
        await db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT DEFAULT 'user' CHECK(role IN ('visitor', 'user', 'admin')),
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
                updated_at TEXT DEFAULT NULL,
                FOREIGN KEY (created_by) REFERENCES users (id)
            )
        `);

        const tableInfo = await db.all(`PRAGMA table_info(puzzles)`);
        const hasUpdatedAt = tableInfo.some(column => column.name === 'updated_at');
        
        if (!hasUpdatedAt) {
            console.log('🔄 Adding missing updated_at column...');
            await db.run(`ALTER TABLE puzzles ADD COLUMN updated_at TEXT DEFAULT NULL`);
            await db.run(`UPDATE puzzles SET updated_at = created_at WHERE updated_at IS NULL`);
        }

        // Create indexes
        await db.run('CREATE INDEX IF NOT EXISTS idx_puzzles_difficulty ON puzzles(difficulty)');
        await db.run('CREATE INDEX IF NOT EXISTS idx_puzzles_created_at ON puzzles(created_at)');
        await db.run('CREATE INDEX IF NOT EXISTS idx_puzzles_updated_at ON puzzles(updated_at)');
        await db.run('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');

        console.log('Database initialized successfully!');
        console.log('Tables created: users, puzzles (with updated_at column)');
        
        const finalTableInfo = await db.all(`PRAGMA table_info(puzzles)`);;
        finalTableInfo.forEach(column => {
            console.log(`  - ${column.name}: ${column.type}`);
        });
        
        return true;
        
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
}

if (require.main === module) {
    initDatabase()
        .then(() => {
            console.log('Database initialization completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Database initialization failed:', error);
            process.exit(1);
        });
}

module.exports = initDatabase;