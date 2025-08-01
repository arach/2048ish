/**
 * Headless game implementation for fast simulations and benchmarking
 * Strips out all UI/animation dependencies for maximum performance
 */

import { GameState, Grid, Direction, createEmptyGrid, addRandomTile, RandomGenerator, SeededRandomGenerator, DefaultRandomGenerator } from './logic';

export interface HeadlessGameConfig {
  gridSize?: number;
  seed?: number;
  winTile?: number;
}

export interface GameMove {
  moveNumber: number;
  direction: Direction;
  gridBefore: Grid;
  gridAfter: Grid;
  scoreIncrease: number;
  totalScore: number;
  reasoning?: string;
  evaluation?: any;
}

export interface GameRecording {
  startTime: number;
  endTime?: number;
  seed?: number;
  moves: GameMove[];
  finalState: GameState;
  strategy: string;
  result: SimulationResult;
}

export interface SimulationResult {
  score: number;
  moves: number;
  maxTile: number;
  isWin: boolean;
  isGameOver: boolean;
  finalGrid: Grid;
  seed?: number;
  duration: number; // milliseconds
  recording?: GameRecording;
}

export class HeadlessGame {
  private state: GameState;
  private random: RandomGenerator;
  private moveCount: number = 0;
  private winTile: number;
  private seed?: number;
  private recording?: GameRecording;
  private isRecording: boolean = false;

  constructor(config: HeadlessGameConfig = {}) {
    this.winTile = config.winTile || 2048;
    this.seed = config.seed;
    this.random = config.seed !== undefined 
      ? new SeededRandomGenerator(config.seed)
      : new DefaultRandomGenerator();
    
    // Initialize game state
    this.state = this.initializeGame(config.gridSize || 4);
  }

  private initializeGame(size: number): GameState {
    let grid = createEmptyGrid(size);
    const result1 = addRandomTile(grid, this.random);
    const result2 = addRandomTile(result1.grid, this.random);
    
    return {
      grid: result2.grid,
      score: 0,
      isGameOver: false,
      hasWon: false
    };
  }

  public makeMove(direction: Direction, reasoning?: string, evaluation?: any): boolean {
    if (this.state.isGameOver) {
      return false;
    }

    const gridBefore = this.state.grid.map(row => [...row]);
    const scoreBefore = this.state.score;

    const moveResult = this.simulateMove(this.state.grid, direction);
    
    if (!moveResult.hasChanged) {
      return false;
    }

    // Update game state
    this.state.grid = moveResult.newGrid;
    this.state.score += moveResult.scoreIncrease;
    this.moveCount++;

    // Add random tile
    const tileResult = addRandomTile(this.state.grid, this.random);
    this.state.grid = tileResult.grid;

    // Record move if recording
    if (this.isRecording && this.recording) {
      this.recording.moves.push({
        moveNumber: this.moveCount,
        direction,
        gridBefore,
        gridAfter: this.state.grid.map(row => [...row]),
        scoreIncrease: moveResult.scoreIncrease,
        totalScore: this.state.score,
        reasoning,
        evaluation
      });
    }

    // Check win condition
    if (!this.state.hasWon && this.hasWinTile()) {
      this.state.hasWon = true;
    }

    // Check game over
    this.state.isGameOver = this.isGameOver();

    return true;
  }

  public startRecording(strategyName: string): void {
    this.isRecording = true;
    this.recording = {
      startTime: Date.now(),
      seed: this.seed,
      moves: [],
      finalState: this.state,
      strategy: strategyName,
      result: {
        score: 0,
        moves: 0,
        maxTile: 0,
        isWin: false,
        isGameOver: false,
        finalGrid: [],
        duration: 0
      }
    };
  }

  public stopRecording(): GameRecording | undefined {
    if (!this.recording) return undefined;
    
    this.recording.endTime = Date.now();
    this.recording.finalState = { ...this.state };
    this.recording.result = {
      score: this.state.score,
      moves: this.moveCount,
      maxTile: this.getMaxTile(),
      isWin: this.state.hasWon,
      isGameOver: this.state.isGameOver,
      finalGrid: this.state.grid.map(row => [...row]),
      duration: this.recording.endTime - this.recording.startTime,
      seed: this.seed
    };
    
    this.isRecording = false;
    return this.recording;
  }

  private simulateMove(grid: Grid, direction: Direction): {
    newGrid: Grid;
    hasChanged: boolean;
    scoreIncrease: number;
  } {
    const size = grid.length;
    const newGrid: Grid = grid.map(row => [...row]);
    let hasChanged = false;
    let scoreIncrease = 0;

    if (direction === 'left' || direction === 'right') {
      for (let row = 0; row < size; row++) {
        const result = this.processLine(
          newGrid[row], 
          direction === 'right'
        );
        newGrid[row] = result.line;
        hasChanged = hasChanged || result.hasChanged;
        scoreIncrease += result.scoreIncrease;
      }
    } else {
      for (let col = 0; col < size; col++) {
        const column = newGrid.map(row => row[col]);
        const result = this.processLine(
          column, 
          direction === 'down'
        );
        for (let row = 0; row < size; row++) {
          newGrid[row][col] = result.line[row];
        }
        hasChanged = hasChanged || result.hasChanged;
        scoreIncrease += result.scoreIncrease;
      }
    }

    return { newGrid, hasChanged, scoreIncrease };
  }

  private processLine(line: (number | null)[], reverse: boolean): {
    line: (number | null)[];
    hasChanged: boolean;
    scoreIncrease: number;
  } {
    // Store original line for comparison
    const originalLine = [...line];
    
    // Remove nulls and reverse if needed
    let numbers = line.filter(cell => cell !== null) as number[];
    if (reverse) numbers.reverse();

    const originalNumbers = [...numbers];
    
    let scoreIncrease = 0;
    let hasChanged = false;

    // Merge adjacent identical numbers
    for (let i = 0; i < numbers.length - 1; i++) {
      if (numbers[i] === numbers[i + 1]) {
        numbers[i] *= 2;
        scoreIncrease += numbers[i];
        numbers.splice(i + 1, 1);
        hasChanged = true;
      }
    }

    // Pad with nulls
    while (numbers.length < line.length) {
      numbers.push(null);
    }

    if (reverse) numbers.reverse();

    // Check if the final line is different from the original
    if (!hasChanged) {
      hasChanged = originalLine.some((cell, idx) => cell !== numbers[idx]);
    }

    return { line: numbers, hasChanged, scoreIncrease };
  }

  private hasWinTile(): boolean {
    for (let row = 0; row < this.state.grid.length; row++) {
      for (let col = 0; col < this.state.grid[row].length; col++) {
        if (this.state.grid[row][col] === this.winTile) {
          return true;
        }
      }
    }
    return false;
  }

  private isGameOver(): boolean {
    // Check for empty cells
    for (let row = 0; row < this.state.grid.length; row++) {
      for (let col = 0; col < this.state.grid[row].length; col++) {
        if (this.state.grid[row][col] === null) {
          return false;
        }
      }
    }

    // Check for possible merges
    const directions: Direction[] = ['up', 'down', 'left', 'right'];
    for (const direction of directions) {
      const result = this.simulateMove(this.state.grid, direction);
      if (result.hasChanged) {
        return false;
      }
    }

    return true;
  }

  public getState(): GameState & { moveCount: number } {
    return {
      ...this.state,
      moveCount: this.moveCount
    };
  }

  public getMaxTile(): number {
    let max = 0;
    for (let row = 0; row < this.state.grid.length; row++) {
      for (let col = 0; col < this.state.grid[row].length; col++) {
        const value = this.state.grid[row][col];
        if (value && value > max) {
          max = value;
        }
      }
    }
    return max;
  }

  public getEmptyTiles(): number {
    let count = 0;
    for (let row = 0; row < this.state.grid.length; row++) {
      for (let col = 0; col < this.state.grid[row].length; col++) {
        if (this.state.grid[row][col] === null) {
          count++;
        }
      }
    }
    return count;
  }

  public isValidMove(direction: Direction): boolean {
    const result = this.simulateMove(this.state.grid, direction);
    return result.hasChanged;
  }

  public getValidMoves(): Direction[] {
    const directions: Direction[] = ['up', 'down', 'left', 'right'];
    return directions.filter(dir => this.isValidMove(dir));
  }

  public reset(seed?: number): void {
    this.seed = seed;
    this.random = seed !== undefined 
      ? new SeededRandomGenerator(seed)
      : new DefaultRandomGenerator();
    this.state = this.initializeGame(this.state.grid.length);
    this.moveCount = 0;
  }

  public getSeed(): number | undefined {
    return this.seed;
  }
}

export function runSimulation(
  strategy: (game: HeadlessGame) => Direction | null,
  config: HeadlessGameConfig & { recordGame?: boolean; strategyName?: string } = {}
): SimulationResult {
  const startTime = performance.now();
  const game = new HeadlessGame(config);
  let totalMoves = 0;

  // Start recording if requested
  if (config.recordGame && config.strategyName) {
    game.startRecording(config.strategyName);
  }

  while (!game.getState().isGameOver && totalMoves < 10000) { // Safety limit
    const move = strategy(game);
    if (!move || !game.makeMove(move)) {
      break;
    }
    totalMoves++;
  }

  const endTime = performance.now();
  const finalState = game.getState();

  // Stop recording and get the recording
  let recording: GameRecording | undefined;
  if (config.recordGame) {
    recording = game.stopRecording();
  }

  return {
    score: finalState.score,
    moves: totalMoves,
    maxTile: game.getMaxTile(),
    isWin: finalState.hasWon,
    isGameOver: finalState.isGameOver,
    finalGrid: finalState.grid,
    seed: game.getSeed(),
    duration: endTime - startTime,
    recording
  };
}