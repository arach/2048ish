import { describe, it, expect } from 'vitest';
import { 
  Grid, 
  GameState, 
  moveGrid, 
  canMove, 
  checkWin, 
  makeMove, 
  initializeGame,
  getMaxTile,
  slideRowLeft,
  SeededRandomGenerator,
  addRandomTile,
  createEmptyGrid
} from '../logic';

describe('Edge Cases', () => {
  describe('full board scenarios', () => {
    it('should handle a completely full board with no moves', () => {
      const fullBoard: Grid = [
        [2, 4, 2, 4],
        [4, 2, 4, 2],
        [2, 4, 2, 4],
        [4, 2, 4, 2]
      ];
      
      expect(canMove(fullBoard)).toBe(false);
      
      // Any move should not change the board
      const { hasChanged } = moveGrid(fullBoard, 'left');
      expect(hasChanged).toBe(false);
    });

    it('should handle a full board with one possible move', () => {
      const almostStuckBoard: Grid = [
        [2, 4, 2, 4],
        [4, 2, 4, 2],
        [2, 4, 2, 4],
        [4, 2, 4, 4] // Last two tiles can merge
      ];
      
      expect(canMove(almostStuckBoard)).toBe(true);
      
      // Check which moves work
      const { hasChanged: leftChanged } = moveGrid(almostStuckBoard, 'left');
      const { hasChanged: upChanged } = moveGrid(almostStuckBoard, 'up');
      const { hasChanged: downChanged } = moveGrid(almostStuckBoard, 'down');
      const { hasChanged: rightChanged } = moveGrid(almostStuckBoard, 'right');
      
      // At least one move should work (the merge)
      const anyMoveWorks = leftChanged || upChanged || downChanged || rightChanged;
      expect(anyMoveWorks).toBe(true);
    });

    it('should handle alternating pattern efficiently', () => {
      const alternatingBoard: Grid = [
        [2, 4, 8, 16],
        [4, 2, 16, 8],
        [8, 16, 2, 4],
        [16, 8, 4, 2]
      ];
      
      expect(canMove(alternatingBoard)).toBe(false);
    });
  });

  describe('large tile scenarios', () => {
    it('should handle maximum tile values', () => {
      const largeBoard: Grid = [
        [131072, 65536, 32768, 16384],
        [8192, 4096, 2048, 1024],
        [512, 256, 128, 64],
        [32, 16, 8, 4]
      ];
      
      expect(getMaxTile(largeBoard)).toBe(131072);
      expect(checkWin(largeBoard, 131072)).toBe(true);
    });

    it('should merge large tiles correctly', () => {
      const { row, points } = slideRowLeft([32768, 32768, null, null]);
      expect(row).toEqual([65536, null, null, null]);
      expect(points).toBe(65536);
    });

    it('should handle overflow scenarios gracefully', () => {
      // JavaScript can handle very large numbers
      const { row, points } = slideRowLeft([1048576, 1048576, null, null]);
      expect(row).toEqual([2097152, null, null, null]);
      expect(points).toBe(2097152);
    });
  });

  describe('empty board scenarios', () => {
    it('should handle moves on nearly empty board', () => {
      const sparseBoard: Grid = [
        [2, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null]
      ];
      
      // All moves should be valid
      const { hasChanged: leftChanged } = moveGrid(sparseBoard, 'left');
      const { hasChanged: rightChanged } = moveGrid(sparseBoard, 'right');
      const { hasChanged: upChanged } = moveGrid(sparseBoard, 'up');
      const { hasChanged: downChanged } = moveGrid(sparseBoard, 'down');
      
      expect(leftChanged || rightChanged || upChanged || downChanged).toBe(true);
    });

    it('should handle single tile moves', () => {
      const singleTile: Grid = [
        [null, null, null, null],
        [null, null, 2, null],
        [null, null, null, null],
        [null, null, null, null]
      ];
      
      const { grid: leftGrid } = moveGrid(singleTile, 'left');
      expect(leftGrid[1][0]).toBe(2);
      expect(leftGrid[1][2]).toBe(null);
      
      const { grid: rightGrid } = moveGrid(singleTile, 'right');
      expect(rightGrid[1][3]).toBe(2);
      expect(rightGrid[1][2]).toBe(null);
    });
  });

  describe('merge rules edge cases', () => {
    it('should only merge the two farthest-forward tiles when three identical tiles slide together', () => {
      // Critical test for the three-tile rule
      const { row: leftResult, points: leftPoints } = slideRowLeft([2, 2, 2, null]);
      expect(leftResult).toEqual([4, 2, null, null]); // First two merge
      expect(leftPoints).toBe(4);

      const { row: rightResult, points: rightPoints } = slideRowLeft([null, 2, 2, 2].reverse());
      expect(rightResult.reverse()).toEqual([null, null, 2, 4]); // Last two merge when going right
      expect(rightPoints).toBe(4);
    });

    it('should handle three tiles in different positions', () => {
      const { row, points } = slideRowLeft([2, null, 2, 2]);
      expect(row).toEqual([4, 2, null, null]); // Still only first two that collide merge
      expect(points).toBe(4);
    });

    it('should handle all tiles being the same value', () => {
      const uniformBoard: Grid = [
        [2, 2, 2, 2],
        [2, 2, 2, 2],
        [2, 2, 2, 2],
        [2, 2, 2, 2]
      ];
      
      const { grid, points } = moveGrid(uniformBoard, 'left');
      expect(grid).toEqual([
        [4, 4, null, null],
        [4, 4, null, null],
        [4, 4, null, null],
        [4, 4, null, null]
      ]);
      expect(points).toBe(32); // 8 merges * 4 points each
    });

    it('should handle rapid successive merges', () => {
      const cascadeBoard: Grid = [
        [2, 2, 4, 8],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null]
      ];
      
      const { grid, points } = moveGrid(cascadeBoard, 'left');
      expect(grid[0]).toEqual([4, 4, 8, null]);
      expect(points).toBe(4); // Only the 2+2 merge
    });

    it('should maintain game over state correctly', () => {
      const gameOverState: GameState = {
        grid: [
          [2, 4, 2, 4],
          [4, 2, 4, 2],
          [2, 4, 2, 4],
          [4, 2, 4, 2]
        ],
        score: 1000,
        isGameOver: true,
        hasWon: false
      };
      
      const newState = makeMove(gameOverState, 'left');
      expect(newState).toBe(gameOverState); // Should return same instance
    });
  });

  describe('deterministic behavior', () => {
    it('should produce identical games with same seed', () => {
      const seed = 42;
      const random1 = new SeededRandomGenerator(seed);
      const random2 = new SeededRandomGenerator(seed);
      
      const game1 = initializeGame(4, random1);
      const game2 = initializeGame(4, random2);
      
      expect(game1.grid).toEqual(game2.grid);
    });

    it('should produce different games with different seeds', () => {
      const random1 = new SeededRandomGenerator(42);
      const random2 = new SeededRandomGenerator(43);
      
      const game1 = initializeGame(4, random1);
      const game2 = initializeGame(4, random2);
      
      expect(game1.grid).not.toEqual(game2.grid);
    });
  });

  describe('tile spawning', () => {
    it('should spawn only 2s and 4s', () => {
      const random = new SeededRandomGenerator(12345);
      const emptyGrid = createEmptyGrid();
      
      // Test multiple spawns
      for (let i = 0; i < 20; i++) {
        const { grid } = addRandomTile(emptyGrid, random);
        const spawnedValue = grid.flat().find(v => v !== null);
        expect([2, 4]).toContain(spawnedValue);
      }
    });

    it('should spawn mostly 2s with reasonable probability', () => {
      const random = new SeededRandomGenerator(12345);
      let twos = 0;
      let fours = 0;
      
      // Test 100 spawns - enough to catch major issues
      for (let i = 0; i < 100; i++) {
        const { grid } = addRandomTile(createEmptyGrid(), random);
        const value = grid.flat().find(v => v !== null);
        if (value === 2) twos++;
        if (value === 4) fours++;
      }
      
      // Should be roughly 90/10 split - allow reasonable variance
      // At least 5x more 2s than 4s (would be 9x in perfect world)
      expect(twos).toBeGreaterThan(fours * 5);
      // But not more than 15x (to catch if it's always spawning 2s)
      expect(twos).toBeLessThan(fours * 15);
      
      // Also check that we got some of each
      expect(twos).toBeGreaterThan(0);
      expect(fours).toBeGreaterThan(0);
    });

    it('should not spawn tiles when board is full', () => {
      const fullBoard: Grid = [
        [2, 4, 8, 16],
        [32, 64, 128, 256],
        [512, 1024, 2048, 4096],
        [8192, 16384, 32768, 65536]
      ];
      
      const { grid, position } = addRandomTile(fullBoard);
      expect(position).toBeNull();
      expect(grid).toEqual(fullBoard);
    });

    it('should spawn in empty cells only', () => {
      const partialBoard: Grid = [
        [2, null, 4, null],
        [null, 8, null, 16],
        [32, null, 64, null],
        [null, 128, null, 256]
      ];
      
      const { grid, position } = addRandomTile(partialBoard);
      expect(position).not.toBeNull();
      
      if (position) {
        const [row, col] = position;
        expect(partialBoard[row][col]).toBeNull();
        expect([2, 4]).toContain(grid[row][col]);
      }
    });
  });

  describe('grid size variations', () => {
    it('should handle 2x2 grid', () => {
      const smallGrid: Grid = [
        [2, 2],
        [2, 2]
      ];
      
      const { grid, points } = moveGrid(smallGrid, 'left');
      expect(grid).toEqual([
        [4, null],
        [4, null]
      ]);
      expect(points).toBe(8);
    });

    it('should handle 6x6 grid', () => {
      const largeGrid: Grid = [
        [2, 2, 4, 4, 8, 8],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null]
      ];
      
      const { grid, points } = moveGrid(largeGrid, 'left');
      expect(grid[0]).toEqual([4, 8, 16, null, null, null]);
      expect(points).toBe(28);
    });
  });

  describe('special movement patterns', () => {
    it('should handle snake pattern movement', () => {
      const snakeBoard: Grid = [
        [2, 4, 8, 16],
        [null, null, null, 32],
        [null, null, null, 64],
        [256, 128, null, null]
      ];
      
      // Move everything to create a snake-like pattern
      const { grid: downGrid } = moveGrid(snakeBoard, 'down');
      const { grid: leftGrid } = moveGrid(downGrid, 'left');
      const { grid: upGrid } = moveGrid(leftGrid, 'up');
      const { grid: rightGrid } = moveGrid(upGrid, 'right');
      
      expect(canMove(rightGrid)).toBe(true);
    });

    it('should handle zigzag merges', () => {
      const zigzagBoard: Grid = [
        [2, null, 2, null],
        [null, 2, null, 2],
        [2, null, 2, null],
        [null, 2, null, 2]
      ];
      
      const { grid: leftGrid } = moveGrid(zigzagBoard, 'left');
      expect(leftGrid[0][0]).toBe(4);
      expect(leftGrid[1][0]).toBe(4);
      expect(leftGrid[2][0]).toBe(4);
      expect(leftGrid[3][0]).toBe(4);
    });
  });

  describe('win condition edge cases', () => {
    it('should not re-trigger win after already won', () => {
      const wonState: GameState = {
        grid: [
          [2048, 1024, null, null],
          [null, null, null, null],
          [null, null, null, null],
          [null, null, null, null]
        ],
        score: 20000,
        isGameOver: false,
        hasWon: true
      };
      
      // Try to move left - since there's space, it should create a new state
      const { hasChanged } = moveGrid(wonState.grid, 'left');
      
      if (hasChanged) {
        const newState = makeMove(wonState, 'left', new SeededRandomGenerator(42));
        expect(newState.hasWon).toBe(true);
        expect(newState).not.toBe(wonState); // New state created
      } else {
        // If no move is possible, state should remain the same
        const newState = makeMove(wonState, 'left', new SeededRandomGenerator(42));
        expect(newState).toBe(wonState);
      }
    });

    it('should handle multiple 2048 tiles', () => {
      const multiWinBoard: Grid = [
        [2048, 2048, null, null],
        [2048, null, null, null],
        [null, null, null, null],
        [null, null, null, null]
      ];
      
      expect(checkWin(multiWinBoard)).toBe(true);
      
      const { grid, points } = moveGrid(multiWinBoard, 'left');
      expect(grid[0][0]).toBe(4096);
      expect(points).toBe(4096);
    });
  });
});