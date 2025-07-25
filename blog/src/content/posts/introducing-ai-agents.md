---
title: 'Introducing AI Agents'
pubDate: 2025-07-22
description: 'From classic gameplay to intelligent automation - implementing AI agents that can actually play 2048 with different strategies and approaches.'
---

# Introducing AI Agents

After building our solid 2048 foundation, it was time for the real challenge: creating AI agents that could actually play the game intelligently.

Turns out, teaching a computer to play 2048 well is much more complex than you might expect.

## The Challenge

2048 seems simple - just slide tiles and merge them to reach 2048. But the decision space is enormous:
- Each move has up to 4 possible directions
- Game states can have millions of possible configurations  
- Long-term strategy matters more than immediate gains
- Bad early moves can doom you 50+ moves later

## Our Agent Architecture

We built a flexible system that supports multiple AI strategies:

```typescript
interface Agent {
  name: string
  description: string
  makeMove(gameState: GameState): Direction
  reset?(): void
}

class AgentManager {
  private agents: Map<string, Agent> = new Map()
  private currentAgent?: Agent

  registerAgent(id: string, agent: Agent) {
    this.agents.set(id, agent)
  }

  switchAgent(id: string) {
    this.currentAgent = this.agents.get(id)
    this.currentAgent?.reset?.()
  }
}
```

## The Agents We Built

### Greedy Agent
Our simplest approach - always takes the move that immediately maximizes the score.

**Strategy**: Look at each possible move, calculate the resulting score, pick the highest.

**Performance**: Gets stuck around 1,000-4,000 points. Great for testing but not competitive.

### Corner Strategy Agent  
Based on the popular human strategy of keeping your highest tile in a corner.

**Strategy**: 
- Keep the highest value tile in one corner
- Build monotonic sequences away from that corner
- Avoid moves that would disturb the corner tile

**Performance**: Much more consistent, regularly reaching 8,000-15,000 points.

### Expectimax Agent
Our most sophisticated approach using game tree search with probabilistic reasoning.

**Strategy**:
- Look ahead several moves using minimax-style search
- Account for random tile placement using expected values
- Evaluate positions using multiple heuristics (smoothness, monotonicity, empty cells)

**Performance**: Our strongest agent, consistently reaching 20,000+ points and occasionally hitting the 2048 tile.

```typescript
class ExpectimaxAgent implements Agent {
  private readonly depth = 4

  makeMove(state: GameState): Direction {
    let bestMove = Direction.Up
    let bestScore = -Infinity

    for (const direction of [Direction.Up, Direction.Down, Direction.Left, Direction.Right]) {
      if (this.isValidMove(state, direction)) {
        const newState = this.simulateMove(state, direction)
        const score = this.expectimax(newState, this.depth - 1, false)
        
        if (score > bestScore) {
          bestScore = score
          bestMove = direction
        }
      }
    }

    return bestMove
  }

  private expectimax(state: GameState, depth: number, isMaximizing: boolean): number {
    if (depth === 0 || state.gameOver) {
      return this.evaluateState(state)
    }

    if (isMaximizing) {
      // Player move - maximize score
      let maxScore = -Infinity
      for (const direction of this.getPossibleMoves(state)) {
        const newState = this.simulateMove(state, direction)
        const score = this.expectimax(newState, depth - 1, false)
        maxScore = Math.max(maxScore, score)
      }
      return maxScore
    } else {
      // Random tile placement - expected value
      let expectedScore = 0
      const emptyCells = this.getEmptyCells(state)
      
      for (const cell of emptyCells) {
        // 90% chance of 2, 10% chance of 4
        expectedScore += 0.9 * this.expectimax(this.placeTitle(state, cell, 2), depth - 1, true)
        expectedScore += 0.1 * this.expectimax(this.placeTitle(state, cell, 4), depth - 1, true)
      }
      
      return expectedScore / emptyCells.length
    }
  }
}
```

## The Coaching Interface

We added a coaching mode that lets you watch these agents play while explaining their decision-making process:

- **Real-time strategy explanation**: See why the agent chose each move
- **Performance metrics**: Track score, moves, and success rates
- **Speed controls**: Watch in slow motion or let them play at full speed
- **Agent switching**: Compare different strategies on the same game

## What We Learned

Building these agents taught us a lot about both AI and game design:

1. **Heuristics matter**: Simple scoring isn't enough - you need to understand board patterns
2. **Lookahead is powerful**: Even shallow search dramatically improves performance  
3. **Randomness is hard**: Dealing with unpredictable tile placement requires probabilistic thinking
4. **Implementation details count**: Small optimizations in move evaluation can make huge differences

## Try Them Yourself

Ready to see these agents in action? Head over to the [agent mode](/) and watch them play. You might be surprised by how different their playing styles are!

---

*Coming up next: We'll dive deep into the research behind these strategies and explore even more sophisticated approaches.*