export function createPolice(T, scene, player, effects) {
  const state = { wanted: 0, topWanted: 0, bust: 0, bustGrace: 0, departGrace: 0, unseen: 0, units: [], air: null };
  const paint = color => new T.MeshStandardMaterial({ color, roughness: .65 });

  function spawnPosition(position) {
    const offset = position.clone().sub(player.position);
    if (offset.length() < 45) position.copy(player.position).addScaledVector(offset.normalize(), 45);
    return position;
  }

  function cruiser(index) {
    const mesh = new T.Group();
    const chassis = new T.Mesh(new T.BoxGeometry(2.1, .8, 4.3), paint(0xf0eadb));
    chassis.position.y = .85;
    mesh.add(chassis);
    const cabin = new T.Mesh(new T.BoxGeometry(1.8, .65, 2), paint(0x172c39));
    cabin.position.y = 1.5;
    mesh.add(cabin);
    for (const x of [-.65, .65]) {
      const lamp = new T.Mesh(new T.BoxGeometry(.55, .22, .4), new T.MeshBasicMaterial({ color: x < 0 ? 0xff334e : 0x338aff }));
      lamp.position.set(x, 1.95, 0);
      mesh.add(lamp);
    }
    for (const x of [-1.05, 1.05]) {
      for (const z of [-1.4, 1.4]) {
        const wheel = new T.Mesh(new T.CylinderGeometry(.4, .4, .25, 10), paint(0x172027));
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, .45, z);
        mesh.add(wheel);
      }
    }
    mesh.traverse(part => { if (part.isMesh) part.castShadow = true; });
    scene.add(mesh);
    const unit = { mesh, position: mesh.position, callsign: `PALM-${index + 1}`, role: 'PURSUE', speed: 0, blockPosition: null };
    const angle = index * 2.4;
    mesh.position.copy(player.position).add(new T.Vector3(Math.sin(angle) * 35, 0, Math.cos(angle) * 35));
    spawnPosition(mesh.position);
    return unit;
  }

  function setWanted(value) {
    const previous = state.wanted;
    state.wanted = Math.max(0, Math.min(5, Math.round(value)));
    if (!previous && state.wanted) state.bustGrace = 6;
    state.topWanted = Math.max(state.topWanted, state.wanted);
    state.unseen = 0;
  }

  function helicopter() {
    const mesh = new T.Group();
    const hull = new T.Mesh(new T.SphereGeometry(2, 12, 8), paint(0x162b36));
    hull.scale.set(1, .7, 2);
    mesh.add(hull);
    const rotor = new T.Mesh(new T.BoxGeometry(12, .1, .25), paint(0x172027));
    rotor.position.y = 2;
    mesh.add(rotor);
    const tail = new T.Mesh(new T.BoxGeometry(.4, .5, 7), paint(0x162b36));
    tail.position.z = 4;
    mesh.add(tail);
    scene.add(mesh);
    const cone = new T.Mesh(new T.ConeGeometry(11, 30, 32, 1, true), new T.MeshBasicMaterial({ color: 0xffbe55, transparent: true, opacity: .12, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending }));
    scene.add(cone);
    const glow = new T.Mesh(new T.CircleGeometry(10, 40), new T.MeshBasicMaterial({ color: 0xffbe55, transparent: true, opacity: .15, depthWrite: false, blending: T.AdditiveBlending }));
    glow.rotation.x = -Math.PI / 2;
    scene.add(glow);
    return { mesh, rotor, cone, glow, callsign: 'AIR-1', role: 'SEARCH' };
  }

  function update(dt, time) {
    const required = state.wanted ? Math.min(6, state.wanted + 1) : 0;
    while (state.units.length < required) state.units.push(cruiser(state.units.length));
    while (state.units.length > required) scene.remove(state.units.pop().mesh);
    let seen = false, close = false;
    const car = player.currentCar;
    const heading = car?.heading ?? car?.mesh?.rotation.y ?? player.mesh?.rotation.y ?? 0;
    const forward = new T.Vector3(Math.sin(heading), 0, Math.cos(heading));
    const side = new T.Vector3(Math.cos(heading), 0, -Math.sin(heading));

    for (let index = 0; index < state.units.length; index++) {
      const unit = state.units[index];
      unit.role = state.wanted >= 3 && index >= 3 ? 'ROADBLOCK' : index % 3 === 1 ? 'RAM' : index % 3 === 2 ? 'PIT' : 'PURSUE';
      let destination = player.position.clone();
      if (unit.role === 'ROADBLOCK') {
        if (!unit.blockPosition || unit.blockPosition.distanceTo(player.position) > 100) {
          unit.blockPosition = spawnPosition(player.position.clone().addScaledVector(forward, 42).addScaledVector(side, (index - 4) * 3));
        }
        destination.copy(unit.blockPosition);
      } else unit.blockPosition = null;
      if (unit.role === 'RAM') destination.addScaledVector(forward, -3).addScaledVector(side, 1.6);
      if (unit.role === 'PIT') destination.addScaledVector(side, 2.3).addScaledVector(forward, -1);
      const offset = destination.sub(unit.position), remaining = offset.length();
      unit.speed = unit.role === 'ROADBLOCK' && remaining < 3 ? 0 : Math.min(23 + state.wanted * 2, remaining * 1.2);
      if (remaining > .3) {
        offset.normalize();
        unit.position.addScaledVector(offset, Math.min(remaining, unit.speed * dt));
        unit.mesh.rotation.y = Math.atan2(offset.x, offset.z);
      }
      if (unit.role === 'ROADBLOCK' && remaining < 4) unit.mesh.rotation.y = heading + Math.PI / 2;
      const distance = unit.position.distanceTo(player.position);
      seen ||= distance < 65;
      close ||= distance < 8;
      if (distance < 3.3 && car && dt > 0) {
        const contactSpeed = car.speed ?? 0;
        const excess = Math.abs(contactSpeed) - 10;
        if (excess > 0) car.speed = Math.sign(contactSpeed) * (10 + excess * Math.exp(-dt * 5));
        car.health = Math.max(0, (car.health ?? 100) - dt * 4);
        if (unit.role === 'PIT') {
          car.heading = (car.heading ?? heading) + dt * .8;
          car.position?.addScaledVector(side, dt * 2);
        }
        if (Math.sin(time * 18 + index) > .8) effects?.spark(player.position, 0xffb65c);
      }
    }

    if (state.wanted >= 4 && !state.air) state.air = helicopter();
    if (state.air) {
      const aircraft = state.air, active = state.wanted >= 4;
      [aircraft.mesh, aircraft.cone, aircraft.glow].forEach(part => part.visible = active);
      if (active) {
        aircraft.mesh.position.copy(player.position).add(new T.Vector3(Math.sin(time * .3) * 8, 30, Math.cos(time * .3) * 8));
        aircraft.rotor.rotation.y += dt * 35 + .1;
        aircraft.glow.position.copy(player.position);
        aircraft.glow.position.y = .12;
        const ground = player.position.clone();
        ground.y = .1;
        const beam = aircraft.mesh.position.clone().sub(ground);
        aircraft.cone.position.copy(ground).addScaledVector(beam, .5);
        aircraft.cone.scale.y = beam.length() / 30;
        aircraft.cone.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), beam.normalize());
        seen ||= state.units.some(unit => unit.position.distanceTo(player.position) < 90);
      }
    }

    const speed = Math.abs(car?.speed ?? player.speed ?? 0);
    state.bust = Math.max(0, Math.min(100, state.bust + (close && speed < 4 ? (state.bustGrace > 0 || state.departGrace > 0 ? 0 : 23) : -15) * dt));
    state.bustGrace = Math.max(0, state.bustGrace - dt);
    state.departGrace = Math.max(0, state.departGrace - dt);
    if (state.wanted && seen) state.unseen = 0;
    else state.unseen += dt;
    if (state.wanted && state.unseen > 18) setWanted(state.wanted - 1);
    return state.bust >= 100;
  }

  return Object.assign(state, {
    setWanted,
    update,
    reportGunfire() { setWanted(Math.max(1, state.wanted)); },
    clear() { setWanted(0); state.bust = 0; },
  });
}
