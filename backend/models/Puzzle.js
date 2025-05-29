const db = require('../database/config');

class Puzzle {
    static async create(puzzleData) {
        const { difficulty, puzzle, solution, createdBy } = puzzleData;
        const sql = `
            INSERT INTO puzzles (difficulty, puzzle, solution, created_by, created_at)
            VALUES (?, ?, ?, ?, datetime('now'))
        `;
        const result = await db.run(sql, [difficulty, JSON.stringify(puzzle), JSON.stringify(solution), createdBy]);
        return result.id;
    }

    static async findById(id) {
        const sql = 'SELECT * FROM puzzles WHERE id = ?';
        const puzzle = await db.get(sql, [id]);
        if (puzzle) {
            puzzle.puzzle = JSON.parse(puzzle.puzzle);
            puzzle.solution = JSON.parse(puzzle.solution);
        }
        return puzzle;
    }

    static async findByDifficulty(difficulty, limit = 10) {
        const sql = 'SELECT * FROM puzzles WHERE difficulty = ? ORDER BY created_at DESC LIMIT ?';
        const puzzles = await db.all(sql, [difficulty, limit]);
        return puzzles.map(puzzle => ({
            ...puzzle,
            puzzle: JSON.parse(puzzle.puzzle),
            solution: JSON.parse(puzzle.solution)
        }));
    }

    static async findAll(limit = 50) {
        const sql = 'SELECT * FROM puzzles ORDER BY created_at DESC LIMIT ?';
        const puzzles = await db.all(sql, [limit]);
        return puzzles.map(puzzle => ({
            ...puzzle,
            puzzle: JSON.parse(puzzle.puzzle),
            solution: JSON.parse(puzzle.solution)
        }));
    }

    static async delete(id) {
        const sql = 'DELETE FROM puzzles WHERE id = ?';
        const result = await db.run(sql, [id]);
        return result.changes > 0;
    }
}

module.exports = Puzzle;