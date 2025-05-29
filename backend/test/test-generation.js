import { generateSudoku, printGrid } from '../sudoku/index.js';

export function testSudokuGeneration() {
  console.log("=== Testing Sudoku Generation ===");
  
  // Generate sudoku puzzles for each difficulty
  const difficulties = ['easy', 'medium', 'hard'];
  
  for (const difficulty of difficulties) {
    console.log(`\n- Generating ${difficulty} sudoku:`);
    
    const start = performance.now();
    const { puzzle, solution } = generateSudoku(difficulty);
    const end = performance.now();
    
    console.log(`  Generation time: ${(end - start).toFixed(2)}ms`);
    
    // Count empty cells to verify difficulty
    let emptyCells = 0;
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (puzzle[row][col] === 0) emptyCells++;
      }
    }
    
    console.log(`  Empty cells: ${emptyCells} (${(emptyCells / 81 * 100).toFixed(2)}% of grid)`);
    console.log("\nPuzzle:");
    printGrid(puzzle);
    console.log("\nSolution:");
    printGrid(solution);
    
    console.log("=".repeat(40));
  }
}

export default testSudokuGeneration;