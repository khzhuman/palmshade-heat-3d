export const keys = Object.create(null);
export const mouse = { x: 0, y: 0, down: false };

const wentDown = new Set();
let listening = false;

export function initInput() {
  if (listening) return;
  listening = true;

  window.addEventListener('keydown', event => {
    if (!keys[event.code]) wentDown.add(event.code);
    keys[event.code] = true;
  });

  window.addEventListener('keyup', event => {
    keys[event.code] = false;
  });

  window.addEventListener('blur', () => {
    for (const code of Object.keys(keys)) keys[code] = false;
    mouse.down = false;
    wentDown.clear();
  });

  window.addEventListener('pointermove', event => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
  });

  window.addEventListener('pointerdown', event => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    if (event.button === 0) mouse.down = true;
  });

  window.addEventListener('pointerup', event => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    if (event.button === 0) mouse.down = false;
  });
}

export function pressed(code) {
  return wentDown.has(code);
}

export function endFrame() {
  wentDown.clear();
}
