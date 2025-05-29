import React, { useState, useEffect, useCallback } from 'react';
import '../styles/SudokuBoard.css';

const SudokuBoard = ({ puzzle, solution }) => {
  const [board, setBoard] = useState(Array(9).fill().map(() => Array(9).fill(0)));
  const [selectedCell, setSelectedCell] = useState(null);
  const [errors, setErrors] = useState(Array(9).fill().map(() => Array(9).fill(false)));
  const [showingSolution, setShowingSolution] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [puzzleSolved, setPuzzleSolved] = useState(false);
  
  useEffect(() => {
    if (puzzle) {
      setBoard(puzzle.map(row => [...row]));
      setErrors(Array(9).fill().map(() => Array(9).fill(false)));
      setPuzzleSolved(false);
      setShowConfetti(false);
    }
  }, [puzzle]);

  const isPrefilled = (row, col) => {
    return puzzle && puzzle[row][col] !== 0;
  };

  const toggleSolution = () => {
    setShowingSolution(!showingSolution);
    if (!showingSolution) {
      if (solution) {
        setBoard(solution.map(row => [...row]));
      }
    } else {
      if (puzzle) {
        setBoard(puzzle.map(row => [...row]));
        setErrors(Array(9).fill().map(() => Array(9).fill(false)));
      }
    }
  };

  const handleCellClick = (row, col) => {
    if (showingSolution) return;
    if (!isPrefilled(row, col)) {
      setSelectedCell({ row, col });
    }
  };


  const countRemainingSteps = useCallback(() => {
    let count = 0;
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        // Count if cell is empty OR has an error
        if (board[i][j] === 0 || errors[i][j]) {
          count++;
        }
      }
    }
    return count;
  }, [board, errors]);

  // Check if puzzle is solved after each move
  useEffect(() => {
    const remainingSteps = countRemainingSteps();
    if (remainingSteps === 0 && !showingSolution && !puzzleSolved) {
      setPuzzleSolved(true);
      setShowConfetti(true);
      // Hide confetti after 5 seconds
      setTimeout(() => {
        setShowConfetti(false);
      }, 5000);
    }
  }, [board, errors, countRemainingSteps, showingSolution, puzzleSolved]);

  const handleNumberInput = (number) => {
    if (selectedCell) {
      const { row, col } = selectedCell;
      const newBoard = [...board];
      newBoard[row][col] = number;
      setBoard(newBoard);
      
      // Check if the move is valid according to the solution
      const newErrors = [...errors];
      newErrors[row][col] = number !== 0 && number !== solution[row][col];
      setErrors(newErrors);
    }
  };

  // Handle keyboard input
  const handleKeyDown = (e) => {
    if (selectedCell && !showingSolution) {
      const key = e.key;
      if (/^[1-9]$/.test(key)) {
        handleNumberInput(parseInt(key));
      } else if (key === 'Backspace' || key === 'Delete' || key === '0') {
        handleNumberInput(0);
      }
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedCell, board]);

  const handleClear = () => {
    handleNumberInput(0);
  };

  const renderNumberControls = () => {
    return (
      <div className="number-controls">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button 
            key={num} 
            onClick={() => handleNumberInput(num)}
            className="number-button"
          >
            {num}
          </button>
        ))}
        <button 
          onClick={handleClear}
          className="number-button backspace-button"
        >
          ←
        </button>
      </div>
    );
  };

  // Render confetti
  const renderConfetti = () => {
    return (
      <div className={`confetti-container ${showConfetti ? 'active' : ''}`}>
        {Array.from({ length: 150 }).map((_, i) => (
          <div 
            key={i} 
            className="confetti"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              backgroundColor: ['#ffd700', '#ff0000', '#00ff00', '#0000ff', '#ff00ff'][Math.floor(Math.random() * 5)]
            }}
          />
        ))}
        <div className="celebration-message">
          <h2>Congratulations!</h2>
          <p>You solved the puzzle!</p>
        </div>
      </div>
    );
  };

  return (
    <div className="sudoku-container">
      {showConfetti && renderConfetti()}
      
      <div className="sudoku-board">
        {board.map((row, rowIndex) => (
          <div key={rowIndex} className="board-row">
            {row.map((cell, colIndex) => (
              <div 
                key={colIndex} 
                className={`board-cell 
                  ${isPrefilled(rowIndex, colIndex) ? 'prefilled' : ''}
                  ${selectedCell && selectedCell.row === rowIndex && selectedCell.col === colIndex ? 'selected' : ''}
                  ${errors[rowIndex][colIndex] ? 'error' : ''}
                  ${rowIndex % 3 === 2 && rowIndex < 8 ? 'border-bottom' : ''}
                  ${colIndex % 3 === 2 && colIndex < 8 ? 'border-right' : ''}
                  ${showingSolution ? 'solution-view' : ''}
                `}
                onClick={() => handleCellClick(rowIndex, colIndex)}
              >
                {cell !== 0 ? cell : ''}
              </div>
            ))}
          </div>
        ))}
      </div>
      
      <div className="board-controls">
        {!showingSolution && renderNumberControls()}
        
        {!showingSolution && (
          <div className="steps-counter">
            Steps to solve: {countRemainingSteps()}
          </div>
        )}
        
        <button 
          className={`solution-button ${showingSolution ? 'showing-solution' : ''}`}
          onClick={toggleSolution}
        >
          {showingSolution ? 'Hide Solution' : 'Show Solution'}
        </button>
      </div>
    </div>
  );
};

export default SudokuBoard;