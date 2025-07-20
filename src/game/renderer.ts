import { Grid, Cell, Move } from './logic';

export type EasingFunction = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'cubic' | 'elastic' | 'bounce';

export interface RenderConfig {
  gridSize: number;
  cellSize: number;
  cellGap: number;
  borderRadius: number;
  fontSize: number;
  animationDuration: number;
  animationStyle?: 'minimal' | 'playful';
  easingFunction?: EasingFunction;
  moveEasing?: EasingFunction;
  mergeEasing?: EasingFunction;
  colors: {
    background: string;
    gridBackground: string;
    emptyCell: string;
    text: {
      light: string;
      dark: string;
    };
    cells: Record<number, string>;
  };
}

export const defaultConfig: RenderConfig = {
  gridSize: 4,
  cellSize: 100,
  cellGap: 10,
  borderRadius: 6,
  fontSize: 48,
  animationDuration: 150,
  animationStyle: 'playful',
  easingFunction: 'ease-in-out',
  moveEasing: 'cubic',
  mergeEasing: 'elastic',
  colors: {
    background: '#faf8ef',
    gridBackground: '#bbada0',
    emptyCell: '#cdc1b4',
    text: {
      light: '#776e65',
      dark: '#f9f6f2'
    },
    cells: {
      2: '#eee4da',
      4: '#ede0c8',
      8: '#f2b179',
      16: '#f59563',
      32: '#f67c5f',
      64: '#f65e3b',
      128: '#edcf72',
      256: '#edcc61',
      512: '#edc850',
      1024: '#edc53f',
      2048: '#edc22e',
      4096: '#3c3a32',
      8192: '#3c3a32'
    }
  }
};

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: RenderConfig;
  private animationFrameId: number | null = null;
  private debugMode: boolean = false;
  private tileStates: Map<string, 'new' | 'merged' | 'moved'> = new Map();
  // Pre-computed top-left pixel positions for each grid cell – avoids recomputing every frame
  private cellPositions: { x: number; y: number }[][] = [];

  constructor(canvas: HTMLCanvasElement, config: Partial<RenderConfig> = {}) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D context from canvas');
    }
    this.ctx = ctx;
    this.config = { ...defaultConfig, ...config };
    this.setupCanvas();

    // Cache pixel positions for each cell so we don't have to recalculate repeatedly
    this.computeCellPositions();
  }

  /**
   * Pre-compute and cache the pixel x/y of every grid coordinate based on the
   * current renderer configuration.
   */
  private computeCellPositions(): void {
    const { gridSize, cellSize, cellGap } = this.config;
    this.cellPositions = Array.from({ length: gridSize }, (_, row) =>
      Array.from({ length: gridSize }, (_, col) => ({
        x: col * cellSize + (col + 1) * cellGap,
        y: row * cellSize + (row + 1) * cellGap
      }))
    );
  }

  private getCellPosition(row: number, col: number): { x: number; y: number } {
    return this.cellPositions[row][col];
  }

  /**
   * Low-level routine that draws a single tile whose top-left corner is at the
   * specified pixel coordinate.  All transformations (translate / scale) are
   * handled internally so callers can supply simple values.
   */
  private drawCellPixels(x: number, y: number, value: number, scale: number = 1): void {
    const { cellSize, borderRadius, fontSize, colors } = this.config;

    this.ctx.save();
    this.ctx.translate(x + cellSize / 2, y + cellSize / 2);
    this.ctx.scale(scale, scale);
    this.ctx.translate(-cellSize / 2, -cellSize / 2);

    // Background
    this.ctx.fillStyle = colors.cells[value] || colors.cells[4096];
    this.roundRect(0, 0, cellSize, cellSize, borderRadius);
    this.ctx.fill();

    // Value text
    this.ctx.fillStyle = value <= 4 ? colors.text.light : colors.text.dark;
    this.ctx.font = `bold ${fontSize}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(value.toString(), cellSize / 2, cellSize / 2);

    this.ctx.restore();
  }

  public render(grid: Grid, animations: AnimationState[] = []): void {
    this.clear();
    this.drawBackground();
    
    // Identify which positions are being animated
    const movingFromPositions = new Set<string>();
    const movingToPositions = new Set<string>();
    const mergePositions = new Set<string>();
    const appearPositions = new Set<string>();
    
    for (const animation of animations) {
      if (animation.type === 'move') {
        // Don't draw tiles at their source positions during move
        movingFromPositions.add(`${animation.from[0]},${animation.from[1]}`);
        // ALSO don't draw at destination during move - animation handles it
        movingToPositions.add(`${animation.to[0]},${animation.to[1]}`);
      } else if (animation.type === 'merge') {
        // Merge animations replace the tile at destination
        mergePositions.add(`${animation.position[0]},${animation.position[1]}`);
      } else if (animation.type === 'appear') {
        appearPositions.add(`${animation.position[0]},${animation.position[1]}`);
        console.log('[Renderer] Appear animation at', `${animation.position[0]},${animation.position[1]}`, 'progress:', animation.progress);
      }
    }
    
    // Draw grid, but skip tiles that are being animated
    this.drawGrid(grid, movingFromPositions, movingToPositions, mergePositions, appearPositions);
    
    if (animations.length > 0) {
      this.drawAnimations(animations);
    }
  }

  private clear(): void {
    const { gridSize, cellSize, cellGap } = this.config;
    const canvasSize = gridSize * cellSize + (gridSize + 1) * cellGap;
    this.ctx.clearRect(0, 0, canvasSize, canvasSize);
  }

  private drawBackground(): void {
    const { gridSize, cellSize, cellGap, borderRadius, colors } = this.config;
    const canvasSize = gridSize * cellSize + (gridSize + 1) * cellGap;
    
    // Draw main background
    this.ctx.fillStyle = colors.background;
    this.ctx.fillRect(0, 0, canvasSize, canvasSize);
    
    // Draw grid background
    this.ctx.fillStyle = colors.gridBackground;
    this.roundRect(0, 0, canvasSize, canvasSize, borderRadius);
    this.ctx.fill();
    
    // Draw empty cells
    this.ctx.fillStyle = colors.emptyCell;
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const { x, y } = this.getCellPosition(row, col);
        this.roundRect(x, y, cellSize, cellSize, borderRadius);
        this.ctx.fill();
      }
    }
  }

  private drawGrid(
    grid: Grid, 
    skipFromPositions: Set<string> = new Set(),
    skipToPositions: Set<string> = new Set(),
    mergePositions: Set<string> = new Set(),
    appearPositions: Set<string> = new Set()
  ): void {
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        const cell = grid[row][col];
        const posKey = `${row},${col}`;
        
        // Skip if this position is being animated as a move source
        if (skipFromPositions.has(posKey)) {
          continue;
        }
        
        // Skip if this position is a move destination
        if (skipToPositions.has(posKey)) {
          continue;
        }
        
        // Skip merge positions during merge animation (they'll be drawn by animation)
        if (mergePositions.has(posKey)) {
          continue;
        }
        
        // Skip appear positions during appear animation
        if (appearPositions.has(posKey)) {
          continue;
        }
        
        if (cell !== null) {
          this.drawCell(row, col, cell);
        }
      }
    }
  }

  private drawCell(row: number, col: number, value: number, scale: number = 1): void {
    const { cellSize, borderRadius } = this.config;
    const { x, y } = this.getCellPosition(row, col);

    this.drawCellPixels(x, y, value, scale);

    // Debug overlay if enabled – only on the base grid, not during animations
    if (this.debugMode) {
      const posKey = `${row},${col}`;
      const tileState = this.tileStates.get(posKey);

      this.ctx.save();
      this.ctx.translate(x, y);

      if (tileState) {
        this.ctx.strokeStyle = tileState === 'new' ? '#4ade80' :     // green-400
                               tileState === 'merged' ? '#a855f7' : // purple-400
                               '#3b82f6';                            // blue-400
        this.ctx.lineWidth = 3;
        this.roundRect(2, 2, cellSize - 4, cellSize - 4, borderRadius);
        this.ctx.stroke();

        // Indicator dot
        const dotSize = 8;
        this.ctx.fillStyle = this.ctx.strokeStyle;
        this.ctx.beginPath();
        this.ctx.arc(cellSize - dotSize, dotSize, dotSize / 2, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        // Static tile (has value but no state)
        this.ctx.strokeStyle = '#4b5563'; // gray-600
        this.ctx.lineWidth = 1;
        this.roundRect(2, 2, cellSize - 4, cellSize - 4, borderRadius);
        this.ctx.stroke();

        const dotSize = 6;
        this.ctx.fillStyle = '#4b5563';
        this.ctx.beginPath();
        this.ctx.arc(cellSize - dotSize, dotSize, dotSize / 2, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.restore();
    }
  }

  private drawAnimations(animations: AnimationState[]): void {
    for (const animation of animations) {
      if (animation.type === 'move') {
        this.drawMoveAnimation(animation);
      } else if (animation.type === 'appear') {
        this.drawAppearAnimation(animation);
      } else if (animation.type === 'merge') {
        this.drawMergeAnimation(animation);
      }
    }
  }

  private drawMoveAnimation(animation: MoveAnimation): void {
    const progress = animation.progress;

    const fromPos = this.getCellPosition(animation.from[0], animation.from[1]);
    const toPos = this.getCellPosition(animation.to[0], animation.to[1]);

    const x = fromPos.x + (toPos.x - fromPos.x) * progress;
    const y = fromPos.y + (toPos.y - fromPos.y) * progress;

    let scale = 1;
    if (this.config.animationStyle === 'playful') {
      scale = 1 - 0.02 * Math.sin(progress * Math.PI);
    }

    this.drawCellPixels(x, y, animation.value, scale);
  }

  private drawAppearAnimation(animation: AppearAnimation): void {
    const { animationStyle } = this.config;
    const t = animation.progress;
    
    let scale: number;
    if (animationStyle === 'minimal') {
      // Subtle fade-in from 0.8 to 1
      scale = 0.8 + 0.2 * this.easeOutCubic(t);
    } else {
      // Playful: Reduced pop effect - more subtle scale
      if (t < 0.3) {
        // Start at 0.85 and grow to 1.05
        const growT = t / 0.3;
        scale = 0.85 + 0.2 * this.easeOutCubic(growT);
      } else {
        // Gentle settle back to 1.0
        const settleT = (t - 0.3) / 0.7;
        scale = 1.05 - 0.05 * this.easeInOutCubic(settleT);
      }
    }
    
    const { x, y } = this.getCellPosition(animation.position[0], animation.position[1]);
    this.drawCellPixels(x, y, animation.value, scale);
  }
  
  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }
  
  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  
  private easeOutBack(t: number, overshoot: number = 1.0): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  private drawMergeAnimation(animation: MergeAnimation): void {
    const { animationStyle } = this.config;
    const t = animation.progress;

    let scale: number;
    if (animationStyle === 'minimal') {
      scale = 1 + 0.25 * Math.sin(t * Math.PI);
    } else {
      if (t < 0.4) {
        const anticipateT = t / 0.4;
        scale = 1 - 0.05 * Math.sin(anticipateT * Math.PI);
      } else if (t < 0.7) {
        const popT = (t - 0.4) / 0.3;
        scale = 0.95 + 0.45 * Math.sin(popT * Math.PI * 0.5);
      } else {
        const settleT = (t - 0.7) / 0.3;
        const bounce = Math.sin(settleT * Math.PI * 3) * (1 - settleT) * 0.08;
        scale = 1.4 - 0.4 * settleT + bounce;
      }
    }

    const { x, y } = this.getCellPosition(animation.position[0], animation.position[1]);
    this.drawCellPixels(x, y, animation.value, scale);
  }

  private roundRect(x: number, y: number, width: number, height: number, radius: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
  }

  public snapshot(): string {
    return this.canvas.toDataURL('image/png');
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public setDebugMode(enabled: boolean, tileStates?: Map<string, 'new' | 'merged' | 'moved'>): void {
    this.debugMode = enabled;
    if (tileStates) {
      this.tileStates = new Map(tileStates);
    }
  }
  
  public getDebugMode(): boolean {
    return this.debugMode;
  }
  
  public destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}

// -------------------- Animation Types --------------------

export interface MoveAnimation {
  type: 'move';
  from: [number, number];
  to: [number, number];
  value: number;
  progress: number;
}

export interface AppearAnimation {
  type: 'appear';
  position: [number, number];
  value: number;
  progress: number;
}

export interface MergeAnimation {
  type: 'merge';
  position: [number, number];
  value: number;
  progress: number;
}

export type AnimationState = MoveAnimation | AppearAnimation | MergeAnimation;

export class AnimationController {
  private animations: Map<string, AnimationState> = new Map();
  private startTime: number = 0;
  private duration: number;
  private onUpdate: (animations: AnimationState[]) => void;
  private animationFrameId: number | null = null;
  private easingFunction: EasingFunction;
  private moveEasing: EasingFunction;
  private mergeEasing: EasingFunction;
  private isRunning: boolean = false;

  constructor(
    duration: number, 
    onUpdate: (animations: AnimationState[]) => void, 
    easingFunction: EasingFunction = 'ease-in-out',
    moveEasing?: EasingFunction,
    mergeEasing?: EasingFunction
  ) {
    this.duration = duration;
    this.onUpdate = onUpdate;
    this.easingFunction = easingFunction;
    this.moveEasing = moveEasing || 'cubic';
    this.mergeEasing = mergeEasing || 'elastic';
  }

  public addMoveAnimation(move: Move): void {
    const key = `move-${move.from.join(',')}-${move.to.join(',')}`;
    this.animations.set(key, {
      type: 'move',
      from: move.from,
      to: move.to,
      value: move.value,
      progress: 0
    } as MoveAnimation);
  }

  public addAppearAnimation(position: [number, number], value: number): void {
    const key = `appear-${position.join(',')}`;
    this.animations.set(key, {
      type: 'appear',
      position,
      value,
      progress: 0
    } as AppearAnimation);
  }

  public addMergeAnimation(position: [number, number], value: number): void {
    const key = `merge-${position.join(',')}`;
    this.animations.set(key, {
      type: 'merge',
      position,
      value,
      progress: 0
    } as MergeAnimation);
  }

  public start(): void {
    // If already running and we have new animations, don't restart the timer
    if (this.isRunning && this.animations.size > 0) {
      return;
    }
    this.startTime = performance.now();
    this.isRunning = true;
    this.animate();
  }

  private animate(): void {
    const elapsed = performance.now() - this.startTime;
    const progress = Math.min(elapsed / this.duration, 1);
    
    // Update all animations with appropriate easing
    for (const [key, animation] of this.animations) {
      const easingFunc = animation.type === 'move' ? this.moveEasing :
                        animation.type === 'merge' ? this.mergeEasing :
                        this.easingFunction;
      animation.progress = this.applyEasing(progress, easingFunc);
    }
    
    this.onUpdate(Array.from(this.animations.values()));
    
    if (progress < 1) {
      this.animationFrameId = requestAnimationFrame(() => this.animate());
      this.isRunning = true;
    } else {
      this.animations.clear();
      this.onUpdate([]);
      this.isRunning = false;
    }
  }

  private applyEasing(t: number, easingFunction: EasingFunction): number {
    switch (easingFunction) {
      case 'linear':
        return t;
      
      case 'ease-in':
        return t * t * t;
      
      case 'ease-out':
        return 1 - Math.pow(1 - t, 3);
      
      case 'ease-in-out':
        return t < 0.5 
          ? 4 * t * t * t 
          : 1 - Math.pow(-2 * t + 2, 3) / 2;
      
      case 'cubic':
        // Fast acceleration and deceleration - perfect for snappy moves
        return t < 0.5
          ? 8 * t * t * t * t
          : 1 - Math.pow(-2 * t + 2, 4) / 2;
      
      case 'elastic':
        // Satisfying elastic effect for merges
        if (t === 0 || t === 1) return t;
        if (t < 0.5) {
          // First half: ease in
          return 0.5 * Math.pow(2 * t, 2);
        } else {
          // Second half: elastic bounce
          const elasticT = (t - 0.5) * 2;
          const p = 0.3;
          const amplitude = 0.5;
          return 0.5 + 0.5 * (1 + amplitude * Math.pow(2, -10 * elasticT) * Math.sin((elasticT - p / 4) * (2 * Math.PI) / p));
        }
      
      case 'bounce':
        // Gentler bounce effect
        const n1 = 7.5625;
        const d1 = 2.75;
        
        if (t < 1 / d1) {
          return n1 * t * t;
        } else if (t < 2 / d1) {
          t -= 1.5 / d1;
          return n1 * t * t + 0.75;
        } else if (t < 2.5 / d1) {
          t -= 2.25 / d1;
          return n1 * t * t + 0.9375;
        } else {
          t -= 2.625 / d1;
          return n1 * t * t + 0.984375;
        }
      
      default:
        return t;
    }
  }

  public stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.animations.clear();
  }

  public forceComplete(): void {
    for (const animation of this.animations.values()) {
      animation.progress = 1;
    }
    this.onUpdate(Array.from(this.animations.values()));
    this.stop();
  }
  
  public setDuration(duration: number): void {
    this.duration = duration;
  }
}