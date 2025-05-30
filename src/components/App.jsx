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
          // Token might be expired, clear it
          apiService.logout()
        }
      }
      setLoading(false)
    }

    checkAuth()
  }, [])

  // Load user's puzzles (you might want to get the most recent one)
  const loadUserPuzzles = async () => {
    try {
      const puzzlesResponse = await apiService.getPuzzles(1, 1) // Get most recent puzzle
      if (puzzlesResponse.puzzles && puzzlesResponse.puzzles.length > 0) {
        const recentPuzzle = puzzlesResponse.puzzles[0]
        setPuzzle(recentPuzzle.puzzle_data.puzzle)
        setSolution(recentPuzzle.puzzle_data.solution)
        setCurrentPuzzleId(recentPuzzle.id)
        setDifficulty(recentPuzzle.difficulty)
      }
    } catch (error) {
      console.error('Failed to load user puzzles:', error)
      // If no puzzles exist, generate a new one
      generateNewPuzzle()
    }
  }

  // Handle successful authentication
  const handleAuthSuccess = (authData) => {
    setUser(authData.user)
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
      const response = await apiService.generatePuzzle(difficulty)
      
      // The response should contain the puzzle data
      if (response.puzzle_data) {
        setPuzzle(response.puzzle_data.puzzle)
        setSolution(response.puzzle_data.solution)
        setCurrentPuzzleId(response.id)
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
        puzzle_data: {
          puzzle: newPuzzleState,
          solution: solution
        }
      })
    } catch (error) {
      console.error('Failed to save puzzle state:', error)
      // Don't show error to user for save failures, as it's not critical
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
        <div className="loading-spinner">Loading...</div>
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
      
      <header>
        <div className="header-left">
          <h1>Sudoku</h1>
          {user && (
            <span className="user-welcome">Welcome, {user.username}!</span>
          )}
        </div>
        <div className="header-right">
          <button 
            className="theme-toggle" 
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button 
            className="logout-btn" 
            onClick={handleLogout}
            aria-label="Logout"
          >
            Logout
          </button>
        </div>
      </header>

      <main>
        {error && (
          <div className="error-banner">
            {error}
            <button onClick={() => setError('')} className="error-close">×</button>
          </div>
        )}

        <div className="controls">
          <DifficultySelector 
            difficulty={difficulty} 
            onDifficultyChange={handleDifficultyChange} 
          />
          <button 
            className="new-game-btn" 
            onClick={generateNewPuzzle}
            disabled={generatingPuzzle}
          >
            {generatingPuzzle ? 'Generating...' : 'New Game'}
          </button>
        </div>

        {puzzle && (
          <SudokuBoard 
            puzzle={puzzle} 
            solution={solution}
            onPuzzleChange={updatePuzzleState}
          />
        )}
      </main>
    </div>
  )
}

export default App