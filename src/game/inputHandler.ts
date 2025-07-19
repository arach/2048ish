import { Direction } from './logic';

export interface InputHandlerConfig {
  preventDefaultKeys?: boolean;
  swipeThreshold?: number;
  swipeVelocityThreshold?: number;
}

export type InputCallback = (direction: Direction) => void;

export class InputHandler {
  private config: Required<InputHandlerConfig>;
  private callbacks: Set<InputCallback> = new Set();
  private element: HTMLElement;
  
  // Touch handling
  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private touchStartTime: number = 0;
  private isTouching: boolean = false;

  constructor(element: HTMLElement, config: InputHandlerConfig = {}) {
    this.element = element;
    this.config = {
      preventDefaultKeys: config.preventDefaultKeys ?? true,
      swipeThreshold: config.swipeThreshold ?? 50,
      swipeVelocityThreshold: config.swipeVelocityThreshold ?? 0.3
    };
    
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Keyboard events
    this.handleKeyDown = this.handleKeyDown.bind(this);
    window.addEventListener('keydown', this.handleKeyDown);
    
    // Touch events
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    
    this.element.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.element.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.element.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    
    // Mouse events (for testing on desktop)
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    
    this.element.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    let direction: Direction | null = null;
    
    switch (event.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        direction = 'up';
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        direction = 'down';
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        direction = 'left';
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        direction = 'right';
        break;
    }
    
    if (direction !== null) {
      if (this.config.preventDefaultKeys) {
        event.preventDefault();
      }
      this.notifyCallbacks(direction);
    }
  }

  private handleTouchStart(event: TouchEvent): void {
    if (event.touches.length !== 1) return;
    
    event.preventDefault();
    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.touchStartTime = Date.now();
    this.isTouching = true;
  }

  private handleTouchMove(event: TouchEvent): void {
    if (!this.isTouching || event.touches.length !== 1) return;
    event.preventDefault();
  }

  private handleTouchEnd(event: TouchEvent): void {
    if (!this.isTouching) return;
    
    event.preventDefault();
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;
    const deltaTime = Date.now() - this.touchStartTime;
    
    this.isTouching = false;
    
    const direction = this.detectSwipeDirection(deltaX, deltaY, deltaTime);
    if (direction !== null) {
      this.notifyCallbacks(direction);
    }
  }

  private handleMouseDown(event: MouseEvent): void {
    // Only handle left mouse button
    if (event.button !== 0) return;
    
    this.touchStartX = event.clientX;
    this.touchStartY = event.clientY;
    this.touchStartTime = Date.now();
    this.isTouching = true;
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.isTouching) return;
    event.preventDefault();
  }

  private handleMouseUp(event: MouseEvent): void {
    if (!this.isTouching) return;
    
    const deltaX = event.clientX - this.touchStartX;
    const deltaY = event.clientY - this.touchStartY;
    const deltaTime = Date.now() - this.touchStartTime;
    
    this.isTouching = false;
    
    const direction = this.detectSwipeDirection(deltaX, deltaY, deltaTime);
    if (direction !== null) {
      this.notifyCallbacks(direction);
    }
  }

  private detectSwipeDirection(deltaX: number, deltaY: number, deltaTime: number): Direction | null {
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    
    // Check if the swipe is long enough
    if (Math.max(absX, absY) < this.config.swipeThreshold) {
      return null;
    }
    
    // Check velocity
    const velocity = Math.max(absX, absY) / deltaTime;
    if (velocity < this.config.swipeVelocityThreshold) {
      return null;
    }
    
    // Determine direction
    if (absX > absY) {
      return deltaX > 0 ? 'right' : 'left';
    } else {
      return deltaY > 0 ? 'down' : 'up';
    }
  }

  public subscribe(callback: InputCallback): () => void {
    this.callbacks.add(callback);
    
    return () => {
      this.callbacks.delete(callback);
    };
  }

  private notifyCallbacks(direction: Direction): void {
    for (const callback of this.callbacks) {
      callback(direction);
    }
  }

  public destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    
    this.element.removeEventListener('touchstart', this.handleTouchStart);
    this.element.removeEventListener('touchmove', this.handleTouchMove);
    this.element.removeEventListener('touchend', this.handleTouchEnd);
    
    this.element.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);
    
    this.callbacks.clear();
  }

  // Test helper methods
  public simulateKeyPress(key: string): void {
    const event = new KeyboardEvent('keydown', { key });
    this.handleKeyDown(event);
  }

  public simulateSwipe(direction: Direction): void {
    const distance = this.config.swipeThreshold * 2;
    const duration = 100; // ms
    
    let deltaX = 0;
    let deltaY = 0;
    
    switch (direction) {
      case 'up':
        deltaY = -distance;
        break;
      case 'down':
        deltaY = distance;
        break;
      case 'left':
        deltaX = -distance;
        break;
      case 'right':
        deltaX = distance;
        break;
    }
    
    // Simulate touch start
    this.touchStartX = 100;
    this.touchStartY = 100;
    this.touchStartTime = Date.now() - duration;
    this.isTouching = true;
    
    // Simulate touch end
    const touchEndEvent = {
      preventDefault: () => {},
      changedTouches: [{
        clientX: this.touchStartX + deltaX,
        clientY: this.touchStartY + deltaY
      }]
    } as any;
    
    this.handleTouchEnd(touchEndEvent);
  }
}