import { findEmptyCell, isValidPlacement, shuffleArray } from './utils.js';

export function solveSudoku(grid) {
  let emptyCell = findEmptyCell(grid);
  
  if (!emptyCell) return true;

  const { row, col } = emptyCell;
  
  for (let num = 1; num <= 9; num++) {
    if (isValidPlacement(grid, row, col, num)) {
      grid[row][col] = num;

      if (solveSudoku(grid)) {
        return true;
      }
      
      grid[row][col] = 0;
    }
  }

  return false;
}

export function solveSudokuRandomized(grid) {
  let emptyCell = findEmptyCell(grid);

  if (!emptyCell) return true;
  
  const { row, col } = emptyCell;
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  shuffleArray(numbers);
  
  for (const num of numbers) {
    if (isValidPlacement(grid, row, col, num)) {
      grid[row][col] = num;
      
      if (solveSudokuRandomized(grid)) {
        return true;
      }
      
      grid[row][col] = 0;
    }
  }
  
  return false;
}

export function isSolved(grid) {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] === 0) return false;
    }
  }
  
  // Check each row
  for (let row = 0; row < 9; row++) {
    const seen = new Set();
    for (let col = 0; col < 9; col++) {
      seen.add(grid[row][col]);
    }
    if (seen.size !== 9) return false;
  }
  
  // Check each column
  for (let col = 0; col < 9; col++) {
    const seen = new Set();
    for (let row = 0; row < 9; row++) {
      seen.add(grid[row][col]);
    }
    if (seen.size !== 9) return false;
  }
  
  // Check each 3x3 box
  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      const seen = new Set();
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          seen.add(grid[boxRow * 3 + row][boxCol * 3 + col]);
        }
      }
      if (seen.size !== 9) return false;
    }
  }
  
  return true;
}

export function isValidMove(grid, row, col, value) {
  return isValidPlacement(grid, row, col, value);
}