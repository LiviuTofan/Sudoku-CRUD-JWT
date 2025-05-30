const db = require('../database/config');

class Puzzle {
    /**
     * Create a new puzzle
     */
    static async create(puzzleData) {
        const { difficulty, puzzle, solution, createdBy } = puzzleData;
        
        const query = `
            INSERT INTO puzzles (difficulty, puzzle, solution, created_by, created_at)
            VALUES (?, ?, ?, ?, datetime('now'))
        `;
        
        try {
            const result = await db.run(query, [
                difficulty,
                JSON.stringify(puzzle),
                JSON.stringify(solution),
                createdBy
            ]);
            
            return result.lastID;
        } catch (error) {
            console.error('Error creating puzzle:', error);
            throw error;
        }
    }

    /**
     * Find puzzle by ID
     */
    static async findById(id) {
        const query = `
            SELECT id, difficulty, puzzle, solution, created_by, created_at
            FROM puzzles 
            WHERE id = ?
        `;
        
        try {
            const row = await db.get(query, [id]);
            
            if (row) {
                return {
                    ...row,
                    puzzle: JSON.parse(row.puzzle),
                    solution: JSON.parse(row.solution)
                };
            }
            
            return null;
        } catch (error) {
            console.error('Error finding puzzle by ID:', error);
            throw error;
        }
    }

    /**
     * Find all puzzles with pagination
     */
    static async findAllPaginated(limit = 10, offset = 0) {
        const query = `
            SELECT id, difficulty, puzzle, solution, created_by, created_at
            FROM puzzles 
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `;
        
        try {
            const rows = await db.all(query, [limit, offset]);
            
            return rows.map(row => ({
                ...row,
                puzzle: JSON.parse(row.puzzle),
                solution: JSON.parse(row.solution)
            }));
        } catch (error) {
            console.error('Error finding all puzzles:', error);
            throw error;
        }
    }

    /**
     * Find puzzles by difficulty with pagination
     */
    static async findByDifficultyPaginated(difficulty, limit = 10, offset = 0) {
        const query = `
            SELECT id, difficulty, puzzle, solution, created_by, created_at
            FROM puzzles 
            WHERE difficulty = ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `;
        
        try {
            const rows = await db.all(query, [difficulty, limit, offset]);
            
            return rows.map(row => ({
                ...row,
                puzzle: JSON.parse(row.puzzle),
                solution: JSON.parse(row.solution)
            }));
        } catch (error) {
            console.error('Error finding puzzles by difficulty:', error);
            throw error;
        }
    }

    /**
     * Count total puzzles
     */
    static async count() {
        const query = 'SELECT COUNT(*) as count FROM puzzles';
        
        try {
            const result = await db.get(query);
            return result.count;
        } catch (error) {
            console.error('Error counting puzzles:', error);
            throw error;
        }
    }

    /**
     * Count puzzles by difficulty
     */
    static async countByDifficulty(difficulty) {
        const query = 'SELECT COUNT(*) as count FROM puzzles WHERE difficulty = ?';
        
        try {
            const result = await db.get(query, [difficulty]);
            return result.count;
        } catch (error) {
            console.error('Error counting puzzles by difficulty:', error);
            throw error;
        }
    }

    /**
     * Update puzzle
     */
    static async update(id, updateData) {
        const { difficulty, puzzle, solution } = updateData;
        
        // Build dynamic query based on provided fields
        const updates = [];
        const params = [];
        
        if (difficulty !== undefined) {
            updates.push('difficulty = ?');
            params.push(difficulty);
        }
        
        if (puzzle !== undefined) {
            updates.push('puzzle = ?');
            params.push(JSON.stringify(puzzle));
        }
        
        if (solution !== undefined) {
            updates.push('solution = ?');
            params.push(JSON.stringify(solution));
        }
        
        if (updates.length === 0) {
            return true; // Nothing to update
        }
        
        updates.push('updated_at = datetime("now")');
        params.push(id);
        
        const query = `
            UPDATE puzzles 
            SET ${updates.join(', ')}
            WHERE id = ?
        `;
        
        try {
            const result = await db.run(query, params);
            return result.changes > 0;
        } catch (error) {
            console.error('Error updating puzzle:', error);
            throw error;
        }
    }

    /**
     * Delete puzzle
     */
    static async delete(id) {
        const query = 'DELETE FROM puzzles WHERE id = ?';
        
        try {
            const result = await db.run(query, [id]);
            return result.changes > 0;
        } catch (error) {
            console.error('Error deleting puzzle:', error);
            throw error;
        }
    }

    /**
     * Find puzzles by user
     */
    static async findByUser(userId, limit = 10, offset = 0) {
        const query = `
            SELECT id, difficulty, puzzle, solution, created_by, created_at
            FROM puzzles 
            WHERE created_by = ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `;
        
        try {
            const rows = await db.all(query, [userId, limit, offset]);
            
            return rows.map(row => ({
                ...row,
                puzzle: JSON.parse(row.puzzle),
                solution: JSON.parse(row.solution)
            }));
        } catch (error) {
            console.error('Error finding puzzles by user:', error);
            throw error;
        }
    }

    /**
     * Count user's puzzles
     */
    static async countByUser(userId) {
        const query = 'SELECT COUNT(*) as count FROM puzzles WHERE created_by = ?';
        
        try {
            const result = await db.get(query, [userId]);
            return result.count;
        } catch (error) {
            console.error('Error counting user puzzles:', error);
            throw error;
        }
    }
}

module.exports = Puzzle;