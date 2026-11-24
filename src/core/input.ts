import { DEFAULT_KEYBINDS, type BindableAction, type KeybindMap } from './settings';

export type InputAction = BindableAction | 'start';

export class InputHub {
  private readonly heldActions = new Set<InputAction>();
  private readonly justPressedBuffer = new Map<InputAction, number>();
  private readonly codesDown = new Set<string>();
  private keybinds: KeybindMap = DEFAULT_KEYBINDS;
  private codeLookup = new Map<string, InputAction[]>();
  private canvasEl: HTMLElement | null = null;
  private rebindListener: ((code: string) => void) | null = null;
  private gameplayMouseEnabled = true;
  private modalSuspended = false;

  // Virtual touch controls state (-1..1 axes)
  private virtualX = 0;
  private virtualY = 0;
  private readonly virtualHeld = new Set<InputAction>();

  // WoW-style RMB camera orbit + steering & scroll zoom
  private rmbDown = false;
  private rmbStartX = 0;
  private rmbStartY = 0;
  private rmbLastX = 0;
  private rmbLastY = 0;
  private rmbDragDist = 0;
  private rmbDownTime = 0;
  private orbitDeltaX = 0;
  private orbitDeltaY = 0;
  private wheelDelta = 0;
  private targetLockPressed = false;

  private readonly onKeyDownBound: (e: KeyboardEvent) => void;
  private readonly onKeyUpBound: (e: KeyboardEvent) => void;
  private readonly onMouseDownBound: (e: MouseEvent) => void;
  private readonly onMouseMoveBound: (e: MouseEvent) => void;
  private readonly onMouseUpBound: (e: MouseEvent) => void;
  private readonly onWheelBound: (e: WheelEvent) => void;
  private readonly onContextMenuBound: (e: MouseEvent) => void;
  private readonly onBlurBound: () => void;
  private readonly onVisibilityBound: () => void;

  constructor(private readonly bufferWindow = 0.14) {
    this.rebuildLookup();
    this.onKeyDownBound = (e) => this.handleKeyDown(e);
    this.onKeyUpBound = (e) => this.handleKeyUp(e);
    this.onMouseDownBound = (e) => this.handleMouseDown(e);
    this.onMouseMoveBound = (e) => this.handleMouseMove(e);
    this.onMouseUpBound = (e) => this.handleMouseUp(e);
    this.onWheelBound = (e) => this.handleWheel(e);
    this.onContextMenuBound = (e) => {
      if (this.canvasEl && (e.target === this.canvasEl || this.canvasEl.contains(e.target as Node))) {
        e.preventDefault();
      }
    };
    this.onBlurBound = () => this.clear();
    this.onVisibilityBound = () => {
      if (document.visibilityState !== 'visible') this.clear();
    };
  }

  setKeybinds(map: KeybindMap): void {
    this.keybinds = map;
    this.rebuildLookup();
    this.clear();
  }

  setCanvasTarget(el: HTMLElement | null): void {
    this.canvasEl = el;
  }

  setGameplayMouseEnabled(enabled: boolean): void {
    this.gameplayMouseEnabled = enabled;
    if (!enabled) {
      this.rmbDown = false;
    }
  }

  setModalSuspended(suspended: boolean): void {
    this.modalSuspended = suspended;
    if (suspended) {
      this.clear();
    }
  }

  startRebindCapture(cb: (code: string) => void): void {
    this.rebindListener = cb;
    this.clear();
  }

  cancelRebindCapture(): void {
    this.rebindListener = null;
  }

  private rebuildLookup(): void {
    const map = new Map<string, InputAction[]>();
    const add = (code: string | undefined, action: InputAction) => {
      if (!code) return;
      const list = map.get(code);
      if (list) {
        if (!list.includes(action)) list.push(action);
      } else {
        map.set(code, [action]);
      }
    };
    for (const action of Object.keys(this.keybinds) as BindableAction[]) {
      const pair = this.keybinds[action];
      add(pair.primary, action);
      add(pair.secondary, action);
    }
    add('Enter', 'start');
    add('Space', 'start');
    this.codeLookup = map;
  }

  attach(target: Window = window): void {
    target.addEventListener('keydown', this.onKeyDownBound);
    target.addEventListener('keyup', this.onKeyUpBound);
    target.addEventListener('mousedown', this.onMouseDownBound);
    target.addEventListener('mousemove', this.onMouseMoveBound);
    target.addEventListener('mouseup', this.onMouseUpBound);
    target.addEventListener('wheel', this.onWheelBound, { passive: false });
    target.addEventListener('contextmenu', this.onContextMenuBound);
    target.addEventListener('blur', this.onBlurBound);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibilityBound);
    }
  }

  detach(target: Window = window): void {
    target.removeEventListener('keydown', this.onKeyDownBound);
    target.removeEventListener('keyup', this.onKeyUpBound);
    target.removeEventListener('mousedown', this.onMouseDownBound);
    target.removeEventListener('mousemove', this.onMouseMoveBound);
    target.removeEventListener('mouseup', this.onMouseUpBound);
    target.removeEventListener('wheel', this.onWheelBound);
    target.removeEventListener('contextmenu', this.onContextMenuBound);
    target.removeEventListener('blur', this.onBlurBound);
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibilityBound);
    }
  }

  clear(): void {
    this.heldActions.clear();
    this.justPressedBuffer.clear();
    this.codesDown.clear();
    this.virtualHeld.clear();
    this.virtualX = 0;
    this.virtualY = 0;
    this.rmbDown = false;
    this.rmbDragDist = 0;
    this.orbitDeltaX = 0;
    this.orbitDeltaY = 0;
    this.wheelDelta = 0;
    this.targetLockPressed = false;
  }

  setVirtualStick(x: number, y: number): void {
    this.virtualX = Math.max(-1, Math.min(1, x));
    this.virtualY = Math.max(-1, Math.min(1, y));
  }

  getVirtualStick(): { x: number; y: number } {
    return { x: this.virtualX, y: this.virtualY };
  }

  addOrbitDelta(dx: number, dy: number): void {
    this.orbitDeltaX += dx;
    this.orbitDeltaY += dy;
  }

  consumeOrbitDelta(): { dx: number; dy: number } {
    const dx = this.orbitDeltaX;
    const dy = this.orbitDeltaY;
    this.orbitDeltaX = 0;
    this.orbitDeltaY = 0;
    return { dx, dy };
  }

  consumeWheelDelta(): number {
    const w = this.wheelDelta;
    this.wheelDelta = 0;
    return w;
  }

  consumeTargetLock(): boolean {
    if (!this.targetLockPressed) return false;
    this.targetLockPressed = false;
    return true;
  }

  isCameraSteering(): boolean {
    return this.rmbDown && this.gameplayMouseEnabled;
  }

  triggerVirtualAction(action: InputAction, pressed: boolean): void {
    if (pressed) {
      if (!this.virtualHeld.has(action)) {
        this.justPressedBuffer.set(action, this.bufferWindow);
      }
      this.virtualHeld.add(action);
      this.heldActions.add(action);
    } else {
      this.virtualHeld.delete(action);
      this.heldActions.delete(action);
    }
  }

  tick(dt: number): void {
    for (const [action, remaining] of this.justPressedBuffer.entries()) {
      const next = remaining - dt;
      if (next <= 0) {
        this.justPressedBuffer.delete(action);
      } else {
        this.justPressedBuffer.set(action, next);
      }
    }
  }

  isHeld(action: InputAction): boolean {
    return this.heldActions.has(action) || this.virtualHeld.has(action);
  }

  consume(action: InputAction): boolean {
    if (!this.justPressedBuffer.has(action)) return false;
    this.justPressedBuffer.delete(action);
    return true;
  }

  private activateCode(code: string): void {
    const actions = this.codeLookup.get(code);
    if (!actions) return;
    const isFresh = !this.codesDown.has(code);
    this.codesDown.add(code);
    for (const action of actions) {
      if (isFresh) {
        this.justPressedBuffer.set(action, this.bufferWindow);
      }
      this.heldActions.add(action);
    }
  }

  private releaseCode(code: string): void {
    this.codesDown.delete(code);
    const actions = this.codeLookup.get(code);
    if (!actions) return;
    for (const action of actions) {
      let stillHeld = this.virtualHeld.has(action);
      if (!stillHeld) {
        for (const heldCode of this.codesDown) {
          const list = this.codeLookup.get(heldCode);
          if (list?.includes(action)) {
            stillHeld = true;
            break;
          }
        }
      }
      if (!stillHeld) {
        this.heldActions.delete(action);
      }
    }
  }

  private isCanvasEvent(target: EventTarget | null): boolean {
    return (
      this.canvasEl !== null &&
      target !== null &&
      (target === this.canvasEl || this.canvasEl.contains(target as Node))
    );
  }

  private resolveEventCode(e: KeyboardEvent): string {
    if (e.code && e.code !== 'Unidentified') return e.code;
    if (e.key >= '0' && e.key <= '9') return `Digit${e.key}`;
    if (e.key.length === 1 && /[a-z]/i.test(e.key)) return `Key${e.key.toUpperCase()}`;
    return e.key;
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const code = this.resolveEventCode(e);
    if (this.rebindListener) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') {
        e.stopImmediatePropagation();
      }
      const listener = this.rebindListener;
      this.rebindListener = null;
      if (code && code !== 'Escape') {
        listener(code);
      }
      return;
    }

    if (this.modalSuspended) {
      return;
    }

    if (code === 'Tab' && this.gameplayMouseEnabled) {
      e.preventDefault();
      if (!e.repeat) {
        this.targetLockPressed = true;
      }
      return;
    }

    if (code.startsWith('Arrow') || code === 'Space') {
      const active = typeof document !== 'undefined' ? document.activeElement : null;
      const inInput =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement;
      if (!inInput) {
        e.preventDefault();
      }
    }
    this.activateCode(code);
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.releaseCode(this.resolveEventCode(e));
  }

  private handleMouseDown(e: MouseEvent): void {
    const code = `Mouse${e.button}`;
    if (this.rebindListener) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') {
        e.stopImmediatePropagation();
      }
      const listener = this.rebindListener;
      this.rebindListener = null;
      listener(code);
      return;
    }

    if (this.modalSuspended || !this.gameplayMouseEnabled) return;
    if (!this.isCanvasEvent(e.target)) return;

    if (e.button === 2) {
      e.preventDefault();
      this.rmbDown = true;
      this.rmbStartX = e.clientX;
      this.rmbStartY = e.clientY;
      this.rmbLastX = e.clientX;
      this.rmbLastY = e.clientY;
      this.rmbDragDist = 0;
      this.rmbDownTime = performance.now();
      return;
    }

    if (e.button === 1) {
      e.preventDefault();
    }
    this.activateCode(code);
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.rmbDown || !this.gameplayMouseEnabled) return;
    const dx = e.clientX - this.rmbLastX;
    const dy = e.clientY - this.rmbLastY;
    this.rmbLastX = e.clientX;
    this.rmbLastY = e.clientY;
    this.rmbDragDist += Math.hypot(dx, dy);
    this.orbitDeltaX += dx;
    this.orbitDeltaY += dy;
  }

  private handleMouseUp(e: MouseEvent): void {
    if (e.button === 2 && this.rmbDown) {
      const wasTap =
        this.rmbDragDist < 8 &&
        performance.now() - this.rmbDownTime < 280 &&
        Math.hypot(e.clientX - this.rmbStartX, e.clientY - this.rmbStartY) < 8;
      this.rmbDown = false;
      if (wasTap && this.gameplayMouseEnabled) {
        // Quick RMB click still triggers jump/bound Mouse2 action cleanly; dragging orbits like WoW
        const actions = this.codeLookup.get('Mouse2');
        if (actions) {
          for (const action of actions) {
            this.justPressedBuffer.set(action, this.bufferWindow);
          }
        }
      }
      return;
    }
    this.releaseCode(`Mouse${e.button}`);
  }

  private handleWheel(e: WheelEvent): void {
    if (!this.gameplayMouseEnabled) return;
    if (!this.isCanvasEvent(e.target)) return;
    e.preventDefault();
    this.wheelDelta += e.deltaY;
  }
}
