import { describe, it, expect, beforeEach } from 'vitest';
import {
  createEmptyGrid,
  addRandomTile,
  initializeGame,
  rotateGridClockwise,
  rotateGridCounterClockwise,
  slideRowLeft,
  moveGrid,
  canMove,
  checkWin,
  makeMove,
  serializeGameState,
  deserializeGameState,
  getMaxTile,
  Grid,
  GameState,
  Direction
} from '../logic';

describe('Game Logic', () => {
  describe('createEmptyGrid', () => {
    it('should create a 4x4 grid by default', () => {
      const grid = createEmptyGrid();
      expect(grid).toHaveLength(4);
      expect(grid[0]).toHaveLength(4);
      expect(grid.every(row => row.every(cell => cell === null))).toBe(true);
    });

    it('should create a grid of specified size', () => {
      const grid = createEmptyGrid(6);
      expect(grid).toHaveLength(6);
      expect(grid[0]).toHaveLength(6);
    });
  });

  describe('addRandomTile', () => {
    it('should add a tile to an empty grid', () => {
      const grid = createEmptyGrid();
      const { grid: newGrid, position } = addRandomTile(grid);
      
      expect(position).not.toBeNull();
      const [row, col] = position!;
      expect(newGrid[row][col]).toBeGreaterThan(0);
      expect([2, 4]).toContain(newGrid[row][col]);
    });

    it('should not modify a full grid', () => {
      const grid: Grid = [
        [2, 4, 2, 4],
        [4, 2, 4, 2],
        [2, 4, 2, 4],
        [4, 2, 4, 2]
      ];
      const { grid: newGrid, position } = addRandomTile(grid);
      expect(position).toBeNull();
      expect(newGrid).toEqual(grid);
    });

    it('should not modify the original grid', () => {
      const grid = createEmptyGrid();
      const originalGrid = grid.map(row => [...row]);
      addRandomTile(grid);
      expect(grid).toEqual(originalGrid);
    });
  });

  describe('initializeGame', () => {
    it('should create a game with two tiles', () => {
      const state = initializeGame();
      const tileCount = state.grid.flat().filter(cell => cell !== null).length;
      expect(tileCount).toBe(2);
      expect(state.score).toBe(0);
      expect(state.isGameOver).toBe(false);
      expect(state.hasWon).toBe(false);
    });
  });

  describe('Grid Rotation', () => {
    const testGrid: Grid = [
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      [9, 10, 11, 12],
      [13, 14, 15, 16]
    ];

    it('should rotate grid clockwise', () => {
      const rotated = rotateGridClockwise(testGrid);
      expect(rotated).toEqual([
        [13, 9, 5, 1],
        [14, 10, 6, 2],
        [15, 11, 7, 3],
        [16, 12, 8, 4]
      ]);
    });

    it('should rotate grid counter-clockwise', () => {
      const rotated = rotateGridCounterClockwise(testGrid);
      expect(rotated).toEqual([
        [4, 8, 12, 16],
        [3, 7, 11, 15],
        [2, 6, 10, 14],
        [1, 5, 9, 13]
      ]);
    });

    it('should return to original after 4 clockwise rotations', () => {
      let grid = testGrid;
      for (let i = 0; i < 4; i++) {
        grid = rotateGridClockwise(grid);
      }
      expect(grid).toEqual(testGrid);
    });
  });

  describe('slideRowLeft', () => {
    it('should slide tiles to the left', () => {
      const { row, moves, points } = slideRowLeft([null, 2, null, 4]);
      expect(row).toEqual([2, 4, null, null]);
      expect(points).toBe(0);
    });

    it('should merge equal tiles', () => {
      const { row, moves, points } = slideRowLeft([2, 2, null, null]);
      expect(row).toEqual([4, null, null, null]);
      expect(points).toBe(4);
    });

    it('should merge multiple pairs', () => {
      const { row, moves, points } = slideRowLeft([2, 2, 4, 4]);
      expect(row).toEqual([4, 8, null, null]);
      expect(points).toBe(12);
    });

    it('should only merge once per tile', () => {
      const { row, moves, points } = slideRowLeft([2, 2, 2, 2]);
      expect(row).toEqual([4, 4, null, null]);
      expect(points).toBe(8);
    });

    it('should handle complex scenarios', () => {
      const { row, moves, points } = slideRowLeft([4, 2, 2, null]);
      expect(row).toEqual([4, 4, null, null]);
      expect(points).toBe(4);
    });
  });

  describe('moveGrid', () => {
    it('should move tiles left', () => {
      const grid: Grid = [
        [null, 2, null, 4],
        [2, null, 2, null],
        [null, null, null, null],
        [4, 4, null, null]
      ];
      
      const { grid: newGrid, points, hasChanged } = moveGrid(grid, 'left');
      
      expect(newGrid[0]).toEqual([2, 4, null, null]);
      expect(newGrid[1]).toEqual([4, null, null, null]);
      expect(newGrid[3]).toEqual([8, null, null, null]);
      expect(points).toBe(12);
      expect(hasChanged).toBe(true);
    });

    it('should move tiles right', () => {
      const grid: Grid = [
        [2, null, 4, null],
        [2, 2, null, null],
        [null, null, null, null],
        [4, 4, null, null]
      ];
      
      const { grid: newGrid, points, hasChanged } = moveGrid(grid, 'right');
      
      expect(newGrid[0]).toEqual([null, null, 2, 4]);
      expect(newGrid[1]).toEqual([null, null, null, 4]);
      expect(newGrid[3]).toEqual([null, null, null, 8]);
      expect(hasChanged).toBe(true);
    });

    it('should move tiles up', () => {
      const grid: Grid = [
        [2, 4, null, 2],
        [2, null, null, 2],
        [null, 4, null, null],
        [null, null, null, 4]
      ];
      
      const { grid: newGrid, points, hasChanged } = moveGrid(grid, 'up');
      
      expect(newGrid[0][0]).toBe(4);
      expect(newGrid[0][1]).toBe(8);
      expect(newGrid[0][3]).toBe(4);
      expect(hasChanged).toBe(true);
    });

    it('should move tiles down', () => {
      const grid: Grid = [
        [2, 4, null, 2],
        [2, null, null, 2],
        [null, 4, null, null],
        [null, null, null, 4]
      ];
      
      const { grid: newGrid, points, hasChanged } = moveGrid(grid, 'down');
      
      expect(newGrid[3][0]).toBe(4);
      expect(newGrid[3][1]).toBe(8);
      expect(newGrid[3][3]).toBe(4);
      expect(hasChanged).toBe(true);
    });

    it('should detect when no change occurs', () => {
      const grid: Grid = [
        [2, 4, 8, 16],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null]
      ];
      
      const { hasChanged } = moveGrid(grid, 'up');
      expect(hasChanged).toBe(false);
    });
  });

  describe('canMove', () => {
    it('should return true for a grid with empty spaces', () => {
      const grid: Grid = [
        [2, 4, 8, 16],
        [32, 64, 128, 256],
        [512, 1024, 2048, 4096],
        [8192, 16384, 32768, null]
      ];
      expect(canMove(grid)).toBe(true);
    });

    it('should return true for a grid with mergeable tiles', () => {
      const grid: Grid = [
        [2, 4, 8, 16],
        [32, 64, 128, 256],
        [512, 1024, 2048, 4096],
        [8192, 16384, 32768, 32768]
      ];
      expect(canMove(grid)).toBe(true);
    });

    it('should return false for a grid with no moves', () => {
      const grid: Grid = [
        [2, 4, 2, 4],
        [4, 2, 4, 2],
        [2, 4, 2, 4],
        [4, 2, 4, 2]
      ];
      expect(canMove(grid)).toBe(false);
    });
  });

  describe('checkWin', () => {
    it('should return true when 2048 is present', () => {
      const grid: Grid = [
        [2, 4, 8, 16],
        [32, 64, 128, 256],
        [512, 1024, 2048, null],
        [null, null, null, null]
      ];
      expect(checkWin(grid)).toBe(true);
    });

    it('should return false when 2048 is not present', () => {
      const grid: Grid = [
        [2, 4, 8, 16],
        [32, 64, 128, 256],
        [512, 1024, null, null],
        [null, null, null, null]
      ];
      expect(checkWin(grid)).toBe(false);
    });

    it('should check for custom win values', () => {
      const grid: Grid = [
        [2, 4, 8, 16],
        [32, 64, 128, 256],
        [512, 1024, null, null],
        [null, null, null, null]
      ];
      expect(checkWin(grid, 1024)).toBe(true);
      expect(checkWin(grid, 2048)).toBe(false);
    });
  });

  describe('makeMove', () => {
    it('should update score when tiles merge', () => {
      const state: GameState = {
        grid: [
          [2, 2, null, null],
          [null, null, null, null],
          [null, null, null, null],
          [null, null, null, null]
        ],
        score: 0,
        isGameOver: false,
        hasWon: false
      };
      
      // Mock Math.random to prevent new tile
      const originalRandom = Math.random;
      Math.random = () => 0.99; // This will place tiles in predictable positions
      
      const newState = makeMove(state, 'left');
      expect(newState.score).toBe(4);
      
      Math.random = originalRandom;
    });

    it('should detect win condition', () => {
      const state: GameState = {
        grid: [
          [1024, 1024, null, null],
          [null, null, null, null],
          [null, null, null, null],
          [null, null, null, null]
        ],
        score: 0,
        isGameOver: false,
        hasWon: false
      };
      
      const newState = makeMove(state, 'left');
      expect(newState.hasWon).toBe(true);
    });

    it('should not change hasWon if already won', () => {
      const state: GameState = {
        grid: [
          [2048, 2, null, null],
          [null, null, null, null],
          [null, null, null, null],
          [null, null, null, null]
        ],
        score: 0,
        isGameOver: false,
        hasWon: true
      };
      
      const newState = makeMove(state, 'right');
      expect(newState.hasWon).toBe(true);
    });
  });

  describe('Serialization', () => {
    it('should serialize and deserialize game state', () => {
      const state: GameState = {
        grid: [
          [2, 4, 8, 16],
          [32, 64, 128, 256],
          [512, 1024, 2048, 4096],
          [null, null, null, null]
        ],
        score: 12345,
        isGameOver: false,
        hasWon: true
      };
      
      const serialized = serializeGameState(state);
      const deserialized = deserializeGameState(serialized);
      
      expect(deserialized).toEqual(state);
    });
  });

  describe('getMaxTile', () => {
    it('should return the maximum tile value', () => {
      const grid: Grid = [
        [2, 4, 8, 16],
        [32, 64, 128, 256],
        [512, 1024, 2048, 4096],
        [null, null, null, null]
      ];
      
      expect(getMaxTile(grid)).toBe(4096);
    });

    it('should return 0 for empty grid', () => {
      const grid = createEmptyGrid();
      expect(getMaxTile(grid)).toBe(0);
    });
  });
});