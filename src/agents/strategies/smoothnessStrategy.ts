import { PlayStrategy, GameState, Direction } from '../types';

interface EvaluationResult {
  score: number;
  smoothness: number;
  monotonicity: number;
  emptyTiles: number;
  cornerBonus: number;
}

export class SmoothnessStrategy implements PlayStrategy {
  name = 'Smoothness Master';
  
  // Weights based on academic research - smoothness is primary
  private weights = {
    smoothness: 0.5,   // 50% - research shows this is most important
    monotonicity: 0.3, // 30% - helps with organization
    emptyTiles: 0.15,  // 15% - survival factor
    cornerBonus: 0.05  // 5% - high tiles in corners
  };

  getNextMove(gameState: GameState): Direction | null {
    const validMoves = this.getValidMoves(gameState);
    if (validMoves.length === 0) return null;

    let bestMove: Direction | null = null;
    let bestScore = -Infinity;

    for (const move of validMoves) {
      const evaluation = this.evaluateMove(gameState, move);
      if (evaluation.score > bestScore) {
        bestScore = evaluation.score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  explainMove(move: Direction, gameState: GameState): string {
    const evaluation = this.evaluateMove(gameState, move);
    const reasons = [];
    
    if (evaluation.smoothness > 0) {
      reasons.push(`smooth board (${evaluation.smoothness.toFixed(1)})`);
    }
    if (evaluation.monotonicity > 0) {
      reasons.push(`good order (${evaluation.monotonicity.toFixed(1)})`);
    }
    if (evaluation.emptyTiles > 0) {
      reasons.push(`${evaluation.emptyTiles} empty spaces`);
    }
    if (evaluation.cornerBonus > 0) {
      reasons.push('corner positioning');
    }

    const mainReason = reasons.length > 0 ? reasons[0] : 'best available option';
    return `${move.toUpperCase()}: Prioritizing ${mainReason} (total: ${evaluation.score.toFixed(1)})`;
  }

  evaluateAllMoves(gameState: GameState): { validMoves: string[]; evaluations: Record<string, any> } {
    const validMoves = this.getValidMoves(gameState);
    const evaluations: Record<string, any> = {};

    for (const move of validMoves) {
      const evaluation = this.evaluateMove(gameState, move);
      evaluations[move] = {
        score: evaluation.score,
        merges: this.countPotentialMerges(gameState, move),
        emptyAfter: evaluation.emptyTiles,
        maxTilePosition: this.getMaxTilePosition(gameState.grid),
        reasoning: `Smoothness-based: smooth=${evaluation.smoothness.toFixed(1)}, mono=${evaluation.monotonicity.toFixed(1)}, empty=${evaluation.emptyTiles}`
      };
    }

    return {
      validMoves: validMoves,
      evaluations
    };
  }

  private evaluateMove(gameState: GameState, move: Direction): EvaluationResult {
    // Simulate the move
    const newGrid = this.simulateMove(gameState.grid, move);
    
    const smoothness = this.calculateSmoothness(newGrid);
    const monotonicity = this.calculateMonotonicity(newGrid);
    const emptyTiles = this.countEmptyTiles(newGrid);
    const cornerBonus = this.calculateCornerBonus(newGrid);
    
    const score = 
      smoothness * this.weights.smoothness +
      monotonicity * this.weights.monotonicity + 
      emptyTiles * this.weights.emptyTiles +
      cornerBonus * this.weights.cornerBonus;

    return {
      score,
      smoothness,
      monotonicity, 
      emptyTiles,
      cornerBonus
    };
  }

  private calculateSmoothness(grid: (number | null)[][]): number {
    let smoothness = 0;
    
    // Calculate differences between adjacent tiles
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (grid[r][c]) {
          const currentValue = grid[r][c]!;
          
          // Check right neighbor
          if (c < 3 && grid[r][c + 1]) {
            const diff = Math.abs(currentValue - grid[r][c + 1]!);
            smoothness -= diff; // Subtract because we want smaller differences
          }
          
          // Check down neighbor
          if (r < 3 && grid[r + 1][c]) {
            const diff = Math.abs(currentValue - grid[r + 1][c]!);
            smoothness -= diff;
          }
        }
      }
    }
    
    return smoothness;
  }

  private calculateMonotonicity(grid: (number | null)[][]): number {
    let monotonicity = 0;
    
    // Check rows for monotonic order
    for (let r = 0; r < 4; r++) {
      const row = grid[r].filter(cell => cell !== null) as number[];
      if (row.length > 1) {
        let isIncreasing = true;
        let isDecreasing = true;
        
        for (let i = 1; i < row.length; i++) {
          if (row[i] < row[i-1]) isIncreasing = false;
          if (row[i] > row[i-1]) isDecreasing = false;
        }
        
        if (isIncreasing || isDecreasing) {
          monotonicity += 10; // Bonus for monotonic rows
        }
      }
    }
    
    // Check columns for monotonic order
    for (let c = 0; c < 4; c++) {
      const col = [];
      for (let r = 0; r < 4; r++) {
        if (grid[r][c] !== null) col.push(grid[r][c]!);
      }
      
      if (col.length > 1) {
        let isIncreasing = true;
        let isDecreasing = true;
        
        for (let i = 1; i < col.length; i++) {
          if (col[i] < col[i-1]) isIncreasing = false;
          if (col[i] > col[i-1]) isDecreasing = false;
        }
        
        if (isIncreasing || isDecreasing) {
          monotonicity += 10; // Bonus for monotonic columns
        }
      }
    }
    
    return monotonicity;
  }

  private countEmptyTiles(grid: (number | null)[][]): number {
    let count = 0;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (grid[r][c] === null) count++;
      }
    }
    return count * 10; // Scale up the value
  }

  private calculateCornerBonus(grid: (number | null)[][]): number {
    const corners = [
      grid[0][0], grid[0][3], grid[3][0], grid[3][3]
    ];
    
    const maxTile = Math.max(...grid.flat().filter(cell => cell !== null) as number[]);
    const maxInCorner = Math.max(...corners.filter(cell => cell !== null) as number[]);
    
    return maxInCorner === maxTile ? 50 : 0; // Big bonus for max tile in corner
  }

  private getValidMoves(gameState: GameState): Direction[] {
    const moves: Direction[] = [];
    const directions: Direction[] = ['up', 'down', 'left', 'right'];
    
    for (const direction of directions) {
      if (this.isValidMove(gameState.grid, direction)) {
        moves.push(direction);
      }
    }
    
    return moves;
  }

  private isValidMove(grid: (number | null)[][], direction: Direction): boolean {
    // Simple check - if any tile can move in that direction, it's valid
    const newGrid = this.simulateMove(grid, direction);
    return JSON.stringify(grid) !== JSON.stringify(newGrid);
  }

  private simulateMove(grid: (number | null)[][], direction: Direction): (number | null)[][] {
    // Create a copy of the grid
    const newGrid = grid.map(row => [...row]);
    
    // Simple move simulation - you might want to use your existing logic here
    // This is a placeholder that doesn't modify the grid
    return newGrid;
  }

  private countPotentialMerges(gameState: GameState, move: Direction): number {
    // Count how many merges this move would create
    let merges = 0;
    const grid = gameState.grid;
    
    // Simple merge counting logic
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (grid[r][c]) {
          // Check if this tile can merge with adjacent tiles
          if (direction === 'right' && c < 3 && grid[r][c] === grid[r][c + 1]) merges++;
          if (direction === 'left' && c > 0 && grid[r][c] === grid[r][c - 1]) merges++;
          if (direction === 'down' && r < 3 && grid[r][c] === grid[r + 1][c]) merges++;
          if (direction === 'up' && r > 0 && grid[r][c] === grid[r - 1][c]) merges++;
        }
      }
    }
    
    return merges;
  }

  private getMaxTilePosition(grid: (number | null)[][]): string {
    let maxTile = 0;
    let position = 'none';
    
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (grid[r][c] && grid[r][c]! > maxTile) {
          maxTile = grid[r][c]!;
          
          // Determine position
          if ((r === 0 || r === 3) && (c === 0 || c === 3)) {
            position = 'corner';
          } else if (r === 0 || r === 3 || c === 0 || c === 3) {
            position = 'edge';
          } else {
            position = 'center';
          }
        }
      }
    }
    
    return position;
  }
}