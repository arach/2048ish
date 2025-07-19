'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameController } from '../game/gameController';

export default function Game2048() {
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
      onWin: () => setHasWon(true)
    });

    controllerRef.current = controller;

    // Update undo/redo states
    const updateUndoRedo = () => {
      setCanUndo(controller.canUndo());
      setCanRedo(controller.canRedo());
    };

    // Subscribe to state changes
    const interval = setInterval(updateUndoRedo, 100);

    return () => {
      clearInterval(interval);
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

  const handleExport = useCallback(() => {
    if (controllerRef.current) {
      const state = controllerRef.current.exportState();
      const blob = new Blob([state], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '2048-game-state.json';
      a.click();
      URL.revokeObjectURL(url);
    }
  }, []);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && controllerRef.current) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          if (controllerRef.current?.importState(content)) {
            setGameOver(false);
            setHasWon(false);
          } else {
            alert('Invalid game state file');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="max-w-md w-full">
        <div className="mb-6">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">2048</h1>
          
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-4">
              <div className="bg-gray-700 text-white px-4 py-2 rounded">
                <div className="text-xs uppercase tracking-wide">Score</div>
                <div className="text-2xl font-bold">{score}</div>
              </div>
              <div className="bg-gray-700 text-white px-4 py-2 rounded">
                <div className="text-xs uppercase tracking-wide">Best</div>
                <div className="text-2xl font-bold">{bestScore}</div>
              </div>
            </div>
            
            <button
              onClick={handleNewGame}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2 rounded transition-colors"
            >
              New Game
            </button>
          </div>

          <div className="flex gap-2 mb-4">
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className={`flex-1 px-3 py-2 rounded font-medium transition-colors ${
                canUndo
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Undo
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              className={`flex-1 px-3 py-2 rounded font-medium transition-colors ${
                canRedo
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Redo
            </button>
            <button
              onClick={handleExport}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded font-medium transition-colors"
            >
              Export
            </button>
            <button
              onClick={handleImport}
              className="flex-1 bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded font-medium transition-colors"
            >
              Import
            </button>
          </div>
        </div>

        <div className="relative">
          <canvas
            ref={canvasRef}
            className="rounded-lg shadow-lg"
            style={{ touchAction: 'none' }}
          />
          
          {(gameOver || hasWon) && (
            <div className="absolute inset-0 bg-black bg-opacity-70 rounded-lg flex items-center justify-center">
              <div className="text-center text-white">
                <h2 className="text-4xl font-bold mb-4">
                  {hasWon ? 'You Win!' : 'Game Over!'}
                </h2>
                <button
                  onClick={handleNewGame}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 text-gray-600 text-sm">
          <p className="font-semibold mb-2">How to play:</p>
          <p>Use arrow keys or WASD to move tiles. Swipe on touch devices.</p>
          <p>When two tiles with the same number touch, they merge into one!</p>
        </div>
      </div>
    </div>
  );
}