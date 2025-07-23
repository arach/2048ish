'use client';

import React, { useState, useEffect } from 'react';
import { AlgorithmicAgent } from '../agents/algorithmicAgent';
import { Direction, GameState } from '../agents/types';
import { theme } from '../theme/colors';

interface AgentControlsProps {
  onMove: (direction: Direction, stateBefore?: GameState, agent?: AlgorithmicAgent) => void;
  getGameState: () => GameState;
  onExplanation?: (explanation: string) => void;
  onPlayingStateChange?: (isPlaying: boolean) => void;
}

const strategies = [
  { id: 'corner', name: 'Corner Master', description: 'Keeps big tiles in corner' },
  { id: 'snake', name: 'Snake Builder', description: 'Builds in zigzag pattern' },
  { id: 'greedy', name: 'Merge Monster', description: 'Maximizes merges' },
  { id: 'expectimax', name: 'Expectimax', description: 'Uses expectimax search with weighted heuristics' },
];

export function AgentControls({ onMove, getGameState, onExplanation, onPlayingStateChange }: AgentControlsProps) {
  const [agent, setAgent] = useState<AlgorithmicAgent | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState('corner');
  const [speed, setSpeed] = useState(2);
  const [showExplanations, setShowExplanations] = useState(true);
  const [lastExplanation, setLastExplanation] = useState<string>('');
  
  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (agent) {
        agent.destroy();
      }
    };
  }, [agent]);
  
  const createAgent = () => {
    if (agent) {
      agent.destroy();
    }
    
    const newAgent = new AlgorithmicAgent({
      strategy: selectedStrategy,
      speed: speed,
      explainMoves: showExplanations,
    });
    
    newAgent.setOnExplanation((explanation) => {
      setLastExplanation(explanation);
      if (onExplanation) {
        onExplanation(explanation);
      }
    });
    
    setAgent(newAgent);
    return newAgent;
  };
  
  const handlePlayPause = () => {
    if (!agent) {
      const newAgent = createAgent();
      newAgent.startPlaying((direction, stateBefore) => {
        onMove(direction, stateBefore, newAgent);
      }, getGameState);
      setIsPlaying(true);
      if (onPlayingStateChange) onPlayingStateChange(true);
    } else if (isPlaying) {
      agent.stopPlaying();
      setIsPlaying(false);
      setLastExplanation(''); // Clear explanation when stopping
      if (onExplanation) {
        onExplanation('');
      }
      if (onPlayingStateChange) onPlayingStateChange(false);
    } else {
      agent.startPlaying((direction, stateBefore) => {
        onMove(direction, stateBefore, agent);
      }, getGameState);
      setIsPlaying(true);
      if (onPlayingStateChange) onPlayingStateChange(true);
    }
  };
  
  const handleStrategyChange = (strategy: string) => {
    setSelectedStrategy(strategy);
    setLastExplanation(''); // Clear explanation when changing strategy
    if (onExplanation) {
      onExplanation('');
    }
    if (agent) {
      agent.destroy();
      const newAgent = new AlgorithmicAgent({
        strategy: strategy,
        speed: speed,
        explainMoves: showExplanations,
      });
      
      newAgent.setOnExplanation((explanation) => {
        setLastExplanation(explanation);
        if (onExplanation) {
          onExplanation(explanation);
        }
      });
      
      setAgent(newAgent);
      
      if (isPlaying) {
        newAgent.startPlaying((direction, stateBefore) => {
          onMove(direction, stateBefore, newAgent);
        }, getGameState);
      }
    }
  };
  
  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    if (agent) {
      agent.setSpeed(newSpeed);
    }
  };
  
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm" style={{ backgroundColor: theme.ui.card.background }}>
      <h3 className="text-lg font-semibold mb-2" style={{ color: theme.ui.text.primary }}>
        🤖 AI Agent Controls
      </h3>
      <p className="text-xs mb-3" style={{ color: theme.ui.text.secondary }}>
        Let an AI play for you! Choose a strategy and watch it work.
      </p>
      
      {/* Strategy Selection */}
      <div className="mb-4">
        <label className="text-sm font-medium mb-2 block" style={{ color: theme.ui.text.secondary }}>
          Strategy
        </label>
        <select
          value={selectedStrategy}
          onChange={(e) => handleStrategyChange(e.target.value)}
          className="w-full px-3 py-2 rounded-md border"
          style={{ 
            backgroundColor: theme.ui.input.background,
            borderColor: theme.ui.input.border,
            color: theme.ui.text.primary 
          }}
        >
          {strategies.map(strategy => (
            <option key={strategy.id} value={strategy.id}>
              {strategy.name}
            </option>
          ))}
        </select>
        <p className="text-xs mt-1" style={{ color: theme.ui.text.tertiary }}>
          {strategies.find(s => s.id === selectedStrategy)?.description}
        </p>
      </div>
      
      {/* Speed Control */}
      <div className="mb-4">
        <label className="text-sm font-medium mb-2 block" style={{ color: theme.ui.text.secondary }}>
          Speed: {speed} moves/second
        </label>
        <input
          type="range"
          min="0.5"
          max="10"
          step="0.5"
          value={speed}
          onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
          className="w-full"
          style={{ accentColor: theme.ui.accent }}
        />
      </div>
      
      {/* Options */}
      <div className="mb-4">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showExplanations}
            onChange={(e) => {
              setShowExplanations(e.target.checked);
              if (agent) {
                agent.setExplainMoves(e.target.checked);
              }
            }}
            className="rounded"
            style={{ accentColor: theme.ui.accent }}
          />
          <span className="text-sm" style={{ color: theme.ui.text.secondary }}>
            Show move explanations
          </span>
        </label>
      </div>
      
      {/* Play/Pause Button */}
      <button
        onClick={handlePlayPause}
        className="w-full py-2 px-4 rounded-md font-medium transition-colors"
        style={{
          backgroundColor: isPlaying ? theme.ui.danger : theme.ui.accent,
          color: theme.ui.text.button,
        }}
      >
        {isPlaying ? 'Pause Agent' : 'Start Agent'}
      </button>
      
      {/* Status */}
      {agent && (
        <div className="mt-3 text-center">
          <p className="text-sm" style={{ color: theme.ui.text.secondary }}>
            {isPlaying ? `${agent.name} is playing...` : `${agent.name} is ready`}
          </p>
        </div>
      )}
      
      {/* Explanation Display */}
      {showExplanations && (
        <div className="mt-4 p-3 rounded-lg animate-fade-in" style={{ 
          backgroundColor: '#FFF5EB',
          border: '2px solid #F59563',
          minHeight: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {lastExplanation ? (
            <p className="text-sm font-medium text-center" style={{ color: theme.ui.text.primary }}>
              {lastExplanation}
            </p>
          ) : (
            <p className="text-sm text-center italic" style={{ color: theme.ui.text.secondary }}>
              Agent explanations will appear here when playing...
            </p>
          )}
        </div>
      )}
    </div>
  );
}