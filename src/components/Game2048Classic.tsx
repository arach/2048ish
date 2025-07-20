'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameController } from '../game/gameController';
import { NavBar } from './NavBar';
import { theme } from '../theme/colors';
import Link from 'next/link';

export default function Game2048Classic() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<GameController | null>(null);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Load best score
    const savedBest = localStorage.getItem('2048-best-score');
    if (savedBest) {
      setBestScore(parseInt(savedBest, 10));
    }

    // Initialize game controller
    const controller = new GameController({
      canvas: canvasRef.current,
      onScoreUpdate: (newScore) => {
        setScore(newScore);
        if (newScore > bestScore) {
          setBestScore(newScore);
          localStorage.setItem('2048-best-score', newScore.toString());
        }
      },
      onGameOver: () => setGameOver(true),
      onWin: () => setHasWon(true),
      animationStyle: 'playful',
      easingFunction: 'ease-in-out'
    });

    controllerRef.current = controller;

    // Update undo/redo states
    const updateUndoRedo = () => {
      setCanUndo(controller.canUndo());
      setCanRedo(controller.canRedo());
    };

    // Subscribe to state changes
    updateUndoRedo();
    
    const unsubscribe = controller.subscribeToGameState?.(() => {
      updateUndoRedo();
    });

    return () => {
      if (unsubscribe) unsubscribe();
      controller.destroy();
    };
  }, [bestScore]);

  const handleNewGame = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.newGame();
      setGameOver(false);
      setHasWon(false);
    }
  }, []);

  const handleUndo = useCallback(() => {
    if (controllerRef.current && controllerRef.current.undo()) {
      setGameOver(false);
    }
  }, []);

  const handleRedo = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.redo();
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4" 
         style={{ background: `linear-gradient(to bottom right, ${theme.background.gradient.from}, ${theme.background.gradient.to})` }}>
      <div className="max-w-lg w-full">
        {/* Back button */}
        <Link 
          href="/" 
          className="inline-flex items-center mb-4 text-sm font-medium transition-colors"
          style={{ color: theme.ui.text.secondary }}
          onMouseEnter={(e) => e.currentTarget.style.color = theme.ui.text.primary}
          onMouseLeave={(e) => e.currentTarget.style.color = theme.ui.text.secondary}
        >
          ← Back to Menu
        </Link>
        
        {/* Header with logo and new game */}
        <div className="mb-6">
          <NavBar onNewGame={handleNewGame} />
        </div>
        
        {/* Score and Best below header */}
        <div className="flex gap-3 mb-6">
          <div className="rounded-lg px-5 py-3" style={{ 
            backgroundColor: theme.ui.card.background,
            boxShadow: `0 2px 4px ${theme.ui.card.shadow}`
          }}>
            <div className="text-xs uppercase tracking-wider font-medium" style={{ color: theme.ui.text.secondary }}>Score</div>
            <div className="text-2xl font-bold" style={{ color: theme.ui.text.primary }}>{score.toLocaleString()}</div>
          </div>
          
          <div className="rounded-lg px-5 py-3" style={{ 
            backgroundColor: theme.ui.card.background,
            boxShadow: `0 2px 4px ${theme.ui.card.shadow}`
          }}>
            <div className="text-xs uppercase tracking-wider font-medium" style={{ color: theme.ui.text.secondary }}>Best</div>
            <div className="text-2xl font-bold" style={{ color: theme.ui.text.primary }}>{bestScore.toLocaleString()}</div>
          </div>
        </div>

        <div className="relative">
          <canvas
            ref={canvasRef}
            className="rounded-xl shadow-2xl"
            style={{ touchAction: 'none' }}
          />
          
          {(gameOver || hasWon) && (
            <div className="absolute inset-0 bg-black bg-opacity-75 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <div className="text-center text-white">
                <h2 className="text-5xl font-bold mb-6">
                  {hasWon ? '🎉 You Win!' : 'Game Over'}
                </h2>
                <p className="text-xl mb-6 opacity-90">
                  Score: {score.toLocaleString()}
                </p>
                <button
                  onClick={handleNewGame}
                  className="bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold px-8 py-4 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-150 text-lg"
                >
                  Play Again
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-center items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className="p-1.5 rounded-lg transition-all duration-150"
            style={{
              backgroundColor: canUndo ? theme.ui.button.secondary.background : theme.ui.button.secondary.disabled.background,
              color: canUndo ? theme.ui.button.secondary.text : theme.ui.button.secondary.disabled.text,
              cursor: canUndo ? 'pointer' : 'not-allowed'
            }}
            onMouseEnter={(e) => canUndo && (e.currentTarget.style.backgroundColor = theme.ui.button.secondary.hover)}
            onMouseLeave={(e) => canUndo && (e.currentTarget.style.backgroundColor = theme.ui.button.secondary.background)}
            title="Undo"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className="p-1.5 rounded-lg transition-all duration-150"
            style={{
              backgroundColor: canRedo ? theme.ui.button.secondary.background : theme.ui.button.secondary.disabled.background,
              color: canRedo ? theme.ui.button.secondary.text : theme.ui.button.secondary.disabled.text,
              cursor: canRedo ? 'pointer' : 'not-allowed'
            }}
            onMouseEnter={(e) => canRedo && (e.currentTarget.style.backgroundColor = theme.ui.button.secondary.hover)}
            onMouseLeave={(e) => canRedo && (e.currentTarget.style.backgroundColor = theme.ui.button.secondary.background)}
            title="Redo"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
            </svg>
          </button>
        </div>
        
        <div className="mt-4 text-center text-sm space-y-1">
          <p className="font-semibold" style={{ color: theme.ui.text.primary }}>HOW TO PLAY</p>
          <p style={{ color: theme.ui.text.secondary }}>Use arrow keys to move tiles. When two tiles with the same number touch, they merge into one!</p>
        </div>
        
        {/* Try Agent Mode CTA */}
        <div className="mt-8 text-center">
          <Link 
            href="/agent" 
            className="inline-flex items-center text-sm font-medium transition-colors"
            style={{ color: theme.ui.accent }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            🤖 Try Agent Mode →
          </Link>
        </div>
      </div>
    </div>
  );
}