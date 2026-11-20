export function createEffects(T, scene, camera) {
  const particles = [];
  let frozen = false, seed = Number(new URLSearchParams(location.search).get('seed') ?? 7) >>> 0;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, '#fff9d8');
  gradient.addColorStop(.18, '#ffdd8b');
  gradient.addColorStop(1, 'rgba(255,170,60,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  const glowTexture = new T.CanvasTexture(canvas);

  function add(object, life, velocity) {
    scene.add(object);
    particles.push({ object, life, total: life, velocity });
    return object;
  }

  function halo(position, color = 0xffd99b, size = 3, life = 0) {
    const sprite = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
    sprite.position.copy(position);
    sprite.scale.setScalar(size);
    if (life) add(sprite, life);
    else scene.add(sprite);
    return sprite;
  }

  function muzzle(position) { return halo(position, 0xffdd91, 2.3, .13); }

  function tracer(start, end, color = 0xffe8a6) {
    const geometry = new T.BufferGeometry().setFromPoints([start, end]);
    return add(new T.Line(geometry, new T.LineBasicMaterial({ color, transparent: true, opacity: .95, depthWrite: false })), .18);
  }

  function spark(position, color = 0xffd46a) {
    for (let index = 0; index < 9; index++) {
      const particle = new T.Mesh(new T.SphereGeometry(.045, 4, 3), new T.MeshBasicMaterial({ color, transparent: true }));
      particle.position.copy(position);
      add(particle, .35, new T.Vector3((random() - .5) * 7, random() * 5, (random() - .5) * 7));
    }
  }

  function text(position, value, color = '#ffda85') {
    const element = document.createElement('div');
    element.className = 'event-text';
    element.innerText = value;
    element.style.color = color;
    document.getElementById('events').append(element);
    particles.push({ el: element, position: position.clone(), life: 1.3, total: 1.3 });
  }

  function smoke(position) {
    const puff = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: 0x33404a, transparent: true, opacity: .3, depthWrite: false }));
    puff.position.copy(position);
    puff.scale.setScalar(2);
    add(puff, 1.5, new T.Vector3(.3, 2, .2));
  }

  function update(dt, cars = []) {
    if (!frozen) {
      for (const car of cars) {
        if ((car.health ?? 100) < 35 && random() < dt * 10) {
          smoke((car.mesh?.position ?? car.position).clone().add(new T.Vector3(0, 1.5, 1)));
        }
      }
    }
    for (let index = particles.length - 1; index >= 0; index--) {
      const particle = particles[index];
      if (!frozen) particle.life -= dt;
      if (particle.life <= 0) {
        if (particle.el) particle.el.remove();
        else {
          scene.remove(particle.object);
          particle.object.geometry?.dispose();
          particle.object.material?.dispose();
        }
        particles.splice(index, 1);
        continue;
      }
      if (particle.el) {
        if (!frozen) particle.position.y += dt;
        const projected = particle.position.clone().project(camera);
        particle.el.style.left = `${(projected.x * .5 + .5) * innerWidth}px`;
        particle.el.style.top = `${(-projected.y * .5 + .5) * innerHeight}px`;
        particle.el.style.opacity = projected.z > 1 ? '0' : String(Math.min(1, particle.life));
      } else {
        if (particle.velocity && !frozen) particle.object.position.addScaledVector(particle.velocity, dt);
        particle.object.material.opacity = particle.life / particle.total;
      }
    }
  }

  return { muzzle, tracer, spark, text, halo, smoke, update, setFrozen(value) { frozen = value; } };
}
