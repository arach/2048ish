'use client';

import Link from 'next/link';
import { theme } from '../../../theme/colors';

export default function ResearchPost() {
  return (
    <div className="min-h-screen" 
         style={{ 
           background: `linear-gradient(to bottom right, ${theme.background.gradient.from}, ${theme.background.gradient.to})`
         }}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/blog" 
            className="inline-flex items-center mb-6 text-sm font-medium transition-colors"
            style={{ color: theme.ui.text.secondary }}
            onMouseEnter={(e) => e.currentTarget.style.color = theme.ui.text.primary}
            onMouseLeave={(e) => e.currentTarget.style.color = theme.ui.text.secondary}
          >
            ← Back to Blog
          </Link>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {['AI', 'Research', 'Game Theory', 'Algorithms'].map((tag) => (
              <span 
                key={tag}
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{ 
                  backgroundColor: '#EEF2FF',
                  color: theme.ui.accent 
                }}
              >
                {tag}
              </span>
            ))}
          </div>
          
          <h1 className="text-4xl font-bold mb-4" style={{ color: theme.ui.text.primary }}>
            The Science Behind 2048 AI: From Academic Research to Implementation
          </h1>
          
          <div className="flex items-center gap-4 text-sm mb-6" style={{ color: theme.ui.text.tertiary }}>
            <span>July 25, 2025</span>
            <span>•</span>
            <span>8 min read</span>
            <span>•</span>
            <span>Research & Development</span>
          </div>
        </div>

        {/* Article Content */}
        <article className="bg-white rounded-xl shadow-lg p-8" style={{ backgroundColor: theme.ui.card.background }}>
          <div className="prose prose-lg max-w-none" style={{ color: theme.ui.text.primary }}>
            
            <p className="text-xl leading-relaxed mb-8" style={{ color: theme.ui.text.secondary }}>
              When we set out to build AI strategies for 2048, we didn't want to just wing it. We dove deep into academic research to understand what actually works. Here's what we discovered and how we built our AI coaches.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4" style={{ color: theme.ui.text.primary }}>
              📚 The Academic Foundation
            </h2>
            
            <p className="mb-4">
              Our journey started with a fascinating 2014 blog post by <strong>Hein Hundal</strong> that tested different evaluation functions on 2048. Running 1000+ games each, the research revealed some surprising insights:
            </p>

            <div className="bg-gray-50 rounded-lg p-6 my-6">
              <h3 className="text-lg font-semibold mb-4">🏆 Evaluation Function Performance (Average Ending Tile Total)</h3>
              <ul className="space-y-2">
                <li><strong>Smoothness:</strong> 720 AETT - reached 1024 tile 🥇</li>
                <li><strong>Cyclic LDRD:</strong> 680 AETT - max 512 tile</li>
                <li><strong>Monotonicity:</strong> 420 AETT - max 512 tile</li>
                <li><strong>Empty Tiles:</strong> 390 AETT - max 512 tile</li>
                <li><strong>Pure Random:</strong> 250 AETT - max 256 tile</li>
              </ul>
            </div>

            <p className="mb-6">
              The clear winner? <strong>Smoothness</strong> - minimizing the differences between adjacent tiles. This wasn't just marginally better; it was dramatically superior, achieving the highest average scores and even reaching the coveted 1024 tile.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4" style={{ color: theme.ui.text.primary }}>
              🧠 Understanding the Heuristics
            </h2>

            <h3 className="text-xl font-semibold mt-6 mb-3">Smoothness: The Champion</h3>
            <p className="mb-4">
              Smoothness measures how similar adjacent tiles are to each other. The idea is simple: if you have a 32 next to a 2, that's a big difference (30 points). But a 32 next to a 16? Much smoother (16 points). 
            </p>
            <p className="mb-4">
              The math is straightforward - sum up all the absolute differences between neighboring tiles, then minimize that total. Smooth boards are easier to merge and create better opportunities for high scores.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">Monotonicity: The Organizer</h3>
            <p className="mb-4">
              Monotonicity rewards boards where rows and columns are sorted - either all increasing or all decreasing. Think of it as preferring organized boards where tiles flow naturally in one direction.
            </p>
            <p className="mb-4">
              While powerful, monotonicity alone wasn't enough. It performed moderately in isolation but works great as a supporting heuristic.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">Corner Strategy: The Classic</h3>
            <p className="mb-6">
              Everyone knows about keeping your highest tile in a corner. It's intuitive and works well for human players. But our research showed it's not the whole story - smoothness and board organization matter more than strict corner positioning.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4" style={{ color: theme.ui.text.primary }}>
              🛠️ Our Implementation: From Theory to Code
            </h2>

            <p className="mb-4">
              Armed with this research, we built multiple AI strategies that you can play against in our game:
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">1. Smoothness Master</h3>
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <p className="mb-2"><strong>Weight Distribution:</strong></p>
              <ul className="text-sm space-y-1">
                <li>• Smoothness: 50% (primary focus)</li>
                <li>• Monotonicity: 30% (organization support)</li>
                <li>• Empty Tiles: 15% (survival factor)</li>
                <li>• Corner Bonus: 5% (traditional wisdom)</li>
              </ul>
            </div>
            <p className="mb-4">
              This strategy directly implements the academic findings, prioritizing smooth board states while incorporating other proven heuristics as supporting factors.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">2. Expectimax Strategy</h3>
            <p className="mb-4">
              Our expectimax implementation uses tree search with weighted heuristics. It looks ahead several moves and considers the random tile placement, making it more sophisticated but computationally intensive.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">3. Corner Master & Snake Builder</h3>
            <p className="mb-6">
              We also implemented traditional strategies like corner-focused play and snake patterns. While these work well for human-guided play, our research shows they're outperformed by smoothness-based approaches.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4" style={{ color: theme.ui.text.primary }}>
              🎯 Real-World Performance Analysis
            </h2>

            <p className="mb-4">
              We analyzed actual gameplay data from our Expectimax strategy (109 moves, final score 1,016, max tile 128) and found some fascinating patterns:
            </p>

            <div className="bg-red-50 rounded-lg p-6 my-6">
              <h3 className="text-lg font-semibold mb-4">🚨 Key Issues Discovered</h3>
              <ul className="space-y-2">
                <li><strong>Move #52:</strong> Chose right (37.09) vs left (86.17) - Lost ~49 points</li>
                <li><strong>Move #96:</strong> Chose left (33.70) vs down (101.79) - Lost ~68 points</li>
                <li><strong>Corner Loss:</strong> Strategy lost corner position mid-game and struggled to recover</li>
                <li><strong>Endgame Struggles:</strong> Performance degraded when board filled up (1-3 empty tiles)</li>
              </ul>
            </div>

            <p className="mb-6">
              This analysis revealed that while Expectimax had good alternatives available, it wasn't weighting them correctly. The smoothness-based approach should address many of these issues by focusing on board structure over immediate scoring.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4" style={{ color: theme.ui.text.primary }}>
              🎮 Try It Yourself: Coach Mode
            </h2>

            <p className="mb-4">
              Want to see these strategies in action? Our <strong>Coach Mode</strong> lets you play while multiple AI strategies analyze your moves in real-time. You'll get:
            </p>

            <ul className="list-disc list-inside mb-4 space-y-1">
              <li>Instant feedback on each move</li>
              <li>Consensus analysis from multiple strategies</li>
              <li>Detailed reasoning for alternative suggestions</li>
              <li>Performance tracking and learning insights</li>
            </ul>

            <div className="bg-green-50 rounded-lg p-6 my-6">
              <h3 className="text-lg font-semibold mb-2">🎯 Experience the Research</h3>
              <p className="mb-4">
                Switch between strategies in Agent Mode to see how different approaches perform, or use Coach Mode to improve your own gameplay with AI insights.
              </p>
            </div>

            <h2 className="text-2xl font-bold mt-8 mb-4" style={{ color: theme.ui.text.primary }}>
              🔬 What's Next: Future Research
            </h2>

            <p className="mb-4">
              Our implementation is just the beginning. We're exploring:
            </p>

            <ul className="list-disc list-inside mb-4 space-y-1">
              <li><strong>Monte Carlo Tree Search (MCTS):</strong> Academic research suggests it outperforms Expectimax</li>
              <li><strong>Neural Network Evaluation:</strong> Learning complex patterns from board positions</li>
              <li><strong>Hybrid Approaches:</strong> Combining multiple strategies dynamically</li>
              <li><strong>Deeper Analysis:</strong> Understanding when different strategies excel</li>
            </ul>

            <h2 className="text-2xl font-bold mt-8 mb-4" style={{ color: theme.ui.text.primary }}>
              💡 Key Takeaways
            </h2>

            <div className="bg-yellow-50 rounded-lg p-6 my-6">
              <ol className="list-decimal list-inside space-y-2">
                <li><strong>Smoothness dominates:</strong> Academic research clearly shows smooth boards outperform other heuristics</li>
                <li><strong>Combination matters:</strong> Multiple heuristics work better than any single approach</li>
                <li><strong>Implementation details count:</strong> Theory is one thing, but real performance depends on proper weighting and implementation</li>
                <li><strong>Continuous learning:</strong> Data analysis reveals gaps between theory and practice</li>
              </ol>
            </div>

            <p className="mb-6">
              Building AI for 2048 taught us that great game AI isn't just about following intuition - it's about understanding the mathematical properties that make strategies successful. The academic research provided the foundation, but the real insights came from implementation, testing, and iterative improvement.
            </p>

            <hr className="my-8" style={{ borderColor: theme.ui.card.border }} />

            <div className="text-center">
              <p className="text-sm mb-4" style={{ color: theme.ui.text.secondary }}>
                Ready to test these strategies yourself?
              </p>
              <div className="flex gap-4 justify-center">
                <Link 
                  href="/coach"
                  className="inline-flex items-center px-6 py-3 rounded-lg text-sm font-medium transition-colors"
                  style={{ 
                    backgroundColor: theme.ui.accent,
                    color: theme.ui.text.button 
                  }}
                >
                  🎯 Try Coach Mode
                </Link>
                <Link 
                  href="/agent"
                  className="inline-flex items-center px-6 py-3 rounded-lg text-sm font-medium transition-colors border"
                  style={{ 
                    borderColor: theme.ui.accent,
                    color: theme.ui.accent
                  }}
                >
                  🤖 Watch AI Play
                </Link>
              </div>
            </div>
          </div>
        </article>

        {/* Back to Blog */}
        <div className="text-center mt-8">
          <Link 
            href="/blog"
            className="inline-flex items-center text-sm font-medium transition-colors"
            style={{ color: theme.ui.text.secondary }}
            onMouseEnter={(e) => e.currentTarget.style.color = theme.ui.text.primary}
            onMouseLeave={(e) => e.currentTarget.style.color = theme.ui.text.secondary}
          >
            ← Back to Blog
          </Link>
        </div>
      </div>
    </div>
  );
}