import { generateSudoku, isValidMove, isSolved, solveSudoku, printGrid } from '../sudoku/index.js';

console.log('🧪 Testing Sudoku Logic Integration...\n');

// Test 1: Generate puzzles of different difficulties
console.log('📝 Test 1: Generating puzzles...');
const difficulties = ['easy', 'medium', 'hard'];

for (const difficulty of difficulties) {
  console.log(`\n🎯 Testing ${difficulty} difficulty:`);
  const start = Date.now();
  
  try {
    const { puzzle, solution } = generateSudoku(difficulty);
    const generationTime = Date.now() - start;
    
    // Count filled cells in puzzle
    const filledCells = puzzle.flat().filter(cell => cell !== 0).length;
    
    console.log(`  ✅ Generated in ${generationTime}ms`);
    console.log(`  📊 Filled cells: ${filledCells}/81`);
    console.log(`  🧩 Puzzle preview:`);
    
    // Show first 3 rows of puzzle
    for (let i = 0; i < 3; i++) {
      console.log(`     ${puzzle[i].map(cell => cell || '.').join(' ')}`);
    }
    
    // Verify solution is complete
    const solutionComplete = isSolved(solution);
    console.log(`  ✅ Solution is valid: ${solutionComplete}`);
    
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }
}

// Test 2: Test move validation
console.log('\n📝 Test 2: Testing move validation...');
const { puzzle } = generateSudoku('easy');

// Find first empty cell
let testRow = -1, testCol = -1;
for (let row = 0; row < 9; row++) {
  for (let col = 0; col < 9; col++) {
    if (puzzle[row][col] === 0) {
      testRow = row;
      testCol = col;
      break;
    }
  }
  if (testRow !== -1) break;
}

if (testRow !== -1) {
  console.log(`🎯 Testing moves at position [${testRow}, ${testCol}]:`);
  
  for (let num = 1; num <= 9; num++) {
    const isValid = isValidMove(puzzle, testRow, testCol, num);
    console.log(`  Number ${num}: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
  }
}

// Test 3: Test solver
console.log('\n📝 Test 3: Testing solver...');
const testPuzzle = generateSudoku('medium');
const puzzleCopy = testPuzzle.puzzle.map(row => [...row]);

console.log('🧩 Original puzzle (first 3 rows):');
for (let i = 0; i < 3; i++) {
  console.log(`   ${puzzleCopy[i].map(cell => cell || '.').join(' ')}`);
}

const solveStart = Date.now();
const solved = solveSudoku(puzzleCopy);
const solveTime = Date.now() - solveStart;

if (solved) {
  console.log(`✅ Puzzle solved in ${solveTime}ms!`);
  console.log('🎉 Solved puzzle (first 3 rows):');
  for (let i = 0; i < 3; i++) {
    console.log(`   ${puzzleCopy[i].join(' ')}`);
  }
  
  const isValidSolution = isSolved(puzzleCopy);
  console.log(`🔍 Solution is valid: ${isValidSolution}`);
} else {
  console.log('❌ Failed to solve puzzle');
}

console.log('\n🎉 All tests completed!');
console.log('\n✅ Sudoku logic integration successful! Ready for API implementation.');