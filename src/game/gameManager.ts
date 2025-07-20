import { GameState, Direction, initializeGame, makeMove, serializeGameState, deserializeGameState, RandomGenerator, DefaultRandomGenerator, SeededRandomGenerator, moveGrid, canMove, checkWin } from './logic';

export interface GameHistory {
  states: GameState[];
  currentIndex: number;
}

export interface GameManagerConfig {
  gridSize?: number;
  maxHistorySize?: number;
  storageKey?: string;
  randomSeed?: number;
}

export class GameManager {
  private history: GameHistory;
  private config: Required<GameManagerConfig>;
  private listeners: Set<(state: GameState) => void> = new Set();
  private randomGenerator: RandomGenerator;

  constructor(config: GameManagerConfig = {}) {
    this.config = {
      gridSize: config.gridSize ?? 4,
      maxHistorySize: config.maxHistorySize ?? 100,
      storageKey: config.storageKey ?? '2048-game-state',
      randomSeed: config.randomSeed ?? 0
    };
    
    this.randomGenerator = this.config.randomSeed > 0 
      ? new SeededRandomGenerator(this.config.randomSeed)
      : new DefaultRandomGenerator();
    
    this.history = {
      states: [],
      currentIndex: -1
    };
    
    this.loadOrInitialize();
  }

  private loadOrInitialize(): void {
    const saved = this.loadFromStorage();
    if (saved) {
      this.history = saved;
    } else {
      this.newGame();
    }
  }

  public newGame(): void {
    const initialState = initializeGame(this.config.gridSize, this.randomGenerator);
    this.history = {
      states: [initialState],
      currentIndex: 0
    };
    this.saveToStorage();
    this.notifyListeners();
  }

  public getCurrentState(): GameState {
    return this.history.states[this.history.currentIndex];
  }

  public move(direction: Direction): boolean {
    const currentState = this.getCurrentState();
    const newState = makeMove(currentState, direction, this.randomGenerator);
    
    // If the state didn't change, the move was invalid
    if (newState === currentState) {
      return false;
    }
    
    // Add the new state to history
    this.addState(newState);
    return true;
  }

  public moveWithoutNewTile(direction: Direction): boolean {
    const currentState = this.getCurrentState();
    const { grid, points, hasChanged } = moveGrid(currentState.grid, direction);
    
    if (!hasChanged) {
      return false;
    }
    
    const newState: GameState = {
      grid,
      score: currentState.score + points,
      isGameOver: !canMove(grid),
      hasWon: currentState.hasWon || checkWin(grid)
    };
    
    this.addState(newState);
    return true;
  }

  private addState(state: GameState): void {
    // Remove any states after the current index (for redo functionality)
    this.history.states = this.history.states.slice(0, this.history.currentIndex + 1);
    
    // Add the new state
    this.history.states.push(state);
    this.history.currentIndex++;
    
    // Trim history if it exceeds max size
    if (this.history.states.length > this.config.maxHistorySize) {
      const overflow = this.history.states.length - this.config.maxHistorySize;
      this.history.states = this.history.states.slice(overflow);
      this.history.currentIndex -= overflow;
    }
    
    this.saveToStorage();
    this.notifyListeners();
  }

  public canUndo(): boolean {
    return this.history.currentIndex > 0;
  }

  public undo(): boolean {
    if (!this.canUndo()) {
      return false;
    }
    
    this.history.currentIndex--;
    this.saveToStorage();
    this.notifyListeners();
    return true;
  }

  public canRedo(): boolean {
    return this.history.currentIndex < this.history.states.length - 1;
  }

  public redo(): boolean {
    if (!this.canRedo()) {
      return false;
    }
    
    this.history.currentIndex++;
    this.saveToStorage();
    this.notifyListeners();
    return true;
  }

  public subscribe(listener: (state: GameState) => void): () => void {
    this.listeners.add(listener);
    // Immediately notify the new listener
    listener(this.getCurrentState());
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const state = this.getCurrentState();
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  public saveToStorage(): void {
    try {
      const serialized = JSON.stringify(this.history);
      localStorage.setItem(this.config.storageKey, serialized);
    } catch (error) {
      console.error('Failed to save game state:', error);
    }
  }

  private loadFromStorage(): GameHistory | null {
    try {
      const serialized = localStorage.getItem(this.config.storageKey);
      if (!serialized) {
        return null;
      }
      
      const history = JSON.parse(serialized) as GameHistory;
      
      // Validate the loaded data
      if (!Array.isArray(history.states) || 
          typeof history.currentIndex !== 'number' ||
          history.currentIndex < 0 || 
          history.currentIndex >= history.states.length) {
        return null;
      }
      
      return history;
    } catch (error) {
      console.error('Failed to load game state:', error);
      return null;
    }
  }

  public clearStorage(): void {
    localStorage.removeItem(this.config.storageKey);
  }

  public exportState(): string {
    return JSON.stringify(this.history);
  }

  public importState(serialized: string): boolean {
    try {
      const history = JSON.parse(serialized) as GameHistory;
      
      // Validate
      if (!Array.isArray(history.states) || 
          typeof history.currentIndex !== 'number' ||
          history.currentIndex < 0 || 
          history.currentIndex >= history.states.length) {
        return false;
      }
      
      this.history = history;
      this.saveToStorage();
      this.notifyListeners();
      return true;
    } catch (error) {
      console.error('Failed to import game state:', error);
      return false;
    }
  }

  public getHistory(): GameHistory {
    return {
      states: [...this.history.states],
      currentIndex: this.history.currentIndex
    };
  }

  public jumpToState(index: number): boolean {
    if (index < 0 || index >= this.history.states.length) {
      return false;
    }
    
    this.history.currentIndex = index;
    this.saveToStorage();
    this.notifyListeners();
    return true;
  }

  public getStats(): {
    score: number;
    moves: number;
    maxTile: number;
    isGameOver: boolean;
    hasWon: boolean;
  } {
    const state = this.getCurrentState();
    const maxTile = Math.max(...state.grid.flat().filter(cell => cell !== null) as number[]);
    
    return {
      score: state.score,
      moves: this.history.currentIndex,
      maxTile,
      isGameOver: state.isGameOver,
      hasWon: state.hasWon
    };
  }
}