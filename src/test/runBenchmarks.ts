#!/usr/bin/env ts-node

/**
 * Benchmark test runner for 2048 AI agents
 * 
 * Usage:
 * npm run benchmark           # Run basic benchmark (100 games each)
 * npm run benchmark:full      # Run comprehensive benchmark (1000 games each)
 * npm run benchmark:quick     # Run quick test (25 games each)
 */

import { AgentBenchmark, quickBenchmark } from './agentBenchmark';
import { allStrategies, basicStrategies } from './strategyAdapters';

async function runQuickBenchmark() {
  console.log('🚀 Running Quick Benchmark (25 games per strategy)...\n');
  
  const results = await quickBenchmark(basicStrategies, 25);
  console.log(results);
}

async function runStandardBenchmark() {
  console.log('🎯 Running Standard Benchmark (100 games per strategy)...\n');
  
  const benchmark = new AgentBenchmark();
  benchmark.addStrategies(allStrategies);
  
  const results = await benchmark.runBenchmark({
    runs: 100,
    useRandomSeeds: true,
    progressCallback: (completed, total, strategy) => {
      if (completed % 20 === 0 || completed === total) {
        console.log(`  ${strategy}: ${completed}/${total} complete (${Math.round(completed/total*100)}%)`);
      }
    }
  });
  
  console.log(benchmark.formatResults(results));
  
  // Save detailed results to file
  const fs = await import('fs');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `benchmark-results-${timestamp}.json`;
  
  fs.writeFileSync(filename, JSON.stringify(results, null, 2));
  console.log(`\n📊 Detailed results saved to: ${filename}`);
}

async function runComprehensiveBenchmark() {
  console.log('🔬 Running Comprehensive Benchmark (1000 games per strategy)...\n');
  console.log('⚠️  This may take several minutes...\n');
  
  const benchmark = new AgentBenchmark();
  benchmark.addStrategies(allStrategies);
  
  const startTime = Date.now();
  
  const results = await benchmark.runBenchmark({
    runs: 1000,
    useRandomSeeds: true,
    progressCallback: (completed, total, strategy) => {
      if (completed % 100 === 0 || completed === total) {
        const elapsed = Date.now() - startTime;
        const rate = completed / (elapsed / 1000);
        const remaining = total - completed;
        const eta = remaining / rate;
        
        console.log(`  ${strategy}: ${completed}/${total} complete (${Math.round(completed/total*100)}%) | ETA: ${Math.round(eta)}s`);
      }
    }
  });
  
  console.log(benchmark.formatResults(results));
  
  // Save detailed results
  const fs = await import('fs');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `benchmark-comprehensive-${timestamp}.json`;
  
  fs.writeFileSync(filename, JSON.stringify(results, null, 2));
  console.log(`\n📊 Comprehensive results saved to: ${filename}`);
  
  // Generate summary report
  generateSummaryReport(results);
}

function generateSummaryReport(results: any) {
  console.log('\n' + '='.repeat(50));
  console.log('📈 COMPREHENSIVE ANALYSIS SUMMARY');
  console.log('='.repeat(50));
  
  const strategies = results.strategies;
  
  // Performance rankings
  console.log('\n🏆 PERFORMANCE RANKINGS:\n');
  
  const byScore = [...strategies].sort((a, b) => b.avgScore - a.avgScore);
  console.log('By Average Score:');
  byScore.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.name}: ${s.avgScore} points`);
  });
  
  const byWinRate = [...strategies].sort((a, b) => b.winRate - a.winRate);
  console.log('\nBy Win Rate:');
  byWinRate.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.name}: ${s.winRate}%`);
  });
  
  const byMoves = [...strategies].sort((a, b) => b.avgMoves - a.avgMoves);
  console.log('\nBy Move Count:');
  byMoves.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.name}: ${s.avgMoves} moves`);
  });
  
  // Efficiency analysis
  console.log('\n⚡ EFFICIENCY ANALYSIS:\n');
  strategies.forEach((s: any) => {
    const pointsPerMove = s.avgScore / s.avgMoves;
    const pointsPerMs = s.avgScore / s.avgDuration;
    console.log(`${s.name}:`);
    console.log(`  Points per move: ${pointsPerMove.toFixed(2)}`);
    console.log(`  Points per ms: ${pointsPerMs.toFixed(4)}`);
    console.log(`  Performance: ${s.avgDuration.toFixed(2)}ms/game`);
    console.log('');
  });
  
  // Statistical significance
  console.log('📊 STATISTICAL CONFIDENCE:\n');
  strategies.forEach((s: any) => {
    const marginOfError = (s.scoreStdDev / Math.sqrt(s.runs)) * 1.96; // 95% confidence
    console.log(`${s.name}: ${s.avgScore} ± ${marginOfError.toFixed(0)} (95% confidence)`);
  });
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'standard';
  
  console.log('🎮 2048ish Agent Benchmark Suite\n');
  
  try {
    switch (command) {
      case 'quick':
        await runQuickBenchmark();
        break;
      case 'standard':
        await runStandardBenchmark();
        break;
      case 'comprehensive':
        await runComprehensiveBenchmark();
        break;
      default:
        console.log('Usage:');
        console.log('  npm run benchmark           # Standard benchmark');
        console.log('  npm run benchmark quick     # Quick test');
        console.log('  npm run benchmark comprehensive # Full analysis');
        break;
    }
  } catch (error) {
    console.error('❌ Benchmark failed:', error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
  process.exit(1);
});

if (require.main === module) {
  main();
}

export { runQuickBenchmark, runStandardBenchmark, runComprehensiveBenchmark };