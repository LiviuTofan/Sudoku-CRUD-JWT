const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const Puzzle = require('../models/Puzzle');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Puzzle:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         difficulty:
 *           type: string
 *           enum: [easy, medium, hard]
 *         puzzle:
 *           type: array
 *           items:
 *             type: array
 *             items:
 *               type: integer
 *               minimum: 0
 *               maximum: 9
 *         solution:
 *           type: array
 *           items:
 *             type: array
 *             items:
 *               type: integer
 *               minimum: 1
 *               maximum: 9
 *         created_by:
 *           type: integer
 *         created_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/puzzles:
 *   get:
 *     summary: Get puzzles with pagination and filtering
 *     tags: [Puzzles]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of puzzles per page
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: string
 *           enum: [easy, medium, hard]
 *         description: Filter by difficulty
 *     responses:
 *       200:
 *         description: List of puzzles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 puzzles:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Puzzle'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       400:
 *         description: Invalid query parameters
 */
router.get('/', [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    query('difficulty')
        .optional()
        .isIn(['easy', 'medium', 'hard'])
        .withMessage('Difficulty must be easy, medium, or hard')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const difficulty = req.query.difficulty;
        const offset = (page - 1) * limit;

        let puzzles, total;

        if (difficulty) {
            puzzles = await Puzzle.findByDifficultyPaginated(difficulty, limit, offset);
            total = await Puzzle.countByDifficulty(difficulty);
        } else {
            puzzles = await Puzzle.findAllPaginated(limit, offset);
            total = await Puzzle.count();
        }

        const totalPages = Math.ceil(total / limit);

        res.json({
            puzzles,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        });

    } catch (error) {
        console.error('Get puzzles error:', error);
        res.status(500).json({
            error: 'Failed to fetch puzzles',
            code: 'FETCH_PUZZLES_ERROR'
        });
    }
});

/**
 * @swagger
 * /api/puzzles:
 *   post:
 *     summary: Create a new puzzle
 *     tags: [Puzzles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - difficulty
 *               - puzzle
 *               - solution
 *             properties:
 *               difficulty:
 *                 type: string
 *                 enum: [easy, medium, hard]
 *               puzzle:
 *                 type: array
 *                 items:
 *                   type: array
 *                   items:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 9
 *               solution:
 *                 type: array
 *                 items:
 *                   type: array
 *                   items:
 *                     type: integer
 *                     minimum: 1
 *                     maximum: 9
 *     responses:
 *       201:
 *         description: Puzzle created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticateToken, [
    body('difficulty')
        .isIn(['easy', 'medium', 'hard'])
        .withMessage('Difficulty must be easy, medium, or hard'),
    body('puzzle')
        .isArray({ min: 9, max: 9 })
        .withMessage('Puzzle must be a 9x9 array')
        .custom((puzzle) => {
            if (!Array.isArray(puzzle) || puzzle.length !== 9) {
                throw new Error('Puzzle must be a 9x9 grid');
            }
            for (let row of puzzle) {
                if (!Array.isArray(row) || row.length !== 9) {
                    throw new Error('Each row must contain exactly 9 elements');
                }
                for (let cell of row) {
                    if (!Number.isInteger(cell) || cell < 0 || cell > 9) {
                        throw new Error('Each cell must be an integer between 0 and 9');
                    }
                }
            }
            return true;
        }),
    body('solution')
        .isArray({ min: 9, max: 9 })
        .withMessage('Solution must be a 9x9 array')
        .custom((solution) => {
            if (!Array.isArray(solution) || solution.length !== 9) {
                throw new Error('Solution must be a 9x9 grid');
            }
            for (let row of solution) {
                if (!Array.isArray(row) || row.length !== 9) {
                    throw new Error('Each row must contain exactly 9 elements');
                }
                for (let cell of row) {
                    if (!Number.isInteger(cell) || cell < 1 || cell > 9) {
                        throw new Error('Each cell in solution must be an integer between 1 and 9');
                    }
                }
            }
            return true;
        })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { difficulty, puzzle, solution } = req.body;
        const createdBy = req.user.id;

        // Validate that solution is valid for the puzzle
        const isValidSolution = validateSudokuSolution(puzzle, solution);
        if (!isValidSolution) {
            return res.status(400).json({
                error: 'Invalid solution for the given puzzle',
                code: 'INVALID_SOLUTION'
            });
        }

        const puzzleId = await Puzzle.create({
            difficulty,
            puzzle,
            solution,
            createdBy
        });

        const createdPuzzle = await Puzzle.findById(puzzleId);

        res.status(201).json({
            message: 'Puzzle created successfully',
            puzzle: createdPuzzle
        });

    } catch (error) {
        console.error('Create puzzle error:', error);
        res.status(500).json({
            error: 'Failed to create puzzle',
            code: 'CREATE_PUZZLE_ERROR'
        });
    }
});

/**
 * @swagger
 * /api/puzzles/{id}:
 *   get:
 *     summary: Get a specific puzzle by ID
 *     tags: [Puzzles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Puzzle ID
 *     responses:
 *       200:
 *         description: Puzzle details
 *       404:
 *         description: Puzzle not found
 */
router.get('/:id', [
    param('id')
        .isInt({ min: 1 })
        .withMessage('ID must be a positive integer')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const puzzle = await Puzzle.findById(req.params.id);
        
        if (!puzzle) {
            return res.status(404).json({
                error: 'Puzzle not found',
                code: 'PUZZLE_NOT_FOUND'
            });
        }

        res.json({ puzzle });

    } catch (error) {
        console.error('Get puzzle error:', error);
        res.status(500).json({
            error: 'Failed to fetch puzzle',
            code: 'FETCH_PUZZLE_ERROR'
        });
    }
});

/**
 * @swagger
 * /api/puzzles/{id}:
 *   put:
 *     summary: Update a puzzle
 *     tags: [Puzzles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Puzzle ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               difficulty:
 *                 type: string
 *                 enum: [easy, medium, hard]
 *               puzzle:
 *                 type: array
 *                 items:
 *                   type: array
 *                   items:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 9
 *               solution:
 *                 type: array
 *                 items:
 *                   type: array
 *                   items:
 *                     type: integer
 *                     minimum: 1
 *                     maximum: 9
 *     responses:
 *       200:
 *         description: Puzzle updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - can only update own puzzles
 *       404:
 *         description: Puzzle not found
 */
router.put('/:id', authenticateToken, [
    param('id')
        .isInt({ min: 1 })
        .withMessage('ID must be a positive integer'),
    body('difficulty')
        .optional()
        .isIn(['easy', 'medium', 'hard'])
        .withMessage('Difficulty must be easy, medium, or hard'),
    body('puzzle')
        .optional()
        .custom((puzzle) => {
            if (puzzle && (!Array.isArray(puzzle) || puzzle.length !== 9)) {
                throw new Error('Puzzle must be a 9x9 grid');
            }
            if (puzzle) {
                for (let row of puzzle) {
                    if (!Array.isArray(row) || row.length !== 9) {
                        throw new Error('Each row must contain exactly 9 elements');
                    }
                    for (let cell of row) {
                        if (!Number.isInteger(cell) || cell < 0 || cell > 9) {
                            throw new Error('Each cell must be an integer between 0 and 9');
                        }
                    }
                }
            }
            return true;
        }),
    body('solution')
        .optional()
        .custom((solution) => {
            if (solution && (!Array.isArray(solution) || solution.length !== 9)) {
                throw new Error('Solution must be a 9x9 grid');
            }
            if (solution) {
                for (let row of solution) {
                    if (!Array.isArray(row) || row.length !== 9) {
                        throw new Error('Each row must contain exactly 9 elements');
                    }
                    for (let cell of row) {
                        if (!Number.isInteger(cell) || cell < 1 || cell > 9) {
                            throw new Error('Each cell in solution must be an integer between 1 and 9');
                        }
                    }
                }
            }
            return true;
        })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const puzzleId = req.params.id;
        const existingPuzzle = await Puzzle.findById(puzzleId);

        if (!existingPuzzle) {
            return res.status(404).json({
                error: 'Puzzle not found',
                code: 'PUZZLE_NOT_FOUND'
            });
        }

        // Check if user owns the puzzle or is admin
        if (existingPuzzle.created_by !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                error: 'You can only update your own puzzles',
                code: 'UPDATE_FORBIDDEN'
            });
        }

        const { difficulty, puzzle, solution } = req.body;

        // If both puzzle and solution are provided, validate them
        if (puzzle && solution) {
            const isValidSolution = validateSudokuSolution(puzzle, solution);
            if (!isValidSolution) {
                return res.status(400).json({
                    error: 'Invalid solution for the given puzzle',
                    code: 'INVALID_SOLUTION'
                });
            }
        }

        const updated = await Puzzle.update(puzzleId, {
            difficulty,
            puzzle,
            solution
        });

        if (!updated) {
            return res.status(500).json({
                error: 'Failed to update puzzle',
                code: 'UPDATE_FAILED'
            });
        }

        const updatedPuzzle = await Puzzle.findById(puzzleId);

        res.json({
            message: 'Puzzle updated successfully',
            puzzle: updatedPuzzle
        });

    } catch (error) {
        console.error('Update puzzle error:', error);
        res.status(500).json({
            error: 'Failed to update puzzle',
            code: 'UPDATE_PUZZLE_ERROR'
        });
    }
});

/**
 * @swagger
 * /api/puzzles/{id}:
 *   delete:
 *     summary: Delete a puzzle
 *     tags: [Puzzles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Puzzle ID
 *     responses:
 *       200:
 *         description: Puzzle deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - can only delete own puzzles
 *       404:
 *         description: Puzzle not found
 */
router.delete('/:id', authenticateToken, [
    param('id')
        .isInt({ min: 1 })
        .withMessage('ID must be a positive integer')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const puzzleId = req.params.id;
        const existingPuzzle = await Puzzle.findById(puzzleId);

        if (!existingPuzzle) {
            return res.status(404).json({
                error: 'Puzzle not found',
                code: 'PUZZLE_NOT_FOUND'
            });
        }

        // Check if user owns the puzzle or is admin
        if (existingPuzzle.created_by !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                error: 'You can only delete your own puzzles',
                code: 'DELETE_FORBIDDEN'
            });
        }

        const deleted = await Puzzle.delete(puzzleId);

        if (!deleted) {
            return res.status(500).json({
                error: 'Failed to delete puzzle',
                code: 'DELETE_FAILED'
            });
        }

        res.json({
            message: 'Puzzle deleted successfully'
        });

    } catch (error) {
        console.error('Delete puzzle error:', error);
        res.status(500).json({
            error: 'Failed to delete puzzle',
            code: 'DELETE_PUZZLE_ERROR'
        });
    }
});

// Helper function to validate Sudoku solution
function validateSudokuSolution(puzzle, solution) {
    // Basic validation: check that solution has numbers where puzzle has 0s
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (puzzle[i][j] !== 0 && puzzle[i][j] !== solution[i][j]) {
                return false;
            }
        }
    }

    // Validate Sudoku rules for solution
    return isValidSudoku(solution);
}

function isValidSudoku(grid) {
    // Check rows
    for (let row = 0; row < 9; row++) {
        const seen = new Set();
        for (let col = 0; col < 9; col++) {
            const num = grid[row][col];
            if (seen.has(num)) return false;
            seen.add(num);
        }
    }

    // Check columns
    for (let col = 0; col < 9; col++) {
        const seen = new Set();
        for (let row = 0; row < 9; row++) {
            const num = grid[row][col];
            if (seen.has(num)) return false;
            seen.add(num);
        }
    }

    // Check 3x3 boxes
    for (let boxRow = 0; boxRow < 3; boxRow++) {
        for (let boxCol = 0; boxCol < 3; boxCol++) {
            const seen = new Set();
            for (let row = boxRow * 3; row < boxRow * 3 + 3; row++) {
                for (let col = boxCol * 3; col < boxCol * 3 + 3; col++) {
                    const num = grid[row][col];
                    if (seen.has(num)) return false;
                    seen.add(num);
                }
            }
        }
    }

    return true;
}

/**
 * @swagger
 * /api/puzzles/generate:
 *   post:
 *     summary: Generate a new Sudoku puzzle
 *     tags: [Puzzles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - difficulty
 *             properties:
 *               difficulty:
 *                 type: string
 *                 enum: [easy, medium, hard]
 *               save:
 *                 type: boolean
 *                 default: false
 *                 description: Whether to save the generated puzzle to database
 *     responses:
 *       200:
 *         description: Puzzle generated successfully
 *       201:
 *         description: Puzzle generated and saved successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/generate', authenticateToken, [
    body('difficulty')
        .isIn(['easy', 'medium', 'hard'])
        .withMessage('Difficulty must be easy, medium, or hard'),
    body('save')
        .optional()
        .isBoolean()
        .withMessage('Save must be a boolean value')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { difficulty, save = false } = req.body;
        
        // Generate a new Sudoku puzzle
        const { puzzle, solution } = generateSudokuPuzzle(difficulty);

        let savedPuzzle = null;
        
        if (save) {
            const puzzleId = await Puzzle.create({
                difficulty,
                puzzle,
                solution,
                createdBy: req.user.id
            });
            savedPuzzle = await Puzzle.findById(puzzleId);
        }

        const response = {
            message: save ? 'Puzzle generated and saved successfully' : 'Puzzle generated successfully',
            puzzle: {
                difficulty,
                puzzle,
                solution: req.user.role === 'admin' ? solution : undefined // Only show solution to admins
            }
        };

        if (savedPuzzle) {
            response.savedPuzzle = savedPuzzle;
        }

        res.status(save ? 201 : 200).json(response);

    } catch (error) {
        console.error('Generate puzzle error:', error);
        res.status(500).json({
            error: 'Failed to generate puzzle',
            code: 'GENERATE_PUZZLE_ERROR'
        });
    }
});

/**
 * @swagger
 * /api/puzzles/{id}/solve:
 *   post:
 *     summary: Get solution for a specific puzzle
 *     tags: [Puzzles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Puzzle ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentState:
 *                 type: array
 *                 items:
 *                   type: array
 *                   items:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 9
 *                 description: Current puzzle state (optional, for partial solving)
 *               hint:
 *                 type: boolean
 *                 default: false
 *                 description: If true, returns only a single hint instead of full solution
 *     responses:
 *       200:
 *         description: Solution or hint provided
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Puzzle not found
 */
router.post('/:id/solve', authenticateToken, [
    param('id')
        .isInt({ min: 1 })
        .withMessage('ID must be a positive integer'),
    body('currentState')
        .optional()
        .custom((currentState) => {
            if (currentState && (!Array.isArray(currentState) || currentState.length !== 9)) {
                throw new Error('Current state must be a 9x9 grid');
            }
            if (currentState) {
                for (let row of currentState) {
                    if (!Array.isArray(row) || row.length !== 9) {
                        throw new Error('Each row must contain exactly 9 elements');
                    }
                    for (let cell of row) {
                        if (!Number.isInteger(cell) || cell < 0 || cell > 9) {
                            throw new Error('Each cell must be an integer between 0 and 9');
                        }
                    }
                }
            }
            return true;
        }),
    body('hint')
        .optional()
        .isBoolean()
        .withMessage('Hint must be a boolean value')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const puzzle = await Puzzle.findById(req.params.id);
        
        if (!puzzle) {
            return res.status(404).json({
                error: 'Puzzle not found',
                code: 'PUZZLE_NOT_FOUND'
            });
        }

        const { currentState, hint = false } = req.body;
        const workingGrid = currentState || puzzle.puzzle;

        if (hint) {
            // Provide a single hint
            const hintCell = getNextHint(workingGrid, puzzle.solution);
            
            if (!hintCell) {
                return res.json({
                    message: 'No hints available - puzzle may be complete or invalid',
                    hint: null
                });
            }

            res.json({
                message: 'Hint provided',
                hint: {
                    row: hintCell.row,
                    col: hintCell.col,
                    value: hintCell.value,
                    explanation: `The value ${hintCell.value} goes in row ${hintCell.row + 1}, column ${hintCell.col + 1}`
                }
            });
        } else {
            // Provide full solution
            res.json({
                message: 'Solution provided',
                solution: puzzle.solution,
                steps: getSolutionSteps(workingGrid, puzzle.solution)
            });
        }

    } catch (error) {
        console.error('Solve puzzle error:', error);
        res.status(500).json({
            error: 'Failed to solve puzzle',
            code: 'SOLVE_PUZZLE_ERROR'
        });
    }
});

/**
 * @swagger
 * /api/puzzles/{id}/validate:
 *   post:
 *     summary: Validate a move or current puzzle state
 *     tags: [Puzzles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Puzzle ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentState:
 *                 type: array
 *                 items:
 *                   type: array
 *                   items:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 9
 *                 description: Current puzzle state to validate
 *               move:
 *                 type: object
 *                 properties:
 *                   row:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 8
 *                   col:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 8
 *                   value:
 *                     type: integer
 *                     minimum: 1
 *                     maximum: 9
 *                 description: Specific move to validate (optional)
 *     responses:
 *       200:
 *         description: Validation result
 *       400:
 *         description: Validation error
 *       404:
 *         description: Puzzle not found
 */
router.post('/:id/validate', [
    param('id')
        .isInt({ min: 1 })
        .withMessage('ID must be a positive integer'),
    body('currentState')
        .custom((currentState) => {
            if (!Array.isArray(currentState) || currentState.length !== 9) {
                throw new Error('Current state must be a 9x9 grid');
            }
            for (let row of currentState) {
                if (!Array.isArray(row) || row.length !== 9) {
                    throw new Error('Each row must contain exactly 9 elements');
                }
                for (let cell of row) {
                    if (!Number.isInteger(cell) || cell < 0 || cell > 9) {
                        throw new Error('Each cell must be an integer between 0 and 9');
                    }
                }
            }
            return true;
        }),
    body('move')
        .optional()
        .custom((move) => {
            if (move) {
                if (typeof move !== 'object' || move === null) {
                    throw new Error('Move must be an object');
                }
                if (!Number.isInteger(move.row) || move.row < 0 || move.row > 8) {
                    throw new Error('Move row must be an integer between 0 and 8');
                }
                if (!Number.isInteger(move.col) || move.col < 0 || move.col > 8) {
                    throw new Error('Move col must be an integer between 0 and 8');
                }
                if (!Number.isInteger(move.value) || move.value < 1 || move.value > 9) {
                    throw new Error('Move value must be an integer between 1 and 9');
                }
            }
            return true;
        })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const puzzle = await Puzzle.findById(req.params.id);
        
        if (!puzzle) {
            return res.status(404).json({
                error: 'Puzzle not found',
                code: 'PUZZLE_NOT_FOUND'
            });
        }

        const { currentState, move } = req.body;

        // Validate that the current state doesn't violate the original puzzle
        const originalViolations = validateAgainstOriginal(puzzle.puzzle, currentState);
        if (originalViolations.length > 0) {
            return res.json({
                valid: false,
                message: 'Current state violates original puzzle constraints',
                violations: originalViolations
            });
        }

        let validationResult = {
            valid: true,
            complete: false,
            violations: [],
            correctCells: 0,
            totalCells: 81,
            progress: 0
        };

        // If a specific move is provided, validate it
        if (move) {
            const moveValidation = validateMove(currentState, move, puzzle.solution);
            validationResult = { ...validationResult, ...moveValidation };
        }

        // Validate current state for Sudoku rules
        const sudokuValidation = validateSudokuState(currentState);
        validationResult.violations = [...validationResult.violations, ...sudokuValidation.violations];
        validationResult.valid = validationResult.valid && sudokuValidation.valid;

        // Check progress and completion
        const progress = calculateProgress(currentState, puzzle.solution);
        validationResult.correctCells = progress.correct;
        validationResult.progress = Math.round((progress.correct / 81) * 100);
        validationResult.complete = progress.complete;

        // Provide hints for violations if any
        if (validationResult.violations.length > 0) {
            validationResult.hints = generateHintsForViolations(validationResult.violations);
        }

        res.json(validationResult);

    } catch (error) {
        console.error('Validate puzzle error:', error);
        res.status(500).json({
            error: 'Failed to validate puzzle',
            code: 'VALIDATE_PUZZLE_ERROR'
        });
    }
});

// Helper functions for puzzle generation and validation

function generateSudokuPuzzle(difficulty) {
    // Create a complete solution first
    const solution = generateCompleteSudoku();
    
    // Remove cells based on difficulty
    const puzzle = JSON.parse(JSON.stringify(solution));
    const cellsToRemove = getDifficultySettings(difficulty).cellsToRemove;
    
    removeCellsFromPuzzle(puzzle, cellsToRemove);
    
    return { puzzle, solution };
}

function generateCompleteSudoku() {
    const grid = Array(9).fill().map(() => Array(9).fill(0));
    fillSudoku(grid);
    return grid;
}

function fillSudoku(grid) {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (grid[row][col] === 0) {
                const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
                shuffleArray(numbers);
                
                for (let num of numbers) {
                    if (isValidMove(grid, row, col, num)) {
                        grid[row][col] = num;
                        if (fillSudoku(grid)) {
                            return true;
                        }
                        grid[row][col] = 0;
                    }
                }
                return false;
            }
        }
    }
    return true;
}

function isValidMove(grid, row, col, num) {
    // Check row
    for (let x = 0; x < 9; x++) {
        if (grid[row][x] === num) return false;
    }
    
    // Check column
    for (let x = 0; x < 9; x++) {
        if (grid[x][col] === num) return false;
    }
    
    // Check 3x3 box
    const startRow = row - row % 3;
    const startCol = col - col % 3;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (grid[i + startRow][j + startCol] === num) return false;
        }
    }
    
    return true;
}

function getDifficultySettings(difficulty) {
    const settings = {
        easy: { cellsToRemove: 40 },
        medium: { cellsToRemove: 50 },
        hard: { cellsToRemove: 60 }
    };
    return settings[difficulty];
}

function removeCellsFromPuzzle(puzzle, count) {
    const positions = [];
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            positions.push([i, j]);
        }
    }
    
    shuffleArray(positions);
    
    for (let i = 0; i < count && i < positions.length; i++) {
        const [row, col] = positions[i];
        puzzle[row][col] = 0;
    }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function getNextHint(currentState, solution) {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (currentState[row][col] === 0) {
                return {
                    row,
                    col,
                    value: solution[row][col]
                };
            }
        }
    }
    return null;
}

function getSolutionSteps(currentState, solution) {
    const steps = [];
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (currentState[row][col] === 0) {
                steps.push({
                    row,
                    col,
                    value: solution[row][col]
                });
            }
        }
    }
    return steps;
}

function validateAgainstOriginal(original, current) {
    const violations = [];
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (original[row][col] !== 0 && original[row][col] !== current[row][col]) {
                violations.push({
                    type: 'original_constraint',
                    row,
                    col,
                    expected: original[row][col],
                    actual: current[row][col],
                    message: `Cell (${row + 1}, ${col + 1}) cannot be changed from original value ${original[row][col]}`
                });
            }
        }
    }
    return violations;
}

function validateMove(currentState, move, solution) {
    const { row, col, value } = move;
    
    // Create a copy and apply the move
    const testGrid = currentState.map(r => [...r]);
    testGrid[row][col] = value;
    
    const isCorrect = solution[row][col] === value;
    const isValidSudokuMove = isValidMove(currentState, row, col, value);
    
    return {
        moveValid: isValidSudokuMove,
        moveCorrect: isCorrect,
        move: {
            row,
            col,
            value,
            correct: isCorrect,
            valid: isValidSudokuMove
        }
    };
}

function validateSudokuState(grid) {
    const violations = [];
    
    // Check for duplicates in rows, columns, and boxes
    for (let i = 0; i < 9; i++) {
        // Check row
        const rowValues = grid[i].filter(v => v !== 0);
        const rowDuplicates = findDuplicates(rowValues);
        if (rowDuplicates.length > 0) {
            violations.push({
                type: 'row_duplicate',
                row: i,
                values: rowDuplicates,
                message: `Row ${i + 1} has duplicate values: ${rowDuplicates.join(', ')}`
            });
        }
        
        // Check column
        const colValues = [];
        for (let j = 0; j < 9; j++) {
            if (grid[j][i] !== 0) colValues.push(grid[j][i]);
        }
        const colDuplicates = findDuplicates(colValues);
        if (colDuplicates.length > 0) {
            violations.push({
                type: 'column_duplicate',
                col: i,
                values: colDuplicates,
                message: `Column ${i + 1} has duplicate values: ${colDuplicates.join(', ')}`
            });
        }
    }
    
    // Check 3x3 boxes
    for (let boxRow = 0; boxRow < 3; boxRow++) {
        for (let boxCol = 0; boxCol < 3; boxCol++) {
            const boxValues = [];
            for (let row = boxRow * 3; row < boxRow * 3 + 3; row++) {
                for (let col = boxCol * 3; col < boxCol * 3 + 3; col++) {
                    if (grid[row][col] !== 0) boxValues.push(grid[row][col]);
                }
            }
            const boxDuplicates = findDuplicates(boxValues);
            if (boxDuplicates.length > 0) {
                violations.push({
                    type: 'box_duplicate',
                    box: { row: boxRow, col: boxCol },
                    values: boxDuplicates,
                    message: `Box (${boxRow + 1}, ${boxCol + 1}) has duplicate values: ${boxDuplicates.join(', ')}`
                });
            }
        }
    }
    
    return {
        valid: violations.length === 0,
        violations
    };
}

function findDuplicates(arr) {
    const seen = new Set();
    const duplicates = new Set();
    
    for (let item of arr) {
        if (seen.has(item)) {
            duplicates.add(item);
        } else {
            seen.add(item);
        }
    }
    
    return Array.from(duplicates);
}

function calculateProgress(currentState, solution) {
    let correct = 0;
    let filled = 0;
    
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (currentState[row][col] !== 0) {
                filled++;
                if (currentState[row][col] === solution[row][col]) {
                    correct++;
                }
            }
        }
    }
    
    return {
        correct,
        filled,
        complete: correct === 81 && filled === 81
    };
}

function generateHintsForViolations(violations) {
    return violations.map(violation => {
        switch (violation.type) {
            case 'row_duplicate':
                return `Check row ${violation.row + 1} for duplicate numbers: ${violation.values.join(', ')}`;
            case 'column_duplicate':
                return `Check column ${violation.col + 1} for duplicate numbers: ${violation.values.join(', ')}`;
            case 'box_duplicate':
                return `Check the 3x3 box at position (${violation.box.row + 1}, ${violation.box.col + 1}) for duplicate numbers: ${violation.values.join(', ')}`;
            case 'original_constraint':
                return violation.message;
            default:
                return 'Unknown violation type';
        }
    });
}

module.exports = router;