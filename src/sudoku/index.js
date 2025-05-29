import { generateSudoku as genSudoku } from './generator.js';
import { isValidMove, isSolved, solveSudoku } from './solver.js';
import { printGrid } from './utils.js';

const generateSudoku = (difficulty) => {
  const result = genSudoku(difficulty);
  
  return {
    puzzle: result.puzzle.map(row => [...row]),
    solution: result.solution.map(row => [...row])
  };
};

export {
  generateSudoku,
  isValidMove,
  isSolved,
  solveSudoku,
  printGrid
};
