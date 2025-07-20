import { GameAgent, GameState, Direction, AgentConfig, PlayStrategy } from './types';
import { CornerStrategy } from './strategies/cornerStrategy';
import { SnakeStrategy } from './strategies/snakeStrategy';
import { GreedyStrategy } from './strategies/greedyStrategy';

export class AlgorithmicAgent implements GameAgent {
  name: string;
  type: 'player' | 'coach' = 'player';
  latency = 'instant' as const;
  
  private strategy: PlayStrategy;
  private speed: number; // moves per second
  private explainMoves: boolean;
  private isPlaying: boolean = false;
  private moveTimeout: NodeJS.Timeout | null = null;
  
  constructor(config: AgentConfig = {}) {
    this.speed = config.speed ?? 2; // Default 2 moves per second
    this.explainMoves = config.explainMoves ?? true;
    
    // Select strategy
    const strategyName = config.strategy ?? 'corner';
    this.strategy = this.createStrategy(strategyName);
    this.name = this.strategy.name;
  }
  
  private createStrategy(name: string): PlayStrategy {
    switch (name) {
      case 'snake':
        return new SnakeStrategy();
      case 'greedy':
        return new GreedyStrategy();
      case 'corner':
      default:
        return new CornerStrategy();
    }
  }
  
  async initialize(): Promise<void> {
    // No initialization needed for algorithmic agents
  }
  
  destroy(): void {
    this.stopPlaying();
  }
  
  async getNextMove(gameState: GameState): Promise<Direction | null> {
    if (gameState.isGameOver) {
      return null;
    }
    
    const move = this.strategy.getNextMove(gameState);
    
    if (move && this.explainMoves) {
      // Could emit explanation event here
      console.log(`${this.strategy.icon} ${this.strategy.explainMove(move, gameState)}`);
    }
    
    return move;
  }
  
  startPlaying(onMove: (move: Direction) => void, getState: () => GameState): void {
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    
    const makeMove = async () => {
      if (!this.isPlaying) return;
      
      const state = getState();
      const move = await this.getNextMove(state);
      
      if (move) {
        onMove(move);
      }
      
      if (this.isPlaying && !state.isGameOver) {
        // Schedule next move based on speed
        const delay = 1000 / this.speed;
        this.moveTimeout = setTimeout(makeMove, delay);
      } else {
        this.isPlaying = false;
      }
    };
    
    // Start the first move
    makeMove();
  }
  
  stopPlaying(): void {
    this.isPlaying = false;
    if (this.moveTimeout) {
      clearTimeout(this.moveTimeout);
      this.moveTimeout = null;
    }
  }
  
  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }
  
  setSpeed(movesPerSecond: number): void {
    this.speed = Math.max(0.5, Math.min(10, movesPerSecond));
  }
  
  getSpeed(): number {
    return this.speed;
  }
  
  setExplainMoves(explain: boolean): void {
    this.explainMoves = explain;
  }
}