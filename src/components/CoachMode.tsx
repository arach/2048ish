'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameController } from '../game/gameController';
import { DebugOverlay } from './debug/DebugOverlay';
import { NavBar } from './NavBar';
import { CoachingPanel } from './CoachingPanel';
import { theme } from '../theme/colors';
import { Direction, GameState } from '../agents/types';
import { AlgorithmicAgent } from '../agents/algorithmicAgent';
import Link from 'next/link';

export default function CoachMode() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<GameController | null>(null);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [animationMode] = useState<'minimal' | 'playful'>('playful');
  const [sessionMoveCount, setSessionMoveCount] = useState(0);
  const previousBoardRef = useRef<(number | null)[][] | null>(null);
  const [coachingEnabled, setCoachingEnabled] = useState(true);
  const [coachingStrategies, setCoachingStrategies] = useState<string[]>(['corner', 'smoothness', 'expectimax']);
  const [lastMoveAnalysis, setLastMoveAnalysis] = useState<{
    humanMove: Direction;
    aiSuggestions: Record<string, {
      suggestion: Direction;
      confidence: number;
      reasoning: string;
      alternatives: any;
    }>;
    moveFeedback: string;
    consensus: {
      agreement: number;
      bestAlternative?: {
        move: Direction;
        supporters: string[];
        reason: string;
      };
    };
  } | null>(null);
  
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
      onMoveComplete: async (boardState) => {
        // Get the current move count directly from the game manager
        const gameStats = controllerRef.current?.getStats();
        const currentMoveCount = gameStats?.moves || 0;
        
        console.log(`[Coach] Human move completed - move #${currentMoveCount}, score: ${boardState.score}`);
        
        // Only process if this is a new move (count increased)
        if (currentMoveCount > sessionMoveCount) {
          const boardAfter = boardState.grid.map(row => [...row]);
          const boardBefore = previousBoardRef.current;
          
          console.log(`[Coach] Analyzing human move: ${sessionMoveCount} → ${currentMoveCount}`);
          setSessionMoveCount(currentMoveCount);
          
          // Analyze the human's move with AI coaches (only if coaching is enabled)
          if (coachingEnabled && boardBefore && boardState.lastDirection) {
            await analyzeHumanMove(boardBefore, boardAfter, boardState.lastDirection as Direction);
          }
          
          // Update previous board state for next move
          previousBoardRef.current = boardAfter;
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
            moves: sessionMoveCount,
            maxTile: state.grid ? Math.max(...state.grid.flat().filter((cell): cell is number => cell !== null)) : 0,
            tileStates: tileStatesObj,
            lastMoves: moves
          };
          return newState;
        });
      }
    };

    // Subscribe to state changes
    updateUndoRedo();
    
    // Initialize the sliding window with the starting board state
    const initialState = controller.getGameState?.();
    if (initialState?.grid) {
      previousBoardRef.current = initialState.grid.map(row => [...row]);
    }
    
    const unsubscribe = controller.subscribeToGameState?.(() => {
      updateUndoRedo();
    });
    
    return () => {
      if (unsubscribe) unsubscribe();
      controller.destroy();
    };
  }, [bestScore, animationMode, sessionMoveCount, lastMoveAnalysis, coachingEnabled]);

  const analyzeHumanMove = async (
    boardBefore: (number | null)[][], 
    boardAfter: (number | null)[][], 
    humanMove: Direction
  ) => {
    console.log(`[Coach] Analyzing human move: ${humanMove}`);
    
    const gameState: GameState = {
      grid: boardBefore,
      score: score,
      isGameOver: false,
      moveCount: sessionMoveCount
    };

    const aiSuggestions: Record<string, {
      suggestion: Direction;
      confidence: number;
      reasoning: string;
      alternatives: any;
    }> = {};

    // Get suggestions from each coaching strategy
    for (const strategyName of coachingStrategies) {
      try {
        const coach = new AlgorithmicAgent({ strategy: strategyName, explainMoves: true });
        await coach.initialize();
        
        const suggestion = await coach.getNextMove(gameState);
        const alternatives = coach.getMoveAlternatives(gameState);
        
        if (suggestion) {
          // Calculate confidence based on how much better this move is vs alternatives
          let confidence = 50; // Base confidence
          if (alternatives?.analysis) {
            const suggestionScore = (alternatives.analysis[suggestion] as any)?.score || 0;
            const otherScores = Object.values(alternatives.analysis)
              .map((alt: any) => alt.score || 0)
              .filter(score => score !== suggestionScore);
            
            if (otherScores.length > 0) {
              const avgOtherScore = otherScores.reduce((a, b) => a + b, 0) / otherScores.length;
              confidence = Math.min(95, Math.max(5, 50 + (suggestionScore - avgOtherScore)));
            }
          }
          
          aiSuggestions[strategyName] = {
            suggestion,
            confidence,
            reasoning: `${strategyName} strategy suggests ${suggestion.toUpperCase()}`,
            alternatives
          };
        }
      } catch (error) {
        console.error(`[Coach] Error analyzing with ${strategyName}:`, error);
      }
    }

    // Generate feedback about the human move
    const { feedback, consensus } = generateMoveFeedback(humanMove, aiSuggestions);
    
    setLastMoveAnalysis({
      humanMove,
      aiSuggestions,
      moveFeedback: feedback,
      consensus
    });
  };

  const generateMoveFeedback = (
    humanMove: Direction, 
    aiSuggestions: Record<string, { suggestion: Direction; confidence: number; reasoning: string }>
  ): { feedback: string; consensus: { agreement: number; bestAlternative?: { move: Direction; supporters: string[]; reason: string } } } => {
    const totalCoaches = Object.keys(aiSuggestions).length;
    const agreements = Object.entries(aiSuggestions).filter(([_, ai]) => ai.suggestion === humanMove);
    const disagreements = Object.entries(aiSuggestions).filter(([_, ai]) => ai.suggestion !== humanMove);
    const agreementPercent = Math.round((agreements.length / totalCoaches) * 100);
    
    let feedback: string;
    let bestAlternative = undefined;
    
    if (agreements.length === totalCoaches) {
      feedback = `🎯 Perfect! All ${totalCoaches} coaches agree with ${humanMove.toUpperCase()}.`;
    } else if (agreementPercent >= 75) {
      feedback = `✅ Excellent choice! ${agreements.length}/${totalCoaches} coaches agree with ${humanMove.toUpperCase()}.`;
    } else if (agreementPercent >= 50) {
      feedback = `👍 Good move! Majority consensus on ${humanMove.toUpperCase()}.`;
    } else if (disagreements.length > 0) {
      // Find the most popular alternative
      const alternativeCounts: Record<string, string[]> = {};
      disagreements.forEach(([strategy, ai]) => {
        if (!alternativeCounts[ai.suggestion]) {
          alternativeCounts[ai.suggestion] = [];
        }
        alternativeCounts[ai.suggestion].push(strategy);
      });
      
      const popularAlternative = Object.entries(alternativeCounts)
        .reduce((best, [move, supporters]) => 
          supporters.length > best.supporters.length ? { move: move as Direction, supporters } : best
        );
      
      bestAlternative = {
        move: popularAlternative.move,
        supporters: popularAlternative.supporters,
        reason: `${popularAlternative.supporters.length} coaches prefer this move`
      };
      
      feedback = `🤔 Divergent opinions. ${popularAlternative.supporters.length} coaches suggest ${popularAlternative.move.toUpperCase()} instead.`;
    } else {
      feedback = `🎲 Unique choice! Let's see how ${humanMove.toUpperCase()} develops.`;
    }
    
    return {
      feedback,
      consensus: {
        agreement: agreementPercent,
        bestAlternative
      }
    };
  };

  const handleNewGame = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.newGame();
      setGameOver(false);
      setHasWon(false);
      setSessionMoveCount(0);
      setLastMoveAnalysis(null);
      console.log('[Coach] New game started - session count reset to 0');
      
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

  const handleClearAnalysis = useCallback(() => {
    console.log(`[Coach] Clearing move analysis table`);
    setMoveAnalyses([]);
    // Keep session count in sync with actual game state
    const gameStats = controllerRef.current?.getStats();
    const currentMoveCount = gameStats?.moves || 0;
    setSessionMoveCount(currentMoveCount);
    console.log(`[Coach] Session count synced to ${currentMoveCount}`);
  }, []);

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
          <p className="font-semibold" style={{ color: theme.ui.text.primary }}>COACH MODE</p>
          <p style={{ color: theme.ui.text.secondary }}>Play normally - AI coaches will analyze your moves!</p>
        </div>
        
        {/* Coaching Panel */}
        <div className="mt-4 flex-shrink-0">
          <CoachingPanel 
            lastAnalysis={lastMoveAnalysis}
            coachingStrategies={coachingStrategies}
            onStrategiesChange={setCoachingStrategies}
            isEnabled={coachingEnabled}
            onToggle={setCoachingEnabled}
          />
        </div>
      </div>
      </div>
      
      {/* Coaching Sidebar - Only show on larger screens */}
      <div className="hidden xl:block w-[400px] p-4">
        <div className="h-full flex flex-col">
          {/* Spacer to align with score section */}
          <div style={{ height: '120px' }}></div>
          
          {/* Extended Coaching Information */}
          <div className="flex-1" style={{ maxHeight: 'calc(100vh - 320px)' }}>
            <div className="bg-white rounded-lg shadow-lg h-full overflow-hidden" 
                 style={{ backgroundColor: theme.ui.card.background }}>
              <div className="p-4 border-b" style={{ borderColor: theme.ui.card.border }}>
                <h3 className="text-lg font-semibold" style={{ color: theme.ui.text.primary }}>
                  🎓 Learning Center
                </h3>
                <p className="text-xs mt-1" style={{ color: theme.ui.text.secondary }}>
                  Strategy insights and improvement tips
                </p>
              </div>
              
              <div className="p-4 overflow-y-auto h-full">
                {lastMoveAnalysis ? (
                  <div className="space-y-4">
                    {/* Strategy Comparison */}
                    <div>
                      <h4 className="text-sm font-medium mb-2" style={{ color: theme.ui.text.primary }}>
                        Strategy Comparison
                      </h4>
                      <div className="space-y-2">
                        {Object.entries(lastMoveAnalysis.aiSuggestions).map(([strategy, opinion]) => (
                          <div key={strategy} className="flex items-center justify-between p-2 rounded" 
                               style={{ backgroundColor: lastMoveAnalysis.humanMove === opinion.suggestion ? '#F0FDF4' : '#FEF2F2' }}>
                            <span className="text-sm capitalize">{strategy}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono">{opinion.suggestion.toUpperCase()}</span>
                              <span className="text-xs px-2 py-0.5 rounded-full" 
                                    style={{ 
                                      backgroundColor: lastMoveAnalysis.humanMove === opinion.suggestion ? '#16A34A' : '#DC2626',
                                      color: 'white'
                                    }}>
                                {Math.round(opinion.confidence)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Learning Tip */}
                    <div className="border-t pt-4" style={{ borderColor: theme.ui.card.border }}>
                      <h4 className="text-sm font-medium mb-2" style={{ color: theme.ui.text.primary }}>
                        💡 Coaching Tip
                      </h4>
                      <p className="text-xs" style={{ color: theme.ui.text.secondary }}>
                        {lastMoveAnalysis.consensus.agreement >= 75 
                          ? "Great strategic thinking! High consensus moves usually lead to better board positions."
                          : lastMoveAnalysis.consensus.bestAlternative
                          ? `Consider the ${lastMoveAnalysis.consensus.bestAlternative.move.toUpperCase()} move next time - it has strong support from multiple strategies.`
                          : "Explore different approaches to find what works best for your playstyle."
                        }
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <div className="text-4xl mb-4">📚</div>
                    <h4 className="text-sm font-medium mb-2" style={{ color: theme.ui.text.primary }}>
                      Learning Insights
                    </h4>
                    <p className="text-xs" style={{ color: theme.ui.text.secondary }}>
                      Start playing to see detailed strategy comparisons and personalized coaching tips!
                    </p>
                  </div>
                )}
              </div>
            </div>
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