import { GameAgent, GameState, Direction, AgentConfig, PlayStrategy } from './types';
import { CornerStrategy } from './strategies/cornerStrategy';
import { SnakeStrategy } from './strategies/snakeStrategy';
import { GreedyStrategy } from './strategies/greedyStrategy';
import { ExpectimaxStrategy } from './strategies/expectimaxStrategy';
import { SmoothnessStrategy } from './strategies/smoothnessStrategy';

export class AlgorithmicAgent implements GameAgent {
  name: string;
  type: 'player' | 'coach' = 'player';
  latency = 'instant' as const;
  
  private strategy: PlayStrategy;
  private speed: number; // moves per second
  private explainMoves: boolean;
  private isPlaying: boolean = false;
  private moveTimeout: NodeJS.Timeout | null = null;
  private onExplanation?: (explanation: string) => void;
  
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
      case 'expectimax':
        return new ExpectimaxStrategy();
      case 'smoothness':
        return new SmoothnessStrategy();
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
      const explanation = this.strategy.explainMove(move, gameState);
      console.log('[Agent] Move explanation:', explanation);
      if (this.onExplanation) {
        this.onExplanation(explanation);
      }
    }
    
    return move;
  }
  
  getMoveAlternatives(gameState: GameState): { validMoves: string[]; analysis: Record<string, any> } | null {
    if (this.strategy.evaluateAllMoves) {
      const evaluation = this.strategy.evaluateAllMoves(gameState);
      return {
        validMoves: evaluation.validMoves,
        analysis: evaluation.evaluations
      };
    }
    return null;
  }
  
  startPlaying(onMove: (move: Direction, stateBefore?: GameState) => void, getState: () => GameState): void {
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    
    const makeMove = async () => {
      if (!this.isPlaying) return;
      
      const state = getState();
      const move = await this.getNextMove(state);
      
      if (move) {
        // Pass the state we used for decision making along with the move
        onMove(move, state);
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
  
  setOnExplanation(callback: (explanation: string) => void): void {
    this.onExplanation = callback;
  }
}