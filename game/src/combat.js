export function createCombat(T, scene, player, missions, police, effects, onGunfire) {
  let cooldown = 0, elapsed = 0;
  const healthBars = new Map();

  function bar(target) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 24;
    const texture = new T.CanvasTexture(canvas);
    const sprite = new T.Sprite(new T.SpriteMaterial({ map: texture, depthTest: false }));
    sprite.scale.set(2.8, .5, 1);
    scene.add(sprite);
    const entry = { canvas, texture, sprite };
    healthBars.set(target, entry);
    return entry;
  }

  function damagePlayer(amount) {
    const absorbed = Math.min(player.armour ?? 0, amount);
    player.armour = Math.max(0, (player.armour ?? 0) - absorbed);
    player.health = Math.max(0, player.health - (amount - absorbed));
  }

  function fire(force = false) {
    if (!force && (cooldown > 0 || player.currentCar)) return false;
    cooldown = .3;
    const heading = player.mesh?.rotation.y ?? player.rotation ?? 0;
    const direction = new T.Vector3(Math.sin(heading), 0, Math.cos(heading));
    const origin = player.position.clone().add(new T.Vector3(0, 1.5, 0)).addScaledVector(direction, .5);
    let target = null, nearest = Infinity;
    for (const rival of missions.rivals) {
      if (rival.health <= 0) continue;
      const offset = rival.position.clone().sub(player.position), distance = offset.length();
      if (distance < 48 && offset.normalize().dot(direction) > .58 && distance < nearest) {
        target = rival;
        nearest = distance;
      }
    }
    const endpoint = target ? target.position.clone().add(new T.Vector3(0, 1.3, 0)) : origin.clone().addScaledVector(direction, 40);
    effects.muzzle(origin);
    effects.tracer(origin, endpoint);
    onGunfire?.(origin);
    police.reportGunfire();
    if (target) {
      target.health = Math.max(0, target.health - 50);
      effects.spark(endpoint);
      effects.text(endpoint, '50', '#fff3a3');
      if (!target.health) {
        target.mesh.rotation.z = Math.PI / 2;
        target.mesh.position.y = .35;
      }
    }
    return true;
  }

  function update(dt, shoot = false) {
    elapsed += dt;
    cooldown = Math.max(0, cooldown - dt);
    if (shoot) fire();
    for (const [index, target] of missions.rivals.entries()) {
      const display = healthBars.get(target) ?? bar(target);
      display.sprite.visible = target.health > 0;
      display.sprite.position.copy(target.position).add(new T.Vector3(0, 2.8, 0));
      const context = display.canvas.getContext('2d');
      context.clearRect(0, 0, 128, 24);
      context.fillStyle = '#111c29';
      context.fillRect(0, 3, 128, 18);
      context.fillStyle = '#ff5066';
      context.fillRect(3, 6, 122 * target.health / 100, 12);
      display.texture.needsUpdate = true;
      if (target.health <= 0 || !missions.active || missions.index !== 2 || missions.stage !== 1 || player.currentCar) continue;
      target.attack -= dt;
      const offset = player.position.clone().sub(target.position), distance = offset.length();
      if (distance < 30) {
        if (distance > 18) target.position.addScaledVector(offset.normalize(), dt * 1.8);
        else target.position.x += Math.sin(elapsed * 1.5 + index * Math.PI) * dt * .7;
        target.mesh.lookAt(player.position.x, 0, player.position.z);
        if (target.attack <= 0) {
          target.attack = 1.6;
          damagePlayer(7);
          onGunfire?.(target.position);
          effects.tracer(target.position.clone().add(new T.Vector3(0, 1.5, 0)), player.position.clone().add(new T.Vector3(0, 1, 0)), 0xff695b);
        }
      }
    }
  }

  return { fire, update, damagePlayer };
}
