'use client';

import Link from 'next/link';
import { theme } from '../theme/colors';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-screen overflow-hidden p-4" 
         style={{ 
           background: `linear-gradient(to bottom right, ${theme.background.gradient.from}, ${theme.background.gradient.to})`,
           height: '100vh',
           maxHeight: '100vh'
         }}>
      <div className="max-w-lg w-full text-center overflow-y-auto" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
        {/* Logo */}
        <h1 
          className="text-7xl mb-4"
          style={{ 
            fontFamily: 'var(--font-silkscreen)',
            color: theme.ui.text.primary,
            letterSpacing: '0.05em'
          }}
        >
          2048
        </h1>
        
        {/* Tagline */}
        <p className="text-xl mb-12" style={{ color: theme.ui.text.secondary }}>
          The classic puzzle game, reimagined
        </p>
        
        {/* Game Mode Cards */}
        <div className="space-y-4">
          {/* Classic Mode */}
          <Link href="/play" className="block">
            <div 
              className="p-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 cursor-pointer"
              style={{ 
                backgroundColor: theme.ui.card.background,
                border: `2px solid transparent`
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = theme.ui.accent}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
            >
              <h2 className="text-2xl font-bold mb-2" style={{ color: theme.ui.text.primary }}>
                Classic Mode
              </h2>
              <p style={{ color: theme.ui.text.secondary }}>
                Play the original 2048 experience. Combine tiles to reach 2048!
              </p>
            </div>
          </Link>
          
          {/* Agent Mode */}
          <Link href="/agent" className="block">
            <div 
              className="p-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 cursor-pointer"
              style={{ 
                backgroundColor: theme.ui.card.background,
                border: `2px solid transparent`
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = theme.ui.accent}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
            >
              <h2 className="text-2xl font-bold mb-2" style={{ color: theme.ui.text.primary }}>
                Agent Mode
              </h2>
              <p style={{ color: theme.ui.text.secondary }}>
                Watch AI agents play! Choose strategies and learn from their moves.
              </p>
            </div>
          </Link>
        </div>
        
        {/* Footer */}
        <div className="mt-16 text-sm" style={{ color: theme.ui.text.tertiary }}>
          <p>Built with love and AI assistance</p>
          <p className="mt-2">
            Based on{' '}
            <a 
              href="https://play2048.co/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline hover:no-underline"
              style={{ color: theme.ui.accent }}
            >
              2048 by Gabriele Cirulli
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}