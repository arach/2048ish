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
  animationDuration: 200,
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

  constructor(canvas: HTMLCanvasElement, config: Partial<RenderConfig> = {}) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D context from canvas');
    }
    this.ctx = ctx;
    this.config = { ...defaultConfig, ...config };
    this.setupCanvas();
  }

  private setupCanvas(): void {
    const { gridSize, cellSize, cellGap } = this.config;
    const canvasSize = gridSize * cellSize + (gridSize + 1) * cellGap;
    
    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = canvasSize * dpr;
    this.canvas.height = canvasSize * dpr;
    this.canvas.style.width = `${canvasSize}px`;
    this.canvas.style.height = `${canvasSize}px`;
    
    this.ctx.scale(dpr, dpr);
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
        // ALSO don't draw at destination - the animation will draw it there
        movingToPositions.add(`${animation.to[0]},${animation.to[1]}`);
      } else if (animation.type === 'merge') {
        // Merge animations happen at destination after move completes
        mergePositions.add(`${animation.position[0]},${animation.position[1]}`);
      } else if (animation.type === 'appear') {
        appearPositions.add(`${animation.position[0]},${animation.position[1]}`);
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
        const x = col * cellSize + (col + 1) * cellGap;
        const y = row * cellSize + (row + 1) * cellGap;
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
        
        // Skip if this position is a move destination (tile will be drawn by animation)
        if (skipToPositions.has(posKey)) {
          continue;
        }
        
        // Skip merge destinations during merge animation (they'll be drawn by animation)
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
    const { cellSize, cellGap, borderRadius, fontSize, colors } = this.config;
    const x = col * cellSize + (col + 1) * cellGap;
    const y = row * cellSize + (row + 1) * cellGap;
    
    // Cell background
    this.ctx.fillStyle = colors.cells[value] || colors.cells[4096];
    this.ctx.save();
    this.ctx.translate(x + cellSize / 2, y + cellSize / 2);
    this.ctx.scale(scale, scale);
    this.ctx.translate(-cellSize / 2, -cellSize / 2);
    this.roundRect(0, 0, cellSize, cellSize, borderRadius);
    this.ctx.fill();
    
    // Cell text
    this.ctx.fillStyle = value <= 4 ? colors.text.light : colors.text.dark;
    this.ctx.font = `bold ${fontSize}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(value.toString(), cellSize / 2, cellSize / 2);
    this.ctx.restore();
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
    const { cellSize, cellGap, animationStyle } = this.config;
    const progress = animation.progress;
    
    const fromX = animation.from[1] * cellSize + (animation.from[1] + 1) * cellGap;
    const fromY = animation.from[0] * cellSize + (animation.from[0] + 1) * cellGap;
    const toX = animation.to[1] * cellSize + (animation.to[1] + 1) * cellGap;
    const toY = animation.to[0] * cellSize + (animation.to[0] + 1) * cellGap;
    
    const x = fromX + (toX - fromX) * progress;
    const y = fromY + (toY - fromY) * progress;
    
    // Draw at actual interpolated position instead of rounding
    this.ctx.save();
    this.ctx.translate(x, y);
    
    // Scale effect based on animation style
    if (animationStyle === 'playful') {
      // Add subtle scale effect during movement
      const moveScale = 1 - 0.02 * Math.sin(progress * Math.PI);
      this.ctx.scale(moveScale, moveScale);
    }
    // Minimal style: no scale effect during movement
    
    // Draw the cell at origin since we've already translated
    const { borderRadius, fontSize, colors } = this.config;
    
    // Cell background
    this.ctx.fillStyle = colors.cells[animation.value] || colors.cells[4096];
    this.roundRect(0, 0, cellSize, cellSize, borderRadius);
    this.ctx.fill();
    
    // Cell text
    this.ctx.fillStyle = animation.value <= 4 ? colors.text.light : colors.text.dark;
    this.ctx.font = `bold ${fontSize}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(animation.value.toString(), cellSize / 2, cellSize / 2);
    
    this.ctx.restore();
  }

  private drawAppearAnimation(animation: AppearAnimation): void {
    const { animationStyle } = this.config;
    const t = animation.progress;
    
    let scale: number;
    if (animationStyle === 'minimal') {
      // Simple fade in
      scale = t;
    } else {
      // Playful: Bouncy appear effect with overshoot
      scale = t < 0.5 
        ? 2 * t * t * (3 * t - 1) // Accelerate with overshoot
        : 1 + (1 - t) * 0.1 * Math.sin((1 - t) * Math.PI * 4); // Wobble at the end
    }
    
    this.drawCell(animation.position[0], animation.position[1], animation.value, scale);
  }

  private drawMergeAnimation(animation: MergeAnimation): void {
    const { animationStyle } = this.config;
    const t = animation.progress;
    
    let scale: number;
    if (animationStyle === 'minimal') {
      // Minimal: More noticeable pulse
      scale = 1 + 0.15 * Math.sin(t * Math.PI);
    } else {
      // Playful: Bigger pop effect with bounce
      if (t < 0.5) {
        // Growing phase - overshoot to 1.3x
        scale = 1 + 0.6 * Math.sin(t * Math.PI);
      } else {
        // Settling phase with bounce
        const settleT = (t - 0.5) * 2;
        const bounce = Math.sin(settleT * Math.PI * 2) * (1 - settleT) * 0.1;
        scale = 1.3 - 0.3 * settleT + bounce;
      }
    }
    
    this.drawCell(animation.position[0], animation.position[1], animation.value, scale);
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

  public destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}

export interface AnimationState {
  type: 'move' | 'appear' | 'merge';
  progress: number;
}

export interface MoveAnimation extends AnimationState {
  type: 'move';
  from: [number, number];
  to: [number, number];
  value: number;
}

export interface AppearAnimation extends AnimationState {
  type: 'appear';
  position: [number, number];
  value: number;
}

export interface MergeAnimation extends AnimationState {
  type: 'merge';
  position: [number, number];
  value: number;
}

export class AnimationController {
  private animations: Map<string, AnimationState> = new Map();
  private startTime: number = 0;
  private duration: number;
  private onUpdate: (animations: AnimationState[]) => void;
  private animationFrameId: number | null = null;
  private easingFunction: EasingFunction;
  private moveEasing: EasingFunction;
  private mergeEasing: EasingFunction;

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
    this.startTime = performance.now();
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
    } else {
      this.animations.clear();
      this.onUpdate([]);
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
        // Gentler elastic effect for merges
        if (t === 0 || t === 1) return t;
        const p = 0.4; // Increased period for less nervousness
        const amplitude = 0.7; // Reduced amplitude
        return amplitude * Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
      
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
}