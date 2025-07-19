import { GameManager } from './gameManager';
import { CanvasRenderer, AnimationController } from './renderer';
import { InputHandler } from './inputHandler';
import { Direction, Move } from './logic';

export interface GameControllerConfig {
  canvas: HTMLCanvasElement;
  gridSize?: number;
  animationDuration?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: () => void;
  onWin?: () => void;
}

export class GameController {
  private gameManager: GameManager;
  private renderer: CanvasRenderer;
  private inputHandler: InputHandler;
  private animationController: AnimationController;
  private config: GameControllerConfig;
  private isAnimating: boolean = false;
  private moveQueue: Direction[] = [];

  constructor(config: GameControllerConfig) {
    this.config = config;
    
    // Initialize components
    this.gameManager = new GameManager({ gridSize: config.gridSize });
    this.renderer = new CanvasRenderer(config.canvas);
    this.inputHandler = new InputHandler(config.canvas);
    
    // Set up animation controller
    this.animationController = new AnimationController(
      config.animationDuration ?? 150,
      (animations) => {
        const state = this.gameManager.getCurrentState();
        this.renderer.render(state.grid, animations);
      }
    );
    
    // Set up subscriptions
    this.setupSubscriptions();
    
    // Initial render
    this.render();
  }

  private setupSubscriptions(): void {
    // Subscribe to game state changes
    this.gameManager.subscribe((state) => {
      if (!this.isAnimating) {
        this.render();
      }
      
      // Notify callbacks
      if (this.config.onScoreUpdate) {
        this.config.onScoreUpdate(state.score);
      }
      
      if (state.isGameOver && this.config.onGameOver) {
        this.config.onGameOver();
      }
      
      if (state.hasWon && this.config.onWin) {
        this.config.onWin();
      }
    });
    
    // Subscribe to input
    this.inputHandler.subscribe((direction) => {
      this.handleInput(direction);
    });
  }

  private handleInput(direction: Direction): void {
    // Queue moves if animating
    if (this.isAnimating) {
      this.moveQueue.push(direction);
      return;
    }
    
    this.executeMove(direction);
  }

  private executeMove(direction: Direction): void {
    const oldState = this.gameManager.getCurrentState();
    const { grid: oldGrid } = oldState;
    
    // Calculate what the move would look like for animation
    const moveResult = this.getMoveResult(oldGrid, direction);
    
    if (!moveResult.hasChanged) {
      // Process queued moves if any
      this.processNextQueuedMove();
      return;
    }
    
    // Start animation
    this.isAnimating = true;
    
    // Set up animations
    for (const move of moveResult.moves) {
      if (move.merged) {
        this.animationController.addMergeAnimation(move.to, move.value);
      } else {
        this.animationController.addMoveAnimation(move);
      }
    }
    
    // Execute the actual move
    const moved = this.gameManager.move(direction);
    
    if (moved) {
      // Get the new tile position
      const newState = this.gameManager.getCurrentState();
      const newTilePos = this.findNewTile(oldGrid, newState.grid);
      
      if (newTilePos) {
        // Add appear animation for new tile
        setTimeout(() => {
          const value = newState.grid[newTilePos[0]][newTilePos[1]];
          if (value !== null) {
            this.animationController.addAppearAnimation(newTilePos, value);
          }
        }, this.config.animationDuration ?? 150);
      }
    }
    
    // Start animations
    this.animationController.start();
    
    // Schedule end of animation
    setTimeout(() => {
      this.isAnimating = false;
      this.render();
      this.processNextQueuedMove();
    }, (this.config.animationDuration ?? 150) * 2);
  }

  private getMoveResult(grid: Grid, direction: Direction): {
    moves: Move[];
    hasChanged: boolean;
  } {
    // Import the moveGrid function to calculate moves without modifying state
    const { moveGrid } = require('./logic');
    const result = moveGrid(grid, direction);
    return {
      moves: result.moves,
      hasChanged: result.hasChanged
    };
  }

  private findNewTile(oldGrid: Grid, newGrid: Grid): [number, number] | null {
    for (let row = 0; row < newGrid.length; row++) {
      for (let col = 0; col < newGrid[row].length; col++) {
        if (oldGrid[row][col] === null && newGrid[row][col] !== null) {
          return [row, col];
        }
      }
    }
    return null;
  }

  private processNextQueuedMove(): void {
    if (this.moveQueue.length > 0) {
      const direction = this.moveQueue.shift()!;
      this.executeMove(direction);
    }
  }

  private render(): void {
    const state = this.gameManager.getCurrentState();
    this.renderer.render(state.grid);
  }

  public newGame(): void {
    this.animationController.stop();
    this.isAnimating = false;
    this.moveQueue = [];
    this.gameManager.newGame();
  }

  public undo(): boolean {
    if (this.isAnimating) return false;
    return this.gameManager.undo();
  }

  public redo(): boolean {
    if (this.isAnimating) return false;
    return this.gameManager.redo();
  }

  public canUndo(): boolean {
    return this.gameManager.canUndo();
  }

  public canRedo(): boolean {
    return this.gameManager.canRedo();
  }

  public getStats() {
    return this.gameManager.getStats();
  }

  public snapshot(): string {
    return this.renderer.snapshot();
  }

  public exportState(): string {
    return this.gameManager.exportState();
  }

  public importState(state: string): boolean {
    return this.gameManager.importState(state);
  }

  public destroy(): void {
    this.inputHandler.destroy();
    this.renderer.destroy();
    this.animationController.stop();
  }

  // Test helpers
  public simulateMove(direction: Direction): void {
    this.handleInput(direction);
  }

  public forceCompleteAnimations(): void {
    this.animationController.forceComplete();
    this.isAnimating = false;
    this.render();
  }

  public getGameState() {
    return this.gameManager.getCurrentState();
  }

  public setAnimationDuration(duration: number): void {
    this.animationController = new AnimationController(
      duration,
      (animations) => {
        const state = this.gameManager.getCurrentState();
        this.renderer.render(state.grid, animations);
      }
    );
  }
}

// Type import to avoid circular dependency
type Grid = import('./logic').Grid;