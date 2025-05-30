// App.jsx - Improved Version with Better Generation Flow
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

  // IMPROVEMENT: Centralized puzzle loading function
  const loadPuzzleData = async (puzzleData) => {
    console.log('📥 Loading puzzle data:', puzzleData.id)
    
    // Set all puzzle states in one batch to prevent multiple renders
    setOriginalPuzzle(puzzleData.puzzle)
    setPuzzle(puzzleData.puzzle)
    setUserProgress(puzzleData.puzzle)
    setSolution(puzzleData.solution)
    setCurrentPuzzleId(puzzleData.id)
    setDifficulty(puzzleData.difficulty)
    
    // Reset game stats
    setGameStats({
      isComplete: false,
      correctCells: 0,
      progress: 0,
      violations: []
    })
    
    console.log('🎯 Puzzle loaded with ID:', puzzleData.id)
    
    // Validate the current state
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
    setGameStats({
      isComplete: false,
      correctCells: 0,
      progress: 0,
      violations: []
    })
    setError('')
  }

  // IMPROVEMENT: Better puzzle generation with proper error handling
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
      
      // IMPROVEMENT: Better response handling
      if (!response.puzzle) {
        throw new Error('No puzzle data in response')
      }
      
      let puzzleData = {
        puzzle: null,
        solution: null,
        id: null,
        difficulty: difficulty
      }
      
      // Extract puzzle data from response
      if (response.puzzle.puzzle) {
        puzzleData.puzzle = response.puzzle.puzzle
      } else {
        puzzleData.puzzle = response.puzzle
      }
      
      // Try to get solution from response
      puzzleData.solution = response.solution || response.puzzle.solution
      
      // Try to get puzzle ID from various possible locations
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
      
      // IMPROVEMENT: If no ID in response, wait briefly and reload to get it
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
        return // Exit early, let the timeout handle the rest
      }
      
      // If we have an ID, load the puzzle data directly
      await loadPuzzleData(puzzleData)
      
    } catch (error) {
      console.error('Failed to generate puzzle:', error)
      setError('Failed to generate new puzzle. Please try again.')
    } finally {
      setGeneratingPuzzle(false)
    }
  }

  // IMPROVEMENT: Better validation with detailed logging
  const validatePuzzleState = async (puzzleId, puzzleState) => {
    try {
      console.log('🔍 Validating puzzle state with ID:', puzzleId)
      
      if (!puzzleState || !Array.isArray(puzzleState)) {
        console.error('❌ Invalid puzzle state for validation')
        return null
      }
      
      // Sanitize puzzle state
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
      
      // Update game stats based on validation
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
    if (!currentPuzzleId || !userProgress) {
      console.log('❌ Cannot get hint: missing puzzle ID or progress')
      return
    }
    
    console.log('💡 Getting hint...')
    
    try {
      const hintResponse = await apiService.solvePuzzle(currentPuzzleId, {
        currentState: userProgress,
        hint: true
      })
      
      console.log('💡 Hint response:', hintResponse)
      
      if (hintResponse.hint) {
        const { row, col, value } = hintResponse.hint
        
        const newProgress = userProgress.map(r => [...r])
        newProgress[row][col] = value
        
        setUserProgress(newProgress)
        setPuzzle(newProgress)
        
        await validatePuzzleState(currentPuzzleId, newProgress)
        await updatePuzzleState(newProgress)
        
        console.log(`💡 Hint applied: [${row}, ${col}] = ${value}`)
      } else {
        console.log('💡 No hints available')
        setError('No hints available for this puzzle')
      }
    } catch (error) {
      console.error('❌ Failed to get hint:', error)
      setError('Failed to get hint. Please try again.')
    }
  }

  const solvePuzzle = async () => {
    if (!currentPuzzleId || !userProgress) {
      console.log('❌ Cannot solve puzzle: missing puzzle ID or progress')
      return
    }
    
    console.log('🔍 Solving puzzle...')
    
    try {
      const solutionResponse = await apiService.solvePuzzle(currentPuzzleId, {
        currentState: userProgress,
        hint: false
      })
      
      console.log('🔍 Solve response:', solutionResponse)
      
      if (solutionResponse.solution) {
        setUserProgress(solutionResponse.solution)
        setPuzzle(solutionResponse.solution)
        
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
    console.log('🔄 Resetting puzzle...')
    if (originalPuzzle) {
      setUserProgress(originalPuzzle)
      setPuzzle(originalPuzzle)
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

  const handleDifficultyChange = (newDifficulty) => {
    console.log('🎚️ Difficulty changed to:', newDifficulty)
    setDifficulty(newDifficulty)
    // Note: User must click "New Game" to generate puzzle with new difficulty
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
        </div>

        {/* Improved Debug Info */}
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
        </div>

        {gameStats && puzzle && (
          <div className="game-stats">
            <div className="progress-info">
              <span>Progress: {gameStats.progress}%</span>
              <span>Correct: {gameStats.correctCells}/81</span>
              {gameStats.isComplete && <span className="completed">🎉 Completed!</span>}
            </div>
            {gameStats.violations && gameStats.violations.length > 0 && (
              <div className="violations">
                <span className="violations-count">⚠️ {gameStats.violations.length} error(s)</span>
              </div>
            )}
          </div>
        )}

        {puzzle && !gameStats.isComplete && (
          <div className="game-actions">
            <button 
              className="hint-btn" 
              onClick={getHint}
              disabled={generatingPuzzle || !solution}
              title={!solution ? "Solution not available for hints" : "Get a hint"}
            >
              💡 Hint
            </button>
            <button 
              className="solve-btn" 
              onClick={solvePuzzle}
              disabled={generatingPuzzle}
            >
              🔍 Solve
            </button>
            <button 
              className="reset-btn" 
              onClick={resetPuzzle}
              disabled={generatingPuzzle}
            >
              🔄 Reset
            </button>
          </div>
        )}

        {puzzle && solution && (
          <SudokuBoard 
            puzzle={puzzle} 
            originalPuzzle={originalPuzzle}
            solution={solution}
            onCellChange={handleCellChange}
            disabled={generatingPuzzle}
            violations={gameStats.violations}
            isComplete={gameStats.isComplete}
          />
        )}

        {!puzzle && !generatingPuzzle && (
          <div className="no-puzzle">
            <p>No puzzle loaded. Click "New Game" to start!</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App