export function createHUD(player,police,missions) {
  const root=document.getElementById('hud');root.replaceChildren();
  function panel(name,cls){const el=document.createElement('div');el.className=cls;el.id=name;root.append(el);return el;}
  const brand=panel('brand','brand');brand.innerText='PALMSHADE\nHEAT 3D';
  const stats=panel('stats','panel stats'),job=panel('job','panel job'),dispatch=panel('dispatch','panel dispatch'),vitals=panel('vitals','panel vitals'),prompt=panel('prompt','panel prompt');
  const dialogue=panel('dialogue','panel dialogue'),completion=panel('completion','panel completion');
  const hint=panel('controls','controls');hint.innerText='WASD MOVE / DRIVE   ·   E ENTER / INTERACT   ·   SPACE FIRE / BRAKE   ·   M MAP';
  function update(context=''){
    stats.innerText=`$${Math.floor(player.cash).toLocaleString()}\n${'★'.repeat(police.wanted)}${'☆'.repeat(5-police.wanted)}\nJOBS ${missions.done}/4`;
    job.innerText=missions.line();
    dispatch.innerText=`DISPATCH / LIVE\n${police.units.map(u=>`${u.callsign} · ${u.role} · ${Math.round(u.position.distanceTo(player.position))}m`).join('\n')}${police.wanted>=4?'\nAIR-1 · SPOTLIGHT · TRACKING':''}${police.wanted===0?'\nCHANNEL CLEAR — KEEP IT COOL':''}`;
    vitals.innerText=`WEAPON: ${player.currentCar?'FISTS':'PISTOL'}\nHEALTH ${Math.ceil(player.health)}  /  ARMOUR ${Math.ceil(player.armour??0)}\n${Math.round(Math.abs(player.currentCar?.speed??0)*3.6)} KM/H   ·   BUST ${Math.round(police.bust)}%`;
    prompt.innerText=context;prompt.hidden=!context;
    dialogue.hidden=missions.dialogueUntil<=0;dialogue.innerText=missions.dialogue;
    completion.hidden=!missions.completion;
    if(missions.completion){const c=missions.completion;completion.innerText=`JOB COMPLETE\n${c.title}\n+$${c.payout}\nJOBS ${c.jobs}/4 · CASH $${Math.floor(c.cash)}\nTOP WANTED ${'★'.repeat(c.topWanted)}\nBACK TO MARA FOR THE NEXT JOB`;}
  }
  return {update,root};
}
