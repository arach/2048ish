'use client';

import React, { useState, useEffect } from 'react';
import { GameRecording, GameMove } from '../game/headlessGame';
import { Grid } from '../game/logic';
import { theme, getTileStyle } from '../theme/colors';

interface GameReplayViewerProps {
  recording: GameRecording;
  onClose: () => void;
}

export function GameReplayViewer({ recording, onClose }: GameReplayViewerProps) {
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000); // ms between moves

  const currentMove = recording.moves[currentMoveIndex];
  
  // Better grid state logic
  const getCurrentGrid = (): Grid => {
    if (recording.moves.length === 0) {
      return recording.finalState.grid;
    }
    
    if (currentMoveIndex === 0) {
      return recording.moves[0]?.gridBefore || recording.finalState.grid;
    }
    
    const move = recording.moves[currentMoveIndex];
    return move?.gridAfter || recording.moves[currentMoveIndex - 1]?.gridAfter || recording.finalState.grid;
  };
  
  const currentGrid = getCurrentGrid();

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setTimeout(() => {
      if (currentMoveIndex < recording.moves.length - 1) {
        setCurrentMoveIndex(prev => prev + 1);
      } else {
        setIsPlaying(false);
      }
    }, playbackSpeed);

    return () => clearTimeout(timer);
  }, [isPlaying, currentMoveIndex, recording.moves.length, playbackSpeed]);

  const formatTileValue = (value: number | null): string => {
    if (value === null) return '';
    return value.toString();
  };


  const goToMove = (index: number) => {
    const maxIndex = Math.max(0, recording.moves.length - 1);
    setCurrentMoveIndex(Math.max(0, Math.min(index, maxIndex)));
    setIsPlaying(false);
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  const step = (direction: 'prev' | 'next') => {
    setIsPlaying(false);
    if (direction === 'prev' && currentMoveIndex > 0) {
      setCurrentMoveIndex(currentMoveIndex - 1);
    } else if (direction === 'next' && currentMoveIndex < recording.moves.length - 1) {
      setCurrentMoveIndex(currentMoveIndex + 1);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-2"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="rounded-xl p-3 max-w-4xl max-h-[98vh] overflow-y-auto shadow-2xl"
        style={{ 
          backgroundColor: theme.ui.card.background,
          border: `2px solid ${theme.board.grid}`
        }}
      >
        {/* Header with stats inline */}
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-4">
            <h2 
              className="text-lg font-light"
              style={{ 
                color: theme.ui.text.primary,
                fontFamily: 'var(--font-silkscreen)'
              }}
            >
              {recording.strategy}
            </h2>
            <div className="flex gap-3 text-xs">
              <span style={{ color: theme.ui.text.secondary }}>
                Score: <span style={{ color: theme.ui.text.primary, fontFamily: 'var(--font-silkscreen)' }}>
                  {recording.result.score.toLocaleString()}
                </span>
              </span>
              <span style={{ color: theme.ui.text.secondary }}>
                Max: <span 
                  className="px-1 rounded"
                  style={{ 
                    backgroundColor: getTileStyle(recording.result.maxTile).background,
                    color: getTileStyle(recording.result.maxTile).text,
                    fontFamily: 'var(--font-silkscreen)'
                  }}
                >
                  {recording.result.maxTile}
                </span>
              </span>
              <span style={{ color: theme.ui.text.secondary }}>
                Moves: <span style={{ color: theme.ui.text.primary, fontFamily: 'var(--font-silkscreen)' }}>
                  {recording.result.moves}
                </span>
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-lg hover:opacity-70 transition-opacity"
            style={{ color: theme.ui.text.secondary }}
          >
            ✕
          </button>
        </div>

        {/* No moves available */}
        {recording.moves.length === 0 && (
          <div className="text-center py-4">
            <div 
              className="text-sm"
              style={{ color: theme.ui.text.secondary }}
            >
              No move history available - showing final board only.
            </div>
          </div>
        )}

        <div className="flex gap-3">
          {/* Game Board */}
          <div className="flex-shrink-0">
            <div 
              className="p-3 rounded-lg shadow-inner"
              style={{ backgroundColor: theme.board.empty }}
            >
              <div className="grid grid-cols-4 gap-2">
                {currentGrid.flat().map((value, index) => {
                  const tileStyle = value ? getTileStyle(value) : { 
                    background: theme.board.empty, 
                    text: theme.ui.text.secondary 
                  };
                  return (
                    <div
                      key={index}
                      className="w-14 h-14 flex items-center justify-center rounded font-bold shadow-sm text-sm"
                      style={{
                        backgroundColor: value ? tileStyle.background : theme.board.empty,
                        color: value ? tileStyle.text : theme.ui.text.secondary,
                        fontFamily: 'var(--font-silkscreen)',
                        border: `2px solid ${theme.board.grid}`
                      }}
                    >
                      {value ? (value >= 1000 ? (value >= 2048 ? '2K+' : '1K+') : value) : ''}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Compact Move Info */}
            {currentMove && (
              <div 
                className="mt-2 p-2 rounded-lg"
                style={{ backgroundColor: theme.board.empty }}
              >
                <div 
                  className="font-light text-xs"
                  style={{ 
                    color: theme.ui.text.primary,
                    fontFamily: 'var(--font-silkscreen)'
                  }}
                >
                  #{currentMove.moveNumber}: {currentMove.direction.toUpperCase()}
                </div>
                <div 
                  className="text-xs"
                  style={{ color: theme.ui.text.secondary }}
                >
                  +{currentMove.scoreIncrease} → {currentMove.totalScore.toLocaleString()}
                </div>
              </div>
            )}
          </div>

          {/* Controls and Analysis */}
          <div className="flex-1 space-y-2">
            {/* Compact Playback Controls */}
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: theme.board.empty }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => step('prev')}
                    disabled={currentMoveIndex === 0}
                    className="px-2 py-1 rounded text-xs font-medium disabled:opacity-50"
                    style={{ 
                      backgroundColor: theme.ui.button.secondary.background,
                      color: theme.ui.button.secondary.text,
                      fontFamily: 'var(--font-silkscreen)'
                    }}
                  >
                    ←
                  </button>
                  
                  <button
                    onClick={togglePlayback}
                    className="px-2 py-1 rounded text-xs font-medium"
                    style={{ 
                      backgroundColor: theme.ui.button.primary.background,
                      color: theme.ui.button.primary.text,
                      fontFamily: 'var(--font-silkscreen)'
                    }}
                  >
                    {isPlaying ? '⏸' : '▶'}
                  </button>
                  
                  <button
                    onClick={() => step('next')}
                    disabled={currentMoveIndex === recording.moves.length - 1}
                    className="px-2 py-1 rounded text-xs font-medium disabled:opacity-50"
                    style={{ 
                      backgroundColor: theme.ui.button.secondary.background,
                      color: theme.ui.button.secondary.text,
                      fontFamily: 'var(--font-silkscreen)'
                    }}
                  >
                    →
                  </button>
                </div>
                
                <div 
                  className="text-xs"
                  style={{ 
                    color: theme.ui.text.secondary,
                    fontFamily: 'var(--font-silkscreen)'
                  }}
                >
                  {currentMoveIndex + 1}/{recording.moves.length}
                </div>
              </div>

              {recording.moves.length > 0 && (
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, recording.moves.length - 1)}
                  value={currentMoveIndex}
                  onChange={(e) => goToMove(parseInt(e.target.value))}
                  className="w-full mb-2"
                  style={{ accentColor: theme.ui.accent }}
                />
              )}

              <div className="flex items-center gap-2 text-xs">
                <span style={{ color: theme.ui.text.secondary }}>Speed:</span>
                <input
                  type="range"
                  min={100}
                  max={2000}
                  step={100}
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(parseInt(e.target.value))}
                  className="flex-1"
                  style={{ accentColor: theme.ui.accent }}
                />
                <span 
                  style={{ 
                    color: theme.ui.text.tertiary,
                    fontFamily: 'var(--font-silkscreen)'
                  }}
                >
                  {playbackSpeed}ms
                </span>
              </div>
            </div>

            {/* Compact Key Moments */}
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: theme.board.empty }}
            >
              <h3 
                className="font-light text-xs mb-1"
                style={{ 
                  color: theme.ui.text.primary,
                  fontFamily: 'var(--font-silkscreen)'
                }}
              >
                Key Moments
              </h3>
              <div className="space-y-1">
                {recording.moves
                  .map((move, index) => ({ move, index }))
                  .filter(({ move }) => 
                    move.scoreIncrease >= 128 || 
                    move.gridAfter.flat().some(v => v && v >= 512)
                  )
                  .slice(0, 3)
                  .map(({ move, index }) => (
                    <button
                      key={index}
                      onClick={() => goToMove(index)}
                      className="block w-full text-left p-1 rounded text-xs hover:opacity-70 transition-opacity"
                      style={{ 
                        backgroundColor: theme.ui.card.background,
                        color: theme.ui.text.secondary
                      }}
                    >
                      <span 
                        style={{ 
                          color: theme.ui.text.primary,
                          fontFamily: 'var(--font-silkscreen)'
                        }}
                      >
                        #{move.moveNumber}
                      </span>
                      {' '}+{move.scoreIncrease}
                      {move.gridAfter.flat().some(v => v && v >= 512) && ' 🏆'}
                    </button>
                  ))}
                {recording.moves.filter(move => 
                  move.scoreIncrease >= 128 || 
                  move.gridAfter.flat().some(v => v && v >= 512)
                ).length === 0 && (
                  <div 
                    className="text-xs text-center py-1"
                    style={{ color: theme.ui.text.tertiary }}
                  >
                    No key moments
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}