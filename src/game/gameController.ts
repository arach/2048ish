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
  private pendingNewTile: { pos: [number, number]; value: number } | null = null;
  private tileStates: Map<string, 'new' | 'merged' | 'moved'> = new Map();
  private debugTileStates: Map<string, 'new' | 'merged' | 'moved'> = new Map(); // Separate debug snapshot
  private lastMoves: Move[] = [];
  private debugMoves: Move[] = []; // Separate debug snapshot
  private hasCompletedFirstMove: boolean = false; // Track if we've completed at least one move
  
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
    
    // Initialize components
    this.gameManager = new GameManager({ gridSize: config.gridSize });
    this.renderer = new CanvasRenderer(config.canvas, {
      animationStyle: config.animationStyle,
      easingFunction: config.easingFunction
    });
    this.inputHandler = new InputHandler(config.canvas);
    
    // Set up animation controller
    this.animationController = new AnimationController(
      config.animationDuration ?? 125,  // Faster default: 125ms
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
    
    // Don't clear tile states here - let them persist until next move starts
    // This ensures debug components can read them
    // this.tileStates.clear();
    
    // Start animation
    this.isAnimating = true;
    
    // Set up animations with proper sequencing
    const animDuration = this.config.animationDuration ?? 125;
    
    // Clear previous tile states now that we're starting a new move
    this.tileStates.clear();
    console.log('[GameController] Starting move', this.moveCount, 'cleared working tile states');
    
    // Build new debug states without clearing first
    const newDebugTileStates = new Map<string, 'new' | 'merged' | 'moved'>();
    
    // Phase 1: Add all move animations and start them
    for (const move of moveResult.moves) {
      this.animationController.addMoveAnimation(move);
      // Track moved tiles
      const toKey = `${move.to[0]},${move.to[1]}`;
      this.tileStates.set(toKey, move.merged ? 'merged' : 'moved');
      // Add to new debug states
      newDebugTileStates.set(toKey, move.merged ? 'merged' : 'moved');
      console.log(`[GameController] Move ${this.moveCount}: Tracked ${move.merged ? 'merged' : 'moved'} tile at ${toKey}`);
    }
    
    // Replace debug states atomically only after we have the new ones ready
    if (this.hasCompletedFirstMove) {
      console.log('[GameController] Replacing debug states for move', this.moveCount, '- Old size:', this.debugTileStates.size, 'New size:', newDebugTileStates.size);
      this.debugTileStates = newDebugTileStates;
      this.debugMoves = [];
    } else {
      // First move - just add to existing (empty) map
      newDebugTileStates.forEach((value, key) => {
        this.debugTileStates.set(key, value);
      });
    }
    // Store the moves for reference
    this.lastMoves = [...moveResult.moves];
    this.debugMoves = [...moveResult.moves];
    console.log('[GameController] Move', this.moveCount, '- Total moves:', this.lastMoves.length, 'Debug states after moves:', this.debugTileStates.size);
    
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
    
    // Delay the actual game state update until after move animations
    setTimeout(() => {
      // Now execute the actual move to update game state
      let gameMoveResult;
      if (this.config.testMode) {
        const moved = this.gameManager.moveWithoutNewTile(direction);
        gameMoveResult = { success: moved, moves: [], newTilePosition: null };
      } else {
        gameMoveResult = this.gameManager.move(direction);
      }
      
      // Phase 2: Start merge animations
      if (hasMerges) {
        // Add all merge animations
        for (const move of merges) {
          this.animationController.addMergeAnimation(move.to, move.value);
        }
        // Start merge animations
        this.animationController.start();
      }
      
      // Phase 3: Schedule new tile for after merges
      if (gameMoveResult.success && gameMoveResult.newTilePosition) {
        const newState = this.gameManager.getCurrentState();
        const [row, col] = gameMoveResult.newTilePosition;
        const value = newState.grid[row][col]!;
        
        this.pendingNewTile = {
          pos: gameMoveResult.newTilePosition,
          value
        };
        
        // Calculate when to show new tile
        const newTileDelay = hasMerges ? animDuration + 50 : 50;
        
        setTimeout(() => {
          if (this.pendingNewTile) {
            this.animationController.addAppearAnimation(
              this.pendingNewTile.pos, 
              this.pendingNewTile.value
            );
            this.animationController.start();
            
            // Track new tile - we KNOW this is a new tile because the game logic told us
            const newKey = `${this.pendingNewTile.pos[0]},${this.pendingNewTile.pos[1]}`;
            this.tileStates.set(newKey, 'new');
            
            // Important: Add to the current debugTileStates Map instance
            this.debugTileStates.set(newKey, 'new');
            
            console.log('[GameController] New tile spawned at:', newKey, 'with value:', this.pendingNewTile.value);
            console.log('[GameController] Debug states after new tile:', this.debugTileStates.size, 'states');
            console.log('[GameController] All debug states now:', Array.from(this.debugTileStates.entries()));
            
            this.pendingNewTile = null;
            
            // Force a render update to show the new state
            this.render();
            
            // Notify any listeners that state has changed
            this.gameManager.notifySubscribers();
          }
        }, newTileDelay);
      }
    }, animDuration);
    
    // Calculate total animation time based on sequence
    // Phase 1: Move (animDuration)
    // Phase 2: Merge if needed (animDuration) 
    // Phase 3: New tile if spawned (50ms delay + animDuration)
    
    let totalAnimTime = animDuration; // Base move time (includes state update delay)
    if (hasMerges) {
      totalAnimTime += animDuration; // Add merge animation time
    }
    if (willMove && !this.config.testMode) {
      totalAnimTime += 50 + animDuration; // Small delay + appear animation
    }
    
    // Schedule end of animation
    setTimeout(() => {
      this.isAnimating = false;
      this.hasCompletedFirstMove = true;
      this.render();
      this.processNextQueuedMove();
    }, totalAnimTime);
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
    // Always update tile states in renderer for debug mode
    if (this.renderer.setDebugMode && this.renderer.getDebugMode) {
      const debugMode = this.renderer.getDebugMode();
      console.log('[GameController] render() - Debug mode:', debugMode, 'Debug states:', this.debugTileStates.size);
      // Use debug states for the overlay since they persist longer
      this.renderer.setDebugMode(debugMode, this.debugTileStates);
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
    return this.config.animationDuration ?? 125;
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
  
  public getTileStates(): Map<string, 'new' | 'merged' | 'moved'> {
    // Return debug snapshot which persists longer
    const states = new Map(this.debugTileStates);
    if (states.size > 0) {
      console.log('[GameController] getTileStates called, returning', states.size, 'debug states');
    }
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
  }
  
  public getLastMoveInfo(): Move[] {
    // Return debug snapshot which persists longer
    return [...this.debugMoves];
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