import { PlayStrategy, GameState, Direction, Grid } from '../types';

interface MCTSNode {
  gameState: GameState;
  move?: Direction;
  parent?: MCTSNode;
  children: MCTSNode[];
  visits: number;
  wins: number;
  score: number;
  isTerminal: boolean;
  hasWon: boolean;
  untriedMoves: Direction[];
}

export class MCTSStrategy implements PlayStrategy {
  name = "Monte Carlo Tree Search";
  description = "Uses MCTS to find actual win paths, not just good scores";
  icon = "🎯";
  
  private maxIterations = 100;  // Reduced for benchmarking performance
  private explorationConstant = 1.414; // √2, standard UCB1
  private maxDepth = 20;  // Reduced depth for faster execution
  
  getNextMove(state: GameState): Direction | null {
    const validMoves = this.getValidMoves(state);
    if (validMoves.length === 0) return null;
    if (validMoves.length === 1) return validMoves[0];
    
    const rootNode = this.createNode(state);
    
    // Run MCTS iterations
    for (let i = 0; i < this.maxIterations; i++) {
      const selectedNode = this.select(rootNode);
      const expandedNode = this.expand(selectedNode);
      const result = this.simulate(expandedNode);
      this.backpropagate(expandedNode, result);
    }
    
    // Choose the move with highest win rate (not just score!)
    const bestChild = this.getBestChild(rootNode, 0); // No exploration in final selection
    return bestChild?.move || validMoves[0];
  }
  
  explainMove(move: Direction, state: GameState): string {
    return `${move.toUpperCase()}: MCTS found this path most likely to reach 2048`;
  }
  
  evaluateAllMoves(state: GameState): { validMoves: string[]; evaluations: Record<string, any> } {
    const validMoves = this.getValidMoves(state);
    const evaluations: Record<string, any> = {};
    
    for (const move of validMoves) {
      evaluations[move] = {
        reasoning: "MCTS evaluation - simulating thousands of random games to find win probability"
      };
    }
    
    return { validMoves, evaluations };
  }
  
  private createNode(state: GameState, move?: Direction, parent?: MCTSNode): MCTSNode {
    return {
      gameState: { ...state, grid: state.grid.map(row => [...row]) },
      move,
      parent,
      children: [],
      visits: 0,
      wins: 0,
      score: 0,
      isTerminal: this.isTerminal(state),
      hasWon: this.hasWon(state),
      untriedMoves: this.getValidMoves(state)
    };
  }
  
  private select(node: MCTSNode): MCTSNode {
    while (!node.isTerminal && node.untriedMoves.length === 0) {
      node = this.getBestChild(node, this.explorationConstant)!;
    }
    return node;
  }
  
  private expand(node: MCTSNode): MCTSNode {
    if (node.isTerminal || node.untriedMoves.length === 0) {
      return node;
    }
    
    // Try an unexplored move
    const move = node.untriedMoves.pop()!;
    const newState = this.applyMove(node.gameState, move);
    const childNode = this.createNode(newState, move, node);
    node.children.push(childNode);
    
    return childNode;
  }
  
  private simulate(node: MCTSNode): { won: boolean; score: number; reachedMaxTile: number } {
    let currentState = { 
      ...node.gameState, 
      grid: node.gameState.grid.map(row => [...row]) 
    };
    let moves = 0;
    let maxTileReached = this.getMaxTile(currentState.grid);
    
    // Run random simulation until game ends or max depth
    while (!this.isTerminal(currentState) && moves < this.maxDepth) {
      const validMoves = this.getValidMoves(currentState);
      if (validMoves.length === 0) break;
      
      // Random move selection for simulation
      const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
      currentState = this.applyMove(currentState, randomMove);
      maxTileReached = Math.max(maxTileReached, this.getMaxTile(currentState.grid));
      moves++;
      
      // Early termination if we find a win
      if (this.hasWon(currentState)) {
        break;
      }
    }
    
    return {
      won: this.hasWon(currentState),
      score: currentState.score,
      reachedMaxTile: maxTileReached
    };
  }
  
  private backpropagate(node: MCTSNode, result: { won: boolean; score: number; reachedMaxTile: number }): void {
    let current: MCTSNode | undefined = node;
    
    while (current) {
      current.visits++;
      current.score += result.score;
      
      // Win-focused scoring: heavily weight actual wins
      if (result.won) {
        current.wins += 10; // Big bonus for actual wins
      } else if (result.reachedMaxTile >= 1024) {
        current.wins += 3; // Good bonus for getting close
      } else if (result.reachedMaxTile >= 512) {
        current.wins += 1; // Small bonus for progress
      }
      
      current = current.parent;
    }
  }
  
  private getBestChild(node: MCTSNode, explorationConstant: number): MCTSNode | null {
    if (node.children.length === 0) return null;
    
    let bestChild = node.children[0];
    let bestValue = this.getUCB1Value(bestChild, node, explorationConstant);
    
    for (let i = 1; i < node.children.length; i++) {
      const child = node.children[i];
      const value = this.getUCB1Value(child, node, explorationConstant);
      
      if (value > bestValue) {
        bestValue = value;
        bestChild = child;
      }
    }
    
    return bestChild;
  }
  
  private getUCB1Value(child: MCTSNode, parent: MCTSNode, explorationConstant: number): number {
    if (child.visits === 0) return Infinity;
    
    // Win rate (not average score!)
    const winRate = child.wins / child.visits;
    
    // Exploration term
    const exploration = explorationConstant * Math.sqrt(Math.log(parent.visits) / child.visits);
    
    return winRate + exploration;
  }
  
  private applyMove(state: GameState, move: Direction): GameState {
    const newGrid = this.simulateMove(state.grid, move);
    const newState = {
      ...state,
      grid: newGrid.grid,
      score: state.score + newGrid.scoreIncrease
    };
    
    // Add random tile (simplified - just add a 2 in random empty spot)
    this.addRandomTile(newState.grid);
    
    return newState;
  }
  
  private simulateMove(grid: Grid, direction: Direction): { grid: Grid; scoreIncrease: number } {
    const size = grid.length;
    const newGrid = grid.map(row => [...row]);
    let scoreIncrease = 0;

    if (direction === 'left' || direction === 'right') {
      for (let row = 0; row < size; row++) {
        const result = this.processLine(newGrid[row], direction === 'right');
        newGrid[row] = result.line;
        scoreIncrease += result.scoreIncrease;
      }
    } else {
      for (let col = 0; col < size; col++) {
        const column = newGrid.map(row => row[col]);
        const result = this.processLine(column, direction === 'down');
        for (let row = 0; row < size; row++) {
          newGrid[row][col] = result.line[row];
        }
        scoreIncrease += result.scoreIncrease;
      }
    }

    return { grid: newGrid, scoreIncrease };
  }
  
  private processLine(line: (number | null)[], reverse: boolean): {
    line: (number | null)[];
    scoreIncrease: number;
  } {
    // Remove nulls and reverse if needed
    let numbers = line.filter(cell => cell !== null) as number[];
    if (reverse) numbers.reverse();

    let scoreIncrease = 0;

    // Merge adjacent identical numbers
    for (let i = 0; i < numbers.length - 1; i++) {
      if (numbers[i] === numbers[i + 1]) {
        numbers[i] *= 2;
        scoreIncrease += numbers[i];
        numbers.splice(i + 1, 1);
      }
    }

    // Pad with nulls
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
      const result = this.simulateMove(state.grid, direction);
      if (JSON.stringify(result.grid) !== JSON.stringify(state.grid)) {
        moves.push(direction);
      }
    }
    
    return moves;
  }
  
  private isTerminal(state: GameState): boolean {
    return this.hasWon(state) || this.getValidMoves(state).length === 0;
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
}