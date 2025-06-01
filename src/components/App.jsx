// App.jsx - Updated Version with Role-based Features
import React, { useState, useEffect } from 'react'
import SudokuBoard from './SudokuBoard'
import DifficultySelector from './DifficultySelector'
import Auth from './Auth'
import apiService from '../services/api'
import '../styles/App.css'
import backgroundImage from '../assets/bg.png';

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [difficulty, setDifficulty] = useState('medium')
  const [puzzle, setPuzzle] = useState(null)
  const [solution, setSolution] = useState(null)
  const [currentPuzzleId, setCurrentPuzzleId] = useState(null)
  const [userProgress, setUserProgress] = useState(null)
  const [originalPuzzle, setOriginalPuzzle] = useState(null)
  
  const [hintCells, setHintCells] = useState(new Set())
  
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('sudokuTheme')
    return savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  })
  const [error, setError] = useState('')
  const [generatingPuzzle, setGeneratingPuzzle] = useState(false)
  const [gameStats, setGameStats] = useState({
    isComplete: false,
    correctCells: 0,
    progress: 0,
    violations: []
  })

  // New state for delete functionality
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      console.log('🔍 Starting auth check...')
      if (apiService.isAuthenticated()) {
        try {
          const verifyResponse = await apiService.verifyToken()
          console.log('✅ Token verification response:', verifyResponse)
          if (verifyResponse.valid) {
            setUser({
              id: verifyResponse.decoded.id,
              username: verifyResponse.decoded.username,
              role: verifyResponse.decoded.role
            })
            console.log('👤 User set:', verifyResponse.decoded.username)
            
            await loadUserPuzzles()
          } else {
            console.log('❌ Token invalid, logging out')
            apiService.logout()
          }
        } catch (error) {
          console.error('Auth check failed:', error)
          try {
            await apiService.refreshToken()
            const verifyResponse = await apiService.verifyToken()
            if (verifyResponse.valid) {
              setUser({
                id: verifyResponse.decoded.id,
                username: verifyResponse.decoded.username,
                role: verifyResponse.decoded.role
              })
              await loadUserPuzzles()
            } else {
              apiService.logout()
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError)
            apiService.logout()
          }
        }
      } else {
        console.log('🔒 User not authenticated')
      }
      setLoading(false)
    }

    checkAuth()
  }, [])

  const loadUserPuzzles = async () => {
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
  }

  const loadPuzzleData = async (puzzleData) => {
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
  }

  const handleAuthSuccess = (authData) => {
    console.log('🎉 Auth success:', authData.user.username)
    setUser(authData.user)
    setError('')
    loadUserPuzzles()
  }

  const handleLogout = () => {
    console.log('👋 Logging out...')
    apiService.logout()
    setUser(null)
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
    setError('')
  }

  const generateNewPuzzle = async () => {
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
  }

  const validatePuzzleState = async (puzzleId, puzzleState) => {
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
  }

  const handleCellChange = async (row, col, value) => {
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
  }

  const updatePuzzleState = async (newPuzzleState) => {
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
  }

  const getHint = async () => {
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
      
      const isValidGrid = cleanGrid.length === 9 && 
                        cleanGrid.every(row => 
                          Array.isArray(row) && row.length === 9 && 
                          row.every(cell => Number.isInteger(cell) && cell >= 0 && cell <= 9)
                        )
      
      if (!isValidGrid) {
        console.error('❌ Clean grid is still invalid:', cleanGrid)
        setError('Unable to format puzzle state properly. Please refresh the page.')
        return
      }
      
      console.log('💡 Sending hint request with clean state:', {
        puzzleId: currentPuzzleId,
        gridValid: isValidGrid,
        dimensions: `${cleanGrid.length}x${cleanGrid[0].length}`,
        sampleRow: cleanGrid[0],
        allIntegers: cleanGrid.flat().every(cell => Number.isInteger(cell))
      })
      
      const requestPayload = {
        currentState: cleanGrid,
        hint: true
      }
      
      try {
        const testSerialization = JSON.stringify(requestPayload)
        const testDeserialization = JSON.parse(testSerialization)
        console.log('💡 Serialization test passed:', {
          originalLength: requestPayload.currentState.length,
          serializedLength: testDeserialization.currentState.length,
          firstCellsMatch: requestPayload.currentState[0][0] === testDeserialization.currentState[0][0]
        })
      } catch (serError) {
        console.error('❌ Serialization test failed:', serError)
        setError('Unable to prepare request data. Please refresh the page.')
        return
      }
      
      const hintResponse = await apiService.solvePuzzle(currentPuzzleId, requestPayload)
      
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
      
      let errorMessage = 'Failed to get hint. '
      
      try {
        if (error.message.includes('Validation failed')) {
          errorMessage += 'The puzzle data format was rejected. '
          
          console.error('❌ Validation failed. Debug info:', {
            userProgressType: typeof userProgress,
            userProgressSample: userProgress?.[0]?.slice(0, 3),
            puzzleId: currentPuzzleId,
            errorDetails: error.message
          })
          
          errorMessage += 'Please refresh the page and try again.'
        } else if (error.message.includes('Invalid puzzle ID')) {
          errorMessage += 'Puzzle ID is invalid. Please try loading a new puzzle.'
        } else if (error.message.includes('Unauthorized')) {
          errorMessage += 'Please log in again.'
          handleLogout()
          return
        } else if (error.message.includes('not found')) {
          errorMessage += 'Puzzle not found on server. Try generating a new puzzle.'
        } else if (error.message.includes('Server error')) {
          errorMessage += 'Server is experiencing issues. Please try again in a moment.'
        } else {
          errorMessage += 'Please try again or refresh the page.'
        }
      } catch (parseError) {
        console.error('Error parsing error:', parseError)
        errorMessage += 'Please try again or refresh the page.'
      }
      
      setError(errorMessage)
    }
  }

  const solvePuzzle = async () => {
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
  }

  const resetPuzzle = () => {
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
  }

  // NEW: Delete puzzle function (admin only)
  const deletePuzzle = async () => {
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
  }

  const handleDifficultyChange = (newDifficulty) => {
    console.log('🎚️ Difficulty changed to:', newDifficulty)
    setDifficulty(newDifficulty)
  }

  useEffect(() => {
    localStorage.setItem('sudokuTheme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light')
  }

  if (loading) {
    return (
      <div className="app-container loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div 
        className="app-container"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
          position: 'relative'
        }}
      >
        <div className="background-overlay"></div>
        <Auth onAuthSuccess={handleAuthSuccess} />
      </div>
    )
  }

  return (
    <div 
      className="app-container"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        position: 'relative'
      }}
    >
      <div className="background-overlay"></div>
      
      <header className="app-header">
        <div className="header-left">
          <h1>Sudoku</h1>
          {user && (
            <span className="user-welcome">
              Welcome, <strong>{user.username}</strong>!
              {user.role === 'admin' && (
                <span className="admin-badge">Admin</span>
              )}
              {user.role === 'visitor' && (
                <span className="visitor-badge">Visitor</span>
              )}
            </span>
          )}
        </div>
        <div className="header-right">
          <button 
            className="theme-toggle" 
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button 
            className="logout-btn" 
            onClick={handleLogout}
            aria-label="Logout"
            title="Logout"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="app-main">
        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={() => setError('')} className="error-close" aria-label="Close error">×</button>
          </div>
        )}

        <div className="game-controls">
          <DifficultySelector 
            difficulty={difficulty} 
            onDifficultyChange={handleDifficultyChange} 
            disabled={generatingPuzzle}
          />
          <button 
            className="new-game-btn" 
            onClick={generateNewPuzzle}
            disabled={generatingPuzzle}
          >
            {generatingPuzzle ? (
              <span className="button-loading">
                <span className="spinner small"></span>
                Generating...
              </span>
            ) : (
              'New Game'
            )}
          </button>
          
          {/* NEW: Delete button (admin only) */}
          {user?.role === 'admin' && currentPuzzleId && (
            <button 
              className="delete-btn" 
              onClick={deletePuzzle}
              disabled={deleting || generatingPuzzle}
              title="Delete current puzzle (Admin only)"
            >
              {deleting ? (
                <span className="button-loading">
                  <span className="spinner small"></span>
                  Deleting...
                </span>
              ) : (
                '🗑️ Delete'
              )}
            </button>
          )}
        </div>

        {/* Admin-only Debug Info */}
        {user?.role === 'admin' && (
          <div style={{ 
            background: 'rgba(0,0,0,0.1)', 
            padding: '10px', 
            margin: '10px 0', 
            borderRadius: '5px',
            fontSize: '12px',
            fontFamily: 'monospace'
          }}>
            <div>🆔 Puzzle ID: {currentPuzzleId || 'null'}</div>
            <div>🎚️ Difficulty: {difficulty}</div>
            <div>🧩 Puzzle: {puzzle ? 'Loaded' : 'None'}</div>
            <div>🎯 Solution: {solution ? 'Available' : 'Missing'}</div>
            <div>📊 Progress: {userProgress ? 'Tracked' : 'None'}</div>
            <div>🔄 Status: {generatingPuzzle ? 'Generating...' : 'Ready'}</div>
            <div>✅ Complete: {gameStats.isComplete ? 'Yes' : 'No'}</div>
            <div>📈 Progress: {gameStats.progress}% ({gameStats.correctCells}/81)</div>
            <div>💡 Hint Cells: {hintCells.size} active (persistent)</div>
            <div>🐛 UserProgress Valid: {userProgress ? 
              `${Array.isArray(userProgress) ? userProgress.length : 'Not Array'}x${Array.isArray(userProgress?.[0]) ? userProgress[0].length : 'Invalid'}` 
              : 'None'}</div>
          </div>
        )}

        {gameStats && puzzle && (
          <div className="game-stats">
            <div className="progress-info">
              <span>Progress: {gameStats.progress}%</span>
              <span>Correct: {gameStats.correctCells}/81</span>
              {gameStats.isComplete && <span className="completed">🎉 Completed!</span>}
            </div>
            {gameStats.violations && gameStats.violations.length> 0 && (
              <div className="violations">
                <span>⚠️ {gameStats.violations.length} violation{gameStats.violations.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        )}

        {puzzle && (
          <div className="game-container">
            <SudokuBoard
              puzzle={puzzle}
              solution={solution}
              originalPuzzle={originalPuzzle}
              onCellChange={handleCellChange}
              hintCells={hintCells}
              violations={gameStats.violations || []}
              readOnly={user?.role === 'visitor'}
            />
            
            <div className="game-actions">
              <button 
                className="hint-btn" 
                onClick={getHint}
                disabled={gameStats.isComplete || user?.role === 'visitor'}
                title={user?.role === 'visitor' ? 'Visitors cannot get hints' : 'Get a hint for the next move'}
              >
                💡 Hint
              </button>
              
              <button 
                className="solve-btn" 
                onClick={solvePuzzle}
                disabled={gameStats.isComplete || user?.role === 'visitor'}
                title={user?.role === 'visitor' ? 'Visitors cannot solve puzzles' : 'Solve the entire puzzle'}
              >
                🔍 Solve
              </button>
              
              <button 
                className="reset-btn" 
                onClick={resetPuzzle}
                disabled={user?.role === 'visitor'}
                title={user?.role === 'visitor' ? 'Visitors cannot reset puzzles' : 'Reset to original puzzle'}
              >
                🔄 Reset
              </button>
            </div>
          </div>
        )}

        {!puzzle && !generatingPuzzle && (
          <div className="no-puzzle">
            <p>No puzzle loaded. Click "New Game" to start!</p>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>Sudoku Game - Enjoy solving puzzles!</p>
        {currentPuzzleId && (
          <p className="puzzle-id">Puzzle #{currentPuzzleId}</p>
        )}
      </footer>
    </div>
  )
}

export default App