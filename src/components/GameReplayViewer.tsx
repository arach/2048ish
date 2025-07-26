'use client';

import React, { useState, useEffect } from 'react';
import { GameRecording, GameMove } from '../game/headlessGame';
import { Grid } from '../game/logic';

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

  const getTileColorClass = (value: number | null): string => {
    if (value === null) return 'bg-gray-200';
    
    const colorMap: Record<number, string> = {
      2: 'bg-gray-100',
      4: 'bg-gray-200',
      8: 'bg-orange-200',
      16: 'bg-orange-300',
      32: 'bg-orange-400',
      64: 'bg-orange-500',
      128: 'bg-yellow-300',
      256: 'bg-yellow-400',
      512: 'bg-yellow-500',
      1024: 'bg-red-400',
      2048: 'bg-red-500'
    };
    
    return colorMap[value] || 'bg-purple-500';
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Game Replay: {recording.strategy}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Game Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
          <div>
            <div className="font-semibold">Final Score</div>
            <div className="text-lg">{recording.result.score.toLocaleString()}</div>
          </div>
          <div>
            <div className="font-semibold">Total Moves</div>
            <div className="text-lg">{recording.result.moves}</div>
          </div>
          <div>
            <div className="font-semibold">Max Tile</div>
            <div className="text-lg">{recording.result.maxTile}</div>
          </div>
          <div>
            <div className="font-semibold">Duration</div>
            <div className="text-lg">{(recording.result.duration / 1000).toFixed(1)}s</div>
          </div>
        </div>

        {/* No moves available */}
        {recording.moves.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-500 mb-4">
              No move history available for this game.
            </div>
            <div className="text-sm text-gray-400">
              Showing final board state only.
            </div>
          </div>
        )}

        <div className="flex gap-6">
          {/* Game Board */}
          <div className="flex-shrink-0">
            <div className="grid grid-cols-4 gap-2 bg-gray-300 p-4 rounded-lg">
              {currentGrid.flat().map((value, index) => (
                <div
                  key={index}
                  className={`
                    w-16 h-16 flex items-center justify-center rounded font-bold text-gray-800
                    ${getTileColorClass(value)}
                  `}
                >
                  {formatTileValue(value)}
                </div>
              ))}
            </div>

            {/* Move Info */}
            {currentMove && (
              <div className="mt-4 p-3 bg-gray-100 rounded">
                <div className="font-semibold">
                  Move {currentMove.moveNumber}: {currentMove.direction.toUpperCase()}
                </div>
                <div>Score: +{currentMove.scoreIncrease} (Total: {currentMove.totalScore})</div>
                {currentMove.reasoning && (
                  <div className="text-sm text-gray-600 mt-1">
                    {currentMove.reasoning}
                  </div>
                )}
              </div>
            )}
            
            {/* Debug Info */}
            <div className="mt-4 p-2 bg-gray-50 rounded text-xs text-gray-500">
              Debug: Move {currentMoveIndex + 1}/{recording.moves.length}
              {currentMove && (
                <div>Current: {currentMove.direction} → Score: {currentMove.totalScore}</div>
              )}
            </div>
          </div>

          {/* Controls and Analysis */}
          <div className="flex-1 space-y-4">
            {/* Playback Controls */}
            <div className="bg-gray-100 p-4 rounded">
              <h3 className="font-semibold mb-3">Playback Controls</h3>
              
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => step('prev')}
                  disabled={currentMoveIndex === 0}
                  className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                >
                  ⮜ Prev
                </button>
                
                <button
                  onClick={togglePlayback}
                  className="px-4 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  {isPlaying ? '⏸ Pause' : '▶ Play'}
                </button>
                
                <button
                  onClick={() => step('next')}
                  disabled={currentMoveIndex === recording.moves.length - 1}
                  className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                >
                  Next ⮞
                </button>
              </div>

              {recording.moves.length > 0 && (
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1">
                    Move {currentMoveIndex + 1} of {recording.moves.length}
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, recording.moves.length - 1)}
                    value={currentMoveIndex}
                    onChange={(e) => goToMove(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">
                  Speed: {playbackSpeed}ms
                </label>
                <input
                  type="range"
                  min={100}
                  max={2000}
                  step={100}
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            {/* Move Analysis */}
            {currentMove && (
              <div className="bg-gray-100 p-4 rounded">
                <h3 className="font-semibold mb-3">Move Analysis</h3>
                <div className="space-y-2 text-sm">
                  <div><strong>Direction:</strong> {currentMove.direction.toUpperCase()}</div>
                  <div><strong>Score Gained:</strong> +{currentMove.scoreIncrease}</div>
                  <div><strong>Total Score:</strong> {currentMove.totalScore.toLocaleString()}</div>
                  {currentMove.reasoning && (
                    <div><strong>Reasoning:</strong> {currentMove.reasoning}</div>
                  )}
                  {currentMove.evaluation && (
                    <div>
                      <strong>Evaluation:</strong>
                      <pre className="text-xs bg-white p-2 rounded mt-1 overflow-x-auto">
                        {JSON.stringify(currentMove.evaluation, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Key Moments */}
            <div className="bg-gray-100 p-4 rounded">
              <h3 className="font-semibold mb-3">Key Moments</h3>
              <div className="space-y-1 text-sm">
                {recording.moves
                  .map((move, index) => ({ move, index }))
                  .filter(({ move }) => 
                    move.scoreIncrease >= 128 || // Big merges
                    move.gridAfter.flat().some(v => v && v >= 512) // High tiles
                  )
                  .slice(0, 5)
                  .map(({ move, index }) => (
                    <button
                      key={index}
                      onClick={() => goToMove(index)}
                      className="block w-full text-left p-2 hover:bg-white rounded"
                    >
                      Move {move.moveNumber}: +{move.scoreIncrease} points
                      {move.gridAfter.flat().some(v => v && v >= 512) && ' 🏆'}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}