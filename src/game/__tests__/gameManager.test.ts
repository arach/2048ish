import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameManager } from '../gameManager';
import { Direction, GameState } from '../logic';

describe('GameManager', () => {
  let gameManager: GameManager;
  
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Use a fixed seed for deterministic tests
    gameManager = new GameManager({ randomSeed: 12345 });
  });
  
  afterEach(() => {
    localStorage.clear();
  });

  describe('initialization', () => {
    it('should initialize with a new game', () => {
      const state = gameManager.getCurrentState();
      expect(state.score).toBe(0);
      expect(state.isGameOver).toBe(false);
      expect(state.hasWon).toBe(false);
      
      // Should have exactly 2 tiles
      const tileCount = state.grid.flat().filter(cell => cell !== null).length;
      expect(tileCount).toBe(2);
    });
    
    it('should respect custom grid size', () => {
      const customManager = new GameManager({ gridSize: 6, randomSeed: 12345 });
      const state = customManager.getCurrentState();
      expect(state.grid.length).toBe(6);
      expect(state.grid[0].length).toBe(6);
    });
    
    it('should use deterministic randomness with seed', () => {
      const manager1 = new GameManager({ randomSeed: 42 });
      const manager2 = new GameManager({ randomSeed: 42 });
      
      const state1 = manager1.getCurrentState();
      const state2 = manager2.getCurrentState();
      
      expect(state1.grid).toEqual(state2.grid);
    });
  });

  describe('move operations', () => {
    it('should execute valid moves', () => {
      const initialState = gameManager.getCurrentState();
      const moved = gameManager.move('left');
      const newState = gameManager.getCurrentState();
      
      expect(moved).toBe(true);
      expect(newState).not.toBe(initialState);
    });
    
    it('should reject invalid moves', () => {
      // Create a scenario where up move is invalid
      gameManager.importState(JSON.stringify({
        states: [{
          grid: [
            [2, 4, 8, 16],
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
      
      const moved = gameManager.move('up');
      expect(moved).toBe(false);
    });
    
    it('should update score when tiles merge', () => {
      gameManager.importState(JSON.stringify({
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
      
      gameManager.move('left');
      const state = gameManager.getCurrentState();
      expect(state.score).toBe(4);
    });
  });

  describe('undo/redo functionality', () => {
    it('should support undo', () => {
      const initialState = gameManager.getCurrentState();
      gameManager.move('left');
      const afterMove = gameManager.getCurrentState();
      
      expect(gameManager.canUndo()).toBe(true);
      gameManager.undo();
      
      const afterUndo = gameManager.getCurrentState();
      expect(afterUndo.grid).toEqual(initialState.grid);
    });
    
    it('should support redo', () => {
      gameManager.move('left');
      const afterMove = gameManager.getCurrentState();
      
      gameManager.undo();
      expect(gameManager.canRedo()).toBe(true);
      
      gameManager.redo();
      const afterRedo = gameManager.getCurrentState();
      expect(afterRedo.grid).toEqual(afterMove.grid);
    });
    
    it('should clear redo history on new move', () => {
      gameManager.move('left');
      gameManager.move('right');
      gameManager.undo();
      
      expect(gameManager.canRedo()).toBe(true);
      
      gameManager.move('up');
      expect(gameManager.canRedo()).toBe(false);
    });
    
    it('should respect max history size', () => {
      const smallHistoryManager = new GameManager({ 
        maxHistorySize: 3,
        randomSeed: 12345 
      });
      
      // Make 5 moves
      smallHistoryManager.move('left');
      smallHistoryManager.move('right');
      smallHistoryManager.move('up');
      smallHistoryManager.move('down');
      smallHistoryManager.move('left');
      
      // Should only be able to undo 2 times (current + 2 previous = 3 total)
      expect(smallHistoryManager.undo()).toBe(true);
      expect(smallHistoryManager.undo()).toBe(true);
      expect(smallHistoryManager.undo()).toBe(false);
    });
  });

  describe('persistence', () => {
    it('should save to localStorage', () => {
      gameManager.move('left');
      gameManager.saveToStorage();
      
      const saved = localStorage.getItem('2048-game-state');
      expect(saved).toBeTruthy();
      
      const parsed = JSON.parse(saved!);
      expect(parsed.states).toHaveLength(2); // initial + one move
      expect(parsed.currentIndex).toBe(1);
    });
    
    it('should load from localStorage', () => {
      gameManager.move('left');
      const stateBeforeSave = gameManager.getCurrentState();
      
      // Create new manager that should load from storage
      const newManager = new GameManager({ randomSeed: 12345 });
      const loadedState = newManager.getCurrentState();
      
      expect(loadedState.grid).toEqual(stateBeforeSave.grid);
      expect(loadedState.score).toEqual(stateBeforeSave.score);
    });
    
    it('should handle corrupted localStorage data', () => {
      localStorage.setItem('2048-game-state', 'invalid json');
      
      // Should start a new game instead of crashing
      const manager = new GameManager({ randomSeed: 12345 });
      const state = manager.getCurrentState();
      
      expect(state.score).toBe(0);
      const tileCount = state.grid.flat().filter(cell => cell !== null).length;
      expect(tileCount).toBe(2);
    });
    
    it('should use custom storage key', () => {
      const customManager = new GameManager({ 
        storageKey: 'custom-game-key',
        randomSeed: 12345 
      });
      
      customManager.move('left');
      customManager.saveToStorage();
      
      expect(localStorage.getItem('custom-game-key')).toBeTruthy();
      expect(localStorage.getItem('2048-game-state')).toBeNull();
    });
  });

  describe('state management', () => {
    it('should notify listeners on state change', () => {
      const listener = vi.fn();
      const unsubscribe = gameManager.subscribe(listener);
      
      // Should be called immediately with current state
      expect(listener).toHaveBeenCalledTimes(1);
      
      gameManager.move('left');
      expect(listener).toHaveBeenCalledTimes(2);
      
      gameManager.undo();
      expect(listener).toHaveBeenCalledTimes(3);
      
      unsubscribe();
      gameManager.move('right');
      expect(listener).toHaveBeenCalledTimes(3); // No more calls
    });
    
    it('should export and import state', () => {
      gameManager.move('left');
      gameManager.move('up');
      
      const exported = gameManager.exportState();
      const parsed = JSON.parse(exported);
      expect(parsed.states).toHaveLength(3);
      expect(parsed.currentIndex).toBe(2);
      
      const newManager = new GameManager({ randomSeed: 99999 });
      const imported = newManager.importState(exported);
      
      expect(imported).toBe(true);
      expect(newManager.getCurrentState()).toEqual(gameManager.getCurrentState());
    });
    
    it('should handle invalid import data', () => {
      const invalidData = JSON.stringify({ invalid: 'data' });
      const imported = gameManager.importState(invalidData);
      
      expect(imported).toBe(false);
    });
    
    it('should jump to specific history state', () => {
      const states: GameState[] = [];
      
      // Capture states as we move
      gameManager.subscribe(state => states.push(state));
      
      gameManager.move('left');
      gameManager.move('right');
      gameManager.move('up');
      
      // Jump back to first move
      gameManager.jumpToState(1);
      expect(gameManager.getCurrentState()).toEqual(states[1]);
      
      // Jump forward
      gameManager.jumpToState(3);
      expect(gameManager.getCurrentState()).toEqual(states[3]);
    });
  });

  describe('game statistics', () => {
    it('should track game stats', () => {
      gameManager.importState(JSON.stringify({
        states: [{
          grid: [
            [2, 4, 8, 16],
            [32, 64, 128, 256],
            [512, 1024, 2048, 4096],
            [null, null, null, null]
          ],
          score: 12345,
          isGameOver: false,
          hasWon: true
        }],
        currentIndex: 0
      }));
      
      const stats = gameManager.getStats();
      expect(stats.score).toBe(12345);
      expect(stats.maxTile).toBe(4096);
      expect(stats.hasWon).toBe(true);
      expect(stats.isGameOver).toBe(false);
      expect(stats.moves).toBe(0);
    });
    
    it('should detect game over', () => {
      gameManager.importState(JSON.stringify({
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
      
      const stats = gameManager.getStats();
      expect(stats.isGameOver).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle new game correctly', () => {
      gameManager.move('left');
      gameManager.move('right');
      
      gameManager.newGame();
      
      const state = gameManager.getCurrentState();
      expect(state.score).toBe(0);
      expect(gameManager.canUndo()).toBe(false);
      expect(gameManager.canRedo()).toBe(false);
    });
    
    it('should handle rapid moves', () => {
      const moves: Direction[] = ['left', 'right', 'up', 'down'];
      let successfulMoves = 0;
      
      for (let i = 0; i < 20; i++) {
        const direction = moves[i % 4];
        if (gameManager.move(direction)) {
          successfulMoves++;
        }
      }
      
      expect(successfulMoves).toBeGreaterThan(0);
      expect(gameManager.getHistory().states.length).toBeLessThanOrEqual(100);
    });
  });
});