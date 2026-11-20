export function createHUD(player, police, missions) {
  const root = document.getElementById('hud');
  root.replaceChildren();

  function panel(id, className) {
    const element = document.createElement('div');
    element.className = className;
    element.id = id;
    root.append(element);
    return element;
  }

  const brand = panel('brand', 'brand');
  brand.innerText = 'PALMSHADE\nHEAT 3D';
  const stats = panel('stats', 'panel stats');
  const job = panel('job', 'panel job');
  const dispatch = panel('dispatch', 'panel dispatch');
  const vitals = panel('vitals', 'panel vitals');
  const prompt = panel('prompt', 'panel prompt');
  const dialogue = panel('dialogue', 'panel dialogue');
  const completion = panel('completion', 'panel completion');
  const controls = panel('controls', 'controls');
  controls.innerText = 'WASD MOVE / DRIVE   ·   E ENTER / INTERACT   ·   SPACE FIRE / BRAKE   ·   M MAP';

  function update(context = '') {
    stats.innerText = `$${Math.floor(player.cash).toLocaleString()}\n${'★'.repeat(police.wanted)}${'☆'.repeat(5 - police.wanted)}\nJOBS ${missions.done}/4`;
    job.innerText = missions.line();
    dispatch.innerText = `DISPATCH / LIVE\n${police.units.map(unit => `${unit.callsign} · ${unit.role} · ${Math.round(unit.position.distanceTo(player.position))}m`).join('\n')}${police.wanted >= 4 ? '\nAIR-1 · SPOTLIGHT · TRACKING' : ''}${police.wanted === 0 ? '\nCHANNEL CLEAR — KEEP IT COOL' : ''}`;
    vitals.innerText = `WEAPON: ${player.currentCar ? 'FISTS' : 'PISTOL'}\nHEALTH ${Math.ceil(player.health)}  /  ARMOUR ${Math.ceil(player.armour ?? 0)}\n${Math.round(Math.abs(player.currentCar?.speed ?? 0) * 3.6)} KM/H   ·   BUST ${Math.round(police.bust)}%`;
    prompt.innerText = context;
    prompt.hidden = !context;
    dialogue.hidden = missions.dialogueUntil <= 0;
    dialogue.innerText = missions.dialogue;
    completion.hidden = !missions.completion;
    if (missions.completion) {
      const result = missions.completion;
      completion.innerText = `JOB COMPLETE\n${result.title}\n+$${result.payout}\nJOBS ${result.jobs}/4 · CASH $${Math.floor(result.cash)}\nTOP WANTED ${'★'.repeat(result.topWanted)}\nBACK TO MARA FOR THE NEXT JOB`;
    }
  }

  return { update, root };
}
