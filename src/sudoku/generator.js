import { isValidPlacement, shuffleArray } from './utils.js';
import { solveSudokuRandomized, solveSudoku } from './solver.js';

export function generateSolvedGrid() {
  const grid = Array(9).fill().map(() => Array(9).fill(0));
  if (!solveSudokuRandomized(grid)) {
    console.error("Failed to generate a valid sudoku solution");
    return null;
  }
  
  return grid;
}

export function hasUniqueSolution(puzzle) {
  const copy = puzzle.map(row => [...row]);

  let emptyFound = false;
  let firstEmpty = { row: -1, col: -1 };
  
  outerLoop:
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (copy[row][col] === 0) {
        firstEmpty = { row, col };
        emptyFound = true;
        break outerLoop;
      }
    }
  }
  
  if (!emptyFound) return true;
  
  let solutionCount = 0;
  
  for (let num = 1; num <= 9; num++) {
    if (isValidPlacement(copy, firstEmpty.row, firstEmpty.col, num)) {
      copy[firstEmpty.row][firstEmpty.col] = num;
      
      const tempCopy = copy.map(row => [...row]);
      const hasSolution = solveSudoku(tempCopy);
      if (hasSolution) solutionCount++;
      
      if (solutionCount > 1) return false;
    }
  }
  
  return solutionCount === 1;
}

export function createPuzzle(solvedGrid, difficulty) {

  const cellsToKeep = {
    'easy': 40,
    'medium': 30,
    'hard': 25,
  }[difficulty] || 35;
  
  // Create a copy of the solved grid
  const puzzle = solvedGrid.map(row => [...row]);
  
  // Create a list of all 81 cell positions
  const positions = [];
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      positions.push({ row, col });
    }
  }

  shuffleArray(positions);
  const cellsToRemove = 81 - cellsToKeep;
  let removedCells = 0;
  for (const pos of positions) {
    if (removedCells >= cellsToRemove) break;
    
    const { row, col } = pos;
    const value = puzzle[row][col];
    puzzle[row][col] = 0;

    if ((difficulty === 'easy' && removedCells % 5 === 0) || 
        (difficulty === 'medium' && removedCells % 3 === 0) || 
        (difficulty === 'hard' && removedCells % 8 === 0)) {

      if (!hasUniqueSolution(puzzle)) {
        puzzle[row][col] = value;
        continue;
      }
    }
    
    removedCells++;
  }
  
  return puzzle;
}

export function generateSudoku(difficulty) {
  const solution = generateSolvedGrid();
  const puzzle = createPuzzle(solution, difficulty);
  
  return {
    puzzle,
    solution
  };
}