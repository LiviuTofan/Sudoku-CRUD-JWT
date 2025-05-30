// src/components/DifficultySelector.jsx
import React from 'react'

function DifficultySelector({ difficulty, onDifficultyChange }) {
  const difficulties = [
    { value: 'easy', label: 'Easy', description: 'Perfect for beginners' },
    { value: 'medium', label: 'Medium', description: 'Moderate challenge' },
    { value: 'hard', label: 'Hard', description: 'For experienced players' },
    { value: 'expert', label: 'Expert', description: 'Ultimate challenge' }
  ]

  return (
    <div className="difficulty-selector">
      <label htmlFor="difficulty-select" className="selector-label">
        Difficulty Level:
      </label>
      <select
        id="difficulty-select"
        value={difficulty}
        onChange={(e) => onDifficultyChange(e.target.value)}
        className="difficulty-select"
      >
        {difficulties.map((diff) => (
          <option key={diff.value} value={diff.value}>
            {diff.label}
          </option>
        ))}
      </select>
      <span className="difficulty-description">
        {difficulties.find(d => d.value === difficulty)?.description}
      </span>
    </div>
  )
}

export default DifficultySelector