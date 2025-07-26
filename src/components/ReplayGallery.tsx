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
      'Win Probability': theme.tiles[512],
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
      <div className="flex justify-between items-center">
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

      {/* Filters and Sorting */}
      <div 
        className="flex gap-6 items-center p-6 rounded-xl"
        style={{ 
          backgroundColor: theme.board.empty,
          border: `2px solid ${theme.board.grid}`
        }}
      >
        <div>
          <label 
            className="block text-sm font-bold mb-2"
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
            className="rounded-lg px-4 py-2 font-semibold"
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

        <div>
          <label 
            className="block text-sm font-bold mb-2"
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
            className="rounded-lg px-4 py-2 font-semibold"
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

      {/* Game Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAndSorted.map((recording, index) => (
          <div
            key={`${recording.strategy}-${recording.startTime}-${index}`}
            className="rounded-xl p-6 cursor-pointer transform hover:-translate-y-2 transition-all duration-200 shadow-lg hover:shadow-xl"
            style={{ 
              backgroundColor: theme.ui.card.background,
              border: `3px solid ${theme.board.grid}`
            }}
            onClick={() => setSelectedRecording(recording)}
          >
            {/* Strategy Badge */}
            <div className="flex justify-between items-start mb-4">
              <span 
                className="text-sm px-3 py-2 rounded-lg font-bold"
                style={{ 
                  backgroundColor: getStrategyStyle(recording.strategy).backgroundColor,
                  color: getStrategyStyle(recording.strategy).color,
                  fontFamily: 'var(--font-silkscreen)'
                }}
              >
                {recording.strategy}
              </span>
              {getPerformanceBadge(recording) && (
                <span className="text-lg">
                  {getPerformanceBadge(recording)}
                </span>
              )}
            </div>

            {/* Key Stats */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span 
                  className="text-sm font-medium"
                  style={{ color: theme.ui.text.secondary }}
                >
                  Score:
                </span>
                <span 
                  className="font-bold text-lg"
                  style={{ 
                    color: theme.ui.text.primary,
                    fontFamily: 'var(--font-silkscreen)'
                  }}
                >
                  {recording.result.score.toLocaleString()}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span 
                  className="text-sm font-medium"
                  style={{ color: theme.ui.text.secondary }}
                >
                  Max Tile:
                </span>
                <span 
                  className="font-bold text-lg px-2 py-1 rounded"
                  style={{ 
                    backgroundColor: getTileStyle(recording.result.maxTile).background,
                    color: getTileStyle(recording.result.maxTile).text,
                    fontFamily: 'var(--font-silkscreen)'
                  }}
                >
                  {recording.result.maxTile}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span 
                  className="text-sm font-medium"
                  style={{ color: theme.ui.text.secondary }}
                >
                  Moves:
                </span>
                <span 
                  className="font-bold"
                  style={{ color: theme.ui.text.primary }}
                >
                  {recording.result.moves}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span 
                  className="text-sm font-medium"
                  style={{ color: theme.ui.text.secondary }}
                >
                  Duration:
                </span>
                <span 
                  className="text-sm"
                  style={{ color: theme.ui.text.secondary }}
                >
                  {formatDuration(recording.result.duration)}
                </span>
              </div>
            </div>

            {/* Mini Grid Preview */}
            <div className="mt-4">
              <div 
                className="text-xs font-bold mb-2"
                style={{ 
                  color: theme.ui.text.secondary,
                  fontFamily: 'var(--font-silkscreen)'
                }}
              >
                Final Board:
              </div>
              <div 
                className="grid grid-cols-4 gap-1 p-2 rounded-lg"
                style={{ backgroundColor: theme.board.background }}
              >
                {recording.finalState.grid.flat().map((value, cellIndex) => {
                  const tileStyle = value ? getTileStyle(value) : { backgroundColor: theme.board.empty, color: theme.ui.text.secondary };
                  return (
                    <div
                      key={cellIndex}
                      className="w-5 h-5 text-[7px] flex items-center justify-center rounded font-bold"
                      style={{
                        backgroundColor: tileStyle.backgroundColor,
                        color: tileStyle.color
                      }}
                    >
                      {value ? (value >= 1000 ? '1k+' : value) : ''}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Key Moments Preview */}
            {recording.moves.length > 0 && (
              <div 
                className="mt-4 text-xs space-y-1"
                style={{ color: theme.ui.text.secondary }}
              >
                {recording.moves.filter(m => m.scoreIncrease >= 128).length > 0 && (
                  <div className="flex items-center">
                    <span className="mr-2">🔥</span>
                    <span className="font-semibold">
                      {recording.moves.filter(m => m.scoreIncrease >= 128).length} big merges
                    </span>
                  </div>
                )}
                {recording.result.maxTile >= 512 && (
                  <div className="flex items-center">
                    <span className="mr-2">🎯</span>
                    <span className="font-semibold">
                      Reached {recording.result.maxTile} tile
                    </span>
                  </div>
                )}
              </div>
            )}
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