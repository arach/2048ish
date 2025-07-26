import { PlayStrategy, GameState, Direction, Grid } from '../types';

interface WinPath {
  moves: Direction[];
  probability: number;
  reasoning: string;
}

export class WinProbabilityStrategy implements PlayStrategy {
  name = "Win Probability";
  description = "Evaluates each move purely on probability of eventually reaching 2048";
  icon = "🎯";
  
  private lookAheadDepth = 1;  // Minimal for benchmarking
  private simulationRuns = 5;    // Very reduced for benchmarking
  
  getNextMove(state: GameState): Direction | null {
    const validMoves = this.getValidMoves(state);
    if (validMoves.length === 0) return null;
    
    let bestMove: Direction | null = null;
    let bestWinProbability = -1;
    
    for (const move of validMoves) {
      const winProbability = this.calculateWinProbability(state, move);
      
      if (winProbability > bestWinProbability) {
        bestWinProbability = winProbability;
        bestMove = move;
      }
    }
    
    return bestMove;
  }
  
  explainMove(move: Direction, state: GameState): string {
    const winProb = this.calculateWinProbability(state, move);
    const percentage = (winProb * 100).toFixed(1);
    
    return `${move.toUpperCase()}: ${percentage}% chance of eventually reaching 2048`;
  }
  
  evaluateAllMoves(state: GameState): { validMoves: string[]; evaluations: Record<string, any> } {
    const validMoves = this.getValidMoves(state);
    const evaluations: Record<string, any> = {};
    
    for (const move of validMoves) {
      const winProb = this.calculateWinProbability(state, move);
      const pathAnalysis = this.analyzeWinPaths(state, move);
      
      evaluations[move] = {
        winProbability: (winProb * 100).toFixed(1) + '%',
        bestPath: pathAnalysis.bestPath,
        reasoning: pathAnalysis.reasoning
      };
    }
    
    return { validMoves, evaluations };
  }
  
  private calculateWinProbability(state: GameState, move: Direction): number {
    // Multi-layered approach to calculate win probability
    
    // 1. Immediate win check
    const immediateState = this.simulateMove(state, move);
    if (this.hasWon(immediateState)) {
      return 1.0; // 100% win probability if we win immediately
    }
    
    // 2. Look-ahead analysis
    const lookAheadProb = this.lookAheadWinProbability(immediateState);
    
    // 3. Monte Carlo simulation
    const monteCarloProb = this.monteCarloWinProbability(immediateState);
    
    // 4. Heuristic win probability
    const heuristicProb = this.heuristicWinProbability(immediateState);
    
    // Weighted combination
    return (
      lookAheadProb * 0.4 +
      monteCarloProb * 0.4 +
      heuristicProb * 0.2
    );
  }
  
  private lookAheadWinProbability(state: GameState): number {
    return this.recursiveWinProbability(state, this.lookAheadDepth);
  }
  
  private recursiveWinProbability(state: GameState, depth: number): number {
    if (depth === 0 || this.hasWon(state)) {
      return this.hasWon(state) ? 1.0 : this.heuristicWinProbability(state);
    }
    
    const validMoves = this.getValidMoves(state);
    if (validMoves.length === 0) {
      return 0.0; // Game over, no win
    }
    
    let totalProb = 0;
    
    for (const move of validMoves) {
      const nextState = this.simulateMove(state, move);
      const prob = this.recursiveWinProbability(nextState, depth - 1);
      totalProb += prob;
    }
    
    return totalProb / validMoves.length;
  }
  
  private monteCarloWinProbability(state: GameState): number {
    let wins = 0;
    
    for (let i = 0; i < this.simulationRuns; i++) {
      if (this.runRandomSimulation(state)) {
        wins++;
      }
    }
    
    return wins / this.simulationRuns;
  }
  
  private runRandomSimulation(initialState: GameState): boolean {
    let currentState = { ...initialState, grid: initialState.grid.map(row => [...row]) };
    let moves = 0;
    const maxMoves = 200; // Prevent infinite loops
    
    while (moves < maxMoves && !this.hasWon(currentState)) {
      const validMoves = this.getValidMoves(currentState);
      if (validMoves.length === 0) {
        break; // Game over
      }
      
      // Random move selection
      const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
      currentState = this.simulateMove(currentState, randomMove);
      this.addRandomTile(currentState.grid);
      moves++;
    }
    
    return this.hasWon(currentState);
  }
  
  private heuristicWinProbability(state: GameState): number {
    const maxTile = this.getMaxTile(state.grid);
    const emptyTiles = this.countEmptyTiles(state.grid);
    const tile1024Count = this.countTilesWithValue(state.grid, 1024);
    const tile512Count = this.countTilesWithValue(state.grid, 512);
    const tile256Count = this.countTilesWithValue(state.grid, 256);
    
    let probability = 0;
    
    // Base probability from max tile achieved
    if (maxTile >= 2048) {
      probability = 1.0;
    } else if (maxTile >= 1024) {
      probability = 0.7;
      // Bonus if we have multiple 1024s or can create them
      if (tile1024Count >= 2) probability += 0.2;
      if (tile512Count >= 2) probability += 0.1;
    } else if (maxTile >= 512) {
      probability = 0.3;
      if (tile512Count >= 2) probability += 0.2;
      if (tile256Count >= 4) probability += 0.1;
    } else if (maxTile >= 256) {
      probability = 0.1;
      if (tile256Count >= 2) probability += 0.05;
    } else {
      probability = 0.01;
    }
    
    // Adjust for board state
    if (emptyTiles <= 2) {
      probability *= 0.2; // Very low chance if board is full
    } else if (emptyTiles <= 4) {
      probability *= 0.5; // Reduced chance if crowded
    } else if (emptyTiles >= 8) {
      probability *= 1.3; // Bonus for having space
    }
    
    // Penalty for poor organization
    const organization = this.evaluateOrganization(state.grid);
    probability *= (0.5 + organization * 0.5);
    
    return Math.min(probability, 1.0);
  }
  
  private evaluateOrganization(grid: Grid): number {
    // Score how well-organized the board is (0 = terrible, 1 = perfect)
    let score = 0;
    
    // Check for monotonic rows/columns
    for (let row = 0; row < 4; row++) {
      if (this.isMonotonicRow(grid, row)) {
        score += 0.25;
      }
    }
    
    for (let col = 0; col < 4; col++) {
      if (this.isMonotonicColumn(grid, col)) {
        score += 0.25;
      }
    }
    
    // Check for largest tile in corner
    const maxTile = this.getMaxTile(grid);
    if (grid[0][0] === maxTile || grid[0][3] === maxTile || 
        grid[3][0] === maxTile || grid[3][3] === maxTile) {
      score += 0.5;
    }
    
    return Math.min(score, 1.0);
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
  
  private analyzeWinPaths(state: GameState, move: Direction): {
    bestPath: string;
    reasoning: string;
  } {
    const nextState = this.simulateMove(state, move);
    const maxTile = this.getMaxTile(nextState.grid);
    
    if (maxTile >= 1024) {
      return {
        bestPath: "Endgame positioning",
        reasoning: "Focus on merging 1024 tiles to create 2048"
      };
    } else if (maxTile >= 512) {
      return {
        bestPath: "Build to 1024",
        reasoning: "Merge 512s while maintaining board organization"
      };
    } else {
      return {
        bestPath: "Foundation building",
        reasoning: "Create larger tiles while keeping options open"
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
  
  private addRandomTile(grid: Grid): void {
    const emptyCells: [number, number][] = [];
    
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        if (grid[row][col] === null) {
          emptyCells.push([row, col]);
        }
      }
    }
    
    if (emptyCells.length > 0) {
      const [row, col] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      grid[row][col] = Math.random() < 0.9 ? 2 : 4;
    }
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
  
  private hasWon(state: GameState): boolean {
    return this.getMaxTile(state.grid) >= 2048;
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
  
  private countTilesWithValue(grid: Grid, value: number): number {
    let count = 0;
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        if (grid[row][col] === value) {
          count++;
        }
      }
    }
    return count;
  }
}