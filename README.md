# 2048ish

A modern implementation of the classic 2048 game built with Next.js, React, TypeScript, and Tailwind CSS.

## Features

- 🎮 Classic 2048 gameplay
- 📱 Responsive design (mobile and desktop)
- 👆 Touch/swipe controls for mobile
- ⌨️ Keyboard controls (arrow keys and WASD)
- 💾 Persistent best score
- ✨ Smooth animations with framer-motion
- 🎨 Clean UI using shadcn/ui components

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

## Coming Soon

- 🤖 AI player agent using Mastra framework
- 👨‍⚖️ AI judge agent that comments on moves
- 📊 Game statistics and analytics
- 🏆 Leaderboard functionality

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Animations**: Framer Motion
- **Development**: Turbopack

## License

MIT