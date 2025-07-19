import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CanvasRenderer, AnimationController, RenderConfig } from '../renderer';
import { Grid } from '../logic';

describe('CanvasRenderer', () => {
  let canvas: HTMLCanvasElement;
  let renderer: CanvasRenderer;
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 500;
    canvas.height = 500;
    renderer = new CanvasRenderer(canvas);
    ctx = canvas.getContext('2d')!;
  });

  afterEach(() => {
    renderer.destroy();
  });

  describe('initialization', () => {
    it('should create renderer with default config', () => {
      expect(renderer).toBeDefined();
      expect(renderer.getCanvas()).toBe(canvas);
    });

    it('should accept custom config', () => {
      const customConfig: Partial<RenderConfig> = {
        gridSize: 6,
        cellSize: 80,
        cellGap: 15,
        colors: {
          background: '#000000',
          gridBackground: '#111111',
          emptyCell: '#222222',
          text: { light: '#ffffff', dark: '#000000' },
          cells: { 2: '#ff0000' }
        }
      };

      const customRenderer = new CanvasRenderer(canvas, customConfig);
      expect(customRenderer).toBeDefined();
      customRenderer.destroy();
    });

    it('should handle high DPI displays', () => {
      const dpr = window.devicePixelRatio || 1;
      const expectedWidth = 450 * dpr; // 4 * 100 + 5 * 10 (10px gap on each side and between cells)
      const expectedHeight = 450 * dpr;

      expect(canvas.width).toBe(expectedWidth);
      expect(canvas.height).toBe(expectedHeight);
    });
  });

  describe('rendering', () => {
    it('should render empty grid', () => {
      const clearRectSpy = vi.spyOn(ctx, 'clearRect');
      const fillRectSpy = vi.spyOn(ctx, 'fillRect');

      const emptyGrid: Grid = [
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null]
      ];

      renderer.render(emptyGrid);

      expect(clearRectSpy).toHaveBeenCalled();
      expect(fillRectSpy).toHaveBeenCalled();
    });

    it('should render grid with tiles', () => {
      const fillTextSpy = vi.spyOn(ctx, 'fillText');

      const grid: Grid = [
        [2, 4, null, null],
        [8, 16, null, null],
        [null, null, null, null],
        [null, null, null, null]
      ];

      renderer.render(grid);

      expect(fillTextSpy).toHaveBeenCalledWith('2', expect.any(Number), expect.any(Number));
      expect(fillTextSpy).toHaveBeenCalledWith('4', expect.any(Number), expect.any(Number));
      expect(fillTextSpy).toHaveBeenCalledWith('8', expect.any(Number), expect.any(Number));
      expect(fillTextSpy).toHaveBeenCalledWith('16', expect.any(Number), expect.any(Number));
    });

    it('should use correct colors for different tile values', () => {
      const grid: Grid = [
        [2, 4, 8, 16],
        [32, 64, 128, 256],
        [512, 1024, 2048, 4096],
        [null, null, null, null]
      ];

      let fillStyleValues: string[] = [];
      const originalFillStyle = Object.getOwnPropertyDescriptor(ctx, 'fillStyle');
      
      Object.defineProperty(ctx, 'fillStyle', {
        get() { return fillStyleValues[fillStyleValues.length - 1]; },
        set(value) { fillStyleValues.push(value); }
      });

      renderer.render(grid);

      // Check that different tile values got different colors
      expect(fillStyleValues).toContain('#eee4da'); // 2
      expect(fillStyleValues).toContain('#ede0c8'); // 4
      expect(fillStyleValues).toContain('#f2b179'); // 8
      expect(fillStyleValues).toContain('#edc22e'); // 2048

      if (originalFillStyle) {
        Object.defineProperty(ctx, 'fillStyle', originalFillStyle);
      }
    });
  });

  describe('snapshot', () => {
    it('should create snapshot', () => {
      const toDataURLSpy = vi.spyOn(canvas, 'toDataURL');
      
      const snapshot = renderer.snapshot();
      
      expect(toDataURLSpy).toHaveBeenCalledWith('image/png');
      expect(snapshot).toBe('data:image/png;base64,mock');
    });

    it('should create consistent snapshots for same grid', () => {
      const grid: Grid = [
        [2, 4, null, null],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null]
      ];

      renderer.render(grid);
      const snapshot1 = renderer.snapshot();

      renderer.render(grid);
      const snapshot2 = renderer.snapshot();

      expect(snapshot1).toBe(snapshot2);
    });
  });
});

describe('AnimationController', () => {
  let animationController: AnimationController;
  let updateCallback: vi.Mock;

  beforeEach(() => {
    vi.useFakeTimers();
    updateCallback = vi.fn();
    animationController = new AnimationController(150, updateCallback);
  });

  afterEach(() => {
    animationController.stop();
    vi.useRealTimers();
  });

  describe('move animations', () => {
    it('should add and animate move', () => {
      const move = {
        from: [0, 0] as [number, number],
        to: [0, 3] as [number, number],
        value: 2
      };

      animationController.addMoveAnimation(move);
      animationController.start();

      // Allow a frame to pass
      vi.advanceTimersByTime(1);

      expect(updateCallback).toHaveBeenCalled();

      const animations = updateCallback.mock.calls[0][0];
      expect(animations).toHaveLength(1);
      expect(animations[0].type).toBe('move');
      expect(animations[0].progress).toBeGreaterThanOrEqual(0);
      expect(animations[0].progress).toBeLessThanOrEqual(1);
    });

    it('should update animation progress over time', () => {
      const move = {
        from: [0, 0] as [number, number],
        to: [0, 3] as [number, number],
        value: 2
      };

      animationController.addMoveAnimation(move);
      animationController.start();

      // Advance time to middle of animation
      vi.advanceTimersByTime(75);

      const calls = updateCallback.mock.calls;
      const lastCall = calls[calls.length - 1];
      const animation = lastCall[0][0];

      expect(animation.progress).toBeGreaterThan(0);
      expect(animation.progress).toBeLessThan(1);
    });

    it('should complete animation', () => {
      const move = {
        from: [0, 0] as [number, number],
        to: [0, 3] as [number, number],
        value: 2
      };

      animationController.addMoveAnimation(move);
      animationController.start();

      // Advance past animation duration
      vi.advanceTimersByTime(200);

      const calls = updateCallback.mock.calls;
      const lastCall = calls[calls.length - 1];
      
      expect(lastCall[0]).toEqual([]); // Empty array means animation completed
    });
  });

  describe('appear animations', () => {
    it('should animate tile appearance', () => {
      animationController.addAppearAnimation([1, 1], 2);
      animationController.start();

      const animations = updateCallback.mock.calls[0][0];
      expect(animations).toHaveLength(1);
      expect(animations[0].type).toBe('appear');
      expect(animations[0].position).toEqual([1, 1]);
      expect(animations[0].value).toBe(2);
    });
  });

  describe('merge animations', () => {
    it('should animate tile merge', () => {
      animationController.addMergeAnimation([2, 2], 4);
      animationController.start();

      const animations = updateCallback.mock.calls[0][0];
      expect(animations).toHaveLength(1);
      expect(animations[0].type).toBe('merge');
      expect(animations[0].position).toEqual([2, 2]);
      expect(animations[0].value).toBe(4);
    });
  });

  describe('animation control', () => {
    it('should handle multiple animations', () => {
      animationController.addMoveAnimation({
        from: [0, 0] as [number, number],
        to: [0, 1] as [number, number],
        value: 2
      });
      animationController.addMoveAnimation({
        from: [1, 0] as [number, number],
        to: [1, 1] as [number, number],
        value: 4
      });
      animationController.addAppearAnimation([2, 2], 2);

      animationController.start();

      const animations = updateCallback.mock.calls[0][0];
      expect(animations).toHaveLength(3);
    });

    it('should stop animations', () => {
      animationController.addMoveAnimation({
        from: [0, 0] as [number, number],
        to: [0, 1] as [number, number],
        value: 2
      });

      animationController.start();
      animationController.stop();

      const callCount = updateCallback.mock.calls.length;
      vi.advanceTimersByTime(100);

      expect(updateCallback).toHaveBeenCalledTimes(callCount); // No new calls
    });

    it('should force complete animations', () => {
      animationController.addMoveAnimation({
        from: [0, 0] as [number, number],
        to: [0, 3] as [number, number],
        value: 2
      });

      animationController.start();
      animationController.forceComplete();

      const calls = updateCallback.mock.calls;
      const beforeForce = calls[calls.length - 2][0][0];
      const afterForce = calls[calls.length - 1][0];

      expect(beforeForce.progress).toBe(1);
      expect(afterForce).toEqual([]); // Cleared after force complete
    });

    it('should use easing function', () => {
      animationController.addMoveAnimation({
        from: [0, 0] as [number, number],
        to: [0, 1] as [number, number],
        value: 2
      });

      animationController.start();

      // Check progress at different time points
      const progressValues: number[] = [];

      for (let i = 0; i < 150; i += 10) {
        vi.advanceTimersByTime(10);
        const calls = updateCallback.mock.calls;
        if (calls.length > 0) {
          const lastCall = calls[calls.length - 1];
          if (lastCall[0].length > 0) {
            progressValues.push(lastCall[0][0].progress);
          }
        }
      }

      // Easing should create non-linear progression
      const isNonLinear = progressValues.some((value, index) => {
        if (index === 0) return false;
        const linearProgress = (index * 10) / 150;
        return Math.abs(value - linearProgress) > 0.1;
      });

      expect(isNonLinear).toBe(true);
    });
  });
});