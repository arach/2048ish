'use client';

import { useState, forwardRef, useImperativeHandle, useCallback, useEffect } from 'react';
import { 
  Bug, X, Copy, Check, Download, Camera, 
  Maximize2, Minimize2, RefreshCw, Play, Pause,
  ChevronRight, ChevronDown, Zap, Grid
} from 'lucide-react';
import { StateTreeView } from './StateTreeView';

interface StateDebuggerProps {
  gameState?: any;
  animationState?: any;
  gameRef?: any;
}

type DebugTab = 'game' | 'grid' | 'animation' | 'actions' | 'state';

export const StateDebugger = forwardRef<any, StateDebuggerProps>(({ 
  gameState,
  animationState,
  gameRef
}, ref) => {
  const [activeTab, setActiveTab] = useState<DebugTab>('game');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  
  // Game specific states
  const [autoPlay, setAutoPlay] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1000);
  const [animationSlowdown, setAnimationSlowdown] = useState(() => {
    // Load saved slowdown from localStorage
    const saved = localStorage.getItem('2048-debug-slowdown');
    return saved ? parseFloat(saved) : 1;
  });
  const [showTileOverlay, setShowTileOverlay] = useState(() => {
    // Load saved overlay preference from localStorage
    const saved = localStorage.getItem('2048-debug-overlay');
    return saved === 'true';
  });
  const [hoveredTile, setHoveredTile] = useState<string | null>(null);
  const [lastMoveInfo, setLastMoveInfo] = useState<any[]>([]);
  const [hoveredTileHistory, setHoveredTileHistory] = useState<any[]>([]);
  
  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    setIsCollapsed: (collapsed: boolean) => setIsCollapsed(collapsed),
    toggleCollapsed: () => setIsCollapsed(prev => !prev)
  }), []);
  
  // State tree expanded paths
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    new Set(['gameState', 'gameState.grid', 'animationState'])
  );
  
  // Apply saved settings on mount and capture move data
  useEffect(() => {
    if (gameRef?.current) {
      // Apply saved slowdown
      if (gameRef.current.setDebugSlowdown && animationSlowdown !== 1) {
        gameRef.current.setDebugSlowdown(animationSlowdown);
      }
      
      // Apply saved overlay setting
      if (gameRef.current.setDebugOverlay && showTileOverlay) {
        gameRef.current.setDebugOverlay(true);
      }
    }
  }, [gameRef, animationState?.baseDuration]); // Only run when gameRef becomes available
  
  // Get move info from game state instead of polling
  useEffect(() => {
    if (gameState?.lastMoves) {
      setLastMoveInfo(gameState.lastMoves);
    }
  }, [gameState?.lastMoves]);
  
  const handleCopy = useCallback(async (data: any, section: string) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);
  
  const handleSnapshot = useCallback(async () => {
    if (!gameRef?.current?.snapshot) return;
    
    try {
      const dataUrl = gameRef.current.snapshot();
      const link = document.createElement('a');
      link.download = `2048-snapshot-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to take snapshot:', err);
    }
  }, [gameRef]);
  
  const handleExportState = useCallback(() => {
    if (!gameRef?.current?.exportState) return;
    
    try {
      const state = gameRef.current.exportState();
      const blob = new Blob([state], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `2048-state-${Date.now()}.json`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export state:', err);
    }
  }, [gameRef]);
  
  // Debug actions
  const debugActions = [
    {
      label: 'Force Win',
      icon: <Zap className="w-3 h-3" />,
      action: () => {
        if (gameRef?.current) {
          // Create a winning state
          const winState = {
            states: [{
              grid: [
                [2048, null, null, null],
                [null, null, null, null],
                [null, null, null, null],
                [null, null, null, null]
              ],
              score: 20000,
              isGameOver: false,
              hasWon: true
            }],
            currentIndex: 0
          };
          gameRef.current.importState(JSON.stringify(winState));
        }
      }
    },
    {
      label: 'Fill Board',
      icon: <Grid className="w-3 h-3" />,
      action: () => {
        if (gameRef?.current) {
          const fullState = {
            states: [{
              grid: [
                [2, 4, 8, 16],
                [32, 64, 128, 256],
                [512, 1024, 2048, 4096],
                [8192, 16384, 32768, 65536]
              ],
              score: 999999,
              isGameOver: false,
              hasWon: true
            }],
            currentIndex: 0
          };
          gameRef.current.importState(JSON.stringify(fullState));
        }
      }
    },
    {
      label: 'Random Board',
      icon: <RefreshCw className="w-3 h-3" />,
      action: () => {
        if (gameRef?.current) {
          const values = [null, null, 2, 4, 8, 16, 32, 64, 128];
          const randomGrid = Array(4).fill(null).map(() =>
            Array(4).fill(null).map(() => 
              values[Math.floor(Math.random() * values.length)]
            )
          );
          const randomState = {
            states: [{
              grid: randomGrid,
              score: Math.floor(Math.random() * 10000),
              isGameOver: false,
              hasWon: false
            }],
            currentIndex: 0
          };
          gameRef.current.importState(JSON.stringify(randomState));
        }
      }
    }
  ];
  
  const tabs: Array<{ id: DebugTab; label: string; icon: JSX.Element }> = [
    { id: 'game', label: 'Game', icon: <Bug className="w-3 h-3" /> },
    { id: 'grid', label: 'Grid', icon: <Grid className="w-3 h-3" /> },
    { id: 'animation', label: 'Anim', icon: <Zap className="w-3 h-3" /> },
    { id: 'actions', label: 'Actions', icon: <Play className="w-3 h-3" /> },
    { id: 'state', label: 'State', icon: <ChevronRight className="w-3 h-3" /> }
  ];
  
  return (
    <>
      {/* Bug button overlay */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="fixed bottom-4 right-4 w-10 h-10 rounded-full
                   bg-gray-900 dark:bg-black
                   backdrop-blur-sm
                   border border-gray-700 dark:border-gray-800
                   shadow-lg shadow-black/50
                   flex items-center justify-center
                   text-white hover:text-white
                   hover:bg-gray-800
                   transition-all duration-300
                   hover:scale-110 active:scale-95
                   group z-[9999]"
        title={isCollapsed ? "Show debug toolbar" : "Hide debug toolbar"}
      >
        <Bug className={`w-5 h-5 transition-transform duration-300 ${
          isCollapsed ? '' : 'rotate-180'
        }`} />
      </button>

      {/* Debug toolbar */}
      {!isCollapsed && (
        <div className={`fixed bottom-4 right-4 rounded-xl text-xs font-sans z-50 
                    bg-gray-900/95 dark:bg-black/95 
                    backdrop-blur-sm
                    border border-gray-700/50 dark:border-gray-800
                    transition-all duration-700
                    ${isExpanded ? 'w-[640px] shadow-[0_20px_50px_rgba(0,0,0,0.7)]' : 'w-[480px] shadow-2xl shadow-black/50'}`}>
          
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-700/50">
            <div className="flex items-center gap-2">
              <Bug className="w-4 h-4 text-gray-400" />
              <h3 className="font-semibold text-white">2048 Debug</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSnapshot}
                className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                title="Take snapshot"
              >
                <Camera className="w-4 h-4" />
              </button>
              <button
                onClick={handleExportState}
                className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                title="Export state"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                title={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsCollapsed(true)}
                className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex border-b border-gray-700/50">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 transition-colors ${
                  activeTab === tab.id 
                    ? 'text-white bg-gray-800/50 border-b-2 border-blue-500' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/30'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
          
          {/* Content */}
          <div className={`overflow-auto ${isExpanded ? 'h-[480px]' : 'h-[320px]'}`}>
            {activeTab === 'game' && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-gray-400 mb-1">Score</div>
                    <div className="text-xl font-mono text-white">{gameState?.score || 0}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Moves</div>
                    <div className="text-xl font-mono text-white">{gameState?.moves || 0}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Max Tile</div>
                    <div className="text-xl font-mono text-white">{gameState?.maxTile || 0}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Status</div>
                    <div className="text-xl font-mono text-white">
                      {gameState?.hasWon ? 'Won' : gameState?.isGameOver ? 'Game Over' : 'Playing'}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'grid' && (
              <div className="p-4">
                <div className="mb-2 flex justify-between items-center">
                  <span className="text-gray-400">Current Grid & Move History</span>
                  <button
                    onClick={() => handleCopy(gameState?.grid, 'grid')}
                    className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white"
                  >
                    {copiedSection === 'grid' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                <div className="flex gap-3">
                  {/* Grid View */}
                  <div className="flex-shrink-0">
                    <div className="inline-block bg-gray-800 p-2 rounded relative">
                  <div className="grid grid-cols-4 gap-1" style={{ width: '220px' }}>
                    {gameState?.grid?.map((row: (number | null)[], rowIndex: number) => (
                      row.map((cell, colIndex) => {
                        const posKey = `${rowIndex},${colIndex}`;
                        // Get tile states with improved fallback logic
                        let tileStates = gameState?.tileStates || {};
                        if (Object.keys(tileStates).length === 0 && gameRef?.current?.getTileStates) {
                          try {
                            const statesMap = gameRef.current.getTileStates();
                            if (statesMap instanceof Map) {
                              tileStates = Object.fromEntries(statesMap);
                            } else if (statesMap && typeof statesMap === 'object') {
                              tileStates = statesMap;
                            }
                          } catch (error) {
                            console.warn('[StateDebugger] Failed to get tile states:', error);
                            tileStates = {};
                          }
                        }
                        const tileState = tileStates[posKey];
                        // Get move info with improved fallback logic
                        let moveInfo = gameState?.lastMoves || lastMoveInfo || [];
                        if (moveInfo.length === 0 && gameRef?.current?.getLastMoveInfo) {
                          try {
                            const lastMoves = gameRef.current.getLastMoveInfo();
                            if (Array.isArray(lastMoves)) {
                              moveInfo = lastMoves;
                            }
                          } catch (error) {
                            console.warn('[StateDebugger] Failed to get last move info:', error);
                            moveInfo = [];
                          }
                        }
                        
                        // Find if this tile moved here from somewhere
                        let moveData = null;
                        let fromDirection = null;
                        if (moveInfo && (tileState === 'moved' || tileState === 'merged')) {
                          moveData = moveInfo.find((m: any) => 
                            m.to[0] === rowIndex && m.to[1] === colIndex
                          );
                          if (moveData) {
                            // Calculate direction arrow
                            const dRow = moveData.to[0] - moveData.from[0];
                            const dCol = moveData.to[1] - moveData.from[1];
                            if (dRow < 0) fromDirection = '↓';
                            else if (dRow > 0) fromDirection = '↑';
                            else if (dCol < 0) fromDirection = '→';
                            else if (dCol > 0) fromDirection = '←';
                          }
                        }
                        
                        // Check if this position was a source for the hovered tile
                        let isHoveredSource = false;
                        if (hoveredTile && moveInfo) {
                          const [hRow, hCol] = hoveredTile.split(',').map(Number);
                          const hoveredMove = moveInfo.find((m: any) => 
                            m.to[0] === hRow && m.to[1] === hCol
                          );
                          if (hoveredMove) {
                            isHoveredSource = hoveredMove.from[0] === rowIndex && hoveredMove.from[1] === colIndex;
                          }
                        }
                        
                        // Determine border color based on tile state
                        let borderClass = '';
                        let dotColor = '';
                        
                        if (hoveredTile === posKey && moveData) {
                          borderClass = 'ring-2 ring-yellow-400';
                        } else if (isHoveredSource) {
                          borderClass = 'ring-2 ring-orange-400';
                        } else if (tileState === 'new') {
                          borderClass = 'ring-2 ring-green-400';
                          dotColor = 'bg-green-400';
                        } else if (tileState === 'merged') {
                          borderClass = 'ring-2 ring-purple-400';
                          dotColor = 'bg-purple-400';
                        } else if (tileState === 'moved') {
                          borderClass = 'ring-2 ring-blue-400';
                          dotColor = 'bg-blue-400';
                        } else if (cell) {
                          borderClass = 'ring-1 ring-gray-600 ring-opacity-50';
                          dotColor = 'bg-gray-600';
                        }
                        
                        return (
                          <div 
                            key={`${rowIndex}-${colIndex}`}
                            className={`w-[52px] h-[52px] flex items-center justify-center rounded text-sm font-bold relative cursor-pointer transition-all
                              ${cell ? 'bg-gray-700' : 'bg-gray-900'} 
                              ${cell && cell >= 8 ? 'text-white' : 'text-gray-300'}
                              ${borderClass}
                              ${hoveredTile === posKey ? 'scale-110 z-10' : ''}
                              ${isHoveredSource ? 'opacity-50' : ''}`}
                            onMouseEnter={() => {
                              if (cell) {
                                setHoveredTile(posKey);
                                // Get tile history if available
                                if (gameRef?.current?.getCompleteTileHistory) {
                                  const history = gameRef.current.getCompleteTileHistory(rowIndex, colIndex);
                                  setHoveredTileHistory(history);
                                }
                              }
                            }}
                            onMouseLeave={() => {
                              setHoveredTile(null);
                              setHoveredTileHistory([]);
                            }}
                          >
                            {cell || ''}
                            {(tileState || cell) && !isHoveredSource && (
                              <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${dotColor}`} />
                            )}
                            {/* Always show direction arrow for moved/merged tiles */}
                            {fromDirection && !isHoveredSource && (
                              <div className="absolute -bottom-1 -left-1 text-[10px] text-gray-400 font-bold">
                                {fromDirection}
                              </div>
                            )}
                            {isHoveredSource && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-2xl text-orange-400">
                                  {(() => {
                                    const [hRow, hCol] = hoveredTile!.split(',').map(Number);
                                    const dRow = hRow - rowIndex;
                                    const dCol = hCol - colIndex;
                                    if (dRow < 0) return '↑';
                                    else if (dRow > 0) return '↓';
                                    else if (dCol < 0) return '←';
                                    else if (dCol > 0) return '→';
                                  })()}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ))}
                  </div>
                  
                  {/* Hover info tooltip */}
                  {hoveredTile && hoveredTileHistory.length > 0 && (() => {
                    const [row, col] = hoveredTile.split(',').map(Number);
                    const currentHistory = hoveredTileHistory[0];
                    
                    return (
                      <div className="absolute -top-12 left-0 right-0 mx-auto w-fit bg-gray-900 px-2 py-1 rounded text-xs text-gray-300 border border-gray-700 z-20">
                        <div className="font-semibold mb-1">Tile History:</div>
                        {hoveredTileHistory.map((entry, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            <span className="text-gray-400">{entry.moveAgo === 0 ? 'Now' : `${entry.moveAgo} move${entry.moveAgo > 1 ? 's' : ''} ago`}:</span>
                            <span className="text-white">{entry.value}</span>
                            {entry.from && (
                              <span className="text-gray-500">
                                {entry.from[0] === row && entry.from[1] === col ? ' (stayed)' : ` from [${entry.from[0]},${entry.from[1]}]`}
                              </span>
                            )}
                            {!entry.from && <span className="text-green-400">(new)</span>}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                    </div>
                  </div>
                  
                  {/* Moves List */}
                  <div className="flex-1">
                    <div className="bg-gray-800 p-2 rounded h-full">
                      <div className="text-xs font-semibold text-gray-300 mb-2 flex justify-between items-center">
                        <span>Last Move Details</span>
                        {(() => {
                          const states = gameState?.tileStates || {};
                          const count = Object.keys(states).length;
                          return count > 0 ? (
                            <span className="text-xs text-gray-500">({count} states)</span>
                          ) : null;
                        })()}
                      </div>
                      <div className="space-y-1 text-xs">
                        {(() => {
                          // Get moves from all sources and use the most recent non-empty one
                          let moveInfo = gameState?.lastMoves || lastMoveInfo || [];
                          if (moveInfo.length === 0 && gameRef?.current?.getLastMoveInfo) {
                            try {
                              const lastMoves = gameRef.current.getLastMoveInfo();
                              if (Array.isArray(lastMoves)) {
                                moveInfo = lastMoves;
                              }
                            } catch (error) {
                              console.warn('[StateDebugger] Failed to get last move info for moves list:', error);
                              moveInfo = [];
                            }
                          }
                          
                          // Get tile states properly with error handling
                          let tileStates = gameState?.tileStates || {};
                          if (Object.keys(tileStates).length === 0 && gameRef?.current?.getTileStates) {
                            try {
                              const statesMap = gameRef.current.getTileStates();
                              if (statesMap instanceof Map) {
                                tileStates = Object.fromEntries(statesMap);
                              } else if (statesMap && typeof statesMap === 'object') {
                                tileStates = statesMap;
                              }
                            } catch (error) {
                              console.warn('[StateDebugger] Failed to get tile states for moves list:', error);
                              tileStates = {};
                            }
                          }
                          const stateCount = Object.keys(tileStates).length;
                          
                          // Removed debug logging
                          
                          if (moveInfo.length === 0) {
                            // If we have tile states but no move info, show that
                            const movedTiles = Object.entries(tileStates).filter(([_, state]) => 
                              state === 'moved' || state === 'merged'
                            );
                            if (movedTiles.length > 0) {
                              return (
                                <div className="text-gray-500">
                                  <div>Move data not available</div>
                                  <div className="text-xs mt-1">({movedTiles.length} tiles marked as moved/merged)</div>
                                </div>
                              );
                            }
                            return <div className="text-gray-500">No moves yet</div>;
                          }
                          
                          return moveInfo.map((move, idx) => (
                            <div 
                              key={idx} 
                              className={`flex items-center gap-2 p-1 rounded ${
                                hoveredTile === `${move.to[0]},${move.to[1]}` ? 'bg-gray-700' : ''
                              }`}
                              onMouseEnter={() => {
                                const key = `${move.to[0]},${move.to[1]}`;
                                setHoveredTile(key);
                                if (gameRef?.current?.getCompleteTileHistory) {
                                  const history = gameRef.current.getCompleteTileHistory(move.to[0], move.to[1]);
                                  setHoveredTileHistory(history);
                                }
                              }}
                              onMouseLeave={() => {
                                setHoveredTile(null);
                                setHoveredTileHistory([]);
                              }}
                            >
                              <div className={`w-2 h-2 rounded-full ${
                                move.merged ? 'bg-purple-400' : 'bg-blue-400'
                              }`} />
                              <div className="font-mono text-gray-300">
                                {move.value}
                              </div>
                              <div className="text-gray-500">
                                [{move.from[0]},{move.from[1]}] → [{move.to[0]},{move.to[1]}]
                              </div>
                              {move.merged && (
                                <span className="text-purple-400 text-xs">×2</span>
                              )}
                            </div>
                          ));
                        })()}
                      </div>
                      {(() => {
                        const moveInfo = gameRef?.current?.getLastMoveInfo?.() || [];
                        const mergeCount = moveInfo.filter(m => m.merged).length;
                        const moveCount = moveInfo.filter(m => !m.merged).length;
                        
                        if (moveInfo.length > 0) {
                          return (
                            <div className="mt-2 pt-2 border-t border-gray-700 text-xs text-gray-400">
                              <div>Total: {moveInfo.length} tiles</div>
                              {moveCount > 0 && <div>Moved: {moveCount}</div>}
                              {mergeCount > 0 && <div>Merged: {mergeCount}</div>}
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-800 p-2 rounded mt-3">
                  <div className="text-xs font-semibold text-gray-300 mb-2">Tile States Legend:</div>
                  <div className="text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                      <span className="text-gray-400">New tile (just spawned)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                      <span className="text-gray-400">Merged tile (two tiles combined)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                      <span className="text-gray-400">Moved tile (slid to new position)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-gray-600 rounded-full"></div>
                      <span className="text-gray-400">Static tile (didn't move)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'animation' && (
              <div className="p-4 space-y-4">
                <div>
                  <div className="text-gray-400 mb-2">Animation Settings</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Base Duration</span>
                      <span className="font-mono text-white">{animationState?.duration || 125}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Effective Duration</span>
                      <span className="font-mono text-white">{(animationState?.duration || 125) * animationSlowdown}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Style</span>
                      <span className="font-mono text-white">{animationState?.style || 'playful'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Easing</span>
                      <span className="font-mono text-white">{animationState?.easing || 'cubic'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Active Animations</span>
                      <span className="font-mono text-white">{animationState?.activeCount || 0}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="text-gray-400 mb-2">Debug Speed Control</div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-4">
                      <label className="text-sm text-gray-300">Base Speed</label>
                      <input
                        type="number"
                        step="10"
                        value={animationState?.baseDuration || 150}
                        onChange={(e) => {
                          const newBase = parseInt(e.target.value);
                          if (!isNaN(newBase) && gameRef?.current?.setBaseAnimationDuration) {
                            gameRef.current.setBaseAnimationDuration(newBase);
                          }
                        }}
                        className="w-20 bg-gray-900 text-white font-mono text-center rounded p-1 border border-gray-600"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Slowdown: {animationSlowdown}x</span>
                      <span className="text-xs text-gray-500">
                        {animationSlowdown === 1 ? 'Normal' : 
                         animationSlowdown < 1 ? `${1/animationSlowdown}x faster` : 
                         `${animationSlowdown}x slower`}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="range"
                        min="0"
                        max="7"
                        step="1"
                        value={[0.5, 1, 1.5, 2, 3, 4, 6, 8].indexOf(animationSlowdown)}
                        onChange={(e) => {
                          const values = [0.5, 1, 1.5, 2, 3, 4, 6, 8];
                          const newSlowdown = values[parseInt(e.target.value)];
                          setAnimationSlowdown(newSlowdown);
                          
                          // Save to localStorage
                          localStorage.setItem('2048-debug-slowdown', newSlowdown.toString());
                          
                          // Apply slowdown to game controller
                          if (gameRef?.current?.setDebugSlowdown) {
                            gameRef.current.setDebugSlowdown(newSlowdown);
                          } else if (gameRef?.current?.setAnimationDuration) {
                            // Fallback to old method
                            const baseDuration = animationState?.baseDuration ?? 150;
                            gameRef.current.setAnimationDuration(baseDuration * newSlowdown);
                          }
                        }}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1 px-1">
                        <span>0.5x</span>
                        <span>1x</span>
                        <span>1.5x</span>
                        <span>2x</span>
                        <span>3x</span>
                        <span>4x</span>
                        <span>6x</span>
                        <span>8x</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="text-gray-400 mb-2">Debug Overlay</div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showTileOverlay}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setShowTileOverlay(checked);
                        // Save to localStorage
                        localStorage.setItem('2048-debug-overlay', checked.toString());
                        // Enable/disable tile state overlay on main canvas
                        if (gameRef?.current?.setDebugOverlay) {
                          gameRef.current.setDebugOverlay(checked);
                        }
                      }}
                      className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-gray-300">Show tile states on game canvas</span>
                  </label>
                  <div className="mt-2 text-xs text-gray-500">
                    Shows colored indicators for new, merged, and moved tiles
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'actions' && (
              <div className="p-4 space-y-2">
                {debugActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.action}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded
                             bg-gray-800 hover:bg-gray-700 text-white
                             transition-colors text-left"
                  >
                    {action.icon}
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
            )}
            
            {activeTab === 'state' && (
              <div className="p-4">
                <StateTreeView
                  data={{
                    gameState,
                    animationState,
                    localStorage: {
                      bestScore: localStorage.getItem('2048-best-score'),
                      savedState: localStorage.getItem('2048-game-state')
                    }
                  }}
                  expandedPaths={expandedPaths}
                  onTogglePath={(path) => {
                    const newPaths = new Set(expandedPaths);
                    if (newPaths.has(path)) {
                      newPaths.delete(path);
                    } else {
                      newPaths.add(path);
                    }
                    setExpandedPaths(newPaths);
                  }}
                  onCopy={handleCopy}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
});