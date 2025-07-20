'use client';

import React, { useState, useEffect } from 'react';
import { AlgorithmicAgent } from '../agents/algorithmicAgent';
import { Direction, GameState } from '../agents/types';
import { theme } from '../theme/colors';

interface AgentControlsProps {
  onMove: (direction: Direction) => void;
  getGameState: () => GameState;
}

const strategies = [
  { id: 'corner', name: 'Corner Master 🏰', description: 'Keeps big tiles in corner' },
  { id: 'snake', name: 'Snake Builder 🐍', description: 'Builds in zigzag pattern' },
  { id: 'greedy', name: 'Merge Monster 👾', description: 'Maximizes merges' },
];

export function AgentControls({ onMove, getGameState }: AgentControlsProps) {
  const [agent, setAgent] = useState<AlgorithmicAgent | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState('corner');
  const [speed, setSpeed] = useState(2);
  const [showExplanations, setShowExplanations] = useState(true);
  
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
    
    setAgent(newAgent);
    return newAgent;
  };
  
  const handlePlayPause = () => {
    if (!agent) {
      const newAgent = createAgent();
      newAgent.startPlaying(onMove, getGameState);
      setIsPlaying(true);
    } else if (isPlaying) {
      agent.stopPlaying();
      setIsPlaying(false);
    } else {
      agent.startPlaying(onMove, getGameState);
      setIsPlaying(true);
    }
  };
  
  const handleStrategyChange = (strategy: string) => {
    setSelectedStrategy(strategy);
    if (agent) {
      agent.destroy();
      const newAgent = new AlgorithmicAgent({
        strategy: strategy,
        speed: speed,
        explainMoves: showExplanations,
      });
      setAgent(newAgent);
      
      if (isPlaying) {
        newAgent.startPlaying(onMove, getGameState);
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
      <h3 className="text-lg font-semibold mb-3" style={{ color: theme.ui.text.primary }}>
        Agent Controls
      </h3>
      
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
        {isPlaying ? '⏸ Pause Agent' : '▶️ Start Agent'}
      </button>
      
      {/* Status */}
      {agent && (
        <div className="mt-3 text-center">
          <p className="text-sm" style={{ color: theme.ui.text.secondary }}>
            {isPlaying ? `${agent.name} is playing...` : `${agent.name} is ready`}
          </p>
        </div>
      )}
    </div>
  );
}