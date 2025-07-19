import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameController } from '../gameController';
import { Direction } from '../logic';

describe('GameController Integration Tests', () => {
  let canvas: HTMLCanvasElement;
  let controller: GameController;
  let scoreCallback: vi.Mock;
  let gameOverCallback: vi.Mock;
  let winCallback: vi.Mock;

  beforeEach(() => {
    vi.useFakeTimers();
    
    canvas = document.createElement('canvas');
    canvas.width = 500;
    canvas.height = 500;
    document.body.appendChild(canvas);
    
    scoreCallback = vi.fn();
    gameOverCallback = vi.fn();
    winCallback = vi.fn();
    
    controller = new GameController({
      canvas,
      gridSize: 4,
      animationDuration: 0, // Instant animations for testing
      onScoreUpdate: scoreCallback,
      onGameOver: gameOverCallback,
      onWin: winCallback
    });
  });

  afterEach(() => {
    controller.destroy();
    document.body.removeChild(canvas);
    vi.useRealTimers();
  });

  describe('game flow', () => {
    it('should initialize and render game', () => {
      const state = controller.getGameState();
      expect(state.score).toBe(0);
      expect(state.isGameOver).toBe(false);
      expect(state.hasWon).toBe(false);
      
      // Should have 2 tiles
      const tileCount = state.grid.flat().filter(cell => cell !== null).length;
      expect(tileCount).toBe(2);
    });

    it('should handle moves and update score', () => {
      // Import a specific state for testing
      controller.importState(JSON.stringify({
        states: [{
          grid: [
            [2, 2, null, null],
            [null, null, null, null],
            [null, null, null, null],
            [null, null, null, null]
          ],
          score: 0,
          isGameOver: false,
          hasWon: false
        }],
        currentIndex: 0
      }));
      
      controller.simulateMove('left');
      controller.forceCompleteAnimations();
      
      expect(scoreCallback).toHaveBeenCalledWith(4);
      
      const state = controller.getGameState();
      expect(state.score).toBe(4);
    });

    it('should detect win condition', () => {
      controller.importState(JSON.stringify({
        states: [{
          grid: [
            [1024, 1024, null, null],
            [null, null, null, null],
            [null, null, null, null],
            [null, null, null, null]
          ],
          score: 0,
          isGameOver: false,
          hasWon: false
        }],
        currentIndex: 0
      }));
      
      controller.simulateMove('left');
      controller.forceCompleteAnimations();
      
      expect(winCallback).toHaveBeenCalled();
    });

    it('should detect game over', () => {
      controller.importState(JSON.stringify({
        states: [{
          grid: [
            [2, 4, 2, 4],
            [4, 2, 4, 2],
            [2, 4, 2, 4],
            [4, 2, 4, 2]
          ],
          score: 100,
          isGameOver: true,
          hasWon: false
        }],
        currentIndex: 0
      }));
      
      expect(gameOverCallback).toHaveBeenCalled();
    });
  });

  describe('input handling', () => {
    it('should respond to keyboard input', () => {
      const initialState = controller.getGameState();
      
      // Simulate arrow key press
      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      window.dispatchEvent(event);
      
      controller.forceCompleteAnimations();
      
      const newState = controller.getGameState();
      expect(newState).not.toEqual(initialState);
    });

    it('should queue moves during animation', () => {
      // Use longer animation duration
      controller.setAnimationDuration(100);
      
      controller.simulateMove('left');
      controller.simulateMove('up');
      controller.simulateMove('right');
      
      // Advance through animations
      vi.advanceTimersByTime(300);
      
      const stats = controller.getStats();
      expect(stats.moves).toBeGreaterThan(0);
    });

    it('should ignore invalid moves', () => {
      controller.importState(JSON.stringify({
        states: [{
          grid: [
            [2, null, null, null],
            [null, null, null, null],
            [null, null, null, null],
            [null, null, null, null]
          ],
          score: 0,
          isGameOver: false,
          hasWon: false
        }],
        currentIndex: 0
      }));
      
      const stateBefore = controller.getGameState();
      controller.simulateMove('up');
      controller.forceCompleteAnimations();
      const stateAfter = controller.getGameState();
      
      // Grid should not change for invalid move
      expect(stateAfter.grid[0][0]).toBe(2);
    });
  });

  describe('undo/redo', () => {
    it('should support undo', () => {
      const initialState = controller.getGameState();
      
      controller.simulateMove('left');
      controller.forceCompleteAnimations();
      
      expect(controller.canUndo()).toBe(true);
      controller.undo();
      
      const undoneState = controller.getGameState();
      expect(undoneState.score).toBe(initialState.score);
    });

    it('should support redo', () => {
      controller.simulateMove('left');
      controller.forceCompleteAnimations();
      const afterMove = controller.getGameState();
      
      controller.undo();
      expect(controller.canRedo()).toBe(true);
      
      controller.redo();
      const redoneState = controller.getGameState();
      expect(redoneState.score).toBe(afterMove.score);
    });

    it('should not allow undo/redo during animation', () => {
      controller.setAnimationDuration(100);
      controller.simulateMove('left');
      
      // Try to undo during animation
      expect(controller.undo()).toBe(false);
      
      // Complete animation
      vi.advanceTimersByTime(200);
      
      // Now undo should work
      expect(controller.undo()).toBe(true);
    });
  });

  describe('state management', () => {
    it('should create new game', () => {
      controller.simulateMove('left');
      controller.simulateMove('right');
      controller.forceCompleteAnimations();
      
      controller.newGame();
      
      const state = controller.getGameState();
      expect(state.score).toBe(0);
      expect(controller.canUndo()).toBe(false);
    });

    it('should export and import state', () => {
      controller.simulateMove('left');
      controller.simulateMove('up');
      controller.forceCompleteAnimations();
      
      const exported = controller.exportState();
      
      // Create new controller
      const newController = new GameController({
        canvas: document.createElement('canvas'),
        animationDuration: 0
      });
      
      newController.importState(exported);
      expect(newController.getGameState()).toEqual(controller.getGameState());
      
      newController.destroy();
    });

    it('should provide accurate stats', () => {
      controller.importState(JSON.stringify({
        states: [
          {
            grid: [
              [2, 4, 8, 16],
              [32, 64, 128, 256],
              [512, 1024, 2048, null],
              [null, null, null, null]
            ],
            score: 12345,
            isGameOver: false,
            hasWon: true
          }
        ],
        currentIndex: 0
      }));
      
      const stats = controller.getStats();
      expect(stats.score).toBe(12345);
      expect(stats.maxTile).toBe(2048);
      expect(stats.hasWon).toBe(true);
      expect(stats.isGameOver).toBe(false);
      expect(stats.moves).toBe(0);
    });
  });

  describe('animations', () => {
    it('should animate moves', () => {
      controller.setAnimationDuration(100);
      
      controller.importState(JSON.stringify({
        states: [{
          grid: [
            [2, null, null, null],
            [2, null, null, null],
            [null, null, null, null],
            [null, null, null, null]
          ],
          score: 0,
          isGameOver: false,
          hasWon: false
        }],
        currentIndex: 0
      }));
      
      controller.simulateMove('down');
      
      // Animation should be in progress
      vi.advanceTimersByTime(50);
      
      // Animation should complete
      vi.advanceTimersByTime(150);
      
      const state = controller.getGameState();
      expect(state.grid[3][0]).toBe(4);
    });

    it('should handle rapid moves with animation queue', () => {
      controller.setAnimationDuration(50);
      
      // Simulate rapid moves
      const moves: Direction[] = ['left', 'up', 'right', 'down'];
      moves.forEach(move => controller.simulateMove(move));
      
      // Let all animations complete
      vi.advanceTimersByTime(500);
      
      const stats = controller.getStats();
      expect(stats.moves).toBeGreaterThan(0);
    });
  });

  describe('canvas snapshots', () => {
    it('should create snapshots', () => {
      const snapshot1 = controller.snapshot();
      expect(snapshot1).toMatch(/^data:image\/png/);
      
      controller.simulateMove('left');
      controller.forceCompleteAnimations();
      
      const snapshot2 = controller.snapshot();
      expect(snapshot2).toMatch(/^data:image\/png/);
      
      // Snapshots should be different after move
      expect(snapshot1).not.toBe(snapshot2);
    });

    it('should create consistent snapshots', () => {
      controller.importState(JSON.stringify({
        states: [{
          grid: [
            [2, 4, null, null],
            [null, null, null, null],
            [null, null, null, null],
            [null, null, null, null]
          ],
          score: 0,
          isGameOver: false,
          hasWon: false
        }],
        currentIndex: 0
      }));
      
      const snapshot1 = controller.snapshot();
      const snapshot2 = controller.snapshot();
      
      expect(snapshot1).toBe(snapshot2);
    });
  });

  describe('cleanup', () => {
    it('should clean up resources on destroy', () => {
      const newController = new GameController({
        canvas: document.createElement('canvas'),
        animationDuration: 0
      });
      
      // Add some state
      newController.simulateMove('left');
      
      // Destroy should not throw
      expect(() => newController.destroy()).not.toThrow();
      
      // Further operations should not crash
      expect(() => newController.simulateMove('right')).not.toThrow();
    });
  });
});