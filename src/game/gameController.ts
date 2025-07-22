import { GameManager } from './gameManager';
import { CanvasRenderer, AnimationController } from './renderer';
import { InputHandler } from './inputHandler';
import { Direction, Move, moveGrid } from './logic';

export interface GameControllerConfig {
  canvas: HTMLCanvasElement;
  gridSize?: number;
  animationDuration?: number;
  animationStyle?: 'minimal' | 'playful';
  easingFunction?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'cubic' | 'elastic' | 'bounce';
  onScoreUpdate?: (score: number) => void;
  onGameOver?: () => void;
  onWin?: () => void;
  onMoveComplete?: (boardState: { 
    grid: (number | null)[][]; 
    score: number; 
    moveCount: number; 
    lastDirection?: Direction;
    maxTile: number;
    emptyTiles: number;
    possibleMerges: number;
  }) => void;
  testMode?: boolean;  // When true, doesn't spawn new tiles
}

export class GameController {
  private gameManager: GameManager;
  private renderer: CanvasRenderer;
  private inputHandler: InputHandler;
  private animationController: AnimationController;
  private config: GameControllerConfig;
  private isAnimating: boolean = false;
  private moveQueue: Direction[] = [];
  private baseAnimationDuration: number;
  private pendingNewTile: { pos: [number, number]; value: number } | null = null;
  private tileStates: Map<string, 'new' | 'merged' | 'moved'> = new Map();
  private debugTileStates: Map<string, 'new' | 'merged' | 'moved'> = new Map(); // Separate debug snapshot
  private lastMoves: Move[] = [];
  private debugMoves: Move[] = []; // Separate debug snapshot
  private hasCompletedFirstMove: boolean = false; // Track if we've completed at least one move
  private debugSlowdownMultiplier: number = 1; // Track debug slowdown multiplier
  private lastDirection: Direction | undefined; // Track the last move direction
  
  // Tile lineage tracking - persists across all moves
  private tileLineage: Map<string, {
    value: number;
    type: 'new' | 'merged' | 'moved' | 'static';
    from: [number, number][] | null; // null for new tiles, array of positions for moved/merged
    moveNumber: number;
  }> = new Map();
  private moveCount: number = 0;

  constructor(config: GameControllerConfig) {
    this.config = config;
    this.baseAnimationDuration = config.animationDuration ?? 150;
    
    // Initialize components
    this.gameManager = new GameManager({ gridSize: config.gridSize });
    this.renderer = new CanvasRenderer(config.canvas, {
      animationStyle: config.animationStyle,
      easingFunction: config.easingFunction
    });
    this.inputHandler = new InputHandler(config.canvas, { globalSwipe: true });
    
    // Set up animation controller
    this.animationController = new AnimationController(
      this.baseAnimationDuration,  // Use base duration
      (animations) => {
        const state = this.gameManager.getCurrentState();
        this.renderer.render(state.grid, animations);
      },
      config.easingFunction || 'ease-in-out',
      config.easingFunction || 'cubic',    // Move easing - use configured or default to cubic
      'elastic'   // Merge easing always elastic for that satisfying pop
    );
    
    // Set up subscriptions
    this.setupSubscriptions();
    
    // Apply saved debug overlay preference
    const savedOverlay = localStorage.getItem('2048-debug-overlay');
    if (savedOverlay === 'true') {
      this.renderer.setDebugMode(true, this.debugTileStates);
    }
    
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
    this.lastDirection = direction; // Track the direction for the callback
    const oldState = this.gameManager.getCurrentState();
    const { grid: oldGrid } = oldState;
    
    // Calculate what the move would look like for animation
    const moveResult = this.getMoveResult(oldGrid, direction);
    
    if (!moveResult.hasChanged) {
      // Process queued moves if any
      this.processNextQueuedMove();
      return;
    }
    
    // Increment move counter
    this.moveCount++;
    
    // Start animation
    this.isAnimating = true;

    // Build debug states
    const newDebugTileStates = new Map<string, 'new' | 'merged' | 'moved'>();
    const mergePositions = new Map<string, number>();
    for (const move of moveResult.moves) {
      const toKey = `${move.to[0]},${move.to[1]}`;
      mergePositions.set(toKey, (mergePositions.get(toKey) || 0) + 1);
    }

    const merges = moveResult.moves.filter(m => m.merged);
    const hasMerges = merges.length > 0;

    // --- Animation Phase 1: Move Tiles ---
    // First, run all the move animations.
    for (const move of moveResult.moves) {
      this.animationController.addMoveAnimation(move);
      const toKey = `${move.to[0]},${move.to[1]}`;
      const isMergeDestination = (mergePositions.get(toKey) || 0) > 1;
      const state = isMergeDestination ? 'merged' : 'moved';
      this.tileStates.set(toKey, state);
      newDebugTileStates.set(toKey, state);
    }
    
    // Update debug state and last moves
    this.debugTileStates = newDebugTileStates;
    this.lastMoves = [...moveResult.moves];
    this.debugMoves = [...moveResult.moves];
    if (this.renderer.getDebugMode()) {
      this.renderer.setDebugMode(true, this.debugTileStates);
    }

    // Start Phase 1. When it completes, the onComplete callback will trigger Phase 2.
    this.animationController.start(() => {
      
      const MERGE_DELAY = 75; // ms to wait before starting the pop animation.

      // After a short delay to let the move "settle", update the state and start results animations.
      setTimeout(() => {
        // Now that moves have landed, update the actual game state.
        const gameMoveResult = this.gameManager.move(direction);
        
        let hasSecondaryAnimations = false;

        // If there were merges, add merge animations for the new values.
        if (hasMerges) {
          hasSecondaryAnimations = true;
          for (const move of merges) {
            // move.value now contains the original value, so we need to double it for the merge
            this.animationController.addMergeAnimation(move.to, move.value * 2);
          }
        }

        // If a new tile spawned, add its appear animation.
        if (gameMoveResult.success && gameMoveResult.newTilePosition) {
          hasSecondaryAnimations = true;
          const [row, col] = gameMoveResult.newTilePosition;
          const value = this.gameManager.getCurrentState().grid[row][col]!;
          this.animationController.addAppearAnimation([row, col], value);
          
          const newKey = `${row},${col}`;
          this.tileStates.set(newKey, 'new');
          this.debugTileStates.set(newKey, 'new');
        }
        
        this.gameManager.notifySubscribers();

        // If there are result animations, start them. The first frame will render the new state.
        // Otherwise, render the final state and finalize the move.
        if (hasSecondaryAnimations) {
          this.animationController.start(() => this.finalizeMove());
        } else {
          this.render(); // Manually render final state if no new animations.
          this.finalizeMove();
        }
      }, MERGE_DELAY);
    });
  }

  private finalizeMove(): void {
    this.isAnimating = false;
    this.hasCompletedFirstMove = true;
    this.render(); // Final render to ensure grid is in its end state
    this.forceDebugRefresh();
    
    // Record the completed board state for explainability
    if (this.config.onMoveComplete) {
      const currentState = this.gameManager.getCurrentState();
      const grid = currentState.grid as (number | null)[][];
      
      // Calculate additional metrics
      const maxTile = Math.max(...grid.flat().filter((cell): cell is number => cell !== null), 0);
      const emptyTiles = grid.flat().filter(cell => cell === null).length;
      const possibleMerges = this.countPossibleMerges(grid);
      
      this.config.onMoveComplete({
        grid,
        score: currentState.score,
        moveCount: this.moveCount,
        lastDirection: this.lastDirection,
        maxTile,
        emptyTiles,
        possibleMerges
      });
    }
    
    this.processNextQueuedMove();
  }

  private getMoveResult(grid: Grid, direction: Direction): {
    moves: Move[];
    hasChanged: boolean;
  } {
    // Use the imported moveGrid function
    const result = moveGrid(grid, direction);
    return {
      moves: result.moves,
      hasChanged: result.hasChanged
    };
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
    // Update tile states in renderer if debug mode is enabled
    if (this.renderer.setDebugMode && this.renderer.getDebugMode) {
      const debugMode = this.renderer.getDebugMode();
      // Always pass the current debug states to the renderer, even if empty
      this.renderer.setDebugMode(debugMode, this.debugTileStates);
      // Only log when there are states to report
      if (this.debugTileStates.size > 0) {
        // console.log('[GameController] render() - Debug mode:', debugMode, 'Debug states:', this.debugTileStates.size);
      }
    }
  }

  public newGame(): void {
    this.animationController.stop();
    this.isAnimating = false;
    this.moveQueue = [];
    this.tileStates.clear();
    this.debugTileStates.clear();
    this.lastMoves = [];
    this.debugMoves = [];
    this.hasCompletedFirstMove = false;
    this.moveCount = 0;
    this.gameManager.newGame();
  }

  public undo(): boolean {
    if (this.isAnimating) return false;
    // Clear move history on undo since we're going backwards
    this.tileStates.clear();
    this.debugTileStates.clear();
    this.lastMoves = [];
    this.debugMoves = [];
    const result = this.gameManager.undo();
    // Force update to clear debug display
    this.render();
    return result;
  }

  public redo(): boolean {
    if (this.isAnimating) return false;
    // Clear move history on redo since we're going forwards
    this.tileStates.clear();
    this.debugTileStates.clear();
    this.lastMoves = [];
    this.debugMoves = [];
    const result = this.gameManager.redo();
    // Force update to clear debug display
    this.render();
    return result;
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
  
  public getAnimationDuration(): number {
    return this.config.animationDuration ?? this.baseAnimationDuration;
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

  // Public method for programmatic moves (e.g., from agents)
  public move(direction: Direction): void {
    this.handleInput(direction);
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
    // Update the config so executeMove uses the new duration
    this.config.animationDuration = duration;
    
    // Update the existing animation controller's duration
    this.animationController.setDuration(duration);
  }
  
  public setDebugSlowdown(multiplier: number): void {
    this.debugSlowdownMultiplier = multiplier;
    // Recalculate the effective animation duration from the base
    const effectiveDuration = this.baseAnimationDuration * multiplier;
    this.setAnimationDuration(effectiveDuration);
  }
  
  public getDebugSlowdown(): number {
    return this.debugSlowdownMultiplier;
  }
  
  public getBaseAnimationDuration(): number {
    return this.baseAnimationDuration;
  }

  public setBaseAnimationDuration(duration: number): void {
    this.baseAnimationDuration = duration;
    // After changing the base, we must re-apply the slowdown multiplier
    this.setDebugSlowdown(this.debugSlowdownMultiplier);
  }
  
  public getTileStates(): Map<string, 'new' | 'merged' | 'moved'> {
    // Return debug snapshot which persists longer
    const states = new Map(this.debugTileStates);
    return states;
  }
  
  public getCompleteTileHistory(row: number, col: number): { value: number; from: [number, number] | null; moveAgo: number }[] {
    // Get the complete history for a tile position by looking through game history
    const history: { value: number; from: [number, number] | null; moveAgo: number }[] = [];
    const gameHistory = this.gameManager.getHistory();
    const currentIndex = gameHistory.currentIndex;
    
    // Start from current state and work backwards
    for (let i = currentIndex; i >= 0; i--) {
      const state = gameHistory.states[i];
      const value = state.grid[row][col];
      
      if (value !== null) {
        // This position has a tile in this state
        let from: [number, number] | null = null;
        
        // If not the first state, check where this tile came from
        if (i > 0) {
          const prevState = gameHistory.states[i - 1];
          
          // Check if tile was already here (didn't move)
          if (prevState.grid[row][col] === value) {
            from = [row, col]; // Came from same position
          } else {
            // Tile moved here or was newly created
            // Look for this value in the previous state
            for (let r = 0; r < prevState.grid.length; r++) {
              for (let c = 0; c < prevState.grid[r].length; c++) {
                if (prevState.grid[r][c] === value && (r !== row || c !== col)) {
                  from = [r, c];
                  break;
                }
              }
              if (from) break;
            }
            
            // If we didn't find it in previous state, it's a new tile
            // (This handles both newly spawned tiles and merged tiles)
          }
        }
        
        history.push({
          value,
          from,
          moveAgo: currentIndex - i
        });
        
        // If this tile came from nowhere (new tile), stop here
        if (!from || (from[0] === row && from[1] === col)) {
          break;
        }
        
        // Continue tracing backwards from where this tile came from
        if (from) {
          row = from[0];
          col = from[1];
        }
      } else {
        // This position is empty in this state, stop tracing
        break;
      }
    }
    
    return history;
  }
  
  public getHistory() {
    return this.gameManager.getHistory();
  }
  
  public setDebugOverlay(enabled: boolean): void {
    this.renderer.setDebugMode(enabled, this.debugTileStates);
    // Re-render to show/hide overlays
    this.render();
    // Notify subscribers to update debug UI
    this.gameManager.notifySubscribers();
  }
  
  public getLastMoveInfo(): Move[] {
    return this.debugMoves;
  }
  
  public forceDebugRefresh(): void {
    // Force a refresh of debug states and notify subscribers
    this.render();
    this.gameManager.notifySubscribers();
  }
  
  public getAnimationState(): {
    isAnimating: boolean;
    activeCount: number;
    lastAnimationTime: number;
    duration: number;
    style: string;
    easing: string;
    baseDuration: number;
  } {
    return {
      isAnimating: this.isAnimating,
      activeCount: this.animationController ? this.animationController.getActiveAnimationCount() : 0,
      lastAnimationTime: Date.now(),
      duration: this.config.animationDuration ?? this.baseAnimationDuration,
      baseDuration: this.baseAnimationDuration,
      style: this.config.animationStyle || 'playful',
      easing: this.config.easingFunction || 'ease-in-out'
    };
  }
  
  public getCurrentStateIndex(): number {
    return this.gameManager.getHistory().currentIndex;
  }
  
  private countPossibleMerges(grid: (number | null)[][]): number {
    let count = 0;
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        const value = grid[row][col];
        if (!value) continue;
        // Check right
        if (col < grid[row].length - 1 && grid[row][col + 1] === value) count++;
        // Check down
        if (row < grid.length - 1 && grid[row + 1][col] === value) count++;
      }
    }
    return count;
  }

  private findTileInGrid(grid: Grid, value: number): boolean {
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c] === value) {
          return true;
        }
      }
    }
    return false;
  }
  
  private countTilesInGrid(grid: Grid, value: number): number {
    let count = 0;
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c] === value) {
          count++;
        }
      }
    }
    return count;
  }
  
  public subscribeToGameState(callback: (state: any) => void): () => void {
    return this.gameManager.subscribe(callback);
  }
}

// Type import to avoid circular dependency
type Grid = import('./logic').Grid;