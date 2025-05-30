// App.jsx
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
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('sudokuTheme')
    return savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  })
  const [error, setError] = useState('')
  const [generatingPuzzle, setGeneratingPuzzle] = useState(false)

  // Check if user is already authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      if (apiService.isAuthenticated()) {
        try {
          // Verify the token is still valid
          const verifyResponse = await apiService.verifyToken()
          if (verifyResponse.valid) {
            // Create user object from token data
            setUser({
              id: verifyResponse.decoded.id,
              username: verifyResponse.decoded.username,
              role: verifyResponse.decoded.role
            })
            
            // Load the user's current puzzle if they have one
            await loadUserPuzzles()
          } else {
            // Token is invalid, clear it
            apiService.logout()
          }
        } catch (error) {
          console.error('Auth check failed:', error)
          // Token might be expired, try to refresh
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
      }
      setLoading(false)
    }

    checkAuth()
  }, [])

  // Load user's puzzles (get the most recent one)
  const loadUserPuzzles = async () => {
    try {
      const puzzlesResponse = await apiService.getPuzzles(1, 1) // Get most recent puzzle
      if (puzzlesResponse.puzzles && puzzlesResponse.puzzles.length > 0) {
        const recentPuzzle = puzzlesResponse.puzzles[0]
        setPuzzle(recentPuzzle.puzzle)
        setSolution(recentPuzzle.solution)
        setCurrentPuzzleId(recentPuzzle.id)
        setDifficulty(recentPuzzle.difficulty)
      } else {
        // No existing puzzles, generate a new one
        await generateNewPuzzle()
      }
    } catch (error) {
      console.error('Failed to load user puzzles:', error)
      // If no puzzles exist or error occurred, generate a new one
      await generateNewPuzzle()
    }
  }

  // Handle successful authentication
  const handleAuthSuccess = (authData) => {
    setUser(authData.user)
    setError('')
    // Load puzzles after successful authentication
    loadUserPuzzles()
  }

  // Handle logout
  const handleLogout = () => {
    apiService.logout()
    setUser(null)
    setPuzzle(null)
    setSolution(null)
    setCurrentPuzzleId(null)
    setError('')
  }

  // Generate new puzzle from backend
  const generateNewPuzzle = async () => {
    if (!user) return
    
    setGeneratingPuzzle(true)
    setError('')
    
    try {
      const response = await apiService.generatePuzzle(difficulty, true) // save=true
      
      // The response should contain the puzzle data
      if (response.puzzle) {
        setPuzzle(response.puzzle.puzzle)
        setSolution(response.puzzle.solution)
        // If puzzle was saved, use the saved puzzle ID
        if (response.savedPuzzle) {
          setCurrentPuzzleId(response.savedPuzzle.id)
        }
      } else {
        throw new Error('Invalid puzzle data received')
      }
    } catch (error) {
      console.error('Failed to generate puzzle:', error)
      setError('Failed to generate new puzzle. Please try again.')
    } finally {
      setGeneratingPuzzle(false)
    }
  }

  // Update puzzle state on backend when user makes moves
  const updatePuzzleState = async (newPuzzleState) => {
    if (!currentPuzzleId) return
    
    try {
      await apiService.updatePuzzle(currentPuzzleId, {
        puzzle: newPuzzleState,
        solution: solution
      })
    } catch (error) {
      console.error('Failed to save puzzle state:', error)
      // Don't show error to user for save failures, as it's not critical
      // but we could show a subtle indicator that changes weren't saved
    }
  }

  // Handle difficulty change
  const handleDifficultyChange = (newDifficulty) => {
    setDifficulty(newDifficulty)
  }

  // Generate new puzzle when difficulty changes
  useEffect(() => {
    if (user && difficulty) {
      generateNewPuzzle()
    }
  }, [difficulty])

  // Handle theme changes
  useEffect(() => {
    localStorage.setItem('sudokuTheme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light')
  }

  // Show loading spinner while checking authentication
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

  // Show authentication form if user is not logged in
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

        {puzzle && solution && (
          <SudokuBoard 
            puzzle={puzzle} 
            solution={solution}
            onPuzzleChange={updatePuzzleState}
            disabled={generatingPuzzle}
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