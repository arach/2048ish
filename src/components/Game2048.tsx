'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameController } from '../game/gameController';
import { DebugOverlay } from './debug/DebugOverlay';

export default function Game2048() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<GameController | null>(null);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [animationMode, setAnimationMode] = useState<'minimal' | 'playful'>('playful');
  const [animationTest, setAnimationTest] = useState(false);
  const [easingFunction, setEasingFunction] = useState<'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'cubic' | 'elastic' | 'bounce'>('ease-in-out');
  
  // Debug state
  const [debugGameState, setDebugGameState] = useState<any>(null);
  const [debugAnimationState, setDebugAnimationState] = useState<any>({
    duration: 150,
    baseDuration: 150,
    style: animationMode,
    easing: easingFunction,
    activeCount: 0,
    isAnimating: false,
    lastAnimationTime: 0
  });

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
      onScoreUpdate: setScore,
      onGameOver: () => setGameOver(true),
      onWin: () => setHasWon(true),
      animationStyle: animationMode,
      // The base duration is now managed inside the controller
      easingFunction: easingFunction,
      testMode: animationTest
    });

    controllerRef.current = controller;

    // Update undo/redo states
    const updateUndoRedo = () => {
      setCanUndo(controller.canUndo());
      setCanRedo(controller.canRedo());
      
      // Update debug states
      if (controller.getGameState) {
        const state = controller.getGameState();
        const tileStatesMap = controller.getTileStates ? controller.getTileStates() : new Map();
        const tileStatesObj = {};
        
        // Convert Map to object properly
        if (tileStatesMap instanceof Map) {
          tileStatesMap.forEach((value, key) => {
            tileStatesObj[key] = value;
          });
        } else {
          Object.assign(tileStatesObj, tileStatesMap);
        }
        
        const moves = controller.getLastMoveInfo ? controller.getLastMoveInfo() : [];
        
        setDebugGameState({
          ...state,
          moves: controller.getStats?.()?.moves || 0,
          maxTile: state.grid ? Math.max(...state.grid.flat().filter(Boolean)) : 0,
          tileStates: tileStatesObj,
          lastMoves: moves
        });
        
        // Log only when there's something meaningful to report
        if (Object.keys(tileStatesObj).length > 0 || moves.length > 0) {
          console.log('[Game2048] Debug state update - Tile states:', Object.keys(tileStatesObj).length, 'Moves:', moves.length);
        }
      }
    };

    // Subscribe to state changes
    // Update immediately
    updateUndoRedo();
    
    // Subscribe to game state changes directly - no polling needed
    const unsubscribe = controller.subscribeToGameState?.(() => {
      updateUndoRedo();
    });
    
    // Update animation state for debug
    if (controller.getAnimationState) {
      const animState = controller.getAnimationState();
      setDebugAnimationState({
        duration: animState.duration,
        baseDuration: animState.baseDuration,
        style: animationMode,
        easing: easingFunction,
        activeCount: animState.activeCount,
        isAnimating: animState.isAnimating,
        lastAnimationTime: animState.lastAnimationTime
      });
      console.log('[Game2048] Debug - Animation state:', debugAnimationState);
    } else {
      setDebugAnimationState({
        duration: 150,
        baseDuration: 150,
        style: animationMode,
        easing: easingFunction,
        activeCount: 0,
        isAnimating: false,
        lastAnimationTime: 0
      });
      console.log('[Game2048] Debug - Animation state (else):', debugAnimationState);
    }

    return () => {
      if (unsubscribe) unsubscribe();
      controller.destroy();
    };
  }, [bestScore, animationMode, animationTest, easingFunction]);

  const handleNewGame = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.newGame();
      setGameOver(false);
      setHasWon(false);
      setAnimationTest(false);
    }
  }, []);

  const handleToggleAnimationDemo = useCallback(() => {
    if (controllerRef.current) {
      if (animationTest) {
        // Exit demo mode - start a new game
        setAnimationTest(false);
        controllerRef.current.newGame();
      } else {
        // Enter demo mode with preset scenario
        const demoState = {
          states: [{
            grid: [
              [2, null, null, 2],     // Two 2s - will merge
              [4, null, null, null],  // Single 4 - will just move
              [null, null, null, null],
              [null, null, null, null]
            ],
            score: 0,
            isGameOver: false,
            hasWon: false
          }],
          currentIndex: 0
        };
        
        controllerRef.current.importState(JSON.stringify(demoState));
        setAnimationTest(true);
        setGameOver(false);
        setHasWon(false);
      }
    }
  }, [animationTest]);

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

          <div className="flex items-center justify-center gap-2 mb-4">
            {!animationTest && (
              <button
                onClick={() => setAnimationMode(animationMode === 'minimal' ? 'playful' : 'minimal')}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors text-sm"
              >
                Animation: {animationMode === 'minimal' ? '⚡ Minimal' : '🎮 Playful'}
              </button>
            )}
            <button
              onClick={handleToggleAnimationDemo}
              className={`px-4 py-2 rounded transition-colors text-sm ${
                animationTest 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-gray-600 hover:bg-gray-700 text-white'
              }`}
            >
              {animationTest ? '❌ Exit Demo Mode' : '🎯 Animation Demo'}
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

        {animationTest && (
          <div className="mt-4 p-4 bg-gray-200 rounded-lg">
            <p className="font-semibold mb-3 text-green-600">🎯 Animation Demo Controls:</p>
            
            <div className="mb-3">
              <span className="text-gray-700">Animation Style:</span>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => setAnimationMode('minimal')}
                  className={`px-3 py-1 rounded text-sm ${animationMode === 'minimal' ? 'bg-blue-500 text-white' : 'bg-gray-300'}`}
                >
                  Minimal
                </button>
                <button
                  onClick={() => setAnimationMode('playful')}
                  className={`px-3 py-1 rounded text-sm ${animationMode === 'playful' ? 'bg-blue-500 text-white' : 'bg-gray-300'}`}
                >
                  Playful
                </button>
              </div>
            </div>
            
            <div>
              <span className="text-gray-700">Easing Function:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {(['ease-in-out', 'ease-in', 'ease-out', 'linear', 'cubic', 'elastic', 'bounce'] as const).map(easing => (
                  <button
                    key={easing}
                    onClick={() => setEasingFunction(easing)}
                    className={`px-3 py-1 rounded text-sm ${easingFunction === easing ? 'bg-blue-500 text-white' : 'bg-gray-300'}`}
                  >
                    {easing}
                  </button>
                ))}
              </div>
            </div>
            
            <p className="mt-3 text-gray-600 text-sm">
              Use arrow keys to see animations.
            </p>
          </div>
        )}

        <div className="mt-6 text-gray-600 text-sm">
          {!animationTest && (
            <>
              <p className="font-semibold mb-2">How to play:</p>
              <p>Use arrow keys or WASD to move tiles. Swipe on touch devices.</p>
              <p>When two tiles with the same number touch, they merge into one!</p>
            </>
          )}
        </div>
      </div>
      
      {/* Debug Overlay */}
      <DebugOverlay
        gameState={debugGameState}
        animationState={debugAnimationState}
        gameRef={controllerRef}
      />
    </div>
  );
}