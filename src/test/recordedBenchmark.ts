/**
 * Enhanced benchmark that records game replays for analysis
 */

import { HeadlessGame, GameRecording } from '../game/headlessGame';
import { BenchmarkStrategy, BenchmarkConfig } from './agentBenchmark';
import { Direction } from '../game/logic';

export interface RecordedBenchmarkConfig extends BenchmarkConfig {
  recordGames: true;
  maxRecordings?: number; // Limit recordings to prevent memory issues
}

export interface RecordedBenchmarkResult {
  strategy: string;
  totalGames: number;
  avgScore: number;
  maxTile: number;
  bestRecordings: GameRecording[];
  worstRecordings: GameRecording[];
  interestingRecordings: GameRecording[]; // Games with notable events
}

export async function runRecordedBenchmark(
  strategies: BenchmarkStrategy[],
  config: RecordedBenchmarkConfig
): Promise<RecordedBenchmarkResult[]> {
  const results: RecordedBenchmarkResult[] = [];

  for (const strategy of strategies) {
    console.log(`🎥 Recording games for: ${strategy.name}`);
    
    const recordings: GameRecording[] = [];
    const scores: number[] = [];
    let maxTile = 0;

    for (let i = 0; i < config.runs; i++) {
      const seed = config.useRandomSeeds ? Math.floor(Math.random() * 1000000) : (config.seedStart || 0) + i;
      const game = new HeadlessGame({ seed });
      
      // Start recording
      game.startRecording(strategy.name);
      
      let moves = 0;
      const maxMoves = config.maxMoves || 10000;
      
      while (!game.getState().isGameOver && !game.getState().hasWon && moves < maxMoves) {
        const gameState = game.getState();
        const move = strategy.strategy(game);
        
        if (!move) break;
        
        // Get explanation if available
        let reasoning: string | undefined;
        let evaluation: any;
        
        if (strategy.getExplanation) {
          reasoning = strategy.getExplanation(move, game);
        }
        
        if (strategy.getEvaluation) {
          evaluation = strategy.getEvaluation(game);
        }
        
        const success = game.makeMove(move, reasoning, evaluation);
        if (!success) break;
        
        moves++;
      }
      
      // Stop recording and collect result
      const recording = game.stopRecording();
      if (recording) {
        recordings.push(recording);
        scores.push(recording.result.score);
        maxTile = Math.max(maxTile, recording.result.maxTile);
      }
      
      // Progress update
      if (config.progressCallback && (i + 1) % 5 === 0) {
        config.progressCallback(i + 1, config.runs, strategy.name);
      }
    }
    
    // Sort recordings by score for best/worst analysis
    const sortedByScore = [...recordings].sort((a, b) => b.result.score - a.result.score);
    
    // Find interesting games (high tiles, unusual events)
    const interestingGames = recordings.filter(recording => 
      recording.result.maxTile >= 512 || // Reached high tiles
      recording.moves.some(move => move.scoreIncrease >= 256) || // Big merges
      recording.result.score >= Math.max(...scores) * 0.8 // Top 20% by score
    ).slice(0, 5);
    
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    results.push({
      strategy: strategy.name,
      totalGames: recordings.length,
      avgScore,
      maxTile,
      bestRecordings: sortedByScore.slice(0, 3), // Top 3 games
      worstRecordings: sortedByScore.slice(-2), // Bottom 2 games  
      interestingRecordings: interestingGames
    });
    
    console.log(`✅ Recorded ${recordings.length} games for ${strategy.name}`);
  }
  
  return results;
}

// Utility function to save recordings to localStorage
export function saveRecordingsToStorage(results: RecordedBenchmarkResult[]): void {
  try {
    const allRecordings = results.flatMap(result => [
      ...result.bestRecordings,
      ...result.interestingRecordings
    ]);
    
    // Limit storage to prevent browser issues
    const limitedRecordings = allRecordings.slice(0, 50);
    
    localStorage.setItem('gameRecordings', JSON.stringify(limitedRecordings));
    console.log(`💾 Saved ${limitedRecordings.length} recordings to storage`);
  } catch (error) {
    console.error('Failed to save recordings:', error);
  }
}

// Utility function to load recordings from storage
export function loadRecordingsFromStorage(): GameRecording[] {
  try {
    const saved = localStorage.getItem('gameRecordings');
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Failed to load recordings:', error);
    return [];
  }
}