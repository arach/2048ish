'use client';

import React, { useState, useEffect, useRef } from 'react';
import { theme } from '../theme/colors';

export interface MoveAnalysis {
  moveNumber: number;
  direction: string;
  score: number;
  maxTile: number;
  explanation: string;
  boardStateBefore?: (number | null)[][];
  boardState?: (number | null)[][];
  mergeEvents?: Array<{
    position: { row: number; col: number };
    values: { value1: number; value2: number; result: number };
  }>;
  boardAnalysis?: {
    emptyTiles: number;
    possibleMerges: number;
    cornerPosition: boolean;
  };
  lookAhead?: {
    bestNextMove?: string;
    potentialScore?: number;
  };
  alternatives?: {
    validMoves: string[];
    analysis: Record<string, {
      merges: number;
      emptyAfter: number;
      maxTilePosition: string;
      reasoning: string;
    }>;
  };
}

export interface SessionMetadata {
  strategy?: string;
  speed?: number;
  startTime?: number;
  endTime?: number;
  totalMoves: number;
  finalScore: number;
  maxTileAchieved: number;
  gameVersion?: string;
}

interface MoveAnalysisTableProps {
  moves: MoveAnalysis[];
  isPlaying: boolean;
  onClear?: () => void;
  sessionMetadata?: SessionMetadata;
}

// Helper function to get tile colors matching the game
function getTileColor(value: number): string {
  const colors: Record<number, string> = {
    2: '#EEE4DA',
    4: '#EDE0C8',
    8: '#F2B179',
    16: '#F59563',
    32: '#F67C5F',
    64: '#F65E3B',
    128: '#EDCF72',
    256: '#EDCC61',
    512: '#EDC850',
    1024: '#EDC53F',
    2048: '#EDC22E',
  };
  return colors[value] || '#3C3A32';
}

// Move option component for cardinal display
interface MoveOptionProps {
  direction: string;
  analysis: {
    merges: number;
    emptyAfter: number;
    maxTilePosition: string;
    reasoning: string;
    score: number;
  };
  isChosen: boolean;
}

function MoveOption({ direction, analysis, isChosen }: MoveOptionProps) {
  return (
    <div 
      className="flex flex-col items-center gap-0 text-xs px-2 py-1 rounded min-w-[60px]"
      style={{ 
        backgroundColor: isChosen ? theme.ui.accent : theme.ui.card.background,
        border: isChosen ? `2px solid ${theme.ui.accent}` : `1px solid ${theme.ui.card.border}`,
        color: isChosen ? theme.ui.text.button : theme.ui.text.primary,
        opacity: isChosen ? 1 : 0.7
      }}
    >
      <span className="font-bold text-base">
        {direction === 'up' && '↑'}
        {direction === 'down' && '↓'}
        {direction === 'left' && '←'}
        {direction === 'right' && '→'}
      </span>
      {isChosen && (
        <span className="font-bold text-xs">{Math.round(analysis.score)}</span>
      )}
      <span className="text-[10px] opacity-75">
        {analysis.merges > 0 ? `${analysis.merges}M` : ''}
        {analysis.reasoning.includes('corner') ? ' C' : ''}
        {analysis.reasoning.includes('priority') ? ' P' : ''}
      </span>
    </div>
  );
}

// Side-by-side mini boards component
interface SideBySideMiniBoards {
  boardBefore?: (number | null)[][];
  boardAfter?: (number | null)[][];
  direction: string;
}

function SideBySideMiniBoards({ boardBefore, boardAfter, direction }: SideBySideMiniBoards) {
  if (!boardBefore) return null;
  
  return (
    <div className="flex gap-1 items-center flex-shrink-0">
      {/* Before grid */}
      {boardBefore && (
        <div className="grid grid-cols-4 gap-0.5 w-16 h-16">
          {boardBefore.flat().map((value, idx) => (
            <div 
              key={idx}
              className="flex items-center justify-center text-xs font-bold rounded-sm"
              style={{
                backgroundColor: value ? getTileColor(value) : '#CDC1B4',
                color: value && value > 4 ? '#F9F6F2' : '#776E65',
                fontSize: '7px',
                lineHeight: 1,
                minHeight: '100%',
                aspectRatio: '1'
              }}
            >
              {value || ''}
            </div>
          ))}
        </div>
      )}
      
      {/* Arrow indicator */}
      <div className="text-xs font-bold px-1" style={{ color: theme.ui.text.secondary }}>
        {direction === 'up' && '↑'}
        {direction === 'down' && '↓'}
        {direction === 'left' && '←'}
        {direction === 'right' && '→'}
      </div>
      
      {/* After grid */}
      <div className="grid grid-cols-4 gap-0.5 w-16 h-16">
        {(boardAfter ? boardAfter.flat() : Array(16).fill(null)).map((value, idx) => (
          <div 
            key={idx}
            className="flex items-center justify-center text-xs font-bold rounded-sm"
            style={{
              backgroundColor: value ? getTileColor(value) : '#CDC1B4',
              color: value && value > 4 ? '#F9F6F2' : '#776E65',
              fontSize: '7px',
              lineHeight: 1,
              minHeight: '100%',
              aspectRatio: '1'
            }}
          >
            {value || ''}
          </div>
        ))}
      </div>
    </div>
  );
}

// Export utility functions
function formatBoardAsString(board: (number | null)[][]): string {
  return board.map(row => 
    row.map(cell => cell || '0').join(',')
  ).join(';');
}

// Performance analysis functions
function calculatePerformanceMetrics(moves: MoveAnalysis[]): string {
  if (moves.length === 0) return 'No data';
  
  const recentMoves = moves.slice(-10); // Last 10 moves
  const avgEmptyTiles = recentMoves.reduce((sum, m) => sum + (m.boardAnalysis?.emptyTiles || 0), 0) / recentMoves.length;
  const avgMerges = recentMoves.reduce((sum, m) => sum + (m.boardAnalysis?.possibleMerges || 0), 0) / recentMoves.length;
  const cornerRate = recentMoves.filter(m => m.boardAnalysis?.cornerPosition).length / recentMoves.length * 100;
  
  return `${avgEmptyTiles.toFixed(1)} empty, ${avgMerges.toFixed(1)} merges, ${cornerRate.toFixed(0)}% corner`;
}

function calculateMissedOpportunities(moves: MoveAnalysis[]): string {
  if (moves.length === 0) return 'No data';
  
  let missedCount = 0;
  let totalAnalyzed = 0;
  let totalMissedPoints = 0;
  
  moves.forEach(move => {
    if (move.alternatives?.analysis) {
      const chosenScore = (move.alternatives.analysis[move.direction] as any)?.score || 0;
      const allScores = Object.values(move.alternatives.analysis).map((alt: any) => alt.score || 0);
      const bestScore = Math.max(...allScores);
      
      if (bestScore > chosenScore) {
        missedCount++;
        totalMissedPoints += (bestScore - chosenScore);
      }
      totalAnalyzed++;
    }
  });
  
  if (totalAnalyzed === 0) return 'No alternatives data';
  
  const missedRate = (missedCount / totalAnalyzed * 100).toFixed(0);
  const avgMissed = missedCount > 0 ? (totalMissedPoints / missedCount).toFixed(1) : '0';
  
  return `${missedRate}% suboptimal (avg -${avgMissed} pts)`;
}

function downloadFile(content: string, filename: string, contentType: string): void {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatDataForJSON(moves: MoveAnalysis[], sessionMetadata?: SessionMetadata) {
  const exportData = {
    metadata: {
      exportedAt: new Date().toISOString(),
      gameVersion: sessionMetadata?.gameVersion || '1.0',
      ...sessionMetadata
    },
    session: {
      strategy: sessionMetadata?.strategy || 'unknown',
      speed: sessionMetadata?.speed || 1,
      startTime: sessionMetadata?.startTime ? new Date(sessionMetadata.startTime).toISOString() : null,
      endTime: sessionMetadata?.endTime ? new Date(sessionMetadata.endTime).toISOString() : null,
      duration: sessionMetadata?.startTime && sessionMetadata?.endTime 
        ? sessionMetadata.endTime - sessionMetadata.startTime 
        : null,
      totalMoves: sessionMetadata?.totalMoves || moves.length,
      finalScore: sessionMetadata?.finalScore || (moves.length > 0 ? moves[moves.length - 1].score : 0),
      maxTileAchieved: sessionMetadata?.maxTileAchieved || Math.max(...moves.map(m => m.maxTile), 0)
    },
    moves: moves.map(move => ({
      moveNumber: move.moveNumber,
      direction: move.direction,
      score: move.score,
      maxTile: move.maxTile,
      explanation: move.explanation,
      boardStateBefore: move.boardStateBefore,
      boardStateAfter: move.boardState,
      mergeEvents: move.mergeEvents,
      performance: {
        emptyTiles: move.boardAnalysis?.emptyTiles,
        possibleMerges: move.boardAnalysis?.possibleMerges,
        cornerPosition: move.boardAnalysis?.cornerPosition
      },
      lookAhead: move.lookAhead,
      alternatives: move.alternatives ? {
        validMoves: move.alternatives.validMoves,
        analysis: Object.fromEntries(
          Object.entries(move.alternatives.analysis).map(([direction, analysis]) => [
            direction,
            {
              merges: analysis.merges,
              emptyAfter: analysis.emptyAfter,
              maxTilePosition: analysis.maxTilePosition,
              reasoning: analysis.reasoning,
              score: (analysis as any).score || 0
            }
          ])
        )
      } : null
    }))
  };
  
  return JSON.stringify(exportData, null, 2);
}

function formatDataForCSV(moves: MoveAnalysis[], sessionMetadata?: SessionMetadata): string {
  const headers = [
    'Move Number',
    'Direction', 
    'Score',
    'Max Tile',
    'Empty Tiles',
    'Possible Merges',
    'Corner Position',
    'Board Before',
    'Board After',
    'Explanation',
    'Valid Alternatives',
    'Chosen Move Score',
    'Alt Up Score',
    'Alt Down Score', 
    'Alt Left Score',
    'Alt Right Score',
    'Alt Up Merges',
    'Alt Down Merges',
    'Alt Left Merges', 
    'Alt Right Merges',
    'Merge Events'
  ];

  const sessionInfo = [
    `# Session Metadata`,
    `# Strategy: ${sessionMetadata?.strategy || 'unknown'}`,
    `# Speed: ${sessionMetadata?.speed || 1} moves/second`,
    `# Total Moves: ${sessionMetadata?.totalMoves || moves.length}`,
    `# Final Score: ${sessionMetadata?.finalScore || (moves.length > 0 ? moves[moves.length - 1].score : 0)}`,
    `# Max Tile Achieved: ${sessionMetadata?.maxTileAchieved || Math.max(...moves.map(m => m.maxTile), 0)}`,
    `# Exported: ${new Date().toISOString()}`,
    `#`,
    ''
  ];

  const rows = moves.map(move => {
    const alternatives = move.alternatives?.analysis || {};
    const chosenAnalysis = alternatives[move.direction];
    
    return [
      move.moveNumber,
      move.direction,
      move.score,
      move.maxTile,
      move.boardAnalysis?.emptyTiles || '',
      move.boardAnalysis?.possibleMerges || '',
      move.boardAnalysis?.cornerPosition ? 'Yes' : 'No',
      move.boardStateBefore ? formatBoardAsString(move.boardStateBefore) : '',
      move.boardState ? formatBoardAsString(move.boardState) : '',
      `"${(move.explanation || '').replace(/"/g, '""')}"`,
      move.alternatives?.validMoves.join(';') || '',
      (chosenAnalysis as any)?.score || '',
      (alternatives.up as any)?.score || '',
      (alternatives.down as any)?.score || '', 
      (alternatives.left as any)?.score || '',
      (alternatives.right as any)?.score || '',
      alternatives.up?.merges || '',
      alternatives.down?.merges || '',
      alternatives.left?.merges || '',
      alternatives.right?.merges || '',
      move.mergeEvents?.map(e => `${e.position.row},${e.position.col}:${e.values.value1}+${e.values.value2}=${e.values.result}`).join(';') || ''
    ].map(value => String(value));
  });

  return [
    ...sessionInfo,
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
}

export function MoveAnalysisTable({ moves, isPlaying, onClear, sessionMetadata }: MoveAnalysisTableProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Export handlers
  const handleExportJSON = () => {
    if (moves.length === 0) return;
    
    const jsonData = formatDataForJSON(moves, sessionMetadata);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `2048-move-analysis-${timestamp}.json`;
    
    downloadFile(jsonData, filename, 'application/json');
  };
  
  const handleExportCSV = () => {
    if (moves.length === 0) return;
    
    const csvData = formatDataForCSV(moves, sessionMetadata);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `2048-move-analysis-${timestamp}.csv`;
    
    downloadFile(csvData, filename, 'text/csv');
  };

  // Auto-scroll to bottom when new moves are added, unless user is actively scrolling
  useEffect(() => {
    if (!isUserScrolling && scrollContainerRef.current && moves.length > 0) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [moves.length, isUserScrolling]);

  // Handle scroll events to detect user interaction
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px tolerance
    
    if (isAtBottom) {
      setIsUserScrolling(false);
    } else {
      setIsUserScrolling(true);
    }
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Set timeout to re-enable auto-scroll after user stops scrolling
    scrollTimeoutRef.current = setTimeout(() => {
      if (scrollContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
        if (isAtBottom) {
          setIsUserScrolling(false);
        }
      }
    }, 1000);
  };
  return (
    <div className="bg-white rounded-lg shadow-lg h-full flex flex-col" style={{ backgroundColor: theme.ui.card.background }}>
      <div className="p-4 border-b" style={{ borderColor: theme.ui.input.border }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold" style={{ color: theme.ui.text.primary }}>
              Move Analysis
            </h3>
            <p className="text-xs mt-1" style={{ color: theme.ui.text.secondary }}>
              {isPlaying ? 'Recording moves...' : moves.length > 0 ? `${moves.length} moves recorded` : 'Start agent to see analysis'}
            </p>
            {moves.length > 5 && (
              <div className="text-xs mt-2 space-y-1" style={{ color: theme.ui.text.tertiary }}>
                <div>💡 <strong>Performance:</strong> {calculatePerformanceMetrics(moves)}</div>
                <div>🎯 <strong>Efficiency:</strong> {calculateMissedOpportunities(moves)}</div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {moves.length > 0 && (
              <>
                <button
                  onClick={handleExportJSON}
                  className="px-3 py-1 rounded text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: theme.ui.accent,
                    color: theme.ui.text.button,
                    border: 'none'
                  }}
                  title="Export as JSON for detailed analysis"
                >
                  JSON
                </button>
                <button
                  onClick={handleExportCSV}
                  className="px-3 py-1 rounded text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: theme.ui.accent,
                    color: theme.ui.text.button,
                    border: 'none'
                  }}
                  title="Export as CSV for spreadsheet analysis"
                >
                  CSV
                </button>
              </>
            )}
            {onClear && moves.length > 0 && (
              <button
                onClick={onClear}
                className="px-3 py-1 rounded text-xs font-medium transition-colors"
                style={{
                  backgroundColor: theme.ui.button.secondary.background,
                  color: theme.ui.button.secondary.text,
                  border: `1px solid ${theme.ui.input.border}`
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.ui.button.secondary.hover}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.ui.button.secondary.background}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
      
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-2"
        onScroll={handleScroll}
      >
        {moves.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm" style={{ color: theme.ui.text.tertiary }}>
              No moves yet. Start the agent to see detailed move analysis.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {moves.map((move, index) => (
              <div 
                key={index} 
                className="border rounded-md p-1.5 transition-all hover:shadow-md"
                style={{ 
                  borderColor: theme.ui.card.border,
                  backgroundColor: index === moves.length - 1 ? '#FFF5EB' : 'transparent'
                }}
              >
                {/* Move Header */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono font-bold text-xs" style={{ color: theme.ui.text.primary }}>
                    #{move.moveNumber}
                  </span>
                  <span className="text-xs ml-auto" style={{ color: theme.ui.text.secondary }}>
                    Score: {Math.round(move.score).toLocaleString()}
                    {move.boardAnalysis && (
                      <>
                        {' • '}
                        <span>E:{move.boardAnalysis.emptyTiles}</span>
                        {' '}
                        <span>M:{move.boardAnalysis.possibleMerges}</span>
                        {' '}
                        <span>{move.boardAnalysis.cornerPosition ? 'C' : 'X'}</span>
                      </>
                    )}
                  </span>
                </div>
                
                {/* Cardinal layout with boards and alternatives */}
                <div className="flex items-center justify-center">
                  <div className="grid grid-cols-3 gap-1 items-center">
                    {/* Top row - UP option */}
                    <div></div>
                    <div className="flex justify-center h-12">
                      {move.alternatives && move.alternatives.analysis['up'] && (
                        <MoveOption 
                          direction="up"
                          analysis={{...move.alternatives.analysis['up'], score: (move.alternatives.analysis['up'] as any).score || 0}}
                          isChosen={move.direction === 'up'}
                        />
                      )}
                    </div>
                    <div></div>
                    
                    {/* Middle row - LEFT, BOARDS, RIGHT */}
                    <div className="flex justify-end h-16">
                      {move.alternatives && move.alternatives.analysis['left'] && (
                        <MoveOption 
                          direction="left"
                          analysis={{...move.alternatives.analysis['left'], score: (move.alternatives.analysis['left'] as any).score || 0}}
                          isChosen={move.direction === 'left'}
                        />
                      )}
                    </div>
                    
                    {/* Center - Side-by-side Mini Boards */}
                    <div className="flex justify-center">
                      <SideBySideMiniBoards 
                        boardBefore={move.boardStateBefore}
                        boardAfter={move.boardState}
                        direction={move.direction}
                      />
                    </div>
                    
                    <div className="flex justify-start h-16">
                      {move.alternatives && move.alternatives.analysis['right'] && (
                        <MoveOption 
                          direction="right"
                          analysis={{...move.alternatives.analysis['right'], score: (move.alternatives.analysis['right'] as any).score || 0}}
                          isChosen={move.direction === 'right'}
                        />
                      )}
                    </div>
                    
                    {/* Bottom row - DOWN option */}
                    <div></div>
                    <div className="flex justify-center h-12">
                      {move.alternatives && move.alternatives.analysis['down'] && (
                        <MoveOption 
                          direction="down"
                          analysis={{...move.alternatives.analysis['down'], score: (move.alternatives.analysis['down'] as any).score || 0}}
                          isChosen={move.direction === 'down'}
                        />
                      )}
                    </div>
                    <div></div>
                  </div>
                </div>
                
                {/* Show explanation if available */}
                {move.explanation && (
                  <div className="mt-2 p-2 rounded text-xs" style={{ 
                    backgroundColor: theme.ui.card.background,
                    border: `1px solid ${theme.ui.input.border}`,
                    color: theme.ui.text.secondary 
                  }}>
                    <strong>Reasoning:</strong> {move.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}