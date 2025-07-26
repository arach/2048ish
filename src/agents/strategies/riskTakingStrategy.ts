import { PlayStrategy, GameState, Direction, Grid } from '../types';

export class RiskTakingStrategy implements PlayStrategy {
  name = "Risk Taker";
  description = "Willing to sacrifice average score for win probability - goes for broke!";
  icon = "🎲";
  
  private riskTolerance = 0.7; // How much risk to take (0 = conservative, 1 = maximum risk)
  
  getNextMove(state: GameState): Direction | null {
    const validMoves = this.getValidMoves(state);
    if (validMoves.length === 0) return null;
    
    const maxTile = this.getMaxTile(state.grid);
    const emptyTiles = this.countEmptyTiles(state.grid);
    
    // Adapt risk level based on game situation
    let currentRiskTolerance = this.riskTolerance;
    
    if (maxTile >= 1024) {
      currentRiskTolerance = 0.9; // Very aggressive in endgame
    } else if (maxTile >= 512) {
      currentRiskTolerance = 0.8; // Aggressive in late game
    } else if (emptyTiles <= 4) {
      currentRiskTolerance = 1.0; // Maximum risk when desperate
    }
    
    return this.getBestRiskyMove(state, currentRiskTolerance);
  }
  
  explainMove(move: Direction, state: GameState): string {
    const maxTile = this.getMaxTile(state.grid);
    const riskAssessment = this.assessMoveRisk(state, move);
    
    if (maxTile >= 1024) {
      return `${move.toUpperCase()}: HIGH RISK endgame move - going for 2048! (${riskAssessment})`;
    } else if (riskAssessment === "high") {
      return `${move.toUpperCase()}: RISKY move that could pay off big or fail spectacularly`;
    } else if (riskAssessment === "medium") {
      return `${move.toUpperCase()}: Calculated risk - potential for major progress`;
    } else {
      return `${move.toUpperCase()}: Conservative choice - building for future risks`;
    }
  }
  
  evaluateAllMoves(state: GameState): { validMoves: string[]; evaluations: Record<string, any> } {
    const validMoves = this.getValidMoves(state);
    const evaluations: Record<string, any> = {};
    
    for (const move of validMoves) {
      const risk = this.assessMoveRisk(state, move);
      const winPotential = this.assessWinPotential(state, move);
      
      evaluations[move] = {
        riskLevel: risk,
        winPotential: winPotential,
        reasoning: `Risk: ${risk}, Win potential: ${winPotential}`
      };
    }
    
    return { validMoves, evaluations };
  }
  
  private getBestRiskyMove(state: GameState, riskTolerance: number): Direction | null {
    const validMoves = this.getValidMoves(state);
    let bestMove: Direction | null = null;
    let bestScore = -Infinity;
    
    for (const move of validMoves) {
      const score = this.evaluateRiskyMove(state, move, riskTolerance);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    
    return bestMove;
  }
  
  private evaluateRiskyMove(state: GameState, move: Direction, riskTolerance: number): number {
    const simulated = this.simulateMove(state, move);
    let score = 0;
    
    // Base score from immediate merges
    const immediateScore = simulated.score - state.score;
    score += immediateScore;
    
    // Win potential bonus (heavily weighted)
    const winPotential = this.calculateWinPotential(simulated);
    score += winPotential * 1000;
    
    // Risk assessment
    const riskLevel = this.calculateRiskLevel(state, simulated);
    
    // Risk-reward calculation
    if (riskLevel === "high") {
      // High risk moves: either massive bonus or massive penalty
      if (winPotential > 0.3) {
        score += 2000 * riskTolerance; // Big reward for high-risk, high-reward
      } else {
        score -= 1000 * (1 - riskTolerance); // Penalty for high-risk, low-reward
      }
    } else if (riskLevel === "medium") {
      // Medium risk moves: moderate adjustments
      score += winPotential * 500 * riskTolerance;
    }
    
    // Desperation bonus: if we're in trouble, take bigger risks
    const emptyTiles = this.countEmptyTiles(simulated.grid);
    if (emptyTiles <= 3) {
      score += 500 * riskTolerance; // Bonus for risky moves when desperate
    }
    
    // Endgame aggression
    const maxTile = this.getMaxTile(simulated.grid);
    if (maxTile >= 1024) {
      // In endgame, heavily favor moves that could create 2048
      if (this.couldCreate2048(simulated)) {
        score += 5000; // Massive bonus for potential wins
      }
    }
    
    return score;
  }
  
  private calculateWinPotential(state: GameState): number {
    const maxTile = this.getMaxTile(state.grid);
    const emptyTiles = this.countEmptyTiles(state.grid);
    
    let potential = 0;
    
    // Base potential based on max tile
    if (maxTile >= 1024) {
      potential = 0.8;
    } else if (maxTile >= 512) {
      potential = 0.4;
    } else if (maxTile >= 256) {
      potential = 0.2;
    } else {
      potential = 0.05;
    }
    
    // Adjust for board state
    if (emptyTiles <= 2) {
      potential *= 0.3; // Low potential if board is crowded
    } else if (emptyTiles >= 6) {
      potential *= 1.5; // Higher potential with breathing room
    }
    
    // Check for specific win opportunities
    if (this.couldCreate2048(state)) {
      potential = 0.9; // Very high potential if 2048 is possible
    }
    
    return Math.min(potential, 1.0);
  }
  
  private calculateRiskLevel(beforeState: GameState, afterState: GameState): "low" | "medium" | "high" {
    const beforeEmpty = this.countEmptyTiles(beforeState.grid);
    const afterEmpty = this.countEmptyTiles(afterState.grid);
    const emptyChange = afterEmpty - beforeEmpty;
    
    const beforeMax = this.getMaxTile(beforeState.grid);
    const afterMax = this.getMaxTile(afterState.grid);
    
    // High risk: move that significantly reduces empty tiles without major progress
    if (emptyChange <= -2 && afterMax === beforeMax) {
      return "high";
    }
    
    // High risk: move in very crowded board
    if (afterEmpty <= 2) {
      return "high";
    }
    
    // Medium risk: moderate empty tile reduction
    if (emptyChange <= -1 || afterEmpty <= 4) {
      return "medium";
    }
    
    return "low";
  }
  
  private couldCreate2048(state: GameState): boolean {
    // Check if the current state could lead to 2048 creation
    const tile1024Count = this.countTilesWithValue(state.grid, 1024);
    const tile512Count = this.countTilesWithValue(state.grid, 512);
    
    // Can create 2048 directly from two 1024s
    if (tile1024Count >= 2) {
      return this.canTilesMerge(state.grid, 1024);
    }
    
    // Can create 1024 and then potentially 2048
    if (tile1024Count === 1 && tile512Count >= 2) {
      return this.canTilesMerge(state.grid, 512);
    }
    
    return false;
  }
  
  private canTilesMerge(grid: Grid, value: number): boolean {
    // Find all tiles with this value
    const positions = this.findTilePositions(grid, value);
    
    if (positions.length < 2) return false;
    
    // Check if any two can be merged
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const [r1, c1] = positions[i];
        const [r2, c2] = positions[j];
        
        // Same row - check horizontal merge
        if (r1 === r2) {
          const start = Math.min(c1, c2);
          const end = Math.max(c1, c2);
          let canMerge = true;
          
          for (let col = start + 1; col < end; col++) {
            if (grid[r1][col] !== null) {
              canMerge = false;
              break;
            }
          }
          
          if (canMerge) return true;
        }
        
        // Same column - check vertical merge
        if (c1 === c2) {
          const start = Math.min(r1, r2);
          const end = Math.max(r1, r2);
          let canMerge = true;
          
          for (let row = start + 1; row < end; row++) {
            if (grid[row][c1] !== null) {
              canMerge = false;
              break;
            }
          }
          
          if (canMerge) return true;
        }
      }
    }
    
    return false;
  }
  
  private assessMoveRisk(state: GameState, move: Direction): "low" | "medium" | "high" {
    const simulated = this.simulateMove(state, move);
    return this.calculateRiskLevel(state, simulated);
  }
  
  private assessWinPotential(state: GameState, move: Direction): "low" | "medium" | "high" {
    const simulated = this.simulateMove(state, move);
    const potential = this.calculateWinPotential(simulated);
    
    if (potential >= 0.7) return "high";
    if (potential >= 0.3) return "medium";
    return "low";
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
}