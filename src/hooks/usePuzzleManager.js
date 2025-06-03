// hooks/usePuzzleManager.js - Custom Hook for Puzzle Management
import { useState, useCallback } from 'react'
import apiService from '../services/api'

const usePuzzleManager = (user, setError) => {
  const [difficulty, setDifficulty] = useState('medium')
  const [puzzle, setPuzzle] = useState(null)
  const [solution, setSolution] = useState(null)
  const [currentPuzzleId, setCurrentPuzzleId] = useState(null)
  const [userProgress, setUserProgress] = useState(null)
  const [originalPuzzle, setOriginalPuzzle] = useState(null)
  const [hintCells, setHintCells] = useState(new Set())
  const [generatingPuzzle, setGeneratingPuzzle] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [gameStats, setGameStats] = useState({
    isComplete: false,
    correctCells: 0,
    progress: 0,
    violations: []
  })

  const clearPuzzleData = useCallback(() => {
    setPuzzle(null)
    setSolution(null)
    setCurrentPuzzleId(null)
    setUserProgress(null)
    setOriginalPuzzle(null)
    setHintCells(new Set())
    setGameStats({
      isComplete: false,
      correctCells: 0,
      progress: 0,
      violations: []
    })
  }, [])

  const validatePuzzleState = useCallback(async (puzzleId, puzzleState) => {
    try {
      console.log('🔍 Validating puzzle state with ID:', puzzleId)
      
      if (!puzzleState || !Array.isArray(puzzleState)) {
        console.error('❌ Invalid puzzle state for validation')
        return null
      }
      
      const sanitizedState = puzzleState.map((row, rowIndex) => {
        if (!Array.isArray(row) || row.length !== 9) {
          console.error(`❌ Invalid row ${rowIndex}:`, row)
          return new Array(9).fill(0)
        }
        return row.map((cell, colIndex) => {
          if (!Number.isInteger(cell) || cell < 0 || cell > 9) {
            console.error(`❌ Invalid cell [${rowIndex}][${colIndex}]:`, cell)
            return 0
          }
          return cell
        })
      })
      
      console.log('✅ Sending sanitized state to API for validation')
      
      const result = await apiService.validatePuzzle(puzzleId, sanitizedState)
      console.log('✅ Validation result:', {
        valid: result.valid,
        complete: result.complete,
        progress: result.progress,
        violations: result.violations?.length || 0
      })
      
      setGameStats({
        isComplete: result.complete || false,
        correctCells: result.correctCells || 0,
        progress: result.progress || 0,
        violations: result.violations || []
      })
      
      return result
    } catch (error) {
      console.error('❌ Validation failed:', error)
      setError('Failed to validate puzzle state')
      return null
    }
  }, [setError])

  const updatePuzzleState = useCallback(async (newPuzzleState) => {
    if (!currentPuzzleId) {
      console.log('❌ Cannot update puzzle state: no puzzle ID')
      return
    }
    
    console.log('💾 Updating puzzle state for ID:', currentPuzzleId)
    
    try {
      await apiService.updatePuzzle(currentPuzzleId, {
        puzzle: newPuzzleState,
        solution: solution
      })
      console.log('✅ Puzzle state updated successfully')
    } catch (error) {
      console.error('❌ Failed to save puzzle state:', error)
    }
  }, [currentPuzzleId, solution])

  const loadPuzzleData = useCallback(async (puzzleData) => {
    console.log('📥 Loading puzzle data:', puzzleData.id)
    
    setOriginalPuzzle(puzzleData.puzzle)
    setPuzzle(puzzleData.puzzle)
    setUserProgress(puzzleData.puzzle)
    setSolution(puzzleData.solution)
    setCurrentPuzzleId(puzzleData.id)
    setDifficulty(puzzleData.difficulty)
    
    setHintCells(new Set())
    
    setGameStats({
      isComplete: false,
      correctCells: 0,
      progress: 0,
      violations: []
    })
    
    console.log('🎯 Puzzle loaded with ID:', puzzleData.id)
    
    if (puzzleData.puzzle) {
      await validatePuzzleState(puzzleData.id, puzzleData.puzzle)
    }
  }, [validatePuzzleState])

  const loadUserPuzzles = useCallback(async () => {
    console.log('📊 Loading user puzzles...')
    try {
      const puzzlesResponse = await apiService.getPuzzles(1, 1)
      console.log('📋 Puzzles response:', puzzlesResponse)
      
      if (puzzlesResponse.puzzles && puzzlesResponse.puzzles.length > 0) {
        const recentPuzzle = puzzlesResponse.puzzles[0]
        console.log('🧩 Recent puzzle found:', {
          id: recentPuzzle.id,
          difficulty: recentPuzzle.difficulty,
          hasPuzzle: !!recentPuzzle.puzzle,
          hasSolution: !!recentPuzzle.solution
        })
        
        await loadPuzzleData(recentPuzzle)
      } else {
        console.log('🆕 No existing puzzles, generating new one...')
        await generateNewPuzzle()
      }
    } catch (error) {
      console.error('Failed to load user puzzles:', error)
      console.log('🆕 Error loading puzzles, generating new one...')
      await generateNewPuzzle()
    }
  }, [])

  const generateNewPuzzle = useCallback(async () => {
    if (!user) {
      console.log('❌ Cannot generate puzzle: no user')
      return
    }
    
    console.log('🎲 Generating new puzzle with difficulty:', difficulty)
    setGeneratingPuzzle(true)
    setError('')
    
    try {
      const response = await apiService.generatePuzzle(difficulty, true)
      console.log('🧩 Generate puzzle response:', response)
      
      if (!response.puzzle) {
        throw new Error('No puzzle data in response')
      }
      
      let puzzleData = {
        puzzle: null,
        solution: null,
        id: null,
        difficulty: difficulty
      }
      
      if (response.puzzle.puzzle) {
        puzzleData.puzzle = response.puzzle.puzzle
      } else {
        puzzleData.puzzle = response.puzzle
      }
      
      puzzleData.solution = response.solution || response.puzzle.solution
      puzzleData.id = response.savedPuzzle?.id || 
                     response.puzzleId || 
                     response.id || 
                     response.puzzle?.id
      
      console.log('✅ Extracted puzzle data:', {
        hasPuzzle: !!puzzleData.puzzle,
        hasSolution: !!puzzleData.solution,
        puzzleId: puzzleData.id
      })
      
      if (!puzzleData.puzzle) {
        throw new Error('Invalid puzzle data received')
      }
      
      if (!puzzleData.id) {
        console.log('⏳ No puzzle ID in response, reloading puzzles...')
        setTimeout(async () => {
          try {
            const puzzlesResponse = await apiService.getPuzzles(1, 1)
            if (puzzlesResponse.puzzles && puzzlesResponse.puzzles.length > 0) {
              const latestPuzzle = puzzlesResponse.puzzles[0]
              if (latestPuzzle.difficulty === difficulty) {
                console.log('🔄 Found newly generated puzzle:', latestPuzzle.id)
                await loadPuzzleData(latestPuzzle)
              }
            }
          } catch (error) {
            console.error('Failed to reload puzzle after generation:', error)
            setError('Puzzle generated but failed to load. Please refresh.')
          } finally {
            setGeneratingPuzzle(false)
          }
        }, 500)
        return
      }
      
      await loadPuzzleData(puzzleData)
      
    } catch (error) {
      console.error('Failed to generate puzzle:', error)
      setError('Failed to generate new puzzle. Please try again.')
    } finally {
      setGeneratingPuzzle(false)
    }
  }, [user, difficulty, setError, loadPuzzleData])

  const handleCellChange = useCallback(async (row, col, value) => {
    // Block cell changes for visitors
    if (user?.role === 'visitor') {
      setError('👁 Visitors can only view puzzles. You cannot solve them.')
      setTimeout(() => setError(''), 3000)
      return
    }

    console.log(`🎯 Cell change: [${row}, ${col}] = ${value}`)
    
    if (!userProgress || !originalPuzzle) {
      console.log('❌ Cannot change cell: no progress or original puzzle')
      return
    }
    
    if (originalPuzzle[row][col] !== 0) {
      console.log('🔒 Cannot change original puzzle cell')
      return
    }
    
    const newProgress = userProgress.map(r => [...r])
    newProgress[row][col] = value
    
    setUserProgress(newProgress)
    setPuzzle(newProgress)
    
    if (currentPuzzleId) {
      console.log('🔍 Validating move...')
      await validatePuzzleState(currentPuzzleId, newProgress)
      await updatePuzzleState(newProgress)
    }
  }, [user?.role, userProgress, originalPuzzle, currentPuzzleId, setError, validatePuzzleState, updatePuzzleState])

  const getHint = useCallback(async () => {
    // Block hints for visitors
    if (user?.role === 'visitor') {
      setError('👁 Visitors cannot get hints. You can only view puzzles.')
      setTimeout(() => setError(''), 3000)
      return
    }

    if (!currentPuzzleId || !userProgress) {
      console.log('❌ Cannot get hint: missing puzzle ID or progress')
      setError('Cannot get hint: puzzle not loaded properly')
      return
    }
    
    console.log('💡 Getting hint...')
    setError('')
    
    try {
      if (!Array.isArray(userProgress) || userProgress.length !== 9) {
        console.error('❌ userProgress is not a valid 9x9 array:', userProgress)
        setError('Invalid puzzle state. Please refresh the page.')
        return
      }

      const cleanGrid = []
      
      for (let i = 0; i < 9; i++) {
        const row = userProgress[i]
        if (!Array.isArray(row) || row.length !== 9) {
          console.error(`❌ Row ${i} is invalid:`, row)
          setError('Invalid puzzle state. Please refresh the page.')
          return
        }
        
        const cleanRow = []
        for (let j = 0; j < 9; j++) {
          let cellValue = row[j]
          
          if (cellValue === null || cellValue === undefined || cellValue === '') {
            cellValue = 0
          } else if (typeof cellValue === 'string') {
            cellValue = parseInt(cellValue, 10)
            if (isNaN(cellValue)) cellValue = 0
          } else if (typeof cellValue === 'number') {
            cellValue = Math.floor(cellValue)
          } else {
            console.warn(`Unexpected cell type at [${i}][${j}]:`, typeof cellValue, cellValue)
            cellValue = 0
          }
          
          if (cellValue < 0 || cellValue > 9) {
            console.warn(`Invalid cell value at [${i}][${j}]:`, cellValue, '-> using 0')
            cellValue = 0
          }
          
          cleanRow.push(cellValue)
        }
        cleanGrid.push(cleanRow)
      }
      
      const hintResponse = await apiService.solvePuzzle(currentPuzzleId, {
        currentState: cleanGrid,
        hint: true
      })
      
      console.log('💡 Hint response received:', hintResponse)
      
      if (hintResponse && hintResponse.hint) {
        const { row, col, value } = hintResponse.hint
        
        console.log(`💡 Applying hint: [${row}, ${col}] = ${value}`)
        
        if (
          !Number.isInteger(row) || row < 0 || row > 8 ||
          !Number.isInteger(col) || col < 0 || col > 8 ||
          !Number.isInteger(value) || value < 1 || value > 9
        ) {
          console.error('❌ Invalid hint values:', { row, col, value })
          setError('Received invalid hint from server')
          return
        }
        
        const hintKey = `${row}-${col}`
        setHintCells(prev => new Set([...prev, hintKey]))
        
        const newProgress = cleanGrid.map(r => [...r])
        newProgress[row][col] = value
        
        setUserProgress(newProgress)
        setPuzzle(newProgress)
        
        await validatePuzzleState(currentPuzzleId, newProgress)
        await updatePuzzleState(newProgress)
        
        console.log(`💡 Hint applied successfully: [${row}, ${col}] = ${value}`)
        setError('')
        
      } else if (hintResponse && hintResponse.message) {
        console.log('💡 Server message:', hintResponse.message)
        setError(hintResponse.message)
      } else {
        console.log('💡 No hints available in response')
        setError('No hints available for this puzzle')
      }
      
    } catch (error) {
      console.error('❌ Failed to get hint:', error)
      setError('Failed to get hint. Please try again or refresh the page.')
    }
  }, [user?.role, currentPuzzleId, userProgress, setError, validatePuzzleState, updatePuzzleState])

  const solvePuzzle = useCallback(async () => {
    // Block solving for visitors
    if (user?.role === 'visitor') {
      setError('👁 Visitors cannot solve puzzles. You can only view them.')
      setTimeout(() => setError(''), 3000)
      return
    }

    if (!currentPuzzleId || !userProgress) {
      console.log('❌ Cannot solve puzzle: missing puzzle ID or progress')
      return
    }
    
    console.log('🔍 Solving puzzle...')
    
    try {
      const sanitizedState = userProgress.map((row, rowIndex) => {
        if (!Array.isArray(row) || row.length !== 9) {
          console.error(`❌ Invalid row ${rowIndex} in userProgress:`, row)
          return new Array(9).fill(0)
        }
        return row.map((cell, colIndex) => {
          const numCell = parseInt(cell, 10)
          if (isNaN(numCell) || numCell < 0 || numCell > 9) {
            console.error(`❌ Invalid cell [${rowIndex}][${colIndex}]:`, cell)
            return 0
          }
          return numCell
        })
      })
      
      const solutionResponse = await apiService.solvePuzzle(currentPuzzleId, {
        currentState: sanitizedState,
        hint: false
      })
      
      console.log('🔍 Solve response:', solutionResponse)
      
      if (solutionResponse.solution) {
        setUserProgress(solutionResponse.solution)
        setPuzzle(solutionResponse.solution)
        
        setHintCells(new Set())
        
        setGameStats({
          isComplete: true,
          correctCells: 81,
          progress: 100,
          violations: []
        })
        
        await updatePuzzleState(solutionResponse.solution)
        
        console.log('🎉 Puzzle solved!')
      }
    } catch (error) {
      console.error('❌ Failed to solve puzzle:', error)
      setError('Failed to solve puzzle. Please try again.')
    }
  }, [user?.role, currentPuzzleId, userProgress, setError, updatePuzzleState])

  const resetPuzzle = useCallback(() => {
    // Block reset for visitors
    if (user?.role === 'visitor') {
      setError('👁 Visitors cannot reset puzzles. You can only view them.')
      setTimeout(() => setError(''), 3000)
      return
    }

    console.log('🔄 Resetting puzzle...')
    if (originalPuzzle) {
      setUserProgress(originalPuzzle)
      setPuzzle(originalPuzzle)
      setHintCells(new Set())
      setGameStats({
        isComplete: false,
        correctCells: 0,
        progress: 0,
        violations: []
      })
      updatePuzzleState(originalPuzzle)
      console.log('✅ Puzzle reset to original state')
    } else {
      console.log('❌ Cannot reset: no original puzzle')
    }
  }, [user?.role, originalPuzzle, setError, updatePuzzleState])

  const deletePuzzle = useCallback(async () => {
    if (user?.role !== 'admin') {
      setError('🔒 Only administrators can delete puzzles!')
      setTimeout(() => setError(''), 3000)
      return
    }

    if (!currentPuzzleId) {
      setError('No puzzle to delete')
      return
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete puzzle #${currentPuzzleId}? This action cannot be undone.`
    )

    if (!confirmDelete) {
      return
    }

    setDeleting(true)
    setError('')

    try {
      await apiService.deletePuzzle(currentPuzzleId)
      console.log('🗑️ Puzzle deleted successfully')
      
      // Clear current puzzle state
      clearPuzzleData()

      // Try to load another puzzle or generate a new one
      try {
        const puzzlesResponse = await apiService.getPuzzles(1, 1)
        if (puzzlesResponse.puzzles && puzzlesResponse.puzzles.length > 0) {
          const nextPuzzle = puzzlesResponse.puzzles[0]
          await loadPuzzleData(nextPuzzle)
        } else {
          console.log('No more puzzles, generating new one...')
          await generateNewPuzzle()
        }
      } catch (loadError) {
        console.error('Failed to load next puzzle:', loadError)
        setError('Puzzle deleted successfully, but failed to load next puzzle. Click "New Game" to continue.')
      }

    } catch (error) {
      console.error('❌ Failed to delete puzzle:', error)
      setError('Failed to delete puzzle. Please try again.')
    } finally {
      setDeleting(false)
    }
  }, [user?.role, currentPuzzleId, setError, clearPuzzleData, loadPuzzleData, generateNewPuzzle])

  const handleDifficultyChange = useCallback((newDifficulty) => {
    console.log('🎚️ Difficulty changed to:', newDifficulty)
    setDifficulty(newDifficulty)
  }, [])

  // Add missing circular dependency fix
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useCallback(() => {
    loadUserPuzzles.current = loadUserPuzzles
    generateNewPuzzle.current = generateNewPuzzle
  }, [user, difficulty, loadPuzzleData])

  return {
    // State
    difficulty,
    puzzle,
    solution,
    currentPuzzleId,
    userProgress,
    originalPuzzle,
    hintCells,
    generatingPuzzle,
    deleting,
    gameStats,
    
    // Actions
    loadUserPuzzles,
    generateNewPuzzle,
    handleCellChange,
    getHint,
    solvePuzzle,
    resetPuzzle,
    deletePuzzle,
    handleDifficultyChange,
    clearPuzzleData
  }
}

export default usePuzzleManager