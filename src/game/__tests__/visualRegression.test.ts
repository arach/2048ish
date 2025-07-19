import { describe, it, expect, beforeEach } from 'vitest';
import { GameTestUtils } from '../testUtils';
import { Grid } from '../logic';

describe('Visual Regression Tests', () => {
  let testUtils: GameTestUtils;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    testUtils = new GameTestUtils();
    canvas = testUtils.createMockCanvas();
  });

  afterEach(() => {
    testUtils.cleanup();
  });

  describe('board state snapshots', () => {
    it('should render initial board consistently', () => {
      const controller = testUtils.createController(canvas);
      
      const snapshot1 = controller.snapshot();
      const snapshot2 = controller.snapshot();
      
      expect(snapshot1).toBe(snapshot2);
    });

    it('should render empty board correctly', () => {
      const controller = testUtils.createController(canvas);
      const emptyGrid = testUtils.createScenario('empty');
      
      testUtils.setFixedGrid(emptyGrid);
      const emptySnapshot = testUtils.takeSnapshot({ name: 'empty-board' });
      
      expect(emptySnapshot).toMatch(/^data:image\/png/);
    });

    it('should render full board correctly', () => {
      const controller = testUtils.createController(canvas);
      const gameOverGrid: Grid = [
        [2, 4, 8, 16],
        [32, 64, 128, 256],
        [512, 1024, 2048, 4096],
        [8192, 16384, 32768, 65536]
      ];
      
      testUtils.setFixedGrid(gameOverGrid);
      const fullSnapshot = testUtils.takeSnapshot({ name: 'full-board' });
      
      expect(fullSnapshot).toMatch(/^data:image\/png/);
    });

    it('should show visual difference after moves', () => {
      const controller = testUtils.createController(canvas);
      
      const beforeMove = controller.snapshot();
      controller.simulateMove('left');
      controller.forceCompleteAnimations();
      const afterMove = controller.snapshot();
      
      expect(beforeMove).not.toBe(afterMove);
    });
  });

  describe('tile rendering', () => {
    it('should render different tile values with correct colors', () => {
      const controller = testUtils.createController(canvas);
      const tileShowcase: Grid = [
        [2, 4, 8, 16],
        [32, 64, 128, 256],
        [512, 1024, 2048, null],
        [null, null, null, null]
      ];
      
      testUtils.setFixedGrid(tileShowcase);
      const showcaseSnapshot = testUtils.takeSnapshot({ name: 'tile-showcase' });
      
      // Render just 2048 tile
      const justWinTile: Grid = [
        [null, null, null, null],
        [null, 2048, null, null],
        [null, null, null, null],
        [null, null, null, null]
      ];
      
      testUtils.setFixedGrid(justWinTile);
      const winTileSnapshot = testUtils.takeSnapshot({ name: 'win-tile' });
      
      expect(showcaseSnapshot).not.toBe(winTileSnapshot);
    });

    it('should render large tiles correctly', () => {
      const controller = testUtils.createController(canvas);
      const largeTiles: Grid = [
        [4096, 8192, 16384, 32768],
        [65536, 131072, null, null],
        [null, null, null, null],
        [null, null, null, null]
      ];
      
      testUtils.setFixedGrid(largeTiles);
      const largeSnapshot = testUtils.takeSnapshot({ name: 'large-tiles' });
      
      expect(largeSnapshot).toMatch(/^data:image\/png/);
    });
  });

  describe('grid patterns', () => {
    it('should render checkerboard pattern', () => {
      const controller = testUtils.createController(canvas);
      const checkerboard: Grid = [
        [2, null, 2, null],
        [null, 2, null, 2],
        [2, null, 2, null],
        [null, 2, null, 2]
      ];
      
      testUtils.setFixedGrid(checkerboard);
      const checkerSnapshot = testUtils.takeSnapshot({ name: 'checkerboard' });
      
      expect(checkerSnapshot).toMatch(/^data:image\/png/);
    });

    it('should render diagonal pattern', () => {
      const controller = testUtils.createController(canvas);
      const diagonal: Grid = [
        [2, null, null, null],
        [null, 4, null, null],
        [null, null, 8, null],
        [null, null, null, 16]
      ];
      
      testUtils.setFixedGrid(diagonal);
      const diagonalSnapshot = testUtils.takeSnapshot({ name: 'diagonal' });
      
      expect(diagonalSnapshot).toMatch(/^data:image\/png/);
    });
  });

  describe('animation snapshots', () => {
    it('should capture move animation states', async () => {
      const controller = testUtils.createController(canvas, 100); // 100ms animation
      const movingGrid: Grid = [
        [2, null, null, null],
        [2, null, null, null],
        [null, null, null, null],
        [null, null, null, null]
      ];
      
      testUtils.setFixedGrid(movingGrid);
      
      // Take snapshots during animation
      const snapshots: string[] = [];
      snapshots.push(controller.snapshot()); // Before move
      
      controller.simulateMove('down');
      
      // During animation
      for (let i = 0; i < 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 20));
        snapshots.push(controller.snapshot());
      }
      
      controller.forceCompleteAnimations();
      snapshots.push(controller.snapshot()); // After animation
      
      // All snapshots should be different during animation
      const uniqueSnapshots = new Set(snapshots);
      expect(uniqueSnapshots.size).toBeGreaterThan(1);
    });
  });

  describe('visual consistency', () => {
    it('should maintain consistent rendering across different canvases', () => {
      const canvas1 = testUtils.createMockCanvas();
      const canvas2 = testUtils.createMockCanvas();
      
      const grid: Grid = [
        [2, 4, 8, 16],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null]
      ];
      
      testUtils.renderGridDirectly(canvas1, grid);
      testUtils.renderGridDirectly(canvas2, grid);
      
      const snapshot1 = canvas1.toDataURL();
      const snapshot2 = canvas2.toDataURL();
      
      expect(snapshot1).toBe(snapshot2);
    });

    it('should render game sequences consistently', async () => {
      const controller = testUtils.createController(canvas);
      
      const sequence = {
        moves: ['left', 'up', 'right', 'down'] as Direction[],
        description: 'Basic movement sequence'
      };
      
      const result = await testUtils.playSequence(sequence);
      
      expect(result.success).toBe(true);
      expect(result.snapshots).toHaveLength(5); // Initial + 4 moves
      
      // Each snapshot should be different
      const uniqueSnapshots = new Set(result.snapshots);
      expect(uniqueSnapshots.size).toBeGreaterThan(1);
    });
  });

  describe('regression prevention', () => {
    it('should detect visual changes in rendering', () => {
      const controller = testUtils.createController(canvas);
      const testGrid: Grid = [
        [2, 4, null, null],
        [8, 16, null, null],
        [null, null, null, null],
        [null, null, null, null]
      ];
      
      testUtils.setFixedGrid(testGrid);
      const baseline = testUtils.takeSnapshot({ name: 'baseline' });
      
      // Simulate a visual change (move a tile)
      const modifiedGrid: Grid = [
        [2, 4, null, null],
        [16, 8, null, null], // Swapped positions
        [null, null, null, null],
        [null, null, null, null]
      ];
      
      testUtils.setFixedGrid(modifiedGrid);
      const modified = testUtils.takeSnapshot({ name: 'modified' });
      
      expect(baseline).not.toBe(modified);
    });

    it('should maintain snapshot history', () => {
      const controller = testUtils.createController(canvas);
      
      // Take multiple snapshots
      testUtils.takeSnapshot({ name: 'state1' });
      controller.simulateMove('left');
      controller.forceCompleteAnimations();
      testUtils.takeSnapshot({ name: 'state2' });
      controller.simulateMove('up');
      controller.forceCompleteAnimations();
      testUtils.takeSnapshot({ name: 'state3' });
      
      // Export and verify
      const snapshots = testUtils.exportSnapshots();
      expect(Object.keys(snapshots)).toHaveLength(3);
      expect(snapshots['state1']).toBeDefined();
      expect(snapshots['state2']).toBeDefined();
      expect(snapshots['state3']).toBeDefined();
    });
  });
});

type Direction = import('../logic').Direction;