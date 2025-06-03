import React, { useState, useEffect } from 'react';
import '../styles/SudokuBoard.css';

const SudokuBoard = ({ 
  puzzle, 
  originalPuzzle, 
  solution, 
  onCellChange, 
  disabled, 
  violations = [], 
  isComplete,
  hintCells = new Set()
}) => {
  const [board, setBoard] = useState(Array(9).fill().map(() => Array(9).fill(0)));
  const [selectedCell, setSelectedCell] = useState(null);
  const [errors, setErrors] = useState(Array(9).fill().map(() => Array(9).fill(false)));

  // Initialize board when puzzle changes
  useEffect(() => {
    console.log('SudokuBoard: puzzle prop changed:', puzzle);
    if (puzzle) {
      setBoard(puzzle.map(row => [...row]));
      // Reset errors when new puzzle loads
      setErrors(Array(9).fill().map(() => Array(9).fill(false)));
    }
  }, [puzzle]);

  // Update errors based on violations
  useEffect(() => {
    const newErrors = Array(9).fill().map(() => Array(9).fill(false));
    violations.forEach(violation => {
      if (violation.row !== undefined && violation.col !== undefined) {
        newErrors[violation.row][violation.col] = true;
      }
    });
    setErrors(newErrors);
  }, [violations]);

  const isPrefilled = (row, col) => {
    return originalPuzzle && originalPuzzle[row][col] !== 0;
  };

  const isHintCell = (row, col) => {
    const hintKey = `${row}-${col}`;
    return hintCells.has(hintKey);
  };

  const isCorrectUserEntry = (row, col) => {
    if (isPrefilled(row, col)) return false;
    if (!solution || !board[row] || board[row][col] === 0) return false;
    return board[row][col] === solution[row][col];
  };

  const handleCellClick = (row, col) => {
    if (disabled || isComplete) return;
    if (!isPrefilled(row, col)) {
      setSelectedCell({ row, col });
    }
  };

  const handleNumberInput = (number) => {
    if (selectedCell && onCellChange) {
      const { row, col } = selectedCell;
      onCellChange(row, col, number);
    }
  };

  // Handle keyboard input
  const handleKeyDown = (e) => {
    if (selectedCell && !disabled && !isComplete) {
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
  }, [selectedCell, disabled, isComplete]);

  const renderNumberControls = () => {
    if (disabled || isComplete) return null;
    
    return (
      <div className="number-controls">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button 
            key={num} 
            onClick={() => handleNumberInput(num)}
            className="number-button"
            disabled={!selectedCell}
          >
            {num}
          </button>
        ))}
        <button 
          onClick={() => handleNumberInput(0)}
          className="number-button clear-button"
          disabled={!selectedCell}
        >
          Clear
        </button>
      </div>
    );
  };

  return (
    <div className="sudoku-container">
      <div className="board-container">
        <div className="sudoku-board">
          {board.map((row, rowIndex) => (
            <div key={rowIndex} className="board-row">
              {row.map((cell, colIndex) => {
                const isSelected = selectedCell && selectedCell.row === rowIndex && selectedCell.col === colIndex;
                const isPrefilledCell = isPrefilled(rowIndex, colIndex);
                const hasError = errors[rowIndex][colIndex];
                const isHint = isHintCell(rowIndex, colIndex);
                const isCorrect = isCorrectUserEntry(rowIndex, colIndex);
                const isThickBottomBorder = rowIndex % 3 === 2 && rowIndex < 8;
                const isThickRightBorder = colIndex % 3 === 2 && colIndex < 8;
                
                // Build CSS classes
                let cssClasses = 'sudoku-cell';
                
                if (isSelected) cssClasses += ' selected';
                if (isThickBottomBorder) cssClasses += ' thick-bottom-border';
                if (isThickRightBorder) cssClasses += ' thick-right-border';
                if (disabled || isComplete) cssClasses += ' disabled';
                
                // Cell type classes (mutually exclusive)
                if (isPrefilledCell) {
                  cssClasses += ' prefilled';
                } else if (cell !== 0) {
                  // User-entered number
                  if (isHint) {
                    cssClasses += ' hint';
                  } else if (hasError || !isCorrect) {
                    cssClasses += ' wrong';
                  } else if (isCorrect) {
                    cssClasses += ' correct';
                  }
                }
                
                return (
                  <div 
                    key={colIndex} 
                    className={cssClasses}
                    onClick={() => handleCellClick(rowIndex, colIndex)}
                  >
                    {cell !== 0 ? cell : ''}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      
      {renderNumberControls()}
      
      {/* Debug info for active hints */}
      {hintCells.size > 0 && (
        <div className="hint-debug">
          💡 Active hints: {Array.from(hintCells).join(', ')}
        </div>
      )}
      
      {isComplete && (
        <div className="completion-message">
          🎉 Congratulations! Puzzle completed! 🎉
        </div>
      )}
    </div>
  );
};

export default SudokuBoard;