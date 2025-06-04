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
      if (!puzzleState || !Array.isArray(puzzleState)) {
        return null
      }
      
      const sanitizedState = puzzleState.map((row, rowIndex) => {
        if (!Array.isArray(row) || row.length !== 9) {
          return new Array(9).fill(0)
        }
        return row.map((cell) => {
          if (!Number.isInteger(cell) || cell < 0 || cell > 9) {
            return 0
          }
          return cell
        })
      })
      
      console.log('API CALL: POST /validate -', `puzzle ${puzzleId}`)
      const result = await apiService.validatePuzzle(puzzleId, sanitizedState)
      
      setGameStats({
        isComplete: result.complete || false,
        correctCells: result.correctCells || 0,
        progress: result.progress || 0,
        violations: result.violations || []
      })
      
      return result
    } catch (error) {
      console.error('API ERROR: validate puzzle -', error)
      setError('Failed to validate puzzle state')
      return null
    }
  }, [setError])

  const updatePuzzleState = useCallback(async (newPuzzleState) => {
    if (!currentPuzzleId) {
      return
    }
    
    try {
      console.log('API CALL: PUT /puzzle -', `ID: ${currentPuzzleId}`)
      await apiService.updatePuzzle(currentPuzzleId, {
        puzzle: newPuzzleState,
        solution: solution
      })
    } catch (error) {
      console.error('API ERROR: update puzzle -', error)
    }
  }, [currentPuzzleId, solution])

  const loadPuzzleData = useCallback(async (puzzleData) => {
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
    
    if (puzzleData.puzzle) {
      await validatePuzzleState(puzzleData.id, puzzleData.puzzle)
    }
  }, [validatePuzzleState])

  const loadUserPuzzles = useCallback(async () => {
    try {
      console.log('API CALL: GET /puzzles')
      const puzzlesResponse = await apiService.getPuzzles(1, 1)
      
      if (puzzlesResponse.puzzles && puzzlesResponse.puzzles.length > 0) {
        const recentPuzzle = puzzlesResponse.puzzles[0]
        await loadPuzzleData(recentPuzzle)
      } else {
        await generateNewPuzzle()
      }
    } catch (error) {
      console.error('API ERROR: get puzzles -', error)
      await generateNewPuzzle()
    }
  }, [])

  const generateNewPuzzle = useCallback(async () => {
    if (!user) {
      return
    }
    
    setGeneratingPuzzle(true)
    setError('')
    
    try {
      console.log('API CALL: POST /generate -', `difficulty: ${difficulty}`)
      const response = await apiService.generatePuzzle(difficulty, true)
      
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
      
      if (!puzzleData.puzzle) {
        throw new Error('Invalid puzzle data received')
      }
      
      if (!puzzleData.id) {
        setTimeout(async () => {
          try {
            console.log('API CALL: GET /puzzles - reload after generate')
            const puzzlesResponse = await apiService.getPuzzles(1, 1)
            if (puzzlesResponse.puzzles && puzzlesResponse.puzzles.length > 0) {
              const latestPuzzle = puzzlesResponse.puzzles[0]
              if (latestPuzzle.difficulty === difficulty) {
                await loadPuzzleData(latestPuzzle)
              }
            }
          } catch (error) {
            console.error('API ERROR: reload after generate -', error)
            setError('Puzzle generated but failed to load. Please refresh.')
          } finally {
            setGeneratingPuzzle(false)
          }
        }, 500)
        return
      }
      
      await loadPuzzleData(puzzleData)
      
    } catch (error) {
      console.error('API ERROR: generate puzzle -', error)
      setError('Failed to generate new puzzle. Please try again.')
    } finally {
      setGeneratingPuzzle(false)
    }
  }, [user, difficulty, setError, loadPuzzleData])

  const handleCellChange = useCallback(async (row, col, value) => {
    // Block cell changes for visitors
    if (user?.role === 'visitor') {
      setError('Visitors can only view puzzles. You cannot solve them.')
      setTimeout(() => setError(''), 3000)
      return
    }

    if (!userProgress || !originalPuzzle) {
      return
    }
    
    if (originalPuzzle[row][col] !== 0) {
      return
    }
    
    const newProgress = userProgress.map(r => [...r])
    newProgress[row][col] = value
    
    setUserProgress(newProgress)
    setPuzzle(newProgress)
    
    if (currentPuzzleId) {
      await validatePuzzleState(currentPuzzleId, newProgress)
      await updatePuzzleState(newProgress)
    }
  }, [user?.role, userProgress, originalPuzzle, currentPuzzleId, setError, validatePuzzleState, updatePuzzleState])

  const getHint = useCallback(async () => {
    // Block hints for visitors
    if (user?.role === 'visitor') {
      setError('Visitors cannot get hints. You can only view puzzles.')
      setTimeout(() => setError(''), 3000)
      return
    }

    if (!currentPuzzleId || !userProgress) {
      setError('Cannot get hint: puzzle not loaded properly')
      return
    }
    
    setError('')
    
    try {
      if (!Array.isArray(userProgress) || userProgress.length !== 9) {
        setError('Invalid puzzle state. Please refresh the page.')
        return
      }

      const cleanGrid = []
      
      for (let i = 0; i < 9; i++) {
        const row = userProgress[i]
        if (!Array.isArray(row) || row.length !== 9) {
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
            cellValue = 0
          }
          
          if (cellValue < 0 || cellValue > 9) {
            cellValue = 0
          }
          
          cleanRow.push(cellValue)
        }
        cleanGrid.push(cleanRow)
      }
      
      console.log('API CALL: POST /solve - hint request')
      const hintResponse = await apiService.solvePuzzle(currentPuzzleId, {
        currentState: cleanGrid,
        hint: true
      })
      
      if (hintResponse && hintResponse.hint) {
        const { row, col, value } = hintResponse.hint
        
        if (
          !Number.isInteger(row) || row < 0 || row > 8 ||
          !Number.isInteger(col) || col < 0 || col > 8 ||
          !Number.isInteger(value) || value < 1 || value > 9
        ) {
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
        
        setError('')
        
      } else if (hintResponse && hintResponse.message) {
        setError(hintResponse.message)
      } else {
        setError('No hints available for this puzzle')
      }
      
    } catch (error) {
      console.error('API ERROR: get hint -', error)
      setError('Failed to get hint. Please try again or refresh the page.')
    }
  }, [user?.role, currentPuzzleId, userProgress, setError, validatePuzzleState, updatePuzzleState])

  const solvePuzzle = useCallback(async () => {
    // Block solving for visitors
    if (user?.role === 'visitor') {
      setError('Visitors cannot solve puzzles. You can only view them.')
      setTimeout(() => setError(''), 3000)
      return
    }

    if (!currentPuzzleId || !userProgress) {
      return
    }
    
    try {
      const sanitizedState = userProgress.map((row, rowIndex) => {
        if (!Array.isArray(row) || row.length !== 9) {
          return new Array(9).fill(0)
        }
        return row.map((cell) => {
          const numCell = parseInt(cell, 10)
          if (isNaN(numCell) || numCell < 0 || numCell > 9) {
            return 0
          }
          return numCell
        })
      })
      
      console.log('API CALL: POST /solve - full solution')
      const solutionResponse = await apiService.solvePuzzle(currentPuzzleId, {
        currentState: sanitizedState,
        hint: false
      })
      
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
      }
    } catch (error) {
      console.error('API ERROR: solve puzzle -', error)
      setError('Failed to solve puzzle. Please try again.')
    }
  }, [user?.role, currentPuzzleId, userProgress, setError, updatePuzzleState])

  const resetPuzzle = useCallback(() => {
    // Block reset for visitors
    if (user?.role === 'visitor') {
      setError('Visitors cannot reset puzzles. You can only view them.')
      setTimeout(() => setError(''), 3000)
      return
    }

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
    }
  }, [user?.role, originalPuzzle, setError, updatePuzzleState])

  const deletePuzzle = useCallback(async () => {
    if (user?.role !== 'admin') {
      setError('Only administrators can delete puzzles!')
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
      console.log('API CALL: DELETE /puzzle -', `ID: ${currentPuzzleId}`)
      await apiService.deletePuzzle(currentPuzzleId)
      
      clearPuzzleData()

      // Try to load another puzzle or generate a new one
      try {
        console.log('API CALL: GET /puzzles - after delete')
        const puzzlesResponse = await apiService.getPuzzles(1, 1)
        if (puzzlesResponse.puzzles && puzzlesResponse.puzzles.length > 0) {
          const nextPuzzle = puzzlesResponse.puzzles[0]
          await loadPuzzleData(nextPuzzle)
        } else {
          await generateNewPuzzle()
        }
      } catch (loadError) {
        console.error('API ERROR: load after delete -', loadError)
        setError('Puzzle deleted successfully, but failed to load next puzzle. Click "New Game" to continue.')
      }

    } catch (error) {
      console.error('API ERROR: delete puzzle -', error)
      setError('Failed to delete puzzle. Please try again.')
    } finally {
      setDeleting(false)
    }
  }, [user?.role, currentPuzzleId, setError, clearPuzzleData, loadPuzzleData, generateNewPuzzle])

  const handleDifficultyChange = useCallback((newDifficulty) => {
    setDifficulty(newDifficulty)
  }, [])

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