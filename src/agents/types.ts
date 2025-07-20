// Agent system types and interfaces

export type Direction = 'up' | 'down' | 'left' | 'right';
export type Grid = (number | null)[][];

export interface GameState {
  grid: Grid;
  score: number;
  isGameOver: boolean;
  moveCount: number;
}

export interface MoveAnalysis {
  direction: Direction;
  score: number;
  reasoning: string;
  confidence: number;
}

export interface PlayStrategy {
  name: string;
  description: string;
  icon: string;
  getNextMove(state: GameState): Direction | null;
  explainMove(move: Direction, state: GameState): string;
}

export interface GameAgent {
  readonly name: string;
  readonly type: 'player' | 'coach';
  readonly latency: 'instant' | 'fast' | 'slow';
  
  initialize(): Promise<void>;
  destroy(): void;
  
  // For player agents
  getNextMove?(gameState: GameState): Promise<Direction | null>;
  
  // For coach agents  
  analyzePosition?(gameState: GameState): Promise<MoveAnalysis[]>;
  getHint?(): string;
}

export interface AgentConfig {
  speed?: number; // Moves per second (0.5 to 10)
  strategy?: string; // Strategy identifier
  explainMoves?: boolean;
}