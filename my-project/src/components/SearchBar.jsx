import { useState } from 'react';

const CITIES = ['Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Jaipur', 'Ahmedabad', 'Bhopal', 'Indore'];

export default function SearchBar({ value, onChange, onSearch, placeholder }) {
  const [input, setInput] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [focused, setFocused] = useState(false);

  const handleInput = (val) => {
    setInput(val);
    if (val.trim().length > 0) {
      const matches = CITIES.filter(c => c.toLowerCase().startsWith(val.toLowerCase()));
      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }
  };

  const submit = (city) => {
    const loc = city || input.trim();
    if (!loc) return;
    setInput(loc);
    setSuggestions([]);
    if (onChange) onChange(loc);
    if (onSearch) onSearch(loc);
  };

  return (
    <div className="search-bar-wrapper">
      <div className={`search-bar-box ${focused ? 'focused' : ''}`}>
        <span className="search-bar-icon">🔍</span>
        <input
          type="text"
          className="search-bar-input"
          placeholder={placeholder || "Search city — Indore, Delhi, Mumbai…"}
          value={input}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => { setFocused(false); setSuggestions([]); }, 200)}
          onKeyDown={e => e.key === 'Enter' && submit()}
        />
        {input && (
          <button className="search-clear-btn" onClick={() => { setInput(''); setSuggestions([]); }} type="button">
            ✕
          </button>
        )}
        <button className="search-submit-btn" onClick={() => submit()} aria-label="Search" type="button">
          <span>Search</span>
          <span className="arrow-icon">→</span>
        </button>
      </div>

      {suggestions.length > 0 && (
        <ul className="search-suggestions-dropdown">
          {suggestions.map(c => (
            <li key={c} className="search-suggestion-item" onMouseDown={() => submit(c)}>
              <span className="suggestion-icon">📍</span>
              <span className="suggestion-text">{c}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
