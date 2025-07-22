// Example: How to use the move recording functionality for explainability

import { GameController } from '../game/gameController';

// Example 1: Basic move recording
export function setupBasicMoveRecording(canvas: HTMLCanvasElement) {
  const moveHistory: Array<{
    direction: string;
    score: number;
    moveCount: number;
    maxTile: number;
    emptyTiles: number;
    possibleMerges: number;
    grid: (number | null)[][];
    timestamp: number;
  }> = [];

  const controller = new GameController({
    canvas,
    onMoveComplete: (boardState) => {
      // Record each move with timestamp
      moveHistory.push({
        direction: boardState.lastDirection || 'unknown',
        score: boardState.score,
        moveCount: boardState.moveCount,
        maxTile: boardState.maxTile,
        emptyTiles: boardState.emptyTiles,
        possibleMerges: boardState.possibleMerges,
        grid: boardState.grid,
        timestamp: Date.now()
      });

      console.log(`Move ${boardState.moveCount}: ${boardState.lastDirection}`);
      console.log(`Score: ${boardState.score}, Max Tile: ${boardState.maxTile}`);
      console.log(`Empty tiles: ${boardState.emptyTiles}, Possible merges: ${boardState.possibleMerges}`);
    }
  });

  return { controller, moveHistory };
}

// Example 2: Analytics tracking
export function setupAnalyticsTracking(canvas: HTMLCanvasElement) {
  const analytics = {
    totalMoves: 0,
    totalScore: 0,
    maxTileReached: 0,
    averageScorePerMove: 0,
    moveEfficiency: 0, // score gained per move
    gameSession: {
      startTime: Date.now(),
      moves: [] as any[]
    }
  };

  const controller = new GameController({
    canvas,
    onMoveComplete: (boardState) => {
      analytics.totalMoves++;
      analytics.totalScore = boardState.score;
      analytics.maxTileReached = Math.max(analytics.maxTileReached, boardState.maxTile);
      analytics.averageScorePerMove = analytics.totalScore / analytics.totalMoves;
      analytics.moveEfficiency = analytics.totalScore / analytics.totalMoves;

      // Track each move for session analysis
      analytics.gameSession.moves.push({
        moveNumber: boardState.moveCount,
        direction: boardState.lastDirection,
        score: boardState.score,
        maxTile: boardState.maxTile,
        emptyTiles: boardState.emptyTiles,
        possibleMerges: boardState.possibleMerges,
        timestamp: Date.now()
      });

      // Send to analytics service (example)
      sendToAnalytics({
        event: 'move_completed',
        data: boardState,
        session: analytics.gameSession
      });
    }
  });

  return { controller, analytics };
}

// Example 3: Game state explainability
export function setupExplainabilityTracking(canvas: HTMLCanvasElement) {
  const explanations: Array<{
    moveNumber: number;
    direction: string;
    reasoning: string;
    boardState: any;
    alternatives: string[];
  }> = [];

  const controller = new GameController({
    canvas,
    onMoveComplete: (boardState) => {
      // Analyze the move and provide explanations
      const explanation = analyzeMove(boardState);
      
      explanations.push({
        moveNumber: boardState.moveCount,
        direction: boardState.lastDirection || 'unknown',
        reasoning: explanation.reasoning,
        boardState,
        alternatives: explanation.alternatives
      });

      console.log(`Move ${boardState.moveCount} explanation:`, explanation.reasoning);
    }
  });

  return { controller, explanations };
}

// Example 4: Performance monitoring
export function setupPerformanceMonitoring(canvas: HTMLCanvasElement) {
  const performance = {
    moveTimes: [] as number[],
    averageMoveTime: 0,
    slowestMove: 0,
    fastestMove: Infinity
  };

  let lastMoveTime = Date.now();

  const controller = new GameController({
    canvas,
    onMoveComplete: (boardState) => {
      const moveTime = Date.now() - lastMoveTime;
      performance.moveTimes.push(moveTime);
      performance.averageMoveTime = performance.moveTimes.reduce((a, b) => a + b, 0) / performance.moveTimes.length;
      performance.slowestMove = Math.max(performance.slowestMove, moveTime);
      performance.fastestMove = Math.min(performance.fastestMove, moveTime);

      lastMoveTime = Date.now();

      // Log performance metrics
      console.log(`Move ${boardState.moveCount} took ${moveTime}ms`);
      console.log(`Average move time: ${performance.averageMoveTime.toFixed(2)}ms`);
    }
  });

  return { controller, performance };
}

// Helper functions
function sendToAnalytics(data: any) {
  // Example analytics service call
  console.log('Sending to analytics:', data);
  // fetch('/api/analytics', { method: 'POST', body: JSON.stringify(data) });
}

function analyzeMove(boardState: any) {
  const { grid, maxTile, emptyTiles, possibleMerges, lastDirection } = boardState;
  
  let reasoning = '';
  const alternatives: string[] = [];

  // Simple analysis logic
  if (possibleMerges > 0) {
    reasoning = `Good move! ${possibleMerges} possible merges available.`;
  } else if (emptyTiles < 4) {
    reasoning = 'Board is getting crowded. Consider consolidating tiles.';
  } else {
    reasoning = 'Standard move. Board has good space.';
  }

  // Suggest alternatives based on current state
  if (maxTile >= 1024) {
    alternatives.push('Focus on keeping high-value tiles in corners');
  }
  if (emptyTiles < 6) {
    alternatives.push('Try to create more space by merging smaller tiles');
  }

  return { reasoning, alternatives };
}

// Example 5: Export game session for analysis
export function exportGameSession(moveHistory: any[]) {
  const session = {
    startTime: moveHistory[0]?.timestamp || Date.now(),
    endTime: Date.now(),
    totalMoves: moveHistory.length,
    finalScore: moveHistory[moveHistory.length - 1]?.score || 0,
    maxTileReached: Math.max(...moveHistory.map(m => m.maxTile)),
    moves: moveHistory,
    summary: {
      averageScorePerMove: moveHistory[moveHistory.length - 1]?.score / moveHistory.length || 0,
      mostUsedDirection: getMostUsedDirection(moveHistory),
      efficiency: calculateEfficiency(moveHistory)
    }
  };

  return session;
}

function getMostUsedDirection(moves: any[]) {
  const directionCounts: Record<string, number> = {};
  moves.forEach(move => {
    directionCounts[move.direction] = (directionCounts[move.direction] || 0) + 1;
  });
  
  return Object.entries(directionCounts)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'unknown';
}

function calculateEfficiency(moves: any[]) {
  if (moves.length < 2) return 0;
  
  const totalScoreGained = moves[moves.length - 1].score - moves[0].score;
  return totalScoreGained / moves.length;
} 