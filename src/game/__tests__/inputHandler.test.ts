import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InputHandler } from '../inputHandler';
import { Direction } from '../logic';

describe('InputHandler', () => {
  let container: HTMLDivElement;
  let inputHandler: InputHandler;
  let capturedDirections: Direction[];
  let unsubscribe: () => void;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
    inputHandler = new InputHandler(container);
    capturedDirections = [];
    
    unsubscribe = inputHandler.subscribe((direction) => {
      capturedDirections.push(direction);
    });
  });

  afterEach(() => {
    unsubscribe();
    inputHandler.destroy();
    document.body.removeChild(container);
    vi.useRealTimers();
  });

  describe('keyboard input', () => {
    it('should handle arrow keys', () => {
      const directions: [string, Direction][] = [
        ['ArrowUp', 'up'],
        ['ArrowDown', 'down'],
        ['ArrowLeft', 'left'],
        ['ArrowRight', 'right']
      ];

      directions.forEach(([key, expectedDirection]) => {
        capturedDirections = [];
        const event = new KeyboardEvent('keydown', { key });
        window.dispatchEvent(event);
        
        expect(capturedDirections).toEqual([expectedDirection]);
      });
    });

    it('should handle WASD keys', () => {
      const keys: [string[], Direction][] = [
        [['w', 'W'], 'up'],
        [['s', 'S'], 'down'],
        [['a', 'A'], 'left'],
        [['d', 'D'], 'right']
      ];

      keys.forEach(([keyVariants, expectedDirection]) => {
        keyVariants.forEach(key => {
          capturedDirections = [];
          const event = new KeyboardEvent('keydown', { key });
          window.dispatchEvent(event);
          
          expect(capturedDirections).toEqual([expectedDirection]);
        });
      });
    });

    it('should ignore non-game keys', () => {
      const nonGameKeys = ['Enter', ' ', 'Escape', 'Tab', 'x', '1'];
      
      nonGameKeys.forEach(key => {
        capturedDirections = [];
        const event = new KeyboardEvent('keydown', { key });
        window.dispatchEvent(event);
        
        expect(capturedDirections).toEqual([]);
      });
    });

    it('should prevent default on game keys when configured', () => {
      const event = new KeyboardEvent('keydown', { 
        key: 'ArrowUp',
        cancelable: true 
      });
      
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      window.dispatchEvent(event);
      
      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should not prevent default when configured', () => {
      inputHandler.destroy();
      inputHandler = new InputHandler(container, { preventDefaultKeys: false });
      inputHandler.subscribe((direction) => capturedDirections.push(direction));
      
      const event = new KeyboardEvent('keydown', { 
        key: 'ArrowUp',
        cancelable: true 
      });
      
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      window.dispatchEvent(event);
      
      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });
  });

  describe('touch input', () => {
    function createTouchEvent(type: string, x: number, y: number): TouchEvent {
      const touch = {
        clientX: x,
        clientY: y,
        identifier: 0,
        target: container
      };
      
      return new TouchEvent(type, {
        touches: type === 'touchend' ? [] : [touch as Touch],
        changedTouches: [touch as Touch],
        cancelable: true,
        bubbles: true
      });
    }

    it('should detect left swipe', () => {
      const startEvent = createTouchEvent('touchstart', 200, 100);
      const endEvent = createTouchEvent('touchend', 50, 100);
      
      container.dispatchEvent(startEvent);
      
      // Simulate delay for swipe
      vi.advanceTimersByTime(50);
      
      container.dispatchEvent(endEvent);
      
      expect(capturedDirections).toEqual(['left']);
    });

    it('should detect right swipe', () => {
      const startEvent = createTouchEvent('touchstart', 50, 100);
      const endEvent = createTouchEvent('touchend', 200, 100);
      
      container.dispatchEvent(startEvent);
      vi.advanceTimersByTime(50);
      container.dispatchEvent(endEvent);
      
      expect(capturedDirections).toEqual(['right']);
    });

    it('should detect up swipe', () => {
      const startEvent = createTouchEvent('touchstart', 100, 200);
      const endEvent = createTouchEvent('touchend', 100, 50);
      
      container.dispatchEvent(startEvent);
      vi.advanceTimersByTime(50);
      container.dispatchEvent(endEvent);
      
      expect(capturedDirections).toEqual(['up']);
    });

    it('should detect down swipe', () => {
      const startEvent = createTouchEvent('touchstart', 100, 50);
      const endEvent = createTouchEvent('touchend', 100, 200);
      
      container.dispatchEvent(startEvent);
      vi.advanceTimersByTime(50);
      container.dispatchEvent(endEvent);
      
      expect(capturedDirections).toEqual(['down']);
    });

    it('should ignore short swipes', () => {
      const startEvent = createTouchEvent('touchstart', 100, 100);
      const endEvent = createTouchEvent('touchend', 110, 110);
      
      container.dispatchEvent(startEvent);
      container.dispatchEvent(endEvent);
      
      expect(capturedDirections).toEqual([]);
    });

    it('should ignore slow swipes', () => {
      inputHandler.destroy();
      inputHandler = new InputHandler(container, { 
        swipeThreshold: 50,
        swipeVelocityThreshold: 0.5 
      });
      inputHandler.subscribe((direction) => capturedDirections.push(direction));
      
      const startEvent = createTouchEvent('touchstart', 100, 100);
      const endEvent = createTouchEvent('touchend', 200, 100);
      
      container.dispatchEvent(startEvent);
      
      // Long delay makes it a slow swipe
      vi.advanceTimersByTime(1000);
      
      container.dispatchEvent(endEvent);
      
      expect(capturedDirections).toEqual([]);
    });

    it('should handle multi-touch by ignoring', () => {
      const touch1 = {
        clientX: 100,
        clientY: 100,
        identifier: 0,
        target: container
      };
      const touch2 = {
        clientX: 200,
        clientY: 200,
        identifier: 1,
        target: container
      };
      
      const multiTouchEvent = new TouchEvent('touchstart', {
        touches: [touch1, touch2] as Touch[],
        cancelable: true,
        bubbles: true
      });
      
      container.dispatchEvent(multiTouchEvent);
      
      const endEvent = createTouchEvent('touchend', 300, 100);
      container.dispatchEvent(endEvent);
      
      expect(capturedDirections).toEqual([]);
    });
  });

  describe('mouse input', () => {
    it('should detect mouse drag as swipe', () => {
      const downEvent = new MouseEvent('mousedown', {
        clientX: 200,
        clientY: 100,
        button: 0,
        bubbles: true
      });
      
      const upEvent = new MouseEvent('mouseup', {
        clientX: 50,
        clientY: 100,
        bubbles: true
      });
      
      container.dispatchEvent(downEvent);
      vi.advanceTimersByTime(50);
      window.dispatchEvent(upEvent);
      
      expect(capturedDirections).toEqual(['left']);
    });

    it('should ignore right mouse button', () => {
      const downEvent = new MouseEvent('mousedown', {
        clientX: 200,
        clientY: 100,
        button: 2, // Right button
        bubbles: true
      });
      
      const upEvent = new MouseEvent('mouseup', {
        clientX: 50,
        clientY: 100,
        bubbles: true
      });
      
      container.dispatchEvent(downEvent);
      window.dispatchEvent(upEvent);
      
      expect(capturedDirections).toEqual([]);
    });
  });

  describe('subscription management', () => {
    it('should support multiple subscribers', () => {
      const directions1: Direction[] = [];
      const directions2: Direction[] = [];
      
      const unsub1 = inputHandler.subscribe(d => directions1.push(d));
      const unsub2 = inputHandler.subscribe(d => directions2.push(d));
      
      inputHandler.simulateKeyPress('ArrowUp');
      
      expect(directions1).toEqual(['up']);
      expect(directions2).toEqual(['up']);
      
      unsub1();
      
      inputHandler.simulateKeyPress('ArrowDown');
      
      expect(directions1).toEqual(['up']); // No new direction
      expect(directions2).toEqual(['up', 'down']);
      
      unsub2();
    });

    it('should clean up event listeners on destroy', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      
      const handler = new InputHandler(container);
      const listenerCount = addEventListenerSpy.mock.calls.length;
      
      handler.destroy();
      
      expect(removeEventListenerSpy).toHaveBeenCalledTimes(listenerCount);
    });
  });

  describe('test helpers', () => {
    it('should simulate key press', () => {
      inputHandler.simulateKeyPress('ArrowLeft');
      expect(capturedDirections).toEqual(['left']);
    });

    it('should simulate swipe', () => {
      inputHandler.simulateSwipe('right');
      expect(capturedDirections).toEqual(['right']);
    });
  });

  describe('configuration', () => {
    it('should respect custom swipe threshold', () => {
      inputHandler.destroy();
      inputHandler = new InputHandler(container, { 
        swipeThreshold: 100 
      });
      inputHandler.subscribe((direction) => capturedDirections.push(direction));
      
      // Swipe less than threshold
      const startEvent = createTouchEvent('touchstart', 100, 100);
      const endEvent = createTouchEvent('touchend', 180, 100);
      
      container.dispatchEvent(startEvent);
      vi.advanceTimersByTime(50);
      container.dispatchEvent(endEvent);
      
      expect(capturedDirections).toEqual([]);
    });
  });
});

function createTouchEvent(type: string, x: number, y: number): TouchEvent {
  const touch = {
    clientX: x,
    clientY: y,
    identifier: 0,
    target: document.body
  };
  
  return new TouchEvent(type, {
    touches: type === 'touchend' ? [] : [touch as Touch],
    changedTouches: [touch as Touch],
    cancelable: true,
    bubbles: true
  });
}