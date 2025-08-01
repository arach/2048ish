import { PlayStrategy, GameState, Direction, Grid } from '../types';

export class GreedyStrategy implements PlayStrategy {
  name = "Merge Monster";
  description = "Always make the move that creates the most merges";
  icon = "";
  
  getNextMove(state: GameState): Direction | null {
    const { grid } = state;
    const moves: Direction[] = ['up', 'down', 'left', 'right'];
    
    let bestMove: Direction | null = null;
    let maxMerges = -1;
    let maxScore = -1;
    
    for (const move of moves) {
      if (!this.canMove(grid, move)) continue;
      
      const simulation = this.simulateMove(grid, move);
      
      if (simulation.mergeCount > maxMerges || 
          (simulation.mergeCount === maxMerges && simulation.scoreGain > maxScore)) {
        maxMerges = simulation.mergeCount;
        maxScore = simulation.scoreGain;
        bestMove = move;
      }
    }
    
    return bestMove;
  }
  
  explainMove(move: Direction, state: GameState): string {
    const { grid } = state;
    const simulation = this.simulateMove(grid, move);
    
    // Get details about specific merges
    const mergeDetails = this.getMergeDetails(grid, move);
    
    // Build specific explanation
    let explanation = `Moving ${move.toUpperCase()}`;
    
    if (mergeDetails.length > 0) {
      const mergeDescriptions = mergeDetails.map(m => `${m.value1}+${m.value2}=${m.result}`);
      explanation += ` to create ${mergeDetails.length} merge${mergeDetails.length > 1 ? 's' : ''}: ${mergeDescriptions.join(', ')}`;
      explanation += ` (+${simulation.scoreGain} points!)`;
    } else {
      explanation += ` to position tiles for future merges`;
    }
    
    // Compare with other moves
    const allMoves: Direction[] = ['up', 'down', 'left', 'right'];
    const alternatives = allMoves.filter(d => d !== move && this.canMove(grid, d));
    
    if (alternatives.length > 0) {
      // Check why this move is better
      let betterThan: string[] = [];
      for (const alt of alternatives) {
        const altSim = this.simulateMove(grid, alt);
        if (simulation.mergeCount > altSim.mergeCount) {
          betterThan.push(`${alt} (only ${altSim.mergeCount} merges)`);
        } else if (simulation.mergeCount === altSim.mergeCount && simulation.scoreGain > altSim.scoreGain) {
          betterThan.push(`${alt} (less points)`);
        }
      }
      
      if (betterThan.length > 0) {
        explanation += `. Better than ${betterThan[0]}`;
      }
    }
    
    return explanation;
  }
  
  private getMergeDetails(grid: Grid, direction: Direction): Array<{value1: number, value2: number, result: number}> {
    const merges: Array<{value1: number, value2: number, result: number}> = [];
    const size = grid.length;
    
    switch (direction) {
      case 'up':
        for (let col = 0; col < size; col++) {
          const values: number[] = [];
          for (let row = 0; row < size; row++) {
            if (grid[row][col] !== null) {
              values.push(grid[row][col]!);
            }
          }
          for (let i = 0; i < values.length - 1; i++) {
            if (values[i] === values[i + 1]) {
              merges.push({ value1: values[i], value2: values[i + 1], result: values[i] * 2 });
              i++; // Skip next as it was merged
            }
          }
        }
        break;
        
      case 'down':
        for (let col = 0; col < size; col++) {
          const values: number[] = [];
          for (let row = size - 1; row >= 0; row--) {
            if (grid[row][col] !== null) {
              values.push(grid[row][col]!);
            }
          }
          for (let i = 0; i < values.length - 1; i++) {
            if (values[i] === values[i + 1]) {
              merges.push({ value1: values[i], value2: values[i + 1], result: values[i] * 2 });
              i++;
            }
          }
        }
        break;
        
      case 'left':
        for (let row = 0; row < size; row++) {
          const values: number[] = [];
          for (let col = 0; col < size; col++) {
            if (grid[row][col] !== null) {
              values.push(grid[row][col]!);
            }
          }
          for (let i = 0; i < values.length - 1; i++) {
            if (values[i] === values[i + 1]) {
              merges.push({ value1: values[i], value2: values[i + 1], result: values[i] * 2 });
              i++;
            }
          }
        }
        break;
        
      case 'right':
        for (let row = 0; row < size; row++) {
          const values: number[] = [];
          for (let col = size - 1; col >= 0; col--) {
            if (grid[row][col] !== null) {
              values.push(grid[row][col]!);
            }
          }
          for (let i = 0; i < values.length - 1; i++) {
            if (values[i] === values[i + 1]) {
              merges.push({ value1: values[i], value2: values[i + 1], result: values[i] * 2 });
              i++;
            }
          }
        }
        break;
    }
    
    return merges;
  }
  
  private simulateMove(grid: Grid, direction: Direction): { mergeCount: number; scoreGain: number; resultGrid: Grid } {
    // Create a deep copy of the grid
    const newGrid = grid.map(row => [...row]);
    let mergeCount = 0;
    let scoreGain = 0;
    
    switch (direction) {
      case 'up':
        for (let col = 0; col < newGrid[0].length; col++) {
          const result = this.moveColumnUp(newGrid, col);
          mergeCount += result.merges;
          scoreGain += result.score;
        }
        break;
        
      case 'down':
        for (let col = 0; col < newGrid[0].length; col++) {
          const result = this.moveColumnDown(newGrid, col);
          mergeCount += result.merges;
          scoreGain += result.score;
        }
        break;
        
      case 'left':
        for (let row = 0; row < newGrid.length; row++) {
          const result = this.moveRowLeft(newGrid, row);
          mergeCount += result.merges;
          scoreGain += result.score;
        }
        break;
        
      case 'right':
        for (let row = 0; row < newGrid.length; row++) {
          const result = this.moveRowRight(newGrid, row);
          mergeCount += result.merges;
          scoreGain += result.score;
        }
        break;
    }
    
    return { mergeCount, scoreGain, resultGrid: newGrid };
  }
  
  private moveColumnUp(grid: Grid, col: number): { merges: number; score: number } {
    let merges = 0;
    let score = 0;
    const size = grid.length;
    
    // Compact non-null values
    const values: number[] = [];
    for (let row = 0; row < size; row++) {
      if (grid[row][col] !== null) {
        values.push(grid[row][col]!);
      }
    }
    
    // Clear column
    for (let row = 0; row < size; row++) {
      grid[row][col] = null;
    }
    
    // Merge and place values
    let targetRow = 0;
    for (let i = 0; i < values.length; i++) {
      if (i + 1 < values.length && values[i] === values[i + 1]) {
        grid[targetRow][col] = values[i] * 2;
        score += values[i] * 2;
        merges++;
        i++; // Skip next value as it was merged
      } else {
        grid[targetRow][col] = values[i];
      }
      targetRow++;
    }
    
    return { merges, score };
  }
  
  private moveColumnDown(grid: Grid, col: number): { merges: number; score: number } {
    let merges = 0;
    let score = 0;
    const size = grid.length;
    
    const values: number[] = [];
    for (let row = size - 1; row >= 0; row--) {
      if (grid[row][col] !== null) {
        values.push(grid[row][col]!);
      }
    }
    
    for (let row = 0; row < size; row++) {
      grid[row][col] = null;
    }
    
    let targetRow = size - 1;
    for (let i = 0; i < values.length; i++) {
      if (i + 1 < values.length && values[i] === values[i + 1]) {
        grid[targetRow][col] = values[i] * 2;
        score += values[i] * 2;
        merges++;
        i++;
      } else {
        grid[targetRow][col] = values[i];
      }
      targetRow--;
    }
    
    return { merges, score };
  }
  
  private moveRowLeft(grid: Grid, row: number): { merges: number; score: number } {
    let merges = 0;
    let score = 0;
    const size = grid[0].length;
    
    const values: number[] = [];
    for (let col = 0; col < size; col++) {
      if (grid[row][col] !== null) {
        values.push(grid[row][col]!);
      }
    }
    
    for (let col = 0; col < size; col++) {
      grid[row][col] = null;
    }
    
    let targetCol = 0;
    for (let i = 0; i < values.length; i++) {
      if (i + 1 < values.length && values[i] === values[i + 1]) {
        grid[row][targetCol] = values[i] * 2;
        score += values[i] * 2;
        merges++;
        i++;
      } else {
        grid[row][targetCol] = values[i];
      }
      targetCol++;
    }
    
    return { merges, score };
  }
  
  private moveRowRight(grid: Grid, row: number): { merges: number; score: number } {
    let merges = 0;
    let score = 0;
    const size = grid[0].length;
    
    const values: number[] = [];
    for (let col = size - 1; col >= 0; col--) {
      if (grid[row][col] !== null) {
        values.push(grid[row][col]!);
      }
    }
    
    for (let col = 0; col < size; col++) {
      grid[row][col] = null;
    }
    
    let targetCol = size - 1;
    for (let i = 0; i < values.length; i++) {
      if (i + 1 < values.length && values[i] === values[i + 1]) {
        grid[row][targetCol] = values[i] * 2;
        score += values[i] * 2;
        merges++;
        i++;
      } else {
        grid[row][targetCol] = values[i];
      }
      targetCol--;
    }
    
    return { merges, score };
  }
  
  private canMove(grid: Grid, direction: Direction): boolean {
    const simulation = this.simulateMove(grid, direction);
    
    // Check if the grid changed
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        if (grid[row][col] !== simulation.resultGrid[row][col]) {
          return true;
        }
      }
    }
    
    return false;
  }
}