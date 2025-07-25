'use client';

import React, { useState, useEffect } from 'react';
import { theme } from '../theme/colors';
import { Direction } from '../agents/types';

interface CoachFeedback {
  humanMove: Direction;
  aiSuggestions: Record<string, {
    suggestion: Direction;
    confidence: number;
    reasoning: string;
    alternatives: any;
  }>;
  moveFeedback: string;
  consensus: {
    agreement: number; // 0-100% how many coaches agree
    bestAlternative?: {
      move: Direction;
      supporters: string[];
      reason: string;
    };
  };
}

interface CoachingPanelProps {
  lastAnalysis: CoachFeedback | null;
  coachingStrategies: string[];
  onStrategiesChange: (strategies: string[]) => void;
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
}

const strategyColors = {
  corner: '#4F46E5',    // Indigo
  smoothness: '#059669', // Emerald
  expectimax: '#DC2626', // Red
  snake: '#7C3AED',     // Violet
  greedy: '#EA580C'     // Orange
};

const strategyIcons = {
  corner: '🏠',
  smoothness: '🌊', 
  expectimax: '🧠',
  snake: '🐍',
  greedy: '🍯'
};

export function CoachingPanel({ 
  lastAnalysis, 
  coachingStrategies, 
  onStrategiesChange,
  isEnabled,
  onToggle 
}: CoachingPanelProps) {
  const [expandedStrategy, setExpandedStrategy] = useState<string | null>(null);
  
  const getConsensusFeedback = (analysis: CoachFeedback | null) => {
    if (!analysis) return null;
    
    const totalCoaches = Object.keys(analysis.aiSuggestions).length;
    const agreements = Object.values(analysis.aiSuggestions)
      .filter(ai => ai.suggestion === analysis.humanMove).length;
    const agreementPercent = Math.round((agreements / totalCoaches) * 100);
    
    return {
      agreementPercent,
      totalCoaches,
      agreements
    };
  };

  const consensus = getConsensusFeedback(lastAnalysis);

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden" 
         style={{ backgroundColor: theme.ui.card.background }}>
      
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: theme.ui.card.border }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🎯</div>
            <div>
              <h3 className="text-lg font-semibold" style={{ color: theme.ui.text.primary }}>
                AI Coaching
              </h3>
              <p className="text-xs" style={{ color: theme.ui.text.secondary }}>
                Real-time strategy feedback
              </p>
            </div>
          </div>
          
          <button
            onClick={() => onToggle(!isEnabled)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              isEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {isEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>
      </div>

      {!isEnabled && (
        <div className="p-6 text-center">
          <div className="text-4xl mb-2">😴</div>
          <p className="text-sm" style={{ color: theme.ui.text.secondary }}>
            Coaching is disabled. Click "Disabled" to enable real-time feedback.
          </p>
        </div>
      )}

      {isEnabled && (
        <>
          {/* Active Coaches */}
          <div className="p-4 border-b" style={{ borderColor: theme.ui.card.border }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium" style={{ color: theme.ui.text.primary }}>
                Active Coaches ({coachingStrategies.length})
              </span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {Object.entries(strategyIcons).map(([strategy, icon]) => (
                <button
                  key={strategy}
                  onClick={() => {
                    if (coachingStrategies.includes(strategy)) {
                      onStrategiesChange(coachingStrategies.filter(s => s !== strategy));
                    } else {
                      onStrategiesChange([...coachingStrategies, strategy]);
                    }
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    coachingStrategies.includes(strategy)
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  style={{
                    backgroundColor: coachingStrategies.includes(strategy) 
                      ? strategyColors[strategy as keyof typeof strategyColors]
                      : undefined
                  }}
                >
                  {icon} {strategy}
                </button>
              ))}
            </div>
          </div>

          {/* Current Move Feedback */}
          {lastAnalysis ? (
            <>
              {/* Overall Assessment */}
              <div className="p-4 border-b" style={{ borderColor: theme.ui.card.border }}>
                <div className="flex items-start gap-3">
                  <div className="text-2xl">
                    {consensus && consensus.agreementPercent >= 75 ? '🎯' : 
                     consensus && consensus.agreementPercent >= 50 ? '✅' : 
                     consensus && consensus.agreementPercent >= 25 ? '🤔' : '🚨'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold" style={{ color: theme.ui.text.primary }}>
                        Your Move: {lastAnalysis.humanMove.toUpperCase()}
                      </span>
                      {consensus && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          consensus.agreementPercent >= 75 ? 'bg-green-100 text-green-800' :
                          consensus.agreementPercent >= 50 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {consensus.agreementPercent}% agreement
                        </span>
                      )}
                    </div>
                    <p className="text-sm" style={{ color: theme.ui.text.secondary }}>
                      {lastAnalysis.moveFeedback}
                    </p>
                  </div>
                </div>
              </div>

              {/* Individual Coach Opinions */}
              <div className="p-4">
                <h4 className="text-sm font-medium mb-3" style={{ color: theme.ui.text.primary }}>
                  Coach Opinions
                </h4>
                
                <div className="space-y-2">
                  {Object.entries(lastAnalysis.aiSuggestions).map(([strategy, opinion]) => (
                    <div key={strategy} className="border rounded-lg p-3" 
                         style={{ borderColor: theme.ui.card.border }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span style={{ color: strategyColors[strategy as keyof typeof strategyColors] }}>
                            {strategyIcons[strategy as keyof typeof strategyIcons]}
                          </span>
                          <span className="text-sm font-medium capitalize" 
                                style={{ color: theme.ui.text.primary }}>
                            {strategy}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            opinion.suggestion === lastAnalysis.humanMove
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {opinion.suggestion === lastAnalysis.humanMove ? 'Agrees' : `Suggests ${opinion.suggestion.toUpperCase()}`}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 transition-all duration-300"
                              style={{ width: `${opinion.confidence}%` }}
                            />
                          </div>
                          <span className="text-xs" style={{ color: theme.ui.text.tertiary }}>
                            {Math.round(opinion.confidence)}%
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-xs" style={{ color: theme.ui.text.secondary }}>
                        {opinion.reasoning}
                      </p>
                      
                      {expandedStrategy === strategy && opinion.alternatives && (
                        <div className="mt-3 pt-2 border-t" style={{ borderColor: theme.ui.card.border }}>
                          <div className="text-xs" style={{ color: theme.ui.text.tertiary }}>
                            Alternative moves analysis...
                          </div>
                        </div>
                      )}
                      
                      <button
                        onClick={() => setExpandedStrategy(
                          expandedStrategy === strategy ? null : strategy
                        )}
                        className="text-xs mt-2 hover:underline"
                        style={{ color: theme.ui.accent }}
                      >
                        {expandedStrategy === strategy ? 'Show less' : 'Show analysis'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Waiting for First Move */
            <div className="p-6 text-center">
              <div className="text-4xl mb-3">🎮</div>
              <h4 className="text-sm font-medium mb-2" style={{ color: theme.ui.text.primary }}>
                Ready to Coach!
              </h4>
              <p className="text-xs" style={{ color: theme.ui.text.secondary }}>
                Make your first move and your AI coaches will provide instant feedback and suggestions.
              </p>
              
              <div className="mt-4 flex justify-center">
                <div className="flex gap-1">
                  {['↑', '↓', '←', '→'].map((arrow, i) => (
                    <div key={i} 
                         className="w-8 h-8 rounded border flex items-center justify-center text-sm"
                         style={{ 
                           borderColor: theme.ui.card.border,
                           color: theme.ui.text.tertiary 
                         }}>
                      {arrow}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}