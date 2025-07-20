'use client';

import React from 'react';
import { theme } from '../theme/colors';

interface NavBarProps {
  onNewGame: () => void;
}

export function NavBar({ onNewGame }: NavBarProps) {
  return (
    <header className="w-full">
      <div className="flex justify-between items-center">
        <h1 
          className="font-normal tracking-wider"
          style={{ 
            fontFamily: 'var(--font-silkscreen)',
            fontSize: '48px',
            color: theme.ui.text.primary,
            letterSpacing: '0.05em'
          }}
        >
          2048
        </h1>
        
        <button
          onClick={onNewGame}
          className="font-bold px-6 py-3 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-150"
          style={{
            backgroundColor: theme.ui.button.primary.background,
            color: theme.ui.button.primary.text,
            boxShadow: `0 2px 4px ${theme.ui.card.shadow}`
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.ui.button.primary.hover}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.ui.button.primary.background}
        >
          New Game
        </button>
      </div>
    </header>
  );
}