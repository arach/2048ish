'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameController } from '../game/gameController';
import { DebugOverlay } from './debug/DebugOverlay';
import { NavBar } from './NavBar';
import { AgentControls } from './AgentControls';
import { MoveAnalysisTable, MoveAnalysis } from './MoveAnalysisTable';
import { theme } from '../theme/colors';
import { Direction, GameState } from '../agents/types';
import { AlgorithmicAgent } from '../agents/algorithmicAgent';
import Link from 'next/link';

export default function Game2048() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<GameController | null>(null);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [animationMode] = useState<'minimal' | 'playful'>('playful');
  const [agentExplanation, setAgentExplanation] = useState<string>('');
  const [moveAnalyses, setMoveAnalyses] = useState<MoveAnalysis[]>([]);
  const [isAgentPlaying, setIsAgentPlaying] = useState(false);
  const [sessionMoveCount, setSessionMoveCount] = useState(0);
  const previousBoardRef = useRef<(number | null)[][] | null>(null);
  
  // Debug state
  const [debugGameState, setDebugGameState] = useState<any>(null);
  const [debugAnimationState, setDebugAnimationState] = useState<any>({
    duration: 150,
    baseDuration: 150,
    style: animationMode,
    easing: 'ease-in-out',
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
      onScoreUpdate: (newScore) => {
        setScore(newScore);
        if (newScore > bestScore) {
          setBestScore(newScore);
          localStorage.setItem('2048-best-score', newScore.toString());
        }
      },
      onGameOver: () => setGameOver(true),
      onWin: () => setHasWon(true),
      onMoveComplete: (boardState) => {
        // Get the current move count directly from the game manager
        const gameStats = controllerRef.current?.getStats();
        const currentMoveCount = gameStats?.moves || 0;
        
        console.log(`[Move] onMoveComplete - move #${currentMoveCount}, score: ${boardState.score}`);
        
        // Only process if this is a new move (count increased)
        if (currentMoveCount > sessionMoveCount) {
          const boardAfter = boardState.grid.map(row => [...row]);
          const boardBefore = previousBoardRef.current;
          
          console.log(`[Count] Move count update: ${sessionMoveCount} → ${currentMoveCount}`);
          setSessionMoveCount(currentMoveCount);
          
          // Create move analysis if we have previous board state
          if (boardBefore) {
            const analysis: MoveAnalysis = {
              moveNumber: currentMoveCount,
              direction: boardState.lastDirection || 'unknown',
              score: boardState.score,
              maxTile: boardState.maxTile,
              explanation: agentExplanation || '',
              boardStateBefore: boardBefore,
              boardState: boardAfter,
              boardAnalysis: {
                emptyTiles: boardState.emptyTiles,
                possibleMerges: boardState.possibleMerges,
                cornerPosition: isMaxTileInCorner(boardAfter)
              },
              alternatives: currentMoveAlternatives.current
            };
            
            console.log(`[Analysis] Adding move analysis for move #${currentMoveCount}`);
            setMoveAnalyses(prev => [...prev, analysis]);
            
            // Clear the alternatives after use
            currentMoveAlternatives.current = null;
          }
          
          // Update previous board state for next move
          previousBoardRef.current = boardAfter;
        } else {
          console.log(`[Count] Move count unchanged (${currentMoveCount}), skipping analysis`);
        }
      },
      animationStyle: animationMode,
      easingFunction: 'ease-in-out'
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
        const tileStatesObj: Record<string, 'new' | 'merged' | 'moved'> = {};
        
        // Convert Map to object properly
        if (tileStatesMap instanceof Map) {
          tileStatesMap.forEach((value, key) => {
            tileStatesObj[key] = value;
          });
        } else {
          Object.assign(tileStatesObj, tileStatesMap);
        }
        
        const moves = controller.getLastMoveInfo ? controller.getLastMoveInfo() : [];
        
        setDebugGameState(prev => {
          const newState = {
            ...state,
            moves: sessionMoveCount, // Use session move count instead of game manager count
            maxTile: state.grid ? Math.max(...state.grid.flat().filter((cell): cell is number => cell !== null)) : 0,
            tileStates: tileStatesObj,
            lastMoves: moves
          };
          return newState;
        });
        
        // Log debug state updates when there's something meaningful
        if (Object.keys(tileStatesObj).length > 0 || moves.length > 0) {
          console.log('[Game2048] Debug state update - Tile states:', Object.keys(tileStatesObj).length, 'Moves:', moves.length);
        }
      }
    };

    // Subscribe to state changes
    // Update immediately
    updateUndoRedo();
    
    // Initialize the sliding window with the starting board state
    const initialState = controller.getGameState?.();
    if (initialState?.grid) {
      previousBoardRef.current = initialState.grid.map(row => [...row]);
    }
    
    // Subscribe to game state changes directly - no polling needed
    const unsubscribe = controller.subscribeToGameState?.(() => {
      updateUndoRedo();
    });
    
    // Disabled interval to prevent re-render storm
    // const debugUpdateInterval = setInterval(() => { ... }, 100);
    
    // Update animation state for debug
    if (controller.getAnimationState) {
      const animState = controller.getAnimationState();
      setDebugAnimationState({
        duration: animState.duration,
        baseDuration: animState.baseDuration,
        style: animationMode,
        easing: 'ease-in-out',
        activeCount: animState.activeCount,
        isAnimating: animState.isAnimating,
        lastAnimationTime: animState.lastAnimationTime
      });
      // console.log('[Game2048] Debug - Animation state:', debugAnimationState);
    } else {
      setDebugAnimationState({
        duration: 150,
        baseDuration: 150,
        style: animationMode,
        easing: 'ease-in-out',
        activeCount: 0,
        isAnimating: false,
        lastAnimationTime: 0
      });
      // console.log('[Game2048] Debug - Animation state (else):', debugAnimationState);
    }

    return () => {
      if (unsubscribe) unsubscribe();
      // clearInterval(debugUpdateInterval);
      controller.destroy();
    };
  }, [bestScore, animationMode]);

  const handleNewGame = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.newGame();
      setGameOver(false);
      setHasWon(false);
      // DON'T clear move analyses - let them persist across games
      // setMoveAnalyses([]);
      setAgentExplanation('');
      
      // Reset session move count to match the new game
      setSessionMoveCount(0);
      currentMoveAlternatives.current = null;
      console.log('[Game] New game started - session count reset to 0');
      
      // Reset the sliding window with the new board state
      const state = controllerRef.current.getGameState?.();
      if (state?.grid) {
        previousBoardRef.current = state.grid.map(row => [...row]);
      }
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

  
  const currentMoveAlternatives = useRef<any>(null);
  
  const handleAgentMove = useCallback((direction: Direction, stateBefore?: GameState, agent?: AlgorithmicAgent) => {
    console.log(`[Move] Agent initiating move: ${direction}`);
    if (controllerRef.current) {
      // Store current board state for the next analysis
      const currentState = controllerRef.current.getGameState();
      if (currentState?.grid) {
        previousBoardRef.current = currentState.grid.map(row => [...row]);
        console.log(`[Move] Stored board state for analysis`);
      }
      
      // Store alternatives for the upcoming analysis
      if (agent && stateBefore) {
        currentMoveAlternatives.current = agent.getMoveAlternatives(stateBefore);
        console.log(`[Move] Captured alternatives for analysis:`, currentMoveAlternatives.current?.validMoves);
      } else {
        currentMoveAlternatives.current = null;
      }
      
      // Make the move - this will trigger animations and eventually call onMoveComplete
      controllerRef.current.move(direction);
    }
  }, []);
  
  const handleAgentExplanation = useCallback((explanation: string) => {
    setAgentExplanation(explanation);
    
    if (!explanation) {
      // Empty explanation means agent stopped
      setIsAgentPlaying(false);
    }
  }, []);
  
  // Helper functions for board analysis
  
  const isMaxTileInCorner = (grid: (number | null)[][]): boolean => {
    const flatGrid = grid.flat().filter(Boolean) as number[];
    if (flatGrid.length === 0) return false;
    const maxTile = Math.max(...flatGrid);
    const corners = [
      grid[0][0], grid[0][grid[0].length - 1],
      grid[grid.length - 1][0], grid[grid.length - 1][grid[0].length - 1]
    ];
    return corners.includes(maxTile);
  };

  const getGameState = useCallback((): GameState => {
    if (!controllerRef.current) {
      return {
        grid: [[null, null, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]],
        score: 0,
        isGameOver: true,
        moveCount: 0
      };
    }
    
    const state = controllerRef.current.getGameState?.() || {};
    return {
      grid: state.grid || [[null, null, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]],
      score: state.score || 0,
      isGameOver: gameOver,
      moveCount: controllerRef.current.getStats?.()?.moves || 0
    };
  }, [gameOver]);
  
  const handleClearAnalysis = useCallback(() => {
    console.log(`[Analysis] Clearing move analysis table`);
    setMoveAnalyses([]);
    // Keep session count in sync with actual game state
    const gameStats = controllerRef.current?.getStats();
    const currentMoveCount = gameStats?.moves || 0;
    setSessionMoveCount(currentMoveCount);
    console.log(`[Count] Session count synced to ${currentMoveCount}`);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden" 
         style={{ 
           background: `linear-gradient(to bottom right, ${theme.background.gradient.from}, ${theme.background.gradient.to})`,
           height: '100vh',
           maxHeight: '100vh'
         }}>
      {/* Main Game Column */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="max-w-lg w-full flex flex-col" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
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
        <div className="mb-4">
          <NavBar onNewGame={handleNewGame} />
        </div>
        
        {/* Score and Best below header */}
        <div className="flex gap-3 mb-4">
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

        <div className="mt-4 flex justify-center items-center gap-2">
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
        
        <div className="mt-3 text-center text-sm space-y-1">
          <p className="font-semibold" style={{ color: theme.ui.text.primary }}>HOW TO PLAY</p>
          <p style={{ color: theme.ui.text.secondary }}>Use arrow keys to move tiles. When two tiles with the same number touch, they merge into one!</p>
        </div>
        
        {/* Agent Controls */}
        <div className="mt-4 flex-shrink-0">
          <AgentControls 
            onMove={handleAgentMove} 
            getGameState={getGameState}
            onExplanation={handleAgentExplanation}
            onPlayingStateChange={setIsAgentPlaying}
          />
        </div>
        
        {/* Try Classic Mode CTA */}
        <div className="mt-6 text-center pb-4">
          <Link 
            href="/play" 
            className="inline-flex items-center text-sm font-medium transition-colors"
            style={{ color: theme.ui.accent }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            🎮 Try Classic Mode →
          </Link>
        </div>
      </div>
      </div>
      
      {/* Move Analysis Column - Only show on larger screens */}
      <div className="hidden xl:block w-[500px] p-4">
        <div className="h-full flex flex-col">
          {/* Spacer to align with score section */}
          <div style={{ height: '120px' }}></div>
          
          {/* Move Analysis Table */}
          <div className="flex-1" style={{ maxHeight: 'calc(100vh - 320px)' }}>
            <MoveAnalysisTable 
              moves={moveAnalyses} 
              isPlaying={isAgentPlaying}
              onClear={handleClearAnalysis}
            />
          </div>
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