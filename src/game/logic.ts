export type Cell = number | null;
export type Grid = Cell[][];
export type Direction = 'up' | 'down' | 'left' | 'right';

export interface GameState {
  grid: Grid;
  score: number;
  isGameOver: boolean;
  hasWon: boolean;
}

export interface RandomGenerator {
  next(): number;
}

export class DefaultRandomGenerator implements RandomGenerator {
  next(): number {
    return Math.random();
  }
}

export class SeededRandomGenerator implements RandomGenerator {
  private seed: number;
  
  constructor(seed: number) {
    this.seed = seed;
  }
  
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

export interface Move {
  from: [number, number];
  to: [number, number];
  value: number;
  merged?: boolean;
}

export function createEmptyGrid(size: number = 4): Grid {
  return Array(size).fill(null).map(() => Array(size).fill(null));
}

export function addRandomTile(grid: Grid, random: RandomGenerator = new DefaultRandomGenerator()): { grid: Grid; position: [number, number] | null } {
  const emptyCells: [number, number][] = [];
  
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (grid[row][col] === null) {
        emptyCells.push([row, col]);
      }
    }
  }
  
  if (emptyCells.length === 0) {
    return { grid, position: null };
  }
  
  const newGrid = grid.map(row => [...row]);
  const randomIndex = Math.floor(random.next() * emptyCells.length);
  const [row, col] = emptyCells[randomIndex];
  newGrid[row][col] = random.next() < 0.9 ? 2 : 4;
  
  return { grid: newGrid, position: [row, col] };
}

export function initializeGame(size: number = 4, random?: RandomGenerator): GameState {
  let grid = createEmptyGrid(size);
  const result1 = addRandomTile(grid, random);
  const result2 = addRandomTile(result1.grid, random);
  
  return {
    grid: result2.grid,
    score: 0,
    isGameOver: false,
    hasWon: false
  };
}

export function rotateGridClockwise(grid: Grid): Grid {
  const size = grid.length;
  const rotated = createEmptyGrid(size);
  
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      rotated[col][size - 1 - row] = grid[row][col];
    }
  }
  
  return rotated;
}

export function rotateGridCounterClockwise(grid: Grid): Grid {
  const size = grid.length;
  const rotated = createEmptyGrid(size);
  
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      rotated[size - 1 - col][row] = grid[row][col];
    }
  }
  
  return rotated;
}

export function slideRowLeft(row: Cell[]): { row: Cell[]; moves: Move[]; points: number } {
  const moves: Move[] = [];
  const nonNull = row.filter(cell => cell !== null) as number[];
  const merged: boolean[] = new Array(nonNull.length).fill(false);
  let points = 0;
  
  // Merge phase
  for (let i = 0; i < nonNull.length - 1; i++) {
    if (!merged[i] && nonNull[i] === nonNull[i + 1]) {
      nonNull[i] *= 2;
      nonNull[i + 1] = 0;
      merged[i] = true;
      points += nonNull[i];
    }
  }
  
  // Compact phase
  const result = nonNull.filter(cell => cell !== 0);
  
  // Pad with nulls
  while (result.length < row.length) {
    result.push(null as any);
  }
  
  // Track moves
  let resultIndex = 0;
  for (let originalIndex = 0; originalIndex < row.length; originalIndex++) {
    if (row[originalIndex] !== null) {
      if (resultIndex < result.length && result[resultIndex] !== null) {
        if (originalIndex !== resultIndex || row[originalIndex] !== result[resultIndex]) {
          moves.push({
            from: [0, originalIndex],
            to: [0, resultIndex],
            value: result[resultIndex] as number,
            merged: row[originalIndex] !== result[resultIndex]
          });
        }
        resultIndex++;
      }
    }
  }
  
  return { row: result as Cell[], moves, points };
}

export function slideRowRight(row: Cell[]): { row: Cell[]; moves: Move[]; points: number } {
  // Reverse, slide left, then reverse again
  const reversed = [...row].reverse();
  const { row: slidRow, moves, points } = slideRowLeft(reversed);
  
  // Adjust move coordinates for the reversal
  const adjustedMoves = moves.map(move => ({
    ...move,
    from: [0, row.length - 1 - move.from[1]] as [number, number],
    to: [0, row.length - 1 - move.to[1]] as [number, number]
  }));
  
  return {
    row: slidRow.reverse(),
    moves: adjustedMoves,
    points
  };
}

export function moveGrid(grid: Grid, direction: Direction): { 
  grid: Grid; 
  moves: Move[]; 
  points: number;
  hasChanged: boolean;
} {
  let newGrid: Grid = [];
  let allMoves: Move[] = [];
  let totalPoints = 0;
  
  switch (direction) {
    case 'left':
      for (let rowIndex = 0; rowIndex < grid.length; rowIndex++) {
        const { row, moves, points } = slideRowLeft(grid[rowIndex]);
        newGrid.push(row);
        
        const adjustedMoves = moves.map(move => ({
          ...move,
          from: [rowIndex, move.from[1]] as [number, number],
          to: [rowIndex, move.to[1]] as [number, number]
        }));
        
        allMoves.push(...adjustedMoves);
        totalPoints += points;
      }
      break;
      
    case 'right':
      for (let rowIndex = 0; rowIndex < grid.length; rowIndex++) {
        const { row, moves, points } = slideRowRight(grid[rowIndex]);
        newGrid.push(row);
        
        const adjustedMoves = moves.map(move => ({
          ...move,
          from: [rowIndex, move.from[1]] as [number, number],
          to: [rowIndex, move.to[1]] as [number, number]
        }));
        
        allMoves.push(...adjustedMoves);
        totalPoints += points;
      }
      break;
      
    case 'up':
      // Process columns
      for (let col = 0; col < grid[0].length; col++) {
        const column = grid.map(row => row[col]);
        const { row, moves, points } = slideRowLeft(column);
        
        // Put the column back
        for (let rowIndex = 0; rowIndex < row.length; rowIndex++) {
          if (!newGrid[rowIndex]) newGrid[rowIndex] = [];
          newGrid[rowIndex][col] = row[rowIndex];
        }
        
        // Adjust move coordinates
        const adjustedMoves = moves.map(move => ({
          ...move,
          from: [move.from[1], col] as [number, number],
          to: [move.to[1], col] as [number, number]
        }));
        
        allMoves.push(...adjustedMoves);
        totalPoints += points;
      }
      break;
      
    case 'down':
      // Process columns
      for (let col = 0; col < grid[0].length; col++) {
        const column = grid.map(row => row[col]);
        const { row, moves, points } = slideRowRight(column);
        
        // Put the column back
        for (let rowIndex = 0; rowIndex < row.length; rowIndex++) {
          if (!newGrid[rowIndex]) newGrid[rowIndex] = [];
          newGrid[rowIndex][col] = row[rowIndex];
        }
        
        // Adjust move coordinates
        const adjustedMoves = moves.map(move => ({
          ...move,
          from: [move.from[1], col] as [number, number],
          to: [move.to[1], col] as [number, number]
        }));
        
        allMoves.push(...adjustedMoves);
        totalPoints += points;
      }
      break;
  }
  
  // Check if grid has changed
  const hasChanged = !grid.every((row, i) => 
    row.every((cell, j) => cell === newGrid[i][j])
  );
  
  return {
    grid: newGrid,
    moves: allMoves,
    points: totalPoints,
    hasChanged
  };
}

export function canMove(grid: Grid): boolean {
  const directions: Direction[] = ['up', 'down', 'left', 'right'];
  
  for (const direction of directions) {
    const { hasChanged } = moveGrid(grid, direction);
    if (hasChanged) {
      return true;
    }
  }
  
  return false;
}

export function checkWin(grid: Grid, winValue: number = 2048): boolean {
  for (const row of grid) {
    for (const cell of row) {
      if (cell === winValue) {
        return true;
      }
    }
  }
  return false;
}

export function makeMove(state: GameState, direction: Direction, random?: RandomGenerator): GameState & { moves: Move[]; newTilePosition: [number, number] | null } {
  const { grid, moves, points, hasChanged } = moveGrid(state.grid, direction);
  
  if (!hasChanged) {
    return {
      ...state,
      moves: [],
      newTilePosition: null
    };
  }
  
  const { grid: newGrid, position: newTilePosition } = addRandomTile(grid, random);
  const hasWon = !state.hasWon && checkWin(newGrid);
  const isGameOver = !canMove(newGrid);
  
  return {
    grid: newGrid,
    score: state.score + points,
    hasWon: state.hasWon || hasWon,
    isGameOver,
    moves,
    newTilePosition
  };
}

export function serializeGameState(state: GameState): string {
  return JSON.stringify(state);
}

export function deserializeGameState(serialized: string): GameState {
  return JSON.parse(serialized);
}

export function getMaxTile(grid: Grid): number {
  let max = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (cell !== null && cell > max) {
        max = cell;
      }
    }
  }
  return max;
}