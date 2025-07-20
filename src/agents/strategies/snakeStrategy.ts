import { PlayStrategy, GameState, Direction, Grid } from '../types';

export class SnakeStrategy implements PlayStrategy {
  name = "Snake Builder 🐍";
  description = "Build tiles in a snake/zigzag pattern";
  icon = "🐍";
  
  getNextMove(state: GameState): Direction | null {
    const { grid } = state;
    
    // The snake pattern tries to keep tiles organized in rows
    // Fill bottom row left-to-right, then next row right-to-left, etc.
    
    // First priority: Keep bottom row filled
    if (this.shouldFillBottomRow(grid)) {
      // Try to move tiles to the right first
      if (this.canMove(grid, 'right')) return 'right';
      if (this.canMove(grid, 'down')) return 'down';
    }
    
    // Second priority: If bottom row is full, work on upper rows
    const emptyInBottomRow = this.countEmptyInRow(grid, grid.length - 1);
    const emptyInSecondRow = this.countEmptyInRow(grid, grid.length - 2);
    
    // If bottom row has fewer empty cells, prioritize down moves
    if (emptyInBottomRow < emptyInSecondRow) {
      if (this.canMove(grid, 'down')) return 'down';
    }
    
    // Snake pattern movement
    const moveSequence = this.getSnakeSequence(grid);
    for (const move of moveSequence) {
      if (this.canMove(grid, move)) {
        return move;
      }
    }
    
    // Fallback: any valid move
    const allMoves: Direction[] = ['left', 'right', 'down', 'up'];
    for (const move of allMoves) {
      if (this.canMove(grid, move)) {
        return move;
      }
    }
    
    return null;
  }
  
  explainMove(move: Direction, state: GameState): string {
    return `I slither ${move} to organize my tiles in a zigzag pattern! 🐍`;
  }
  
  private shouldFillBottomRow(grid: Grid): boolean {
    const bottomRow = grid.length - 1;
    let hasEmpty = false;
    let hasValue = false;
    
    for (let col = 0; col < grid[0].length; col++) {
      if (grid[bottomRow][col] === null) {
        hasEmpty = true;
      } else {
        hasValue = true;
      }
    }
    
    return hasEmpty && hasValue;
  }
  
  private countEmptyInRow(grid: Grid, row: number): number {
    let count = 0;
    for (let col = 0; col < grid[0].length; col++) {
      if (grid[row][col] === null) count++;
    }
    return count;
  }
  
  private getSnakeSequence(grid: Grid): Direction[] {
    // Analyze current state to determine best snake movement
    const bottomRowFull = this.countEmptyInRow(grid, grid.length - 1) === 0;
    const secondRowFull = this.countEmptyInRow(grid, grid.length - 2) === 0;
    
    if (!bottomRowFull) {
      // Fill bottom row first
      return ['right', 'down', 'left'];
    } else if (!secondRowFull) {
      // Fill second row in opposite direction
      return ['left', 'down', 'right'];
    } else {
      // Alternate pattern for upper rows
      return ['right', 'left', 'down'];
    }
  }
  
  private canMove(grid: Grid, direction: Direction): boolean {
    const size = grid.length;
    
    switch (direction) {
      case 'up':
        for (let col = 0; col < size; col++) {
          for (let row = 1; row < size; row++) {
            if (grid[row][col] !== null) {
              if (grid[row - 1][col] === null || grid[row - 1][col] === grid[row][col]) {
                return true;
              }
            }
          }
        }
        break;
        
      case 'down':
        for (let col = 0; col < size; col++) {
          for (let row = size - 2; row >= 0; row--) {
            if (grid[row][col] !== null) {
              if (grid[row + 1][col] === null || grid[row + 1][col] === grid[row][col]) {
                return true;
              }
            }
          }
        }
        break;
        
      case 'left':
        for (let row = 0; row < size; row++) {
          for (let col = 1; col < size; col++) {
            if (grid[row][col] !== null) {
              if (grid[row][col - 1] === null || grid[row][col - 1] === grid[row][col]) {
                return true;
              }
            }
          }
        }
        break;
        
      case 'right':
        for (let row = 0; row < size; row++) {
          for (let col = size - 2; col >= 0; col--) {
            if (grid[row][col] !== null) {
              if (grid[row][col + 1] === null || grid[row][col + 1] === grid[row][col]) {
                return true;
              }
            }
          }
        }
        break;
    }
    
    return false;
  }
}