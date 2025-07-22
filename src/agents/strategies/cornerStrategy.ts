import { PlayStrategy, GameState, Direction, Grid, MoveEvaluation } from '../types';

export class CornerStrategy implements PlayStrategy {
  name = "Corner Master";
  description = "Keep the biggest tile in a corner";
  icon = "";
  
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
    const { grid } = state;
    
    // Find the largest tile value and position
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
    
    // Check what merges will happen
    const merges = this.findMergesForMove(grid, move);
    const cornerName = this.preferredCorner.replace('-', ' ');
    
    // Build specific explanation
    let explanation = `Moving ${move.toUpperCase()}`;
    
    // Explain merges
    if (merges.length > 0) {
      const mergeDescriptions = merges.map(m => `${m.value1}+${m.value2}=${m.result}`);
      explanation += ` to merge ${mergeDescriptions.join(', ')}`;
    }
    
    // Explain position of max tile
    const isInCorner = this.isMaxTileInPreferredCorner(maxPos, grid);
    if (isInCorner) {
      explanation += `, keeping ${maxValue} safely in ${cornerName} corner`;
    } else {
      explanation += `, working to move ${maxValue} toward ${cornerName} corner`;
    }
    
    // Check all valid moves and explain why this one was chosen
    const validMoves = ['up', 'down', 'left', 'right'].filter(d => this.canMove(grid, d as Direction));
    
    if (validMoves.length === 1) {
      explanation += ` (only valid move)`;
    } else if (validMoves.length > 1) {
      // Explain why this move over others
      const priorityMoves = this.getPriorityMoves(maxPos, grid);
      const moveIndex = priorityMoves.indexOf(move);
      
      if (moveIndex === 0) {
        explanation += ` (priority move for ${cornerName})`;
      } else if (moveIndex > 0) {
        // Explain why we couldn't use higher priority moves
        const skippedMoves = priorityMoves.slice(0, moveIndex).filter(m => validMoves.includes(m));
        if (skippedMoves.length > 0) {
          const alternativeMerges = this.findMergesForMove(grid, skippedMoves[0]);
          if (alternativeMerges.length === 0 && merges.length > 0) {
            explanation += ` (${skippedMoves[0]} has no merges)`;
          }
        }
      }
      
      // Check if alternatives would displace max tile
      for (const altMove of validMoves) {
        if (altMove !== move && this.wouldDisplaceMaxTile(grid, altMove, maxPos)) {
          explanation += ` (${altMove} would move ${maxValue} from corner)`;
          break;
        }
      }
    }
    
    return explanation;
  }
  
  private wouldDisplaceMaxTile(grid: Grid, direction: Direction, maxPos: {row: number, col: number}): boolean {
    const { row, col } = maxPos;
    const lastRow = grid.length - 1;
    const lastCol = grid[0].length - 1;
    
    // Check if move would displace max tile from preferred corner
    switch (this.preferredCorner) {
      case 'bottom-right':
        if (row === lastRow && col === lastCol) {
          return direction === 'up' || direction === 'left';
        }
        break;
      case 'bottom-left':
        if (row === lastRow && col === 0) {
          return direction === 'up' || direction === 'right';
        }
        break;
      case 'top-right':
        if (row === 0 && col === lastCol) {
          return direction === 'down' || direction === 'left';
        }
        break;
      case 'top-left':
        if (row === 0 && col === 0) {
          return direction === 'down' || direction === 'right';
        }
        break;
    }
    
    return false;
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
  
  private isMaxTileInPreferredCorner(maxPos: { row: number, col: number }, grid: Grid): boolean {
    const { row, col } = maxPos;
    const lastRow = grid.length - 1;
    const lastCol = grid[0].length - 1;
    
    switch (this.preferredCorner) {
      case 'bottom-right':
        return row === lastRow && col === lastCol;
      case 'bottom-left':
        return row === lastRow && col === 0;
      case 'top-right':
        return row === 0 && col === lastCol;
      case 'top-left':
        return row === 0 && col === 0;
    }
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
  
  evaluateAllMoves(state: GameState): { validMoves: Direction[]; evaluations: Record<Direction, MoveEvaluation> } {
    const { grid } = state;
    const directions: Direction[] = ['up', 'down', 'left', 'right'];
    const validMoves: Direction[] = [];
    const evaluations: Record<Direction, MoveEvaluation> = {} as Record<Direction, MoveEvaluation>;
    
    // Find max tile position
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
    
    const priorityMoves = this.getPriorityMoves(maxPos, grid);
    
    for (const direction of directions) {
      if (this.canMove(grid, direction)) {
        validMoves.push(direction);
        
        // Simulate the move to evaluate outcomes
        const merges = this.findMergesForMove(grid, direction);
        const emptyBefore = grid.flat().filter(cell => cell === null).length;
        const emptyAfter = emptyBefore + merges.length; // Each merge frees up one space
        
        // Determine where max tile would end up
        const maxTileNewPos = this.getMaxTilePositionAfterMove(grid, direction, maxPos);
        const maxTilePositionStr = this.describePosition(maxTileNewPos, grid);
        
        // Score the move (higher is better)
        let score = 0;
        
        // Bonus for merges
        score += merges.length * 10;
        score += merges.reduce((sum, m) => sum + Math.log2(m.result), 0) * 5;
        
        // Bonus for keeping max tile in corner
        if (this.isPositionInPreferredCorner(maxTileNewPos, grid)) {
          score += 100;
        }
        
        // Bonus for priority moves
        const priorityIndex = priorityMoves.indexOf(direction);
        if (priorityIndex >= 0) {
          score += (4 - priorityIndex) * 20;
        }
        
        // Penalty for moving max tile away from corner
        if (this.wouldDisplaceMaxTile(grid, direction, maxPos)) {
          score -= 50;
        }
        
        // Generate reasoning
        let reasoning = '';
        if (merges.length > 0) {
          reasoning += `Creates ${merges.length} merge${merges.length > 1 ? 's' : ''}`;
        }
        
        if (this.isPositionInPreferredCorner(maxTileNewPos, grid)) {
          reasoning += (reasoning ? ', ' : '') + `keeps ${maxValue} in corner`;
        } else if (this.wouldDisplaceMaxTile(grid, direction, maxPos)) {
          reasoning += (reasoning ? ', ' : '') + `moves ${maxValue} from corner`;
        }
        
        if (priorityIndex === 0) {
          reasoning += (reasoning ? ', ' : '') + 'priority move';
        }
        
        if (!reasoning) {
          reasoning = 'Valid move';
        }
        
        evaluations[direction] = {
          merges: merges.length,
          emptyAfter,
          maxTilePosition: maxTilePositionStr,
          score,
          reasoning
        };
      }
    }
    
    return { validMoves, evaluations };
  }
  
  private getMaxTilePositionAfterMove(grid: Grid, direction: Direction, currentMaxPos: {row: number, col: number}): {row: number, col: number} {
    // Simplified simulation - in reality we'd need to simulate the full move
    const { row, col } = currentMaxPos;
    
    switch (direction) {
      case 'up':
        return { row: 0, col };
      case 'down':
        return { row: grid.length - 1, col };
      case 'left':
        return { row, col: 0 };
      case 'right':
        return { row, col: grid[0].length - 1 };
    }
  }
  
  private describePosition(pos: {row: number, col: number}, grid: Grid): string {
    const { row, col } = pos;
    const lastRow = grid.length - 1;
    const lastCol = grid[0].length - 1;
    
    if (row === 0 && col === 0) return 'top-left';
    if (row === 0 && col === lastCol) return 'top-right';
    if (row === lastRow && col === 0) return 'bottom-left';
    if (row === lastRow && col === lastCol) return 'bottom-right';
    
    if (row === 0) return 'top edge';
    if (row === lastRow) return 'bottom edge';
    if (col === 0) return 'left edge';
    if (col === lastCol) return 'right edge';
    
    return 'center';
  }
  
  private isPositionInPreferredCorner(pos: {row: number, col: number}, grid: Grid): boolean {
    const posDesc = this.describePosition(pos, grid);
    return posDesc === this.preferredCorner;
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