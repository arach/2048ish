# Move Recording for Explainability

This document explains how to use the move recording functionality to track and analyze game moves for explainability and analytics.

## Overview

The `GameController` now includes an `onMoveComplete` callback that fires after each move has been fully applied and all animations have completed. This provides a perfect place to record the board state for explainability, analytics, or debugging purposes.

## Basic Usage

```typescript
import { GameController } from './game/gameController';

const controller = new GameController({
  canvas: canvasElement,
  onMoveComplete: (boardState) => {
    console.log('Move completed:', {
      direction: boardState.lastDirection,
      score: boardState.score,
      moveCount: boardState.moveCount,
      maxTile: boardState.maxTile,
      emptyTiles: boardState.emptyTiles,
      possibleMerges: boardState.possibleMerges,
      grid: boardState.grid
    });
  }
});
```

## Callback Data Structure

The `onMoveComplete` callback receives a `boardState` object with the following properties:

```typescript
{
  grid: (number | null)[][];        // Current board state
  score: number;                    // Current score
  moveCount: number;                // Total moves made
  lastDirection?: Direction;         // Direction of the last move
  maxTile: number;                  // Highest tile value on board
  emptyTiles: number;               // Number of empty cells
  possibleMerges: number;           // Number of possible merges
}
```

## Use Cases

### 1. Move History Tracking

```typescript
const moveHistory: any[] = [];

const controller = new GameController({
  canvas,
  onMoveComplete: (boardState) => {
    moveHistory.push({
      ...boardState,
      timestamp: Date.now()
    });
  }
});
```

### 2. Analytics and Performance Monitoring

```typescript
const analytics = {
  totalMoves: 0,
  totalScore: 0,
  maxTileReached: 0
};

const controller = new GameController({
  canvas,
  onMoveComplete: (boardState) => {
    analytics.totalMoves++;
    analytics.totalScore = boardState.score;
    analytics.maxTileReached = Math.max(analytics.maxTileReached, boardState.maxTile);
    
    // Send to analytics service
    sendToAnalytics({
      event: 'move_completed',
      data: boardState
    });
  }
});
```

### 3. Game State Explainability

```typescript
const explanations: any[] = [];

const controller = new GameController({
  canvas,
  onMoveComplete: (boardState) => {
    const explanation = analyzeMove(boardState);
    explanations.push({
      moveNumber: boardState.moveCount,
      direction: boardState.lastDirection,
      reasoning: explanation.reasoning,
      boardState
    });
  }
});

function analyzeMove(boardState: any) {
  const { maxTile, emptyTiles, possibleMerges } = boardState;
  
  if (possibleMerges > 0) {
    return { reasoning: `Good move! ${possibleMerges} possible merges available.` };
  } else if (emptyTiles < 4) {
    return { reasoning: 'Board is getting crowded. Consider consolidating tiles.' };
  } else {
    return { reasoning: 'Standard move. Board has good space.' };
  }
}
```

### 4. Debug and Development

```typescript
const controller = new GameController({
  canvas,
  onMoveComplete: (boardState) => {
    // Log detailed state for debugging
    console.log('=== Move Debug Info ===');
    console.log(`Move ${boardState.moveCount}: ${boardState.lastDirection}`);
    console.log(`Score: ${boardState.score}`);
    console.log(`Max Tile: ${boardState.maxTile}`);
    console.log(`Empty Tiles: ${boardState.emptyTiles}`);
    console.log(`Possible Merges: ${boardState.possibleMerges}`);
    console.log('Board State:', boardState.grid);
    console.log('========================');
  }
});
```

## Timing

The callback fires at the perfect moment for recording:

1. **After all animations complete** - The board state is final
2. **After merges are applied** - All tile values are updated
3. **After new tiles spawn** - Complete board state is available
4. **Before the next move can be made** - No race conditions

## Examples

See `src/examples/moveRecordingExample.ts` for comprehensive examples including:

- Basic move recording
- Analytics tracking
- Game state explainability
- Performance monitoring
- Session export functionality

## Integration with Existing Code

The move recording is already integrated into the main game component (`src/components/Game2048.tsx`) with basic logging. You can extend this to add more sophisticated tracking as needed.

## Best Practices

1. **Keep callbacks lightweight** - Don't perform heavy computations in the callback
2. **Use async operations carefully** - The callback is synchronous, use `setTimeout` for async work
3. **Store data externally** - Don't rely on the callback for persistent storage
4. **Handle errors gracefully** - Wrap callback logic in try-catch blocks
5. **Consider performance** - The callback fires frequently, optimize accordingly

## Advanced Usage

For more advanced use cases, see the examples in `src/examples/moveRecordingExample.ts` which demonstrate:

- Session tracking and analysis
- Move efficiency calculations
- Direction preference analysis
- Performance benchmarking
- Export functionality for external analysis 