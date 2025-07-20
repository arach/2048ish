# 2048ish - An Agentic Gaming Experiment

## Why Another 2048 Clone?

This isn't just another 2048 implementation. It's an experiment in **agentic gaming** - where the real joy comes not from playing the game yourself, but from teaching an agent to play it for you.

### The Vision

Traditional gaming: **You** are the player → **You** make decisions → **You** win or lose

Agentic gaming: **You** are the teacher → **Your agent** makes decisions → **You both** learn together

Imagine a child (or adult!) who:
- Programs their own robot friend to play 2048
- Teaches it strategies like "keep the big numbers in the corner"
- Watches it play and learns from its mistakes
- Tweaks the algorithm to make it smarter
- Competes with friends to see whose agent plays better

The satisfaction comes from being the architect of intelligence, not the executor of moves.

## Current Features

- 🎮 Smooth, satisfying 2048 gameplay
- 📱 Responsive design with mobile swipe support
- ⌨️ Keyboard controls (arrow keys and WASD)
- ↩️ Undo/redo functionality
- 💾 Persistent best score
- ✨ Carefully tuned animations (that merge "pop" 👌)
- 🎨 Beautiful themeable design with warm tan palette
- 🏗️ Canvas-based rendering for perfect control
- 🧪 Comprehensive test suite including visual regression tests

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or pnpm

### Installation

```bash
# Install dependencies
npm install
# or
pnpm install
```

### Development

```bash
# Run the development server
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to play the game.

## How to Play

Use your arrow keys or swipe to move the tiles. When two tiles with the same number touch, they merge into one. The goal is to create a tile with the number 2048!

## How We Built This

This project was developed iteratively with Claude (Anthropic's AI assistant) using a test-driven, component-based approach:

1. **Canvas-based rendering** - For smooth animations and precise control
2. **Clean architecture** - Separation of game logic, rendering, and input handling  
3. **Test-driven development** - Visual regression tests to ensure quality
4. **Iterative refinement** - Hours spent tuning the perfect merge "pop" animation
5. **Accessibility first** - Touch, keyboard, and soon... AI control!

## What's Next: The Agent Revolution

### Phase 1: Algorithmic Agents (No AI needed)
- **Corner Strategy Bot** - "Always keep the biggest tile in the corner!"
- **Snake Pattern Bot** - "Fill the board in a zigzag pattern!"
- **Merge Monster Bot** - "Always make the move with the most merges!"

### Phase 2: Tiny AI Agents  
- **50KB neural networks** that run entirely in the browser
- **No cloud costs** - Everything runs locally
- **Learn from watching** - Train agents on your gameplay

### Phase 3: The Teaching Game
- **Visual programming** - Drag and drop to create strategies
- **Agent battles** - Compete with friends' agents
- **Coaching mode** - AI helps you improve your play

Check out [docs/agent-implementation-options.md](docs/agent-implementation-options.md) for detailed technical plans!

## Tech Stack

- **Framework**: Next.js 15 with React
- **Language**: TypeScript  
- **Rendering**: Canvas API (no game engine needed!)
- **Styling**: Tailwind CSS + Themeable design system
- **Font**: Silkscreen for that retro feel
- **Testing**: Vitest + Visual regression tests
- **Development**: Built with ❤️ and Claude

## License

MIT - Use this as a foundation for your own experiments!

## Credits & Acknowledgments

- **Original 2048** by [Gabriele Cirulli](https://github.com/gabrielecirulli) - [Play the original here!](https://play2048.co/)
- Based on [1024 by Veewo Studio](https://itunes.apple.com/us/app/1024!/id823499224) 
- Conceptually similar to [Threes by Asher Vollmer](http://threesgame.com/)
- Built in collaboration with Claude AI (Anthropic)
- Inspired by the idea that programming can be as fun as playing

---

*"The best game is the one that teaches you to make better games."*