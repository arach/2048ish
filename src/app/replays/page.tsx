'use client';

import React, { useState, useEffect } from 'react';
import { ReplayGallery } from '../../components/ReplayGallery';
import { GameRecording } from '../../game/headlessGame';
import { generateRealisticRecordings } from '../../utils/generateRealisticRecordings';
import { theme } from '../../theme/colors';
import { AgentBenchmark } from '../../test/agentBenchmark';
import { allStrategies } from '../../test/strategyAdapters';


export default function ReplaysPage() {
  const [recordings, setRecordings] = useState<GameRecording[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<{
    completed: number;
    total: number;
    currentStrategy: string;
  } | null>(null);

  useEffect(() => {
    const loadRecordings = async () => {
      try {
        // Try to load real recorded games first
        const response = await fetch('/gameRecordings.json');
        if (response.ok) {
          const realRecordings = await response.json();
          console.log(`✅ Loaded ${realRecordings.length} real game recordings`);
          setRecordings(realRecordings);
        } else {
          // Fallback to localStorage
          const savedRecordings = localStorage.getItem('gameRecordings');
          if (savedRecordings) {
            const parsed = JSON.parse(savedRecordings);
            setRecordings(parsed);
          } else {
            // Use realistic sample data for demonstration
            const sampleRecordings = generateRealisticRecordings();
            setRecordings(sampleRecordings);
          }
        }
      } catch (error) {
        console.error('Failed to load recordings:', error);
        // Fallback to realistic sample data
        setRecordings(generateRealisticRecordings());
      } finally {
        setIsLoading(false);
      }
    };

    loadRecordings();
  }, []);

  const generateNewReplays = async () => {
    setIsGenerating(true);
    setGenerationProgress(null);
    
    try {
      const benchmark = new AgentBenchmark();
      benchmark.addStrategies(allStrategies);
      
      const newRecordings: GameRecording[] = [];
      
      // Run a smaller benchmark per strategy to get good recordings quickly
      const runsPerStrategy = 5; // Keep it manageable for UI
      
      for (const strategy of allStrategies) {
        setGenerationProgress({
          completed: 0,
          total: runsPerStrategy,
          currentStrategy: strategy.name
        });
        
        const strategyBenchmark = new AgentBenchmark();
        strategyBenchmark.addStrategy(strategy);
        
        const results = await strategyBenchmark.runBenchmark({
          runs: runsPerStrategy,
          useRandomSeeds: true,
          recordGames: true,
          progressCallback: (completed, total, strategyName) => {
            setGenerationProgress({
              completed,
              total,
              currentStrategy: strategyName
            });
          }
        });
        
        // Extract recordings from results
        for (const strategyStats of results.strategies) {
          for (const result of strategyStats.results) {
            if (result.recording) {
              newRecordings.push(result.recording);
            }
          }
        }
      }
      
      // Combine with existing recordings
      const allRecordings = [...recordings, ...newRecordings];
      setRecordings(allRecordings);
      
      // Save to localStorage
      localStorage.setItem('gameRecordings', JSON.stringify(allRecordings));
      
      console.log(`✅ Generated ${newRecordings.length} new game recordings`);
      
    } catch (error) {
      console.error('Failed to generate recordings:', error);
    } finally {
      setIsGenerating(false);
      setGenerationProgress(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div>Loading game replays...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        body {
          overflow: auto !important;
          position: static !important;
          height: auto !important;
        }
      `}</style>
      <div 
        className="min-h-screen"
        style={{ 
          background: `linear-gradient(to bottom right, ${theme.background.gradient.from}, ${theme.background.gradient.to})` 
        }}
      >
        <div className="container mx-auto px-4 py-8 pb-16">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 
            className="text-6xl mb-4"
            style={{ 
              fontFamily: 'var(--font-silkscreen)',
              color: theme.ui.text.primary,
              letterSpacing: '0.05em'
            }}
          >
            Game Replays
          </h1>
          <p 
            className="text-xl max-w-3xl mx-auto leading-relaxed"
            style={{ color: theme.ui.text.secondary }}
          >
            Analyze and replay games from benchmark runs to understand strategy performance, 
            critical decisions, and identify improvement opportunities. Watch how different 
            strategies approach the game and learn from their successes and failures.
          </p>
        </div>

        {/* Stats Overview */}
        {recordings.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div 
              className="p-6 rounded-xl shadow-lg transform hover:-translate-y-1 transition-all duration-200"
              style={{ 
                backgroundColor: theme.ui.card.background,
                border: `2px solid ${theme.board.grid}`
              }}
            >
              <div 
                className="text-3xl font-normal mb-2"
                style={{ 
                  fontFamily: 'var(--font-silkscreen)',
                  color: theme.ui.accent
                }}
              >
                {recordings.length}
              </div>
              <div style={{ color: theme.ui.text.secondary }}>Total Games</div>
            </div>
            
            <div 
              className="p-6 rounded-xl shadow-lg transform hover:-translate-y-1 transition-all duration-200"
              style={{ 
                backgroundColor: theme.ui.card.background,
                border: `2px solid ${theme.board.grid}`
              }}
            >
              <div 
                className="text-3xl font-normal mb-2"
                style={{ 
                  fontFamily: 'var(--font-silkscreen)',
                  color: theme.tiles[512].background
                }}
              >
                {Math.max(...recordings.map(r => r.result.score)).toLocaleString()}
              </div>
              <div style={{ color: theme.ui.text.secondary }}>Highest Score</div>
            </div>
            
            <div 
              className="p-6 rounded-xl shadow-lg transform hover:-translate-y-1 transition-all duration-200"
              style={{ 
                backgroundColor: theme.ui.card.background,
                border: `2px solid ${theme.board.grid}`
              }}
            >
              <div 
                className="text-3xl font-normal mb-2"
                style={{ 
                  fontFamily: 'var(--font-silkscreen)',
                  color: theme.tiles[1024].background
                }}
              >
                {Math.max(...recordings.map(r => r.result.maxTile))}
              </div>
              <div style={{ color: theme.ui.text.secondary }}>Highest Tile</div>
            </div>
            
            <div 
              className="p-6 rounded-xl shadow-lg transform hover:-translate-y-1 transition-all duration-200"
              style={{ 
                backgroundColor: theme.ui.card.background,
                border: `2px solid ${theme.board.grid}`
              }}
            >
              <div 
                className="text-3xl font-normal mb-2"
                style={{ 
                  fontFamily: 'var(--font-silkscreen)',
                  color: theme.ui.text.primary
                }}
              >
                {new Set(recordings.map(r => r.strategy)).size}
              </div>
              <div style={{ color: theme.ui.text.secondary }}>Strategies</div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div 
          className="rounded-xl p-6 mb-8"
          style={{ 
            backgroundColor: theme.ui.card.background,
            border: `2px solid ${theme.board.empty}`,
            boxShadow: `0 4px 6px ${theme.ui.card.shadow}`
          }}
        >
          <h3 
            className="font-bold mb-4 text-lg"
            style={{ 
              color: theme.ui.text.primary,
              fontFamily: 'var(--font-silkscreen)'
            }}
          >
            How to Use
          </h3>
          <ul className="space-y-2" style={{ color: theme.ui.text.secondary }}>
            <li className="flex items-center">
              <span className="mr-3 text-lg">🎮</span>
              Click on any game card to open the replay viewer
            </li>
            <li className="flex items-center">
              <span className="mr-3 text-lg">⏯️</span>
              Use playback controls to step through moves or watch automatically
            </li>
            <li className="flex items-center">
              <span className="mr-3 text-lg">🔍</span>
              Filter by strategy and sort by different metrics
            </li>
            <li className="flex items-center">
              <span className="mr-3 text-lg">🏆</span>
              Look for 🥇 🥈 badges indicating exceptional performance
            </li>
            <li className="flex items-center">
              <span className="mr-3 text-lg">⚡</span>
              Check "Key Moments" to jump to important game events
            </li>
          </ul>
        </div>

        {/* Replay Gallery */}
        <div 
          className="rounded-xl p-6"
          style={{ 
            backgroundColor: theme.ui.card.background,
            border: `2px solid ${theme.board.grid}`,
            boxShadow: `0 8px 16px ${theme.ui.card.shadow}`
          }}
        >
          <ReplayGallery recordings={recordings} />
        </div>

        {/* Call to Action */}
        <div className="mt-8 text-center">
          <div 
            className="rounded-xl p-8 max-w-lg mx-auto"
            style={{ 
              backgroundColor: theme.ui.card.background,
              border: `2px solid ${theme.board.empty}`,
              boxShadow: `0 4px 6px ${theme.ui.card.shadow}`
            }}
          >
            <h3 
              className="text-xl font-bold mb-4"
              style={{ 
                color: theme.ui.text.primary,
                fontFamily: 'var(--font-silkscreen)'
              }}
            >
              Generate New Replays
            </h3>
            <p 
              className="mb-6 leading-relaxed"
              style={{ color: theme.ui.text.secondary }}
            >
              Run benchmarks with recording enabled to create new game replays for analysis.
            </p>
            <button 
              onClick={generateNewReplays}
              disabled={isGenerating}
              className="px-8 py-3 rounded-lg font-semibold transform hover:-translate-y-1 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:transform-none"
              style={{ 
                backgroundColor: isGenerating ? theme.ui.text.secondary : theme.ui.button.primary.background,
                color: theme.ui.button.primary.text,
                fontFamily: 'var(--font-silkscreen)'
              }}
              onMouseEnter={(e) => {
                if (!isGenerating) {
                  e.currentTarget.style.backgroundColor = theme.ui.button.primary.hover;
                }
              }}
              onMouseLeave={(e) => {
                if (!isGenerating) {
                  e.currentTarget.style.backgroundColor = theme.ui.button.primary.background;
                }
              }}
            >
              {isGenerating ? 'Generating...' : 'Generate New Replays'}
            </button>
            
            {generationProgress && (
              <div className="mt-4 text-center">
                <div 
                  className="text-sm mb-2"
                  style={{ color: theme.ui.text.secondary }}
                >
                  Running {generationProgress.currentStrategy}: {generationProgress.completed}/{generationProgress.total}
                </div>
                <div 
                  className="w-full bg-gray-200 rounded-full h-2"
                  style={{ backgroundColor: theme.board.empty }}
                >
                  <div 
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ 
                      backgroundColor: theme.ui.accent,
                      width: `${(generationProgress.completed / generationProgress.total) * 100}%`
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}