import { PlayStrategy, GameState, Direction, Grid } from '../types';

export class EndgameStrategy implements PlayStrategy {
  name = "Endgame Specialist";
  description = "Specialized for 1024→2048 transitions and winning positions";
  icon = "🏁";
  
  getNextMove(state: GameState): Direction | null {
    const validMoves = this.getValidMoves(state);
    if (validMoves.length === 0) return null;
    
    const maxTile = this.getMaxTile(state.grid);
    const emptyTiles = this.countEmptyTiles(state.grid);
    
    // Different strategies based on game phase
    if (maxTile >= 1024) {
      return this.getEndgameMove(state);
    } else if (maxTile >= 512) {
      return this.getLateGameMove(state);
    } else if (emptyTiles <= 6) {
      return this.getSurvivalMove(state);
    } else {
      return this.getFoundationMove(state);
    }
  }
  
  explainMove(move: Direction, state: GameState): string {
    const maxTile = this.getMaxTile(state.grid);
    const emptyTiles = this.countEmptyTiles(state.grid);
    
    if (maxTile >= 1024) {
      return `${move.toUpperCase()}: ENDGAME - Setting up for 2048 creation`;
    } else if (maxTile >= 512) {
      return `${move.toUpperCase()}: LATE GAME - Building toward 1024`;
    } else if (emptyTiles <= 6) {
      return `${move.toUpperCase()}: SURVIVAL - Keeping game alive`;
    } else {
      return `${move.toUpperCase()}: FOUNDATION - Building strong base`;
    }
  }
  
  evaluateAllMoves(state: GameState): { validMoves: string[]; evaluations: Record<string, any> } {
    const validMoves = this.getValidMoves(state);
    const evaluations: Record<string, any> = {};
    
    for (const move of validMoves) {
      const evaluation = this.evaluateMove(state, move);
      evaluations[move] = {
        winProbability: evaluation.winProbability,
        riskLevel: evaluation.riskLevel,
        reasoning: evaluation.reasoning
      };
    }
    
    return { validMoves, evaluations };
  }
  
  private getEndgameMove(state: GameState): Direction | null {
    // When we have 1024, we need to be VERY careful about positioning
    const validMoves = this.getValidMoves(state);
    let bestMove: Direction | null = null;
    let bestScore = -Infinity;
    
    for (const move of validMoves) {
      const score = this.evaluateEndgamePosition(state, move);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    
    return bestMove;
  }
  
  private evaluateEndgamePosition(state: GameState, move: Direction): number {
    const simulatedState = this.simulateMove(state, move);
    let score = 0;
    
    // Find 1024 tiles and their positions
    const tile1024Positions = this.findTilePositions(simulatedState.grid, 1024);
    const tile512Positions = this.findTilePositions(simulatedState.grid, 512);
    
    // CRITICAL: Can we create 2048 immediately?
    if (this.canCreate2048(simulatedState.grid)) {
      score += 10000; // Massive bonus for immediate win possibility
    }
    
    // Can we set up for 2048 in next move?
    if (tile1024Positions.length >= 2) {
      score += this.evaluate1024Merger(simulatedState.grid, tile1024Positions);
    }
    
    // Are we building toward 1024?
    if (tile512Positions.length >= 2) {
      score += this.evaluate512Merger(simulatedState.grid, tile512Positions);
    }
    
    // Penalty for dangerous positions that could block win paths
    score -= this.evaluateWinPathBlocking(simulatedState.grid) * 1000;
    
    // Keep some empty space for maneuvering
    const emptyTiles = this.countEmptyTiles(simulatedState.grid);
    if (emptyTiles >= 2) {
      score += emptyTiles * 50;
    } else {
      score -= 500; // Penalty for being too crowded
    }
    
    return score;
  }
  
  private canCreate2048(grid: Grid): boolean {
    // Check if two 1024 tiles can be merged
    const positions1024 = this.findTilePositions(grid, 1024);
    
    for (let i = 0; i < positions1024.length; i++) {
      for (let j = i + 1; j < positions1024.length; j++) {
        const pos1 = positions1024[i];
        const pos2 = positions1024[j];
        
        // Check if they can merge in any direction
        if (this.canTilesMerge(grid, pos1, pos2)) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  private canTilesMerge(grid: Grid, pos1: [number, number], pos2: [number, number]): boolean {
    const [r1, c1] = pos1;
    const [r2, c2] = pos2;
    
    // Same row - can merge horizontally?
    if (r1 === r2) {
      const minCol = Math.min(c1, c2);
      const maxCol = Math.max(c1, c2);
      
      // Check if path is clear between them
      for (let col = minCol + 1; col < maxCol; col++) {
        if (grid[r1][col] !== null) return false;
      }
      return true;
    }
    
    // Same column - can merge vertically?
    if (c1 === c2) {
      const minRow = Math.min(r1, r2);
      const maxRow = Math.max(r1, r2);
      
      // Check if path is clear between them
      for (let row = minRow + 1; row < maxRow; row++) {
        if (grid[row][c1] !== null) return false;
      }
      return true;
    }
    
    return false;
  }
  
  private evaluate1024Merger(grid: Grid, positions: [number, number][]): number {
    let score = 0;
    
    // Bonus for 1024 tiles in good positions (corners/edges)
    for (const [row, col] of positions) {
      if ((row === 0 || row === 3) && (col === 0 || col === 3)) {
        score += 200; // Corner is great
      } else if (row === 0 || row === 3 || col === 0 || col === 3) {
        score += 100; // Edge is good
      }
    }
    
    // Check if 1024 tiles can be brought together
    if (positions.length >= 2) {
      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          if (this.canTilesMerge(grid, positions[i], positions[j])) {
            score += 500; // Big bonus for mergeable 1024s
          }
        }
      }
    }
    
    return score;
  }
  
  private evaluate512Merger(grid: Grid, positions: [number, number][]): number {
    let score = 0;
    
    // Check if 512 tiles can merge to create 1024
    if (positions.length >= 2) {
      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          if (this.canTilesMerge(grid, positions[i], positions[j])) {
            score += 300; // Good bonus for creating 1024
          }
        }
      }
    }
    
    return score;
  }
  
  private evaluateWinPathBlocking(grid: Grid): number {
    // Check if the board configuration blocks potential win paths
    let blockingScore = 0;
    
    // Look for patterns that make it hard to get tiles together
    const highTiles = this.findTilePositions(grid, 256)
      .concat(this.findTilePositions(grid, 512))
      .concat(this.findTilePositions(grid, 1024));
    
    // Penalty if high-value tiles are scattered and can't reach each other
    for (let i = 0; i < highTiles.length; i++) {
      for (let j = i + 1; j < highTiles.length; j++) {
        if (!this.hasPathBetween(grid, highTiles[i], highTiles[j])) {
          blockingScore += 1;
        }
      }
    }
    
    return blockingScore;
  }
  
  private hasPathBetween(grid: Grid, pos1: [number, number], pos2: [number, number]): boolean {
    // Simplified path check - could be more sophisticated
    const [r1, c1] = pos1;
    const [r2, c2] = pos2;
    
    // If in same row or column with clear path, they can potentially merge
    if (r1 === r2 || c1 === c2) {
      return this.canTilesMerge(grid, pos1, pos2);
    }
    
    // For more complex paths, could implement A* or similar
    // For now, assume they can eventually reach each other if not completely blocked
    return true;
  }
  
  private getLateGameMove(state: GameState): Direction | null {
    // Focus on building 1024 from 512s while maintaining board organization
    const validMoves = this.getValidMoves(state);
    let bestMove: Direction | null = null;
    let bestScore = -Infinity;
    
    for (const move of validMoves) {
      let score = 0;
      const simulated = this.simulateMove(state, move);
      
      // Prefer moves that create or position 512s well
      const mergeCount = this.countMerges(state, move);
      score += mergeCount * 50;
      
      // Bonus for maintaining corner/edge positioning of high tiles
      score += this.evaluatePositioning(simulated.grid) * 10;
      
      // Keep some breathing room
      const emptyTiles = this.countEmptyTiles(simulated.grid);
      score += emptyTiles * 20;
      
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    
    return bestMove;
  }
  
  private getSurvivalMove(state: GameState): Direction | null {
    // When space is tight, prioritize keeping the game alive
    const validMoves = this.getValidMoves(state);
    let bestMove: Direction | null = null;
    let mostEmptyTiles = -1;
    
    for (const move of validMoves) {
      const simulated = this.simulateMove(state, move);
      const emptyTiles = this.countEmptyTiles(simulated.grid);
      
      if (emptyTiles > mostEmptyTiles) {
        mostEmptyTiles = emptyTiles;
        bestMove = move;
      }
    }
    
    return bestMove;
  }
  
  private getFoundationMove(state: GameState): Direction | null {
    // Early game: build a strong foundation
    const validMoves = this.getValidMoves(state);
    let bestMove: Direction | null = null;
    let bestScore = -Infinity;
    
    for (const move of validMoves) {
      let score = 0;
      
      // Prefer moves that create merges
      const mergeCount = this.countMerges(state, move);
      score += mergeCount * 100;
      
      // Prefer maintaining organization (corner strategy as base)
      if (move === 'left' || move === 'down') {
        score += 10; // Slight preference for these directions
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    
    return bestMove;
  }
  
  private evaluateMove(state: GameState, move: Direction): {
    winProbability: number;
    riskLevel: string;
    reasoning: string;
  } {
    const maxTile = this.getMaxTile(state.grid);
    
    if (maxTile >= 1024) {
      return {
        winProbability: 0.8,
        riskLevel: "high",
        reasoning: "Endgame positioning for 2048 creation"
      };
    } else if (maxTile >= 512) {
      return {
        winProbability: 0.4,
        riskLevel: "medium",
        reasoning: "Building toward 1024 tile"
      };
    } else {
      return {
        winProbability: 0.1,
        riskLevel: "low",
        reasoning: "Foundation building"
      };
    }
  }
  
  // Helper methods
  private simulateMove(state: GameState, move: Direction): GameState {
    const size = state.grid.length;
    const newGrid = state.grid.map(row => [...row]);
    let scoreIncrease = 0;

    if (move === 'left' || move === 'right') {
      for (let row = 0; row < size; row++) {
        const result = this.processLine(newGrid[row], move === 'right');
        newGrid[row] = result.line;
        scoreIncrease += result.scoreIncrease;
      }
    } else {
      for (let col = 0; col < size; col++) {
        const column = newGrid.map(row => row[col]);
        const result = this.processLine(column, move === 'down');
        for (let row = 0; row < size; row++) {
          newGrid[row][col] = result.line[row];
        }
        scoreIncrease += result.scoreIncrease;
      }
    }

    return { ...state, grid: newGrid, score: state.score + scoreIncrease };
  }

  private processLine(line: (number | null)[], reverse: boolean): {
    line: (number | null)[];
    scoreIncrease: number;
  } {
    let numbers = line.filter(cell => cell !== null) as number[];
    if (reverse) numbers.reverse();

    let scoreIncrease = 0;

    for (let i = 0; i < numbers.length - 1; i++) {
      if (numbers[i] === numbers[i + 1]) {
        numbers[i] *= 2;
        scoreIncrease += numbers[i];
        numbers.splice(i + 1, 1);
      }
    }

    while (numbers.length < line.length) {
      numbers.push(null);
    }

    if (reverse) numbers.reverse();

    return { line: numbers, scoreIncrease };
  }
  
  private getValidMoves(state: GameState): Direction[] {
    const moves: Direction[] = [];
    const directions: Direction[] = ['up', 'down', 'left', 'right'];
    
    for (const direction of directions) {
      const result = this.simulateMove(state, direction);
      if (JSON.stringify(result.grid) !== JSON.stringify(state.grid)) {
        moves.push(direction);
      }
    }
    
    return moves;
  }
  
  private getMaxTile(grid: Grid): number {
    let max = 0;
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        const value = grid[row][col];
        if (value && value > max) {
          max = value;
        }
      }
    }
    return max;
  }
  
  private countEmptyTiles(grid: Grid): number {
    let count = 0;
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        if (grid[row][col] === null) {
          count++;
        }
      }
    }
    return count;
  }
  
  private findTilePositions(grid: Grid, value: number): [number, number][] {
    const positions: [number, number][] = [];
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        if (grid[row][col] === value) {
          positions.push([row, col]);
        }
      }
    }
    return positions;
  }
  
  private countMerges(state: GameState, move: Direction): number {
    const simulated = this.simulateMove(state, move);
    return simulated.score - state.score;
  }
  
  private evaluatePositioning(grid: Grid): number {
    let score = 0;
    const maxTile = this.getMaxTile(grid);
    
    // Check if max tile is in corner
    if (grid[0][0] === maxTile || grid[0][3] === maxTile || 
        grid[3][0] === maxTile || grid[3][3] === maxTile) {
      score += 50;
    }
    
    // Check for monotonic rows/columns
    for (let row = 0; row < 4; row++) {
      if (this.isMonotonicRow(grid, row)) score += 10;
    }
    
    for (let col = 0; col < 4; col++) {
      if (this.isMonotonicColumn(grid, col)) score += 10;
    }
    
    return score;
  }
  
  private isMonotonicRow(grid: Grid, row: number): boolean {
    const values = grid[row].filter(cell => cell !== null) as number[];
    if (values.length <= 1) return true;
    
    let increasing = true;
    let decreasing = true;
    
    for (let i = 1; i < values.length; i++) {
      if (values[i] < values[i-1]) increasing = false;
      if (values[i] > values[i-1]) decreasing = false;
    }
    
    return increasing || decreasing;
  }
  
  private isMonotonicColumn(grid: Grid, col: number): boolean {
    const values = grid.map(row => row[col]).filter(cell => cell !== null) as number[];
    if (values.length <= 1) return true;
    
    let increasing = true;
    let decreasing = true;
    
    for (let i = 1; i < values.length; i++) {
      if (values[i] < values[i-1]) increasing = false;
      if (values[i] > values[i-1]) decreasing = false;
    }
    
    return increasing || decreasing;
  }
}