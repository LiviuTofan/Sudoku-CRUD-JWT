import React, { useState, useEffect } from 'react';

const SudokuBoard = ({ 
  puzzle, 
  originalPuzzle, 
  solution, 
  onCellChange, 
  disabled, 
  violations = [], 
  isComplete 
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
      <div style={styles.numberControls}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button 
            key={num} 
            onClick={() => handleNumberInput(num)}
            style={styles.numberButton}
            disabled={!selectedCell}
          >
            {num}
          </button>
        ))}
        <button 
          onClick={() => handleNumberInput(0)}
          style={{...styles.numberButton, ...styles.clearButton}}
          disabled={!selectedCell}
        >
          Clear
        </button>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.boardContainer}>
        <div style={styles.board}>
          {board.map((row, rowIndex) => (
            <div key={rowIndex} style={styles.row}>
              {row.map((cell, colIndex) => {
                const isSelected = selectedCell && selectedCell.row === rowIndex && selectedCell.col === colIndex;
                const isPrefilledCell = isPrefilled(rowIndex, colIndex);
                const hasError = errors[rowIndex][colIndex];
                const isThickBottomBorder = rowIndex % 3 === 2 && rowIndex < 8;
                const isThickRightBorder = colIndex % 3 === 2 && colIndex < 8;
                
                return (
                  <div 
                    key={colIndex} 
                    style={{
                      ...styles.cell,
                      ...(isSelected ? styles.selectedCell : {}),
                      ...(isPrefilledCell ? styles.prefilledCell : {}),
                      ...(hasError ? styles.errorCell : {}),
                      ...(isThickBottomBorder ? styles.thickBottomBorder : {}),
                      ...(isThickRightBorder ? styles.thickRightBorder : {}),
                      ...(disabled || isComplete ? styles.disabledCell : {}),
                      cursor: (!isPrefilledCell && !disabled && !isComplete) ? 'pointer' : 'default'
                    }}
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
      
      {isComplete && (
        <div style={styles.completionMessage}>
          🎉 Congratulations! Puzzle completed! 🎉
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    padding: '20px',
  },
  boardContainer: {
    display: 'flex',
    justifyContent: 'center',
    padding: '10px',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
  },
  board: {
    display: 'grid',
    gridTemplateRows: 'repeat(9, 1fr)',
    gap: '1px',
    backgroundColor: '#333',
    border: '3px solid #333',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: 'repeat(9, 1fr)',
    gap: '1px',
  },
  cell: {
    width: '45px',
    height: '45px',
    backgroundColor: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 'bold',
    border: 'none',
    transition: 'all 0.2s ease',
    userSelect: 'none',
  },
  selectedCell: {
    backgroundColor: '#4CAF50',
    color: 'white',
  },
  prefilledCell: {
    backgroundColor: '#f5f5f5',
    color: '#333',
    fontWeight: '900',
  },
  errorCell: {
    backgroundColor: '#ffebee',
    color: '#d32f2f',
  },
  disabledCell: {
    opacity: 0.6,
  },
  thickBottomBorder: {
    borderBottom: '3px solid #333',
  },
  thickRightBorder: {
    borderRight: '3px solid #333',
  },
  numberControls: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '8px',
    padding: '15px',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: '12px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
  },
  numberButton: {
    padding: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minWidth: '50px',
  },
  clearButton: {
    backgroundColor: '#ff5722',
  },
  completionMessage: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'center',
    padding: '20px',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
    animation: 'pulse 2s infinite',
  },
};

export default SudokuBoard;