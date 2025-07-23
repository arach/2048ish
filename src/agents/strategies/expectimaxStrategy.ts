import { PlayStrategy, GameState, Direction, Grid, MoveEvaluation } from '../types';

interface BoardEvaluation {
  score: number;
  emptyCells: number;
  maxTile: number;
  cornerBonus: number;
  smoothness: number;
  mergeability: number;
  monotonicity: number;
}

interface MoveScore {
  direction: Direction;
  score: number;
  depth: number;
  evaluation: BoardEvaluation;
  reasoning: string[];
  merges: Array<{value1: number, value2: number, result: number}>;
  expectedValue: number;
}

export class ExpectimaxStrategy implements PlayStrategy {
  name = "Expectimax";
  description = "Uses expectimax search with weighted heuristics and detailed move reasoning";
  icon = "🧠";
  
  private maxDepth = 4;
  private weights = {
    emptyCells: 2.7,
    maxTileCorner: 1.0,
    smoothness: 0.1,
    monotonicity: 1.0,
    mergeability: 0.5,
    scoreGain: 0.001
  };
  
  getNextMove(state: GameState): Direction | null {
    const analysis = this.analyzeAllMoves(state);
    
    if (analysis.length === 0) return null;
    
    // Sort by score and return the best move
    analysis.sort((a, b) => b.score - a.score);
    return analysis[0].direction;
  }
  
  explainMove(move: Direction, state: GameState): string {
    const analysis = this.analyzeAllMoves(state);
    const chosenMove = analysis.find(a => a.direction === move);
    
    if (!chosenMove) {
      return `Moving ${move.toUpperCase()} (fallback choice)`;
    }
    
    let explanation = `Moving ${move.toUpperCase()}`;
    
    // Add merge information
    if (chosenMove.merges.length > 0) {
      const mergeDesc = chosenMove.merges.map(m => `${m.value1}+${m.value2}=${m.result}`);
      explanation += ` to merge ${mergeDesc.join(', ')}`;
    }
    
    // Add the most important reasoning
    if (chosenMove.reasoning.length > 0) {
      explanation += `. ${chosenMove.reasoning[0]}`;
      
      // Add secondary reasons if space permits
      if (chosenMove.reasoning.length > 1) {
        explanation += `, ${chosenMove.reasoning[1]}`;
      }
    }
    
    // Compare with alternatives
    const alternatives = analysis.filter(a => a.direction !== move).sort((a, b) => b.score - a.score);
    if (alternatives.length > 0) {
      const scoreDiff = chosenMove.score - alternatives[0].score;
      if (scoreDiff > 0.1) {
        explanation += ` (${scoreDiff.toFixed(1)} points better than ${alternatives[0].direction})`;
      }
    }
    
    return explanation;
  }
  
  evaluateAllMoves(state: GameState): { validMoves: Direction[]; evaluations: Record<Direction, MoveEvaluation> } {
    const { grid } = state;
    const directions: Direction[] = ['up', 'down', 'left', 'right'];
    const validMoves: Direction[] = [];
    const evaluations: Record<Direction, MoveEvaluation> = {} as Record<Direction, MoveEvaluation>;
    
    const analysis = this.analyzeAllMoves(state);
    
    for (const moveAnalysis of analysis) {
      validMoves.push(moveAnalysis.direction);
      
      const merges = moveAnalysis.merges;
      const emptyAfter = moveAnalysis.evaluation.emptyCells;
      
      // Determine max tile position after move
      const maxTilePosition = this.getMaxTilePositionDescription(grid, moveAnalysis.direction);
      
      evaluations[moveAnalysis.direction] = {
        merges: merges.length,
        emptyAfter,
        maxTilePosition,
        score: moveAnalysis.score,
        reasoning: moveAnalysis.reasoning.join(', ')
      };
    }
    
    return { validMoves, evaluations };
  }
  
  private analyzeAllMoves(state: GameState): MoveScore[] {
    const { grid } = state;
    const directions: Direction[] = ['up', 'down', 'left', 'right'];
    const results: MoveScore[] = [];
    
    for (const direction of directions) {
      if (this.canMove(grid, direction)) {
        const moveScore = this.evaluateMove(grid, direction, state.score);
        results.push(moveScore);
      }
    }
    
    return results;
  }
  
  private evaluateMove(grid: Grid, direction: Direction, currentScore: number): MoveScore {
    // Simulate the move
    const { newGrid, merges, scoreGain } = this.simulateMove(grid, direction);
    
    // Evaluate the resulting position using minimax
    const evaluation = this.minimax(newGrid, this.maxDepth - 1, false, currentScore + scoreGain);
    
    // Generate detailed reasoning
    const reasoning = this.generateReasoning(grid, newGrid, direction, merges, evaluation);
    
    return {
      direction,
      score: evaluation.score,
      depth: this.maxDepth,
      evaluation,
      reasoning,
      merges,
      expectedValue: evaluation.score
    };
  }
  
  private minimax(grid: Grid, depth: number, isMaximizing: boolean, currentScore: number): BoardEvaluation {
    if (depth === 0 || this.isGameOver(grid)) {
      return this.evaluateBoard(grid, currentScore);
    }
    
    if (isMaximizing) {
      // Player's turn - try all moves
      let bestEval = this.evaluateBoard(grid, currentScore);
      bestEval.score = -Infinity;
      
      const directions: Direction[] = ['up', 'down', 'left', 'right'];
      for (const direction of directions) {
        if (this.canMove(grid, direction)) {
          const { newGrid, scoreGain } = this.simulateMove(grid, direction);
          const evaluation = this.minimax(newGrid, depth - 1, false, currentScore + scoreGain);
          
          if (evaluation.score > bestEval.score) {
            bestEval = evaluation;
          }
        }
      }
      
      return bestEval;
    } else {
      // Random tile placement - consider worst case scenarios
      let worstEval = this.evaluateBoard(grid, currentScore);
      worstEval.score = Infinity;
      
      const emptyCells = this.getEmptyCells(grid);
      if (emptyCells.length === 0) {
        return this.evaluateBoard(grid, currentScore);
      }
      
      // Sample a few empty positions for efficiency
      const sampleSize = Math.min(6, emptyCells.length);
      const samples = emptyCells.slice(0, sampleSize);
      
      for (const { row, col } of samples) {
        // Try placing a 2 (90% probability)
        const gridWith2 = grid.map(r => [...r]);
        gridWith2[row][col] = 2;
        const evalWith2 = this.minimax(gridWith2, depth - 1, true, currentScore);
        
        // Try placing a 4 (10% probability)
        const gridWith4 = grid.map(r => [...r]);
        gridWith4[row][col] = 4;
        const evalWith4 = this.minimax(gridWith4, depth - 1, true, currentScore);
        
        // Weighted average based on probabilities
        const weightedEval = {
          ...evalWith2,
          score: evalWith2.score * 0.9 + evalWith4.score * 0.1
        };
        
        if (weightedEval.score < worstEval.score) {
          worstEval = weightedEval;
        }
      }
      
      return worstEval;
    }
  }
  
  private evaluateBoard(grid: Grid, currentScore: number): BoardEvaluation {
    const emptyCells = this.countEmptyCells(grid);
    const maxTile = this.getMaxTile(grid);
    const cornerBonus = this.getCornerBonus(grid);
    const smoothness = this.getSmoothness(grid);
    const mergeability = this.getMergeability(grid);
    const monotonicity = this.getMonotonicity(grid);
    
    // Weighted score calculation
    const score = 
      emptyCells * this.weights.emptyCells +
      cornerBonus * this.weights.maxTileCorner +
      smoothness * this.weights.smoothness +
      monotonicity * this.weights.monotonicity +
      mergeability * this.weights.mergeability +
      currentScore * this.weights.scoreGain;
    
    return {
      score,
      emptyCells,
      maxTile,
      cornerBonus,
      smoothness,
      mergeability,
      monotonicity
    };
  }
  
  private generateReasoning(
    originalGrid: Grid, 
    newGrid: Grid, 
    direction: Direction, 
    merges: Array<{value1: number, value2: number, result: number}>,
    evaluation: BoardEvaluation
  ): string[] {
    const reasoning: string[] = [];
    
    // Primary reasoning based on merges
    if (merges.length > 0) {
      const totalMergeValue = merges.reduce((sum, m) => sum + m.result, 0);
      if (merges.some(m => m.result >= 512)) {
        reasoning.push(`Creates high-value merges (${totalMergeValue} total)`);
      } else if (merges.length >= 2) {
        reasoning.push(`Maximizes merges (${merges.length} simultaneous)`);
      } else {
        reasoning.push(`Secures merge for ${merges[0].result}`);
      }
    }
    
    // Corner strategy reasoning
    if (evaluation.cornerBonus > 50) {
      reasoning.push(`Maintains max tile in corner position`);
    } else if (evaluation.cornerBonus > 0) {
      reasoning.push(`Improves corner positioning`);
    }
    
    // Empty cells reasoning
    if (evaluation.emptyCells >= this.countEmptyCells(originalGrid)) {
      reasoning.push(`Preserves mobility (${evaluation.emptyCells} empty cells)`);
    } else {
      reasoning.push(`Maintains adequate space`);
    }
    
    // Monotonicity reasoning
    if (evaluation.monotonicity > 0.5) {
      reasoning.push(`Improves tile organization`);
    }
    
    // Smoothness reasoning
    if (evaluation.smoothness > 0.3) {
      reasoning.push(`Reduces tile gaps for future merges`);
    }
    
    // Mergeability reasoning
    if (evaluation.mergeability > 0.4) {
      reasoning.push(`Sets up future merge opportunities`);
    }
    
    // Fallback reasoning
    if (reasoning.length === 0) {
      reasoning.push(`Best available option maintains board stability`);
    }
    
    return reasoning.slice(0, 3); // Limit to top 3 reasons
  }
  
  private simulateMove(grid: Grid, direction: Direction): { 
    newGrid: Grid; 
    merges: Array<{value1: number, value2: number, result: number}>; 
    scoreGain: number 
  } {
    const newGrid = grid.map(row => [...row]);
    const merges: Array<{value1: number, value2: number, result: number}> = [];
    let scoreGain = 0;
    
    switch (direction) {
      case 'up':
        for (let col = 0; col < newGrid[0].length; col++) {
          const result = this.moveColumnUp(newGrid, col);
          merges.push(...result.merges);
          scoreGain += result.scoreGain;
        }
        break;
      case 'down':
        for (let col = 0; col < newGrid[0].length; col++) {
          const result = this.moveColumnDown(newGrid, col);
          merges.push(...result.merges);
          scoreGain += result.scoreGain;
        }
        break;
      case 'left':
        for (let row = 0; row < newGrid.length; row++) {
          const result = this.moveRowLeft(newGrid, row);
          merges.push(...result.merges);
          scoreGain += result.scoreGain;
        }
        break;
      case 'right':
        for (let row = 0; row < newGrid.length; row++) {
          const result = this.moveRowRight(newGrid, row);
          merges.push(...result.merges);
          scoreGain += result.scoreGain;
        }
        break;
    }
    
    return { newGrid, merges, scoreGain };
  }
  
  private moveColumnUp(grid: Grid, col: number): { 
    merges: Array<{value1: number, value2: number, result: number}>; 
    scoreGain: number 
  } {
    const merges: Array<{value1: number, value2: number, result: number}> = [];
    let scoreGain = 0;
    const size = grid.length;
    
    // Collect non-null values
    const values: number[] = [];
    for (let row = 0; row < size; row++) {
      if (grid[row][col] !== null) {
        values.push(grid[row][col]!);
      }
    }
    
    // Clear column
    for (let row = 0; row < size; row++) {
      grid[row][col] = null;
    }
    
    // Merge and place values
    let targetRow = 0;
    let i = 0;
    while (i < values.length) {
      if (i + 1 < values.length && values[i] === values[i + 1]) {
        const mergedValue = values[i] * 2;
        grid[targetRow][col] = mergedValue;
        merges.push({ value1: values[i], value2: values[i + 1], result: mergedValue });
        scoreGain += mergedValue;
        i += 2;
      } else {
        grid[targetRow][col] = values[i];
        i++;
      }
      targetRow++;
    }
    
    return { merges, scoreGain };
  }
  
  private moveColumnDown(grid: Grid, col: number): { 
    merges: Array<{value1: number, value2: number, result: number}>; 
    scoreGain: number 
  } {
    const merges: Array<{value1: number, value2: number, result: number}> = [];
    let scoreGain = 0;
    const size = grid.length;
    
    const values: number[] = [];
    for (let row = size - 1; row >= 0; row--) {
      if (grid[row][col] !== null) {
        values.push(grid[row][col]!);
      }
    }
    
    for (let row = 0; row < size; row++) {
      grid[row][col] = null;
    }
    
    let targetRow = size - 1;
    let i = 0;
    while (i < values.length) {
      if (i + 1 < values.length && values[i] === values[i + 1]) {
        const mergedValue = values[i] * 2;
        grid[targetRow][col] = mergedValue;
        merges.push({ value1: values[i], value2: values[i + 1], result: mergedValue });
        scoreGain += mergedValue;
        i += 2;
      } else {
        grid[targetRow][col] = values[i];
        i++;
      }
      targetRow--;
    }
    
    return { merges, scoreGain };
  }
  
  private moveRowLeft(grid: Grid, row: number): { 
    merges: Array<{value1: number, value2: number, result: number}>; 
    scoreGain: number 
  } {
    const merges: Array<{value1: number, value2: number, result: number}> = [];
    let scoreGain = 0;
    const size = grid[0].length;
    
    const values: number[] = [];
    for (let col = 0; col < size; col++) {
      if (grid[row][col] !== null) {
        values.push(grid[row][col]!);
      }
    }
    
    for (let col = 0; col < size; col++) {
      grid[row][col] = null;
    }
    
    let targetCol = 0;
    let i = 0;
    while (i < values.length) {
      if (i + 1 < values.length && values[i] === values[i + 1]) {
        const mergedValue = values[i] * 2;
        grid[row][targetCol] = mergedValue;
        merges.push({ value1: values[i], value2: values[i + 1], result: mergedValue });
        scoreGain += mergedValue;
        i += 2;
      } else {
        grid[row][targetCol] = values[i];
        i++;
      }
      targetCol++;
    }
    
    return { merges, scoreGain };
  }
  
  private moveRowRight(grid: Grid, row: number): { 
    merges: Array<{value1: number, value2: number, result: number}>; 
    scoreGain: number 
  } {
    const merges: Array<{value1: number, value2: number, result: number}> = [];
    let scoreGain = 0;
    const size = grid[0].length;
    
    const values: number[] = [];
    for (let col = size - 1; col >= 0; col--) {
      if (grid[row][col] !== null) {
        values.push(grid[row][col]!);
      }
    }
    
    for (let col = 0; col < size; col++) {
      grid[row][col] = null;
    }
    
    let targetCol = size - 1;
    let i = 0;
    while (i < values.length) {
      if (i + 1 < values.length && values[i] === values[i + 1]) {
        const mergedValue = values[i] * 2;
        grid[row][targetCol] = mergedValue;
        merges.push({ value1: values[i], value2: values[i + 1], result: mergedValue });
        scoreGain += mergedValue;
        i += 2;
      } else {
        grid[row][targetCol] = values[i];
        i++;
      }
      targetCol--;
    }
    
    return { merges, scoreGain };
  }
  
  // Heuristic evaluation functions
  private countEmptyCells(grid: Grid): number {
    return grid.flat().filter(cell => cell === null).length;
  }
  
  private getMaxTile(grid: Grid): number {
    return Math.max(...grid.flat().filter(cell => cell !== null) as number[]);
  }
  
  private getCornerBonus(grid: Grid): number {
    const maxTile = this.getMaxTile(grid);
    const corners = [
      grid[0][0], grid[0][grid[0].length - 1],
      grid[grid.length - 1][0], grid[grid.length - 1][grid[0].length - 1]
    ];
    
    return corners.includes(maxTile) ? Math.log2(maxTile) * 10 : 0;
  }
  
  private getSmoothness(grid: Grid): number {
    let smoothness = 0;
    const size = grid.length;
    
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const current = grid[row][col];
        if (current === null) continue;
        
        const logCurrent = Math.log2(current);
        
        // Check right neighbor
        if (col + 1 < size && grid[row][col + 1] !== null) {
          const logRight = Math.log2(grid[row][col + 1]!);
          smoothness -= Math.abs(logCurrent - logRight);
        }
        
        // Check down neighbor
        if (row + 1 < size && grid[row + 1][col] !== null) {
          const logDown = Math.log2(grid[row + 1][col]!);
          smoothness -= Math.abs(logCurrent - logDown);
        }
      }
    }
    
    return smoothness;
  }
  
  private getMonotonicity(grid: Grid): number {
    const size = grid.length;
    let totalMono = 0;
    
    // Check row monotonicity
    for (let row = 0; row < size; row++) {
      let increasing = 0;
      let decreasing = 0;
      
      for (let col = 0; col < size - 1; col++) {
        const current = grid[row][col];
        const next = grid[row][col + 1];
        
        if (current !== null && next !== null) {
          const logCurrent = Math.log2(current);
          const logNext = Math.log2(next);
          
          if (logCurrent < logNext) {
            increasing += logNext - logCurrent;
          } else if (logCurrent > logNext) {
            decreasing += logCurrent - logNext;
          }
        }
      }
      
      totalMono += Math.max(increasing, decreasing);
    }
    
    // Check column monotonicity
    for (let col = 0; col < size; col++) {
      let increasing = 0;
      let decreasing = 0;
      
      for (let row = 0; row < size - 1; row++) {
        const current = grid[row][col];
        const next = grid[row + 1][col];
        
        if (current !== null && next !== null) {
          const logCurrent = Math.log2(current);
          const logNext = Math.log2(next);
          
          if (logCurrent < logNext) {
            increasing += logNext - logCurrent;
          } else if (logCurrent > logNext) {
            decreasing += logCurrent - logNext;
          }
        }
      }
      
      totalMono += Math.max(increasing, decreasing);
    }
    
    return totalMono;
  }
  
  private getMergeability(grid: Grid): number {
    let mergeability = 0;
    const size = grid.length;
    
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const current = grid[row][col];
        if (current === null) continue;
        
        // Check if it can merge with neighbors
        const neighbors = [
          col > 0 ? grid[row][col - 1] : null,
          col < size - 1 ? grid[row][col + 1] : null,
          row > 0 ? grid[row - 1][col] : null,
          row < size - 1 ? grid[row + 1][col] : null
        ];
        
        const canMerge = neighbors.some(neighbor => neighbor === current);
        if (canMerge) {
          mergeability += Math.log2(current);
        }
      }
    }
    
    return mergeability;
  }
  
  private getEmptyCells(grid: Grid): Array<{row: number, col: number}> {
    const empty: Array<{row: number, col: number}> = [];
    
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        if (grid[row][col] === null) {
          empty.push({ row, col });
        }
      }
    }
    
    return empty;
  }
  
  private getMaxTilePositionDescription(grid: Grid, direction: Direction): string {
    // Simplified position description after move
    const maxTile = this.getMaxTile(grid);
    
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        if (grid[row][col] === maxTile) {
          if (row === 0 && col === 0) return 'top-left';
          if (row === 0 && col === grid[0].length - 1) return 'top-right';
          if (row === grid.length - 1 && col === 0) return 'bottom-left';
          if (row === grid.length - 1 && col === grid[0].length - 1) return 'bottom-right';
          
          if (row === 0) return 'top edge';
          if (row === grid.length - 1) return 'bottom edge';
          if (col === 0) return 'left edge';
          if (col === grid[0].length - 1) return 'right edge';
          
          return 'center';
        }
      }
    }
    
    return 'unknown';
  }
  
  private isGameOver(grid: Grid): boolean {
    // Check for empty cells
    if (this.countEmptyCells(grid) > 0) return false;
    
    // Check for possible merges
    const directions: Direction[] = ['up', 'down', 'left', 'right'];
    return !directions.some(direction => this.canMove(grid, direction));
  }
  
  private canMove(grid: Grid, direction: Direction): boolean {
    const size = grid.length;
    
    switch (direction) {
      case 'up':
        for (let col = 0; col < size; col++) {
          for (let row = 1; row < size; row++) {
            if (grid[row][col] !== null) {
              if (grid[row - 1][col] === null || grid[row - 1][col] === grid[row][col]) {
                return true;
              }
            }
          }
        }
        break;
        
      case 'down':
        for (let col = 0; col < size; col++) {
          for (let row = size - 2; row >= 0; row--) {
            if (grid[row][col] !== null) {
              if (grid[row + 1][col] === null || grid[row + 1][col] === grid[row][col]) {
                return true;
              }
            }
          }
        }
        break;
        
      case 'left':
        for (let row = 0; row < size; row++) {
          for (let col = 1; col < size; col++) {
            if (grid[row][col] !== null) {
              if (grid[row][col - 1] === null || grid[row][col - 1] === grid[row][col]) {
                return true;
              }
            }
          }
        }
        break;
        
      case 'right':
        for (let row = 0; row < size; row++) {
          for (let col = size - 2; col >= 0; col--) {
            if (grid[row][col] !== null) {
              if (grid[row][col + 1] === null || grid[row][col + 1] === grid[row][col]) {
                return true;
              }
            }
          }
        }
        break;
    }
    
    return false;
  }
}