import { GameState, Grid, Direction, Cell, initializeGame, makeMove } from './logic';
import { GameController } from './gameController';
import { CanvasRenderer } from './renderer';

export interface GameSequence {
  moves: Direction[];
  expectedScore?: number;
  expectedMaxTile?: number;
  description?: string;
}

export interface SnapshotOptions {
  name: string;
  format?: 'png' | 'jpeg';
  quality?: number;
}

export class GameTestUtils {
  private controller: GameController | null = null;
  private snapshots: Map<string, string> = new Map();
  
  public createController(canvas: HTMLCanvasElement, animationDuration: number = 0): GameController {
    this.controller = new GameController({
      canvas,
      animationDuration // Set to 0 for instant animations in tests
    });
    return this.controller;
  }

  public createMockCanvas(width: number = 500, height: number = 500): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  public setFixedGrid(grid: Grid): GameState {
    const state: GameState = {
      grid,
      score: 0,
      isGameOver: false,
      hasWon: false
    };
    
    if (this.controller) {
      this.controller.importState(JSON.stringify({
        states: [state],
        currentIndex: 0
      }));
    }
    
    return state;
  }

  public createGridFromArray(array: (number | null)[][]): Grid {
    return array;
  }

  public async playSequence(sequence: GameSequence): Promise<{
    finalState: GameState;
    snapshots: string[];
    success: boolean;
  }> {
    if (!this.controller) {
      throw new Error('Controller not initialized. Call createController first.');
    }
    
    const snapshots: string[] = [];
    
    // Take initial snapshot
    snapshots.push(this.controller.snapshot());
    
    // Play moves
    for (const move of sequence.moves) {
      this.controller.simulateMove(move);
      
      // Force complete animations for testing
      this.controller.forceCompleteAnimations();
      
      // Take snapshot after each move
      snapshots.push(this.controller.snapshot());
    }
    
    const finalState = this.controller.getGameState();
    const stats = this.controller.getStats();
    
    // Verify expectations
    let success = true;
    if (sequence.expectedScore !== undefined && stats.score !== sequence.expectedScore) {
      console.error(`Score mismatch: expected ${sequence.expectedScore}, got ${stats.score}`);
      success = false;
    }
    
    if (sequence.expectedMaxTile !== undefined && stats.maxTile !== sequence.expectedMaxTile) {
      console.error(`Max tile mismatch: expected ${sequence.expectedMaxTile}, got ${stats.maxTile}`);
      success = false;
    }
    
    return {
      finalState,
      snapshots,
      success
    };
  }

  public takeSnapshot(options: SnapshotOptions): string {
    if (!this.controller) {
      throw new Error('Controller not initialized. Call createController first.');
    }
    
    const snapshot = this.controller.snapshot();
    this.snapshots.set(options.name, snapshot);
    return snapshot;
  }

  public compareSnapshots(name1: string, name2: string): boolean {
    const snapshot1 = this.snapshots.get(name1);
    const snapshot2 = this.snapshots.get(name2);
    
    if (!snapshot1 || !snapshot2) {
      throw new Error('Snapshot not found');
    }
    
    return snapshot1 === snapshot2;
  }

  public async compareCanvasPixels(canvas1: HTMLCanvasElement, canvas2: HTMLCanvasElement): Promise<boolean> {
    const ctx1 = canvas1.getContext('2d');
    const ctx2 = canvas2.getContext('2d');
    
    if (!ctx1 || !ctx2) {
      throw new Error('Could not get canvas context');
    }
    
    const imageData1 = ctx1.getImageData(0, 0, canvas1.width, canvas1.height);
    const imageData2 = ctx2.getImageData(0, 0, canvas2.width, canvas2.height);
    
    if (imageData1.data.length !== imageData2.data.length) {
      return false;
    }
    
    for (let i = 0; i < imageData1.data.length; i++) {
      if (imageData1.data[i] !== imageData2.data[i]) {
        return false;
      }
    }
    
    return true;
  }

  public renderGridDirectly(canvas: HTMLCanvasElement, grid: Grid): void {
    const renderer = new CanvasRenderer(canvas);
    renderer.render(grid);
  }

  public exportSnapshots(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [name, data] of this.snapshots) {
      result[name] = data;
    }
    return result;
  }

  public importSnapshots(snapshots: Record<string, string>): void {
    this.snapshots.clear();
    for (const [name, data] of Object.entries(snapshots)) {
      this.snapshots.set(name, data);
    }
  }

  // Deterministic game sequences for testing
  public getPredefinedSequences(): Record<string, GameSequence> {
    return {
      simpleHorizontalMerge: {
        moves: ['left', 'right', 'left', 'right'],
        description: 'Basic horizontal merging test'
      },
      verticalMerge: {
        moves: ['up', 'down', 'up', 'down'],
        description: 'Basic vertical merging test'
      },
      cornerStrategy: {
        moves: ['up', 'left', 'up', 'left', 'up', 'left'],
        description: 'Corner strategy pattern'
      },
      fullGame: {
        moves: Array(50).fill(null).flatMap(() => ['up', 'left', 'down', 'right']),
        description: 'Extended gameplay sequence'
      }
    };
  }

  // Helper to create specific game scenarios
  public createScenario(name: string): Grid {
    const scenarios: Record<string, Grid> = {
      almostWin: [
        [1024, 512, 256, 128],
        [512, 256, 128, 64],
        [256, 128, 64, 32],
        [128, 64, 32, 2]
      ],
      gameOver: [
        [2, 4, 2, 4],
        [4, 2, 4, 2],
        [2, 4, 2, 4],
        [4, 2, 4, 2]
      ],
      empty: [
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null]
      ],
      singleTile: [
        [2, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null]
      ]
    };
    
    return scenarios[name] || scenarios.empty;
  }

  public cleanup(): void {
    if (this.controller) {
      this.controller.destroy();
      this.controller = null;
    }
    this.snapshots.clear();
  }
}

// Standalone test functions for pure logic testing
export function testMoveSequence(initialGrid: Grid, moves: Direction[]): GameState {
  let state: GameState = {
    grid: initialGrid,
    score: 0,
    isGameOver: false,
    hasWon: false
  };
  
  for (const move of moves) {
    state = makeMove(state, move);
  }
  
  return state;
}

export function generateRandomMoves(count: number): Direction[] {
  const directions: Direction[] = ['up', 'down', 'left', 'right'];
  return Array(count).fill(null).map(() => 
    directions[Math.floor(Math.random() * directions.length)]
  );
}

export function createDeterministicRandom(seed: number): () => number {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}