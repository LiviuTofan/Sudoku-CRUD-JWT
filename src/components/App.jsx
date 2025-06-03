import React, { useState, useEffect } from 'react'
import SudokuBoard from './SudokuBoard'
import DifficultySelector from './DifficultySelector'
import Auth from './Auth'
import usePuzzleManager from '../hooks/usePuzzleManager'
import apiService from '../services/api'
import '../styles/App.css'
import '../styles/GameControls.css'
import '../styles/GameActions.css'
import backgroundImage from '../assets/bg.png'

function App() {
  // State for user authentication and app state
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('sudokuTheme')
    return savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  })

  const {
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
  } = usePuzzleManager(user, setError)

  // Authentication check
  useEffect(() => {
    const checkAuth = async () => {
      if (apiService.isAuthenticated()) {
        try {
          const verifyResponse = await apiService.verifyToken()
          if (verifyResponse.valid) {
            const userData = {
              id: verifyResponse.decoded.id,
              username: verifyResponse.decoded.username,
              role: verifyResponse.decoded.role
            }
            setUser(userData)
            console.log('User authenticated:', userData)
            
            await loadUserPuzzles()
          } else {
            apiService.logout()
          }
        } catch (error) {
          console.error('Auth check failed:', error)
          try {
            await apiService.refreshToken()
            const verifyResponse = await apiService.verifyToken()
            if (verifyResponse.valid) {
              const userData = {
                id: verifyResponse.decoded.id,
                username: verifyResponse.decoded.username,
                role: verifyResponse.decoded.role
              }
              setUser(userData)
              console.log('User authenticated after refresh:', userData)
              await loadUserPuzzles()
            } else {
              apiService.logout()
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError)
            apiService.logout()
          }
        }
      }
      setLoading(false)
    }

    checkAuth()
  }, [loadUserPuzzles])

  // Theme effect
  useEffect(() => {
    localStorage.setItem('sudokuTheme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Handle successful events  
  const handleAuthSuccess = (authData) => {
    console.log('Login successful:', {
      username: authData.user.username,
      role: authData.user.role,
      token: authData.token ? 'present' : 'missing'
    })
    setUser(authData.user)
    setError('')
    loadUserPuzzles()
  }

  const handleLogout = () => {
    console.log('User logout')
    apiService.logout()
    setUser(null)
    clearPuzzleData()
    setError('')
  }

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light')
  }

  // Game action handlers
  const handleGetHint = () => {
    getHint()
  }

  const handleSolvePuzzle = () => {
    solvePuzzle()
  }

  const handleResetPuzzle = () => {
    resetPuzzle()
  }

  const handleGenerateNewPuzzle = () => {
    generateNewPuzzle()
  }

  const handleDeletePuzzle = () => {
    deletePuzzle()
  }
  
  // Loading state
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

  // Not logged in state
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

  // Main app content
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
            onClick={handleGenerateNewPuzzle}
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
          
          {/* Delete button (admin only) */}
          {user?.role === 'admin' && currentPuzzleId && (
            <button 
              className="delete-btn" 
              onClick={handleDeletePuzzle}
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
            <div>Puzzle ID: {currentPuzzleId || 'null'}</div>
            <div>Difficulty: {difficulty}</div>
            <div>Progress: {userProgress ? 'Tracked' : 'None'}</div>
            <div>Complete: {gameStats.isComplete ? 'Yes' : 'No'}</div>
            <div>Progress: {gameStats.progress}% ({gameStats.correctCells}/81)</div>
            <div>Hint Cells: {hintCells.size} active</div>
            </div> 
        )}

        {gameStats && puzzle && (
          <div className="game-stats">
            <div className="progress-info">
              <span><strong>Steps to solve: {81 - gameStats.correctCells}</strong></span>
              {gameStats.isComplete && <span className="completed">🎉 Completed!</span>}
            </div>
          </div>
        )}

        {puzzle && (
          <div className="game-container">
            <SudokuBoard
              puzzle={puzzle}
              solution={solution}
              userProgress={userProgress}
              onCellChange={handleCellChange}
              hintCells={hintCells}
              isComplete={gameStats?.isComplete}
              originalPuzzle={originalPuzzle}
            />
            
            <div className="game-actions">
              <button 
                className="hint-btn"
                onClick={handleGetHint}
                disabled={!puzzle || gameStats?.isComplete}
                title="Get a hint for an empty cell"
              >
                💡 Hint
              </button>
              
              <button 
                className="solve-btn"
                onClick={handleSolvePuzzle}
                disabled={!puzzle || gameStats?.isComplete}
                title="Show the complete solution"
              >
                🎯 Solve
              </button>
              
              <button 
                className="reset-btn"
                onClick={handleResetPuzzle}
                disabled={!puzzle}
                title="Reset to original puzzle"
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
    </div>
  )
}

export default App