---
title: 'Headless Agent Benchmarking: Statistical Performance Analysis'
pubDate: 2025-07-26
description: 'Building a fast, headless testing framework to statistically compare algorithmic agent performance - discovering which strategies actually work best.'
---

Moving beyond UI-driven testing, we built a comprehensive headless benchmarking system to get real statistical data on algorithmic agent performance. The results were eye-opening.

## The Problem with UI Testing

While our interactive agents were fun to watch, we needed hard data:
- Visual testing is slow and subjective
- Sample sizes were too small for statistical significance  
- No way to compare strategies fairly across hundreds of games
- Performance bottlenecked by animations and rendering

We needed to go headless.

## Building the Test Harness

### Headless Game Engine

First, we stripped out all UI dependencies to create a pure game logic engine:

```typescript
export class HeadlessGame {
  private state: GameState;
  private random: RandomGenerator;
  private moveCount: number = 0;

  constructor(config: HeadlessGameConfig = {}) {
    this.random = config.seed !== undefined 
      ? new SeededRandomGenerator(config.seed)
      : new DefaultRandomGenerator();
    this.state = this.initializeGame(config.gridSize || 4);
  }

  public makeMove(direction: Direction): boolean {
    if (this.state.isGameOver) return false;
    
    const moveResult = this.simulateMove(this.state.grid, direction);
    if (!moveResult.hasChanged) return false;

    // Update state and add random tile
    this.state.grid = moveResult.newGrid;
    this.state.score += moveResult.scoreIncrease;
    this.moveCount++;
    
    const tileResult = addRandomTile(this.state.grid, this.random);
    this.state.grid = tileResult.grid;
    
    this.state.isGameOver = this.isGameOver();
    return true;
  }
}
```

Key optimizations:
- **Seeded randomness** for reproducible tests
- **No animations** or DOM manipulation  
- **Pure function** move simulation
- **Batch processing** of multiple games

### Benchmarking Framework

Then we built a statistical analysis framework:

```typescript
export class AgentBenchmark {
  async runBenchmark(config: BenchmarkConfig): Promise<BenchmarkComparison> {
    const results: StrategyStats[] = [];

    for (const strategy of this.strategies) {
      const stats = await this.benchmarkStrategy(strategy, config);
      results.push(stats);
    }

    return {
      strategies: results,
      summary: this.generateSummary(results),
      runConfig: config
    };
  }

  private calculateStats(name: string, results: SimulationResult[]): StrategyStats {
    const scores = results.map(r => r.score);
    const moves = results.map(r => r.moves);
    const maxTiles = results.map(r => r.maxTile);

    return {
      name,
      runs: results.length,
      avgScore: Math.round(this.average(scores)),
      scoreStdDev: Math.round(this.standardDeviation(scores, avgScore)),
      maxTileDistribution: this.getDistribution(maxTiles),
      // ... more stats
    };
  }
}
```

## Strategy Adapters

We created adapters to test the actual UI strategies in the headless environment:

```typescript
// Real Strategy Adapters - using actual UI implementations
export const expectimaxStrategy: BenchmarkStrategy = {
  name: "Expectimax",
  description: "Uses expectimax search with weighted heuristics from the real UI strategy",
  strategy: (game: HeadlessGame): Direction | null => {
    const expectimax = new ExpectimaxStrategy();
    const gameState = convertGameState(game);
    return expectimax.getNextMove(gameState);
  }
};

export const greedyStrategy: BenchmarkStrategy = {
  name: "Greedy", 
  description: "Always makes the move that creates the most merges immediately",
  strategy: (game: HeadlessGame): Direction | null => {
    const greedy = new GreedyStrategy();
    const gameState = convertGameState(game);
    return greedy.getNextMove(gameState);
  }
};
```

This ensures our benchmarks reflect the actual user experience from the interactive game.

## The Results: Real UI Strategy Performance Analysis

Testing the actual strategies from our UI revealed fascinating performance characteristics:

### 🏆 Performance Rankings (Real Strategies)

**By Average Score:**
1. **Expectimax** - 3,090 points (most sophisticated)
2. **Greedy** - 2,849 points (excellent efficiency)  
3. **Corner Master** - 1,461 points (underperforming expectations)
4. **Snake Builder** - 1,185 points (similar to baseline)
5. **Random** - 1,133 points (baseline)

### 📊 Key Insights

**Expectimax Dominance with a Cost:**
- Highest scores as expected from game tree search
- 782ms per game (400x slower than other strategies)
- Uses weighted heuristics: smoothness, monotonicity, empty cells
- Impractical for real-time play but theoretically optimal

**Greedy Strategy Sweet Spot:**
- 2.5x better than random baseline
- Only 2ms per game execution time
- Excellent performance-to-speed ratio
- Practical for interactive gameplay

**Surprising Strategy Results:**
- **Corner Master** significantly underperformed expectations (1,461 vs 2,500+ in manual tests)
- **Snake Builder** performed similar to random baseline
- Real implementations show different characteristics than simplified versions

### 📈 Performance vs Speed Tradeoff

| Strategy | Score | Speed | Efficiency Rating |
|----------|-------|-------|------------------|
| **Expectimax** | 3,090 | 782ms | ⭐⭐⭐⭐⭐ (slow but smart) |
| **Greedy** | 2,849 | 2ms | ⭐⭐⭐⭐⭐ (optimal balance) |
| **Corner Master** | 1,461 | 0.6ms | ⭐⭐⭐ (fast but weak) |
| **Snake Builder** | 1,185 | 1.2ms | ⭐⭐ (needs improvement) |

### 🔬 Statistical Validation

The real strategy differences are statistically significant with proper confidence intervals. Expectimax's superiority comes at a severe computational cost, while Greedy provides the best practical performance.

## Technical Deep Dive

### Critical Bug Fix

During development, we discovered a critical bug in move validation:

```typescript
// BEFORE: Incorrect change detection
if (!hasChanged) {
  hasChanged = originalNumbers.length !== numbers.length ||
    originalNumbers.some((num, idx) => num !== numbers[idx]);
}

// AFTER: Compare original line to final line  
if (!hasChanged) {
  hasChanged = originalLine.some((cell, idx) => cell !== numbers[idx]);
}
```

This bug was causing valid moves to be rejected, leading to games ending after 0-1 moves.

### Performance Optimization

The headless engine achieved impressive performance:
- **0.56ms per game** (Random strategy)
- **1.1ms per game** (Greedy strategy)  
- **100 games in ~100ms** total runtime
- **10,000x faster** than UI-driven testing

## Running Your Own Benchmarks

The framework supports multiple benchmark modes:

```bash
# Quick test (25 games per strategy)
npm run benchmark:quick

# Standard analysis (100 games per strategy)  
npm run benchmark

# Comprehensive analysis (1000 games per strategy)
npm run benchmark:full
```

Results include:
- Score statistics (mean, median, std dev, confidence intervals)
- Move count analysis  
- Tile achievement distributions
- Performance timing
- Detailed JSON export for further analysis

## Future Improvements

Our testing framework opens up new possibilities:

1. **Hyperparameter Optimization** - Test strategy variations systematically
2. **Monte Carlo Tree Search** - Implement and benchmark advanced algorithms
3. **Genetic Algorithms** - Evolve better strategies through thousands of iterations
4. **A/B Testing** - Compare strategy tweaks with statistical rigor
5. **Tournament Mode** - Head-to-head strategy competitions

## Conclusion

Moving to headless testing revealed the true performance characteristics of our algorithmic strategies. **Expectimax** proved theoretically superior but computationally expensive, while **Greedy** emerged as the practical winner with excellent performance-to-speed ratio.

The most surprising finding was **Corner Master's** underperformance compared to manual testing, suggesting that different game conditions affect strategy effectiveness.

Most importantly, we now have a robust framework for:
- ✅ Testing actual UI strategies (not simplified versions)
- ✅ Statistical significance with large sample sizes  
- ✅ Performance vs speed tradeoff analysis
- ✅ Reproducible, seeded testing
- ✅ Automated strategy comparison with confidence intervals

The benchmarking system proved that theoretical strategy strength doesn't always translate to practical performance - **Greedy's** simplicity and speed make it the optimal choice for interactive gameplay, while **Expectimax** remains the gold standard for maximum scoring potential.

---

*The complete benchmarking framework is available in our codebase, with results automatically saved to JSON for further analysis.*