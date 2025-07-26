import { runRecordedBenchmark, saveRecordingsToStorage } from './src/test/recordedBenchmark';
import { endgameStrategy, winProbabilityStrategy, greedyStrategy } from './src/test/strategyAdapters';

async function generateSampleRecordings() {
  console.log('🎥 Generating sample game recordings...');
  
  const strategies = [endgameStrategy, winProbabilityStrategy, greedyStrategy];
  
  const results = await runRecordedBenchmark(strategies, {
    runs: 5,
    recordGames: true,
    useRandomSeeds: true,
    maxRecordings: 15,
    progressCallback: (completed, total, strategy) => {
      console.log(`  ${strategy}: ${completed}/${total} games recorded`);
    }
  });
  
  console.log('\n📊 Results Summary:');
  results.forEach(result => {
    console.log(`${result.strategy}:`);
    console.log(`  Avg Score: ${result.avgScore.toFixed(0)}`);
    console.log(`  Max Tile: ${result.maxTile}`);
    console.log(`  Recordings: ${result.bestRecordings.length + result.interestingRecordings.length}`);
  });
  
  // Save to localStorage for the web app
  saveRecordingsToStorage(results);
  
  console.log('\n✅ Sample recordings generated and saved!');
  console.log('Visit http://localhost:3000/replays to view them');
}

generateSampleRecordings().catch(console.error);