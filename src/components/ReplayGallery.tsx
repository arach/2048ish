'use client';

import React, { useState } from 'react';
import { GameRecording } from '../game/headlessGame';
import { GameReplayViewer } from './GameReplayViewer';
import { theme, getTileStyle } from '../theme/colors';

interface ReplayGalleryProps {
  recordings: GameRecording[];
  title?: string;
}

export function ReplayGallery({ recordings, title = "Game Replays" }: ReplayGalleryProps) {
  const [selectedRecording, setSelectedRecording] = useState<GameRecording | null>(null);
  const [sortBy, setSortBy] = useState<'score' | 'moves' | 'maxTile' | 'strategy'>('score');
  const [filterStrategy, setFilterStrategy] = useState<string>('all');

  const strategies = Array.from(new Set(recordings.map(r => r.strategy)));

  const filteredAndSorted = recordings
    .filter(recording => filterStrategy === 'all' || recording.strategy === filterStrategy)
    .sort((a, b) => {
      switch (sortBy) {
        case 'score':
          return b.result.score - a.result.score;
        case 'moves':
          return b.result.moves - a.result.moves;
        case 'maxTile':
          return b.result.maxTile - a.result.maxTile;
        case 'strategy':
          return a.strategy.localeCompare(b.strategy);
        default:
          return 0;
      }
    });

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getStrategyStyle = (strategy: string): { backgroundColor: string; color: string } => {
    const strategyColors = {
      'Strategic Analyzer': theme.tiles[512],
      'Win Probability': theme.tiles[512], // Fallback for old data
      'Endgame Specialist': theme.tiles[1024], 
      'Greedy': theme.tiles[256],
      'MCTS Win Hunter': theme.tiles[128],
      'Risk Taker': theme.tiles[64],
      'Smoothness Master': theme.tiles[32]
    };
    
    return strategyColors[strategy as keyof typeof strategyColors] || theme.tiles[16];
  };

  const getPerformanceBadge = (recording: GameRecording): string => {
    const { maxTile, score } = recording.result;
    
    if (maxTile >= 2048) return '🏆 WIN!';
    if (maxTile >= 1024) return '🥇 1024';
    if (maxTile >= 512) return '🥈 512';
    if (score >= 5000) return '⭐ High Score';
    if (score >= 3000) return '✨ Good';
    return '';
  };

  return (
    <div className="space-y-6">
      {/* Title and Filters Row */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-6">
          <h2 
            className="text-3xl font-bold"
            style={{ 
              color: theme.ui.text.primary,
              fontFamily: 'var(--font-silkscreen)'
            }}
          >
            {title}
          </h2>
          <div 
            className="text-lg font-semibold"
            style={{ color: theme.ui.text.secondary }}
          >
            {filteredAndSorted.length} games
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Strategy Filter */}
          <div className="flex items-center gap-2">
            <label 
              className="text-sm font-bold whitespace-nowrap"
              style={{ 
                color: theme.ui.text.primary,
                fontFamily: 'var(--font-silkscreen)'
              }}
            >
              Strategy:
            </label>
            <select
              value={filterStrategy}
              onChange={(e) => setFilterStrategy(e.target.value)}
              className="rounded-lg px-3 py-1 font-semibold text-sm"
              style={{ 
                backgroundColor: theme.ui.card.background,
                border: `2px solid ${theme.board.grid}`,
                color: theme.ui.text.primary
              }}
            >
              <option value="all">All Strategies</option>
              {strategies.map(strategy => (
                <option key={strategy} value={strategy}>{strategy}</option>
              ))}
            </select>
          </div>

          {/* Sort Filter */}
          <div className="flex items-center gap-2">
            <label 
              className="text-sm font-bold whitespace-nowrap"
              style={{ 
                color: theme.ui.text.primary,
                fontFamily: 'var(--font-silkscreen)'
              }}
            >
              Sort by:
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-lg px-3 py-1 font-semibold text-sm"
              style={{ 
                backgroundColor: theme.ui.card.background,
                border: `2px solid ${theme.board.grid}`,
                color: theme.ui.text.primary
              }}
            >
              <option value="score">Score (High to Low)</option>
              <option value="moves">Moves (High to Low)</option>
              <option value="maxTile">Max Tile (High to Low)</option>
              <option value="strategy">Strategy (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Game Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAndSorted.map((recording, index) => (
          <div
            key={`${recording.strategy}-${recording.startTime}-${index}`}
            className="rounded-xl p-6 cursor-pointer transform hover:-translate-y-2 transition-all duration-200 shadow-lg hover:shadow-xl"
            style={{ 
              backgroundColor: theme.ui.card.background,
              border: `1px solid ${theme.board.grid}40`
            }}
            onClick={() => setSelectedRecording(recording)}
          >
            {/* Strategy Header */}
            <div className="flex justify-between items-center mb-4">
              <span 
                className="text-xs font-medium"
                style={{ 
                  color: theme.ui.text.secondary,
                  fontFamily: 'var(--font-silkscreen)'
                }}
              >
                Strategy:
              </span>
              <span 
                className="text-sm px-2 py-1 rounded-lg font-bold"
                style={{ 
                  backgroundColor: getStrategyStyle(recording.strategy).backgroundColor,
                  color: getStrategyStyle(recording.strategy).color,
                  fontFamily: 'var(--font-silkscreen)'
                }}
              >
                {recording.strategy}
              </span>
            </div>

            {/* Board and Stats Layout */}
            <div className="flex gap-4">
              {/* Final Board */}
              <div className="flex-shrink-0">
                <div 
                  className="text-xs font-medium mb-2"
                  style={{ 
                    color: theme.ui.text.secondary,
                    fontFamily: 'var(--font-silkscreen)'
                  }}
                >
                  Final Board:
                </div>
                <div 
                  className="p-2 rounded-lg"
                  style={{ 
                    backgroundColor: theme.board.empty,
                    border: `1px solid ${theme.board.grid}`,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                >
                  <div className="grid grid-cols-4 gap-1">
                    {recording.finalState.grid.flat().map((value, cellIndex) => {
                      const tileStyle = value ? getTileStyle(value) : { 
                        background: theme.board.empty, 
                        text: theme.ui.text.tertiary 
                      };
                      
                      // Create slightly muted versions of the tile colors
                      const mutedBackground = value 
                        ? `color-mix(in srgb, ${tileStyle.background} 80%, ${theme.ui.card.background} 20%)`
                        : theme.board.empty;
                      const mutedText = value 
                        ? `color-mix(in srgb, ${tileStyle.text} 90%, ${theme.ui.text.secondary} 10%)`
                        : theme.ui.text.tertiary;
                        
                      return (
                        <div
                          key={cellIndex}
                          className="w-8 h-8 flex items-center justify-center rounded font-bold"
                          style={{
                            backgroundColor: mutedBackground,
                            color: mutedText,
                            fontFamily: 'var(--font-silkscreen)',
                            fontSize: '9px',
                            border: `1px solid ${theme.board.grid}60`,
                            boxShadow: value ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                          }}
                        >
                          {value ? (value >= 1000 ? (value >= 2048 ? '2K+' : '1K') : value) : ''}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Stats Column */}
              <div className="flex-1">
                {/* Push content down to align with board container */}
                <div className="text-xs mb-2">&nbsp;</div>
                
                {/* Highlighted Score */}
                <div 
                  className="p-2 rounded-lg text-center mb-3"
                  style={{ 
                    backgroundColor: `${theme.ui.accent}15`,
                    border: `1px solid ${theme.ui.accent}`
                  }}
                >
                  <div 
                    className="text-xs font-medium"
                    style={{ color: theme.ui.text.secondary }}
                  >
                    Score
                  </div>
                  <div 
                    className="font-bold text-lg"
                    style={{ 
                      color: theme.ui.accent,
                      fontFamily: 'var(--font-silkscreen)'
                    }}
                  >
                    {recording.result.score.toLocaleString()}
                  </div>
                </div>
                {/* Other Stats */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center leading-tight">
                    <span 
                      className="text-xs font-medium"
                      style={{ color: theme.ui.text.secondary }}
                    >
                      Max Tile:
                    </span>
                    <span 
                      className="font-bold text-xs px-1.5 py-0.5 rounded"
                      style={{ 
                        backgroundColor: getTileStyle(recording.result.maxTile).background,
                        color: getTileStyle(recording.result.maxTile).text,
                        fontFamily: 'var(--font-silkscreen)'
                      }}
                    >
                      {recording.result.maxTile}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center leading-tight">
                    <span 
                      className="text-xs font-medium"
                      style={{ color: theme.ui.text.secondary }}
                    >
                      Moves:
                    </span>
                    <span 
                      className="font-bold text-xs"
                      style={{ 
                        color: theme.ui.text.primary,
                        fontFamily: 'var(--font-silkscreen)'
                      }}
                    >
                      {recording.result.moves}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center leading-tight">
                    <span 
                      className="text-xs font-medium"
                      style={{ color: theme.ui.text.secondary }}
                    >
                      Duration:
                    </span>
                    <span 
                      className="text-xs"
                      style={{ 
                        color: theme.ui.text.primary,
                        fontFamily: 'var(--font-silkscreen)'
                      }}
                    >
                      {formatDuration(recording.result.duration)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center leading-tight">
                    <span 
                      className="text-xs font-medium"
                      style={{ color: theme.ui.text.secondary }}
                    >
                      Big Merges:
                    </span>
                    <span 
                      className="text-xs"
                      style={{ 
                        color: theme.ui.text.primary,
                        fontFamily: 'var(--font-silkscreen)'
                      }}
                    >
                      {recording.moves.filter(m => m.scoreIncrease >= 128).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        ))}
      </div>

      {filteredAndSorted.length === 0 && (
        <div 
          className="text-center py-12 text-xl"
          style={{ color: theme.ui.text.secondary }}
        >
          No games found with the current filters.
        </div>
      )}

      {/* Replay Modal */}
      {selectedRecording && (
        <GameReplayViewer
          recording={selectedRecording}
          onClose={() => setSelectedRecording(null)}
        />
      )}
    </div>
  );
}