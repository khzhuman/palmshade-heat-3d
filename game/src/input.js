const aliases = Object.freeze({
  w: 'KeyW', a: 'KeyA', s: 'KeyS', d: 'KeyD',
  e: 'KeyE', m: 'KeyM', shift: 'ShiftLeft', space: 'Space',
  arrowup: 'ArrowUp', arrowdown: 'ArrowDown',
  arrowleft: 'ArrowLeft', arrowright: 'ArrowRight'
});

const heldKeys = new Set();
const keyStarts = new Set();
const keyEnds = new Set();

export const mouse = {
  x: 0,
  y: 0,
  buttons: new Set(),
  pressed: new Set(),
  released: new Set()
};

function resolveCode(key) {
  if (aliases[key]) return aliases[key];
  if (key.startsWith('Key') || key.startsWith('Arrow') || key === 'Space') {
    return key;
  }
  return key.length === 1 ? `Key${key.toUpperCase()}` : key;
}

export function isDown(key) {
  return heldKeys.has(resolveCode(key.toLowerCase?.() ?? key));
}

export function wasPressed(key) {
  return keyStarts.has(resolveCode(key.toLowerCase?.() ?? key));
}

export function wasReleased(key) {
  return keyEnds.has(resolveCode(key.toLowerCase?.() ?? key));
}

export function isMouseDown(button = 0) {
  return mouse.buttons.has(button);
}

export function wasMousePressed(button = 0) {
  return mouse.pressed.has(button);
}

export function wasMouseReleased(button = 0) {
  return mouse.released.has(button);
}

window.addEventListener('keydown', (event) => {
  const physicalKey = event.code;
  if (physicalKey === 'Space' || physicalKey.startsWith('Arrow')) {
    event.preventDefault();
  }
  if (!heldKeys.has(physicalKey)) keyStarts.add(physicalKey);
  heldKeys.add(physicalKey);
});

window.addEventListener('keyup', (event) => {
  heldKeys.delete(event.code);
  keyEnds.add(event.code);
});

window.addEventListener('mousemove', (event) => {
  mouse.x = event.clientX;
  mouse.y = event.clientY;
});

window.addEventListener('mousedown', (event) => {
  if (!mouse.buttons.has(event.button)) {
    mouse.pressed.add(event.button);
  }
  mouse.buttons.add(event.button);
});

window.addEventListener('mouseup', (event) => {
  mouse.buttons.delete(event.button);
  mouse.released.add(event.button);
});

export function endInputFrame() {
  keyStarts.clear();
  keyEnds.clear();
  mouse.pressed.clear();
  mouse.released.clear();
}
