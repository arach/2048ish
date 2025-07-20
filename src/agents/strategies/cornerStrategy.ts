import { PlayStrategy, GameState, Direction, Grid } from '../types';

export class CornerStrategy implements PlayStrategy {
  name = "Corner Master 🏰";
  description = "Keep the biggest tile in a corner";
  icon = "🏰";
  
  private preferredCorner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  
  constructor(corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' = 'bottom-right') {
    this.preferredCorner = corner;
  }
  
  getNextMove(state: GameState): Direction | null {
    const { grid } = state;
    
    // Find the position of the largest tile
    let maxValue = 0;
    let maxPos = { row: 0, col: 0 };
    
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        const value = grid[row][col];
        if (value && value > maxValue) {
          maxValue = value;
          maxPos = { row, col };
        }
      }
    }
    
    // Determine priority moves based on corner preference
    const priorityMoves = this.getPriorityMoves(maxPos, grid);
    
    // Try each move in priority order
    for (const move of priorityMoves) {
      if (this.canMove(grid, move)) {
        return move;
      }
    }
    
    // If no priority moves available, try any valid move
    const allMoves: Direction[] = ['up', 'down', 'left', 'right'];
    for (const move of allMoves) {
      if (!priorityMoves.includes(move) && this.canMove(grid, move)) {
        return move;
      }
    }
    
    return null;
  }
  
  explainMove(move: Direction, state: GameState): string {
    const cornerName = this.preferredCorner.replace('-', ' ');
    return `I'm moving ${move} to keep my castle in the ${cornerName} corner where it's safe!`;
  }
  
  private getPriorityMoves(maxPos: { row: number, col: number }, grid: Grid): Direction[] {
    const { row, col } = maxPos;
    const moves: Direction[] = [];
    
    switch (this.preferredCorner) {
      case 'bottom-right':
        // Priority: down, right
        moves.push('down', 'right');
        // If max tile is already in corner, alternate to prevent getting stuck
        if (row === grid.length - 1 && col === grid[0].length - 1) {
          moves.unshift('left', 'up');
        }
        break;
        
      case 'bottom-left':
        moves.push('down', 'left');
        if (row === grid.length - 1 && col === 0) {
          moves.unshift('right', 'up');
        }
        break;
        
      case 'top-right':
        moves.push('up', 'right');
        if (row === 0 && col === grid[0].length - 1) {
          moves.unshift('left', 'down');
        }
        break;
        
      case 'top-left':
        moves.push('up', 'left');
        if (row === 0 && col === 0) {
          moves.unshift('right', 'down');
        }
        break;
    }
    
    return moves;
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