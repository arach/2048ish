/**
 * Agent benchmarking framework for statistical performance analysis
 */

import { HeadlessGame, runSimulation, SimulationResult, HeadlessGameConfig } from '../game/headlessGame';
import { Direction } from '../game/logic';

export interface BenchmarkStrategy {
  name: string;
  description: string;
  strategy: (game: HeadlessGame) => Direction | null;
}

export interface BenchmarkConfig {
  runs: number;
  seedStart?: number;
  useRandomSeeds?: boolean;
  gameConfig?: HeadlessGameConfig;
  maxMoves?: number;
  progressCallback?: (completed: number, total: number, strategy: string) => void;
}

export interface StrategyStats {
  name: string;
  runs: number;
  
  // Score statistics
  avgScore: number;
  medianScore: number;
  minScore: number;
  maxScore: number;
  scoreStdDev: number;
  
  // Move statistics
  avgMoves: number;
  medianMoves: number;
  minMoves: number;
  maxMoves: number;
  movesStdDev: number;
  
  // Tile statistics
  avgMaxTile: number;
  medianMaxTile: number;
  minMaxTile: number;
  maxMaxTile: number;
  maxTileDistribution: Record<number, number>;
  
  // Success rates
  winRate: number; // Percentage reaching win tile
  gameOverRate: number; // Percentage ending in game over vs timeout
  
  // Performance
  avgDuration: number;
  totalDuration: number;
  
  // Raw results for further analysis
  results: SimulationResult[];
}

export interface BenchmarkComparison {
  strategies: StrategyStats[];
  summary: {
    bestByScore: string;
    bestByWinRate: string;
    bestByMoves: string;
    fastestStrategy: string;
  };
  runConfig: BenchmarkConfig;
}

export class AgentBenchmark {
  private strategies: BenchmarkStrategy[] = [];

  addStrategy(strategy: BenchmarkStrategy): void {
    this.strategies.push(strategy);
  }

  addStrategies(strategies: BenchmarkStrategy[]): void {
    this.strategies.push(...strategies);
  }

  async runBenchmark(config: BenchmarkConfig): Promise<BenchmarkComparison> {
    const results: StrategyStats[] = [];

    for (const strategy of this.strategies) {
      console.log(`\nBenchmarking strategy: ${strategy.name}`);
      const stats = await this.benchmarkStrategy(strategy, config);
      results.push(stats);
    }

    return {
      strategies: results,
      summary: this.generateSummary(results),
      runConfig: config
    };
  }

  private async benchmarkStrategy(
    strategy: BenchmarkStrategy, 
    config: BenchmarkConfig
  ): Promise<StrategyStats> {
    const results: SimulationResult[] = [];
    const startTime = performance.now();

    for (let i = 0; i < config.runs; i++) {
      const seed = config.useRandomSeeds 
        ? Math.floor(Math.random() * 1000000)
        : (config.seedStart || 0) + i;

      const gameConfig: HeadlessGameConfig = {
        ...config.gameConfig,
        seed
      };

      const result = runSimulation(strategy.strategy, gameConfig);
      results.push(result);

      if (config.progressCallback) {
        config.progressCallback(i + 1, config.runs, strategy.name);
      }
    }

    const endTime = performance.now();
    return this.calculateStats(strategy.name, results, endTime - startTime);
  }

  private calculateStats(name: string, results: SimulationResult[], totalDuration: number): StrategyStats {
    const scores = results.map(r => r.score);
    const moves = results.map(r => r.moves);
    const maxTiles = results.map(r => r.maxTile);
    const durations = results.map(r => r.duration);

    // Score statistics
    const sortedScores = [...scores].sort((a, b) => a - b);
    const avgScore = this.average(scores);
    const medianScore = this.median(sortedScores);
    const scoreStdDev = this.standardDeviation(scores, avgScore);

    // Move statistics  
    const sortedMoves = [...moves].sort((a, b) => a - b);
    const avgMoves = this.average(moves);
    const medianMoves = this.median(sortedMoves);
    const movesStdDev = this.standardDeviation(moves, avgMoves);

    // Tile statistics
    const sortedMaxTiles = [...maxTiles].sort((a, b) => a - b);
    const avgMaxTile = this.average(maxTiles);
    const medianMaxTile = this.median(sortedMaxTiles);

    // Max tile distribution
    const maxTileDistribution: Record<number, number> = {};
    maxTiles.forEach(tile => {
      maxTileDistribution[tile] = (maxTileDistribution[tile] || 0) + 1;
    });

    // Success rates
    const wins = results.filter(r => r.isWin).length;
    const gameOvers = results.filter(r => r.isGameOver).length;

    return {
      name,
      runs: results.length,
      
      avgScore: Math.round(avgScore),
      medianScore: medianScore,
      minScore: Math.min(...scores),
      maxScore: Math.max(...scores),
      scoreStdDev: Math.round(scoreStdDev),
      
      avgMoves: Math.round(avgMoves),
      medianMoves: medianMoves,
      minMoves: Math.min(...moves),
      maxMoves: Math.max(...moves),
      movesStdDev: Math.round(movesStdDev),
      
      avgMaxTile: Math.round(avgMaxTile),
      medianMaxTile: medianMaxTile,
      minMaxTile: Math.min(...maxTiles),
      maxMaxTile: Math.max(...maxTiles),
      maxTileDistribution,
      
      winRate: Math.round((wins / results.length) * 100 * 100) / 100,
      gameOverRate: Math.round((gameOvers / results.length) * 100 * 100) / 100,
      
      avgDuration: Math.round(this.average(durations) * 100) / 100,
      totalDuration: Math.round(totalDuration),
      
      results
    };
  }

  private generateSummary(strategies: StrategyStats[]) {
    const bestByScore = strategies.reduce((best, current) => 
      current.avgScore > best.avgScore ? current : best
    );
    
    const bestByWinRate = strategies.reduce((best, current) => 
      current.winRate > best.winRate ? current : best
    );
    
    const bestByMoves = strategies.reduce((best, current) => 
      current.avgMoves > best.avgMoves ? current : best
    );
    
    const fastestStrategy = strategies.reduce((fastest, current) => 
      current.avgDuration < fastest.avgDuration ? current : fastest
    );

    return {
      bestByScore: bestByScore.name,
      bestByWinRate: bestByWinRate.name,
      bestByMoves: bestByMoves.name,
      fastestStrategy: fastestStrategy.name
    };
  }

  private average(numbers: number[]): number {
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  private median(sortedNumbers: number[]): number {
    const mid = Math.floor(sortedNumbers.length / 2);
    return sortedNumbers.length % 2 === 0
      ? (sortedNumbers[mid - 1] + sortedNumbers[mid]) / 2
      : sortedNumbers[mid];
  }

  private standardDeviation(numbers: number[], mean: number): number {
    const squaredDifferences = numbers.map(n => Math.pow(n - mean, 2));
    const avgSquaredDiff = this.average(squaredDifferences);
    return Math.sqrt(avgSquaredDiff);
  }

  // Utility method to format results for console output
  formatResults(comparison: BenchmarkComparison): string {
    let output = '\n=== AGENT BENCHMARK RESULTS ===\n\n';
    
    output += `Configuration: ${comparison.runConfig.runs} runs per strategy\n\n`;

    // Summary table
    output += 'SUMMARY:\n';
    output += `Best by Score: ${comparison.summary.bestByScore}\n`;
    output += `Best by Win Rate: ${comparison.summary.bestByWinRate}\n`;
    output += `Most Moves: ${comparison.summary.bestByMoves}\n`;
    output += `Fastest: ${comparison.summary.fastestStrategy}\n\n`;

    // Detailed stats table
    output += 'DETAILED STATISTICS:\n\n';
    output += '| Strategy | Avg Score | Win Rate | Avg Moves | Max Tile | Avg Time |\n';
    output += '|----------|-----------|----------|-----------|----------|----------|\n';

    for (const stats of comparison.strategies) {
      const name = stats.name.padEnd(8);
      const score = stats.avgScore.toString().padStart(9);
      const winRate = `${stats.winRate}%`.padStart(8);
      const moves = stats.avgMoves.toString().padStart(9);
      const maxTile = stats.avgMaxTile.toString().padStart(8);
      const time = `${stats.avgDuration}ms`.padStart(8);
      
      output += `| ${name} | ${score} | ${winRate} | ${moves} | ${maxTile} | ${time} |\n`;
    }

    output += '\n';

    // Individual strategy details
    for (const stats of comparison.strategies) {
      output += `${stats.name.toUpperCase()}:\n`;
      output += `  Score: ${stats.avgScore} ± ${stats.scoreStdDev} (${stats.minScore}-${stats.maxScore})\n`;
      output += `  Moves: ${stats.avgMoves} ± ${stats.movesStdDev} (${stats.minMoves}-${stats.maxMoves})\n`;
      output += `  Max Tile: ${stats.avgMaxTile} (${stats.minMaxTile}-${stats.maxMaxTile})\n`;
      output += `  Win Rate: ${stats.winRate}% | Game Over Rate: ${stats.gameOverRate}%\n`;
      output += `  Performance: ${stats.avgDuration}ms avg, ${stats.totalDuration}ms total\n`;
      output += `  Max Tile Distribution: ${JSON.stringify(stats.maxTileDistribution)}\n\n`;
    }

    return output;
  }
}

// Export helper function for quick benchmarking
export async function quickBenchmark(
  strategies: BenchmarkStrategy[],
  runs: number = 100
): Promise<string> {
  const benchmark = new AgentBenchmark();
  benchmark.addStrategies(strategies);
  
  const results = await benchmark.runBenchmark({
    runs,
    useRandomSeeds: true,
    progressCallback: (completed, total, strategy) => {
      if (completed % 10 === 0 || completed === total) {
        console.log(`${strategy}: ${completed}/${total} complete`);
      }
    }
  });
  
  return benchmark.formatResults(results);
}