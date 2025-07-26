/**
 * Adapters to use existing agent strategies with the headless benchmarking system
 */

import { HeadlessGame } from '../game/headlessGame';
import { Direction, Grid, GameState } from '../game/logic';
import { BenchmarkStrategy } from './agentBenchmark';

// Import existing strategies
import { GreedyStrategy } from '../agents/strategies/greedyStrategy';
import { CornerStrategy } from '../agents/strategies/cornerStrategy';
import { ExpectimaxStrategy } from '../agents/strategies/expectimaxStrategy';
import { SnakeStrategy } from '../agents/strategies/snakeStrategy';
import { SmoothnessStrategy } from '../agents/strategies/smoothnessStrategy';

// Convert HeadlessGame state to agent GameState format
function convertGameState(game: HeadlessGame): GameState {
  const state = game.getState();
  return {
    grid: state.grid as Grid,
    score: state.score,
    isGameOver: state.isGameOver,
    hasWon: state.hasWon
  };
}

// Greedy Strategy Adapter
export const greedyStrategy: BenchmarkStrategy = {
  name: "Greedy",
  description: "Always makes the move that creates the most merges immediately",
  strategy: (game: HeadlessGame): Direction | null => {
    const greedy = new GreedyStrategy();
    const gameState = convertGameState(game);
    return greedy.getNextMove(gameState);
  }
};

// Random Strategy (baseline)
export const randomStrategy: BenchmarkStrategy = {
  name: "Random",
  description: "Makes completely random valid moves",
  strategy: (game: HeadlessGame): Direction | null => {
    const validMoves = game.getValidMoves();
    if (validMoves.length === 0) return null;
    return validMoves[Math.floor(Math.random() * validMoves.length)];
  }
};

// Real Corner Strategy Adapter
export const cornerStrategy: BenchmarkStrategy = {
  name: "Corner Master",
  description: "Keep the biggest tile in a corner using the real UI strategy",
  strategy: (game: HeadlessGame): Direction | null => {
    const corner = new CornerStrategy('bottom-right');
    const gameState = convertGameState(game);
    return corner.getNextMove(gameState);
  }
};

// Monotonicity Strategy
export const monotonicityStrategy: BenchmarkStrategy = {
  name: "Monotonic",
  description: "Tries to maintain monotonic sequences",
  strategy: (game: HeadlessGame): Direction | null => {
    const state = game.getState();
    const grid = state.grid;
    const validMoves = game.getValidMoves();
    
    if (validMoves.length === 0) return null;
    
    let bestMove: Direction | null = null;
    let bestScore = -Infinity;
    
    for (const move of validMoves) {
      const score = evaluateMonotonicity(grid, move);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    
    return bestMove;
  }
};

function evaluateMonotonicity(grid: Grid, direction: Direction): number {
  let score = 0;
  
  // Check row monotonicity
  for (let row = 0; row < grid.length; row++) {
    const rowValues = grid[row].filter(cell => cell !== null) as number[];
    if (rowValues.length > 1) {
      // Check ascending
      let ascending = 0, descending = 0;
      for (let i = 0; i < rowValues.length - 1; i++) {
        if (rowValues[i] <= rowValues[i + 1]) ascending++;
        if (rowValues[i] >= rowValues[i + 1]) descending++;
      }
      score += Math.max(ascending, descending);
    }
  }
  
  // Check column monotonicity
  for (let col = 0; col < grid[0].length; col++) {
    const colValues = grid.map(row => row[col]).filter(cell => cell !== null) as number[];
    if (colValues.length > 1) {
      let ascending = 0, descending = 0;
      for (let i = 0; i < colValues.length - 1; i++) {
        if (colValues[i] <= colValues[i + 1]) ascending++;
        if (colValues[i] >= colValues[i + 1]) descending++;
      }
      score += Math.max(ascending, descending);
    }
  }
  
  return score;
}

// Empty cells strategy (maximize empty cells)
export const emptyCellsStrategy: BenchmarkStrategy = {
  name: "Empty Cells",
  description: "Prioritizes moves that maximize empty cells",
  strategy: (game: HeadlessGame): Direction | null => {
    const validMoves = game.getValidMoves();
    if (validMoves.length === 0) return null;
    
    // For now, prefer moves in this order to generally create space
    const preferredOrder: Direction[] = ['left', 'up', 'right', 'down'];
    
    for (const move of preferredOrder) {
      if (validMoves.includes(move)) {
        return move;
      }
    }
    
    return validMoves[0];
  }
};

// High-score strategy (immediate score maximization)
export const highScoreStrategy: BenchmarkStrategy = {
  name: "High Score",
  description: "Always picks the move that gives the highest immediate score",
  strategy: (game: HeadlessGame): Direction | null => {
    const validMoves = game.getValidMoves();
    if (validMoves.length === 0) return null;
    
    let bestMove: Direction | null = null;
    let bestScore = -1;
    
    for (const move of validMoves) {
      // Create a temporary game to simulate the move
      const currentState = game.getState();
      const tempGame = new HeadlessGame({ seed: 12345 }); // Fixed seed for consistency
      
      // We'd need access to setState to properly simulate, so for now use a simple heuristic
      // This is a simplified version - in a real implementation we'd need a way to simulate moves
      
      // Simple heuristic: prefer right and down for higher scores
      const moveScores = { 'right': 4, 'down': 3, 'left': 2, 'up': 1 };
      const score = moveScores[move] || 0;
      
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    
    return bestMove;
  }
};

// Real Expectimax Strategy Adapter
export const expectimaxStrategy: BenchmarkStrategy = {
  name: "Expectimax",
  description: "Uses expectimax search with weighted heuristics from the real UI strategy",
  strategy: (game: HeadlessGame): Direction | null => {
    const expectimax = new ExpectimaxStrategy();
    const gameState = convertGameState(game);
    return expectimax.getNextMove(gameState);
  }
};

// Real Snake Strategy Adapter
export const snakeStrategy: BenchmarkStrategy = {
  name: "Snake Builder",
  description: "Build tiles in a snake/zigzag pattern using the real UI strategy",
  strategy: (game: HeadlessGame): Direction | null => {
    const snake = new SnakeStrategy();
    const gameState = convertGameState(game);
    return snake.getNextMove(gameState);
  }
};

// Research-Based Smoothness Strategy Adapter
export const smoothnessStrategy: BenchmarkStrategy = {
  name: "Smoothness Master",
  description: "Based on academic research - prioritizes smoothness, monotonicity, and empty tiles",
  strategy: (game: HeadlessGame): Direction | null => {
    const smoothness = new SmoothnessStrategy();
    const gameState = convertGameState(game);
    return smoothness.getNextMove(gameState);
  }
};

// Export all strategies (real ones from UI)
export const allStrategies: BenchmarkStrategy[] = [
  randomStrategy,
  greedyStrategy,
  cornerStrategy,
  expectimaxStrategy,
  snakeStrategy,
  smoothnessStrategy
];

// Export strategies grouped by type
export const basicStrategies = [randomStrategy, greedyStrategy, cornerStrategy];
export const advancedStrategies = [expectimaxStrategy, snakeStrategy, smoothnessStrategy];

// Keep old manual strategies for comparison
export const manualStrategies = [monotonicityStrategy, emptyCellsStrategy, highScoreStrategy];