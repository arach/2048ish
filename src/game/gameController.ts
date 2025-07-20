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
    this.inputHandler = new InputHandler(config.canvas);
    
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
    
    // Clear working tile states but preserve debug states until we have new ones
    this.tileStates.clear();
    console.log('[GameController] Starting move', this.moveCount, 'cleared working tile states');
    
    // Build new debug states without clearing first
    const newDebugTileStates = new Map<string, 'new' | 'merged' | 'moved'>();
    
    // First, identify positions where merges will happen
    const mergePositions = new Map<string, number>(); // position -> count of tiles moving there
    for (const move of moveResult.moves) {
      const toKey = `${move.to[0]},${move.to[1]}`;
      mergePositions.set(toKey, (mergePositions.get(toKey) || 0) + 1);
    }
    
    // Phase 1: Add all move animations and start them
    for (const move of moveResult.moves) {
      this.animationController.addMoveAnimation(move);
      // Track moved tiles
      const toKey = `${move.to[0]},${move.to[1]}`;
      
      // A position is "merged" only if multiple tiles are moving to it
      const isMergeDestination = (mergePositions.get(toKey) || 0) > 1;
      
      this.tileStates.set(toKey, isMergeDestination ? 'merged' : 'moved');
      // Add to new debug states
      newDebugTileStates.set(toKey, isMergeDestination ? 'merged' : 'moved');
      // Tracked tile state
    }
    
    // Store the moves for reference
    this.lastMoves = [...moveResult.moves];
    const newDebugMoves = [...moveResult.moves];
    
    // Replace debug states atomically only after we have the new ones ready
    if (this.hasCompletedFirstMove) {
      // Replacing debug states
      this.debugTileStates = newDebugTileStates;
      this.debugMoves = newDebugMoves;
    } else {
      // First move - just add to existing (empty) map
      newDebugTileStates.forEach((value, key) => {
        this.debugTileStates.set(key, value);
      });
      this.debugMoves = newDebugMoves;
      // First move - setting debug moves
    }
    // Move complete - debug states updated
    
    // Update the renderer with the new debug states if debug mode is enabled
    if (this.renderer.getDebugMode && this.renderer.getDebugMode()) {
      this.renderer.setDebugMode(true, this.debugTileStates);
    }
    
    // Update the renderer with the new debug states
    this.render();
    
    this.animationController.start();
    
    // Collect merge positions for phase 2
    const merges = moveResult.moves.filter(m => m.merged);
    const hasMerges = merges.length > 0;
    
    // Store the old grid for comparison after move
    const previewGrid = [...oldGrid.map(row => [...row])];
    
    // Apply the move to preview grid to know where new tile will be
    let willMove = false;
    if (moveResult.hasChanged) {
      // Simulate the move to know what will happen
      willMove = true;
    }
    
    // Helper function to get current animation duration dynamically
    const getCurrentAnimDuration = () => this.config.animationDuration ?? this.baseAnimationDuration;
    
    // Animation sequence timing
    const animDuration = getCurrentAnimDuration();
    const newTileDelay = 50; // Small delay before new tile appears
    
    // Ensure AnimationController has the current duration
    this.animationController.setDuration(animDuration);
    
    // Phase 1: Move animations (already started above)
    // Phase 2: Game state update and merge animations
    setTimeout(() => {
      // Execute the actual move to update game state
      let gameMoveResult;
      if (this.config.testMode) {
        const moved = this.gameManager.moveWithoutNewTile(direction);
        gameMoveResult = { success: moved, moves: [], newTilePosition: null };
      } else {
        gameMoveResult = this.gameManager.move(direction);
      }
      
      // Start merge animations if any
      if (hasMerges) {
        // Ensure AnimationController has the current duration for merge phase
        this.animationController.setDuration(animDuration);
        for (const move of merges) {
          this.animationController.addMergeAnimation(move.to, move.value);
        }
        this.animationController.start();
      }
      
      // Phase 3: New tile animation (if spawned)
      if (gameMoveResult.success && gameMoveResult.newTilePosition) {
        const newState = this.gameManager.getCurrentState();
        const [row, col] = gameMoveResult.newTilePosition;
        const value = newState.grid[row][col]!;
        
        this.pendingNewTile = { pos: gameMoveResult.newTilePosition, value };
        
        // Schedule new tile animation
        setTimeout(() => {
          if (this.pendingNewTile) {
            // Ensure AnimationController has the current duration for appear phase
            this.animationController.setDuration(animDuration);
            this.animationController.addAppearAnimation(
              this.pendingNewTile.pos, 
              this.pendingNewTile.value
            );
            this.animationController.start();
            
            // Track new tile state
            const newKey = `${this.pendingNewTile.pos[0]},${this.pendingNewTile.pos[1]}`;
            this.tileStates.set(newKey, 'new');
            this.debugTileStates.set(newKey, 'new');
            
            this.pendingNewTile = null;
            
            // Update renderer and notify subscribers
            if (this.renderer.getDebugMode && this.renderer.getDebugMode()) {
              this.renderer.setDebugMode(true, this.debugTileStates);
            }
            this.render();
            this.gameManager.notifySubscribers();
          }
        }, hasMerges ? animDuration + newTileDelay : newTileDelay);
      }
    }, animDuration);
    
    // Calculate total animation time
    let totalTime = animDuration; // Phase 1: Move
    if (hasMerges) totalTime += animDuration; // Phase 2: Merge
    if (willMove && !this.config.testMode) totalTime += newTileDelay + animDuration; // Phase 3: New tile
    
    // Schedule animation completion
    setTimeout(() => {
      this.isAnimating = false;
      this.hasCompletedFirstMove = true;
      this.render();
      this.forceDebugRefresh();
      this.processNextQueuedMove();
    }, totalTime);
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
        console.log('[GameController] render() - Debug mode:', debugMode, 'Debug states:', this.debugTileStates.size);
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
    console.log('[GameController] New game started, reset all tracking');
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