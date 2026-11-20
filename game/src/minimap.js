export function createMinimap(player, police, missions, world = {}) {
  const localMap = document.getElementById('minimap');
  localMap.width = localMap.height = 256;
  const localContext = localMap.getContext('2d');
  const overlay = document.getElementById('map-overlay');
  const cityMap = document.getElementById('city-map');
  cityMap.width = cityMap.height = 800;
  const cityContext = cityMap.getContext('2d');
  const districts = [
    [-240, -240, 'OLD PORT', '#3b5967'],
    [0, -240, 'THE FLATS', '#6b6549'],
    [-240, 0, 'CORAL HEIGHTS', '#385b54'],
    [0, 0, 'NEON MILE', '#61505c'],
  ];
  let open = false;

  function draw(context, size, scale, centerX, centerZ, labels) {
    context.fillStyle = '#143c49';
    context.fillRect(0, 0, size, size);
    context.save();
    context.translate(size / 2 - centerX * scale, size / 2 - centerZ * scale);
    for (const [x, z, name, color] of districts) {
      context.fillStyle = color;
      context.fillRect(x * scale, z * scale, 240 * scale, 240 * scale);
      if (labels) {
        context.fillStyle = '#f5e6bc';
        context.font = 'bold 17px system-ui';
        context.fillText((world.districtAt?.(x + 120, z + 120) ?? name).toUpperCase(), (x + 20) * scale, (z + 35) * scale);
      }
    }
    context.strokeStyle = '#979d93';
    context.lineWidth = 10 * scale;
    for (let road = -180; road <= 180; road += 60) {
      context.beginPath();
      context.moveTo(-240 * scale, road * scale);
      context.lineTo(240 * scale, road * scale);
      context.stroke();
      context.beginPath();
      context.moveTo(road * scale, -240 * scale);
      context.lineTo(road * scale, 240 * scale);
      context.stroke();
    }
    context.strokeStyle = '#cfbd8e';
    context.lineWidth = .45 * scale;
    for (let road = -180; road <= 180; road += 60) {
      context.beginPath();
      context.moveTo(-240 * scale, road * scale);
      context.lineTo(240 * scale, road * scale);
      context.stroke();
      context.beginPath();
      context.moveTo(road * scale, -240 * scale);
      context.lineTo(road * scale, 240 * scale);
      context.stroke();
    }
    if (police.wanted >= 4) {
      context.strokeStyle = 'rgba(255,94,91,.65)';
      context.lineWidth = 2;
      context.beginPath();
      context.arc(player.position.x * scale, player.position.z * scale, 65 * scale, 0, Math.PI * 2);
      context.stroke();
    }
    for (const [index, unit] of police.units.entries()) {
      context.fillStyle = index % 2 ? '#579dff' : '#ff465f';
      context.beginPath();
      context.arc(unit.position.x * scale, unit.position.z * scale, 4, 0, Math.PI * 2);
      context.fill();
    }
    if (police.wanted >= 4) {
      context.strokeStyle = '#ffbdc5';
      context.beginPath();
      context.arc(player.position.x * scale + 8, player.position.z * scale - 8, 4, 0, Math.PI * 2);
      context.stroke();
    }
    const objective = missions.marker ?? missions.objective();
    if (objective) {
      context.fillStyle = '#ffda85';
      context.beginPath();
      context.arc(objective.x * scale, objective.z * scale, 6, 0, Math.PI * 2);
      context.fill();
    }
    context.save();
    context.translate(player.position.x * scale, player.position.z * scale);
    context.rotate(-(player.currentCar?.mesh?.rotation.y ?? player.mesh?.rotation.y ?? 0));
    context.fillStyle = '#eaffff';
    context.beginPath();
    context.moveTo(0, 12);
    context.lineTo(-6, -5);
    context.lineTo(0, -2);
    context.lineTo(6, -5);
    context.closePath();
    context.fill();
    context.restore();
    context.restore();
    context.fillStyle = '#eaffff';
    context.font = 'bold 14px system-ui';
    context.fillText('N ↑', 12, 22);
  }

  function update() {
    draw(localContext, 256, 1.6, player.position.x, player.position.z, false);
    overlay.hidden = !open;
    if (open) {
      draw(cityContext, 800, 1.55, 0, 0, true);
      document.getElementById('map-status').innerText = `${missions.line()}\nJOBS ${missions.done}/4   ·   ◆ OBJECTIVE   ▲ YOU   ● POLICE   ·   M TO CLOSE`;
    }
  }

  return {
    update,
    toggle() { open = !open; },
    setOpen(value) { open = value; },
    get open() { return open; },
  };
}
