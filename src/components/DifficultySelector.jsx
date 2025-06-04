// src/components/DifficultySelector.jsx
import React from 'react'
import '../styles/DifficultySelector.css'

function DifficultySelector({ difficulty, onDifficultyChange, disabled = false }) {
  const difficulties = [
    { value: 'easy', label: 'Easy', description: 'Perfect for beginners', emoji: '🟢' },
    { value: 'medium', label: 'Medium', description: 'Moderate challenge', emoji: '🟡' },
    { value: 'hard', label: 'Hard', description: 'For experienced players', emoji: '🟠' }
  ]

  const currentDifficulty = difficulties.find(d => d.value === difficulty)

  return (
    <div className="difficulty-selector">
      <label htmlFor="difficulty-select" className="selector-label">
        🎯 Difficulty Level
      </label>
      <select
        id="difficulty-select"
        value={difficulty}
        onChange={(e) => onDifficultyChange(e.target.value)}
        className="difficulty-select"
        disabled={disabled}
      >
        {difficulties.map((diff) => (
          <option key={diff.value} value={diff.value}>
            {diff.emoji} {diff.label}
          </option>
        ))}
      </select>
      <div className="difficulty-description">
        {currentDifficulty?.emoji} {currentDifficulty?.description}
      </div>
    </div>
  )
}

export default DifficultySelector