import React from 'react';
import '../styles/DifficultySelector.css';

const DifficultySelector = ({ difficulty, onDifficultyChange }) => {
  return (
    <div className="difficulty-selector">
      <select 
        value={difficulty} 
        onChange={(e) => onDifficultyChange(e.target.value)}
        className="difficulty-select"
      >
        <option value="easy">Easy</option>
        <option value="medium">Medium</option>
        <option value="hard">Hard</option>
      </select>
    </div>
  );
};

export default DifficultySelector;