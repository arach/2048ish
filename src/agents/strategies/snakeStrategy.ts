import { PlayStrategy, GameState, Direction, Grid } from '../types';

export class SnakeStrategy implements PlayStrategy {
  name = "Snake Builder";
  description = "Build tiles in a snake/zigzag pattern";
  icon = "";
  
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
    const { grid } = state;
    
    // Find merges that will happen
    const merges = this.findMergesForMove(grid, move);
    
    // Analyze row states
    const bottomRowEmpty = this.countEmptyInRow(grid, grid.length - 1);
    const secondRowEmpty = this.countEmptyInRow(grid, grid.length - 2);
    
    // Build specific explanation
    let explanation = `Moving ${move.toUpperCase()}`;
    
    // Explain merges
    if (merges.length > 0) {
      const mergeDescriptions = merges.map(m => `${m.value1}+${m.value2}=${m.result}`);
      explanation += ` to merge ${mergeDescriptions.join(', ')}`;
    }
    
    // Explain snake pattern logic
    if (move === 'down' && bottomRowEmpty > 0) {
      explanation += `, filling bottom row (${bottomRowEmpty} empty)`;
    } else if (move === 'right' && this.shouldFillBottomRow(grid)) {
      explanation += `, organizing bottom row left-to-right`;
    } else if (move === 'left' && bottomRowEmpty === 0 && secondRowEmpty > 0) {
      explanation += `, filling 2nd row right-to-left (snake pattern)`;
    }
    
    // Find the largest value in grid
    let maxValue = 0;
    let totalTiles = 0;
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        if (grid[row][col]) {
          maxValue = Math.max(maxValue, grid[row][col]);
          totalTiles++;
        }
      }
    }
    
    explanation += `. Keeping ${totalTiles} tiles organized, max: ${maxValue}`;
    
    return explanation;
  }
  
  private findMergesForMove(grid: Grid, direction: Direction): Array<{value1: number, value2: number, result: number}> {
    const merges: Array<{value1: number, value2: number, result: number}> = [];
    const size = grid.length;
    
    switch (direction) {
      case 'up':
        for (let col = 0; col < size; col++) {
          for (let row = 1; row < size; row++) {
            const current = grid[row][col];
            if (current !== null) {
              // Look for merge target
              for (let targetRow = row - 1; targetRow >= 0; targetRow--) {
                const target = grid[targetRow][col];
                if (target === current) {
                  merges.push({ value1: current, value2: target, result: current * 2 });
                  break;
                } else if (target !== null) {
                  break;
                }
              }
            }
          }
        }
        break;
        
      case 'down':
        for (let col = 0; col < size; col++) {
          for (let row = size - 2; row >= 0; row--) {
            const current = grid[row][col];
            if (current !== null) {
              for (let targetRow = row + 1; targetRow < size; targetRow++) {
                const target = grid[targetRow][col];
                if (target === current) {
                  merges.push({ value1: current, value2: target, result: current * 2 });
                  break;
                } else if (target !== null) {
                  break;
                }
              }
            }
          }
        }
        break;
        
      case 'left':
        for (let row = 0; row < size; row++) {
          for (let col = 1; col < size; col++) {
            const current = grid[row][col];
            if (current !== null) {
              for (let targetCol = col - 1; targetCol >= 0; targetCol--) {
                const target = grid[row][targetCol];
                if (target === current) {
                  merges.push({ value1: current, value2: target, result: current * 2 });
                  break;
                } else if (target !== null) {
                  break;
                }
              }
            }
          }
        }
        break;
        
      case 'right':
        for (let row = 0; row < size; row++) {
          for (let col = size - 2; col >= 0; col--) {
            const current = grid[row][col];
            if (current !== null) {
              for (let targetCol = col + 1; targetCol < size; targetCol++) {
                const target = grid[row][targetCol];
                if (target === current) {
                  merges.push({ value1: current, value2: target, result: current * 2 });
                  break;
                } else if (target !== null) {
                  break;
                }
              }
            }
          }
        }
        break;
    }
    
    return merges;
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