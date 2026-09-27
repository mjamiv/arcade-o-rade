import type { DriveInput } from './physics.ts';

export class Controls {
  keys = new Set<string>();
  touch = new Set<string>();
  connected = false;
  private previousButtons: boolean[] = [];
  onAction: (action: string) => void = () => {};
  constructor() {
    window.addEventListener('keydown', (event) => {
      if (
        document.querySelector('dialog[open]') ||
        (event.target instanceof HTMLElement &&
          ['INPUT', 'SELECT'].includes(event.target.tagName))
      )
        return;
      const key = event.code;
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(
          key,
        )
      )
        event.preventDefault();
      this.keys.add(key);
      if (event.repeat) return;
      const actions: Record<string, string> = {
        Escape: 'pause',
        KeyP: 'pause',
        KeyC: 'camera',
        KeyR: 'recover',
        KeyM: 'mute',
        KeyF: 'fullscreen',
      };
      if (actions[key]) this.onAction(actions[key]);
    });
    window.addEventListener('keyup', (event) => this.keys.delete(event.code));
    window.addEventListener('blur', () => this.clear());
    for (const el of document.querySelectorAll<HTMLButtonElement>(
      '[data-control]',
    )) {
      const control = el.dataset.control!;
      el.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        el.setPointerCapture(event.pointerId);
        this.touch.add(control);
        el.classList.add('pressed');
      });
      const release = () => {
        this.touch.delete(control);
        el.classList.remove('pressed');
      };
      el.addEventListener('pointerup', release);
      el.addEventListener('pointercancel', release);
      el.addEventListener('lostpointercapture', release);
    }
  }
  clear() {
    this.keys.clear();
    this.touch.clear();
    document
      .querySelectorAll('.pressed')
      .forEach((e) => e.classList.remove('pressed'));
  }
  read(): DriveInput {
    const has = (...keys: string[]) => keys.some((k) => this.keys.has(k));
    let throttle = has('KeyW', 'ArrowUp') || this.touch.has('throttle') ? 1 : 0;
    let brake = has('KeyS', 'ArrowDown') || this.touch.has('brake') ? 1 : 0;
    let steer =
      (has('KeyA', 'ArrowLeft') || this.touch.has('left') ? 1 : 0) -
      (has('KeyD', 'ArrowRight') || this.touch.has('right') ? 1 : 0);
    let handbrake = has('Space');
    const pad = navigator.getGamepads?.().find((p) => p?.connected);
    this.connected = !!pad;
    if (pad) {
      const axis = pad.axes[0] ?? 0;
      if (Math.abs(axis) > 0.12)
        steer = (-Math.sign(axis) * (Math.abs(axis) - 0.12)) / 0.88;
      throttle = Math.max(throttle, pad.buttons[7]?.value ?? 0);
      brake = Math.max(brake, pad.buttons[6]?.value ?? 0);
      handbrake ||= pad.buttons[0]?.pressed ?? false;
      for (const [index, action] of [
        [9, 'pause'],
        [3, 'camera'],
        [1, 'recover'],
      ] as const) {
        const pressed = pad.buttons[index]?.pressed ?? false;
        if (pressed && !this.previousButtons[index]) this.onAction(action);
        this.previousButtons[index] = pressed;
      }
    }
    return { throttle, brake, steer, handbrake };
  }
}
