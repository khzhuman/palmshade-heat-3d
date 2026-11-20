const keyMap = Object.freeze({
  w: 'KeyW', a: 'KeyA', s: 'KeyS', d: 'KeyD',
  e: 'KeyE', m: 'KeyM', shift: 'ShiftLeft', space: 'Space',
  arrowup: 'ArrowUp', arrowdown: 'ArrowDown',
  arrowleft: 'ArrowLeft', arrowright: 'ArrowRight'
});

const down = new Set();
const pressed = new Set();
const released = new Set();

export const mouse = {
  x: 0,
  y: 0,
  buttons: new Set(),
  pressed: new Set(),
  released: new Set()
};

function codeFor(key) {
  if (keyMap[key]) return keyMap[key];
  if (key.startsWith('Key') || key.startsWith('Arrow') || key === 'Space') return key;
  return key.length === 1 ? `Key${key.toUpperCase()}` : key;
}

export function isDown(key) {
  return down.has(codeFor(key.toLowerCase?.() ?? key));
}

export function wasPressed(key) {
  return pressed.has(codeFor(key.toLowerCase?.() ?? key));
}

export function wasReleased(key) {
  return released.has(codeFor(key.toLowerCase?.() ?? key));
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
  const code = event.code;
  if (code === 'Space' || code.startsWith('Arrow')) event.preventDefault();
  if (!down.has(code)) pressed.add(code);
  down.add(code);
});

window.addEventListener('keyup', (event) => {
  down.delete(event.code);
  released.add(event.code);
});

window.addEventListener('mousemove', (event) => {
  mouse.x = event.clientX;
  mouse.y = event.clientY;
});

window.addEventListener('mousedown', (event) => {
  if (!mouse.buttons.has(event.button)) mouse.pressed.add(event.button);
  mouse.buttons.add(event.button);
});

window.addEventListener('mouseup', (event) => {
  mouse.buttons.delete(event.button);
  mouse.released.add(event.button);
});

export function endInputFrame() {
  pressed.clear();
  released.clear();
  mouse.pressed.clear();
  mouse.released.clear();
}
