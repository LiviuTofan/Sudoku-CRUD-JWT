// src/components/SudokuBoard.jsx
import React, { useState, useEffect, useCallback } from 'react'

function SudokuBoard({ puzzle, solution, onPuzzleChange }) {
  const [board, setBoard] = useState([])
  const [originalPuzzle, setOriginalPuzzle] = useState([])
  const [selectedCell, setSelectedCell] = useState(null)
  const [errors, setErrors] = useState({})
  const [isComplete, setIsComplete] = useState(false)

  // Initialize board when puzzle changes
  useEffect(() => {
    if (puzzle) {
      const puzzleBoard = puzzle.map(row => [...row])
      setBoard(puzzleBoard)
      setOriginalPuzzle(puzzle.map(row => [...row]))
      setErrors({})
      setIsComplete(false)
    }
  }, [puzzle])

  // Check if puzzle is complete
  const checkCompletion = useCallback((currentBoard) => {
    if (!solution) return false
    
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (currentBoard[row][col] !== solution[row][col]) {
          return false
        }
      }
    }
    return true
  }, [solution])

  // Validate a number placement
  const isValidPlacement = (board, row, col, num) => {
    // Check row
    for (let x = 0; x < 9; x++) {
      if (x !== col && board[row][x] === num) {
        return false
      }
    }

    // Check column
    for (let x = 0; x < 9; x++) {
      if (x !== row && board[x][col] === num) {
        return false
      }
    }

    // Check 3x3 box
    const boxRow = Math.floor(row / 3) * 3
    const boxCol = Math.floor(col / 3) * 3
    
    for (let i = boxRow; i < boxRow + 3; i++) {
      for (let j = boxCol; j < boxCol + 3; j++) {
        if ((i !== row || j !== col) && board[i][j] === num) {
          return false
        }
      }
    }

    return true
  }

  // Handle cell value change
  const handleCellChange = (row, col, value) => {
    // Don't allow changes to original puzzle cells
    if (originalPuzzle[row][col] !== 0) return

    const newBoard = board.map(r => [...r])
    const numValue = value === '' ? 0 : parseInt(value)

    // Validate input
    if (value !== '' && (isNaN(numValue) || numValue < 1 || numValue > 9)) {
      return
    }

    newBoard[row][col] = numValue

    // Check for errors
    const newErrors = { ...errors }
    const errorKey = `${row}-${col}`

    if (numValue !== 0 && !isValidPlacement(newBoard, row, col, numValue)) {
      newErrors[errorKey] = true
    } else {
      delete newErrors[errorKey]
    }

    setBoard(newBoard)
    setErrors(newErrors)

    // Check if puzzle is complete
    const complete = checkCompletion(newBoard)
    setIsComplete(complete)

    // Notify parent component of change
    if (onPuzzleChange) {
      onPuzzleChange(newBoard)
    }
  }

  // Handle cell selection
  const handleCellClick = (row, col) => {
    setSelectedCell({ row, col })
  }

  // Handle keyboard input
  const handleKeyDown = (e, row, col) => {
    if (originalPuzzle[row][col] !== 0) return

    const key = e.key
    if (key >= '1' && key <= '9') {
      handleCellChange(row, col, key)
    } else if (key === 'Backspace' || key === 'Delete') {
      handleCellChange(row, col, '')
    }
  }

  // Get cell class names
  const getCellClassName = (row, col) => {
    let className = 'sudoku-cell'
    
    if (originalPuzzle[row][col] !== 0) {
      className += ' original'
    }
    
    if (selectedCell && selectedCell.row === row && selectedCell.col === col) {
      className += ' selected'
    }
    
    if (errors[`${row}-${col}`]) {
      className += ' error'
    }
    
    // Add border classes for 3x3 box separation
    if (row % 3 === 0) className += ' border-top'
    if (col % 3 === 0) className += ' border-left'
    if (row % 3 === 2) className += ' border-bottom'
    if (col % 3 === 2) className += ' border-right'
    
    return className
  }

  if (!board.length) {
    return <div className="sudoku-loading">Loading puzzle...</div>
  }

  return (
    <div className="sudoku-container">
      {isComplete && (
        <div className="completion-message">
          🎉 Congratulations! You solved the puzzle! 🎉
        </div>
      )}
      
      <div className="sudoku-grid">
        {board.map((row, rowIndex) => (
          <div key={rowIndex} className="sudoku-row">
            {row.map((cell, colIndex) => (
              <input
                key={`${rowIndex}-${colIndex}`}
                type="text"
                className={getCellClassName(rowIndex, colIndex)}
                value={cell === 0 ? '' : cell}
                onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                onClick={() => handleCellClick(rowIndex, colIndex)}
                onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                maxLength="1"
                readOnly={originalPuzzle[rowIndex][colIndex] !== 0}
              />
            ))}
          </div>
        ))}
      </div>
      
      {Object.keys(errors).length > 0 && (
        <div className="error-info">
          ⚠️ Some numbers conflict with Sudoku rules
        </div>
      )}
    </div>
  )
}

export default SudokuBoard