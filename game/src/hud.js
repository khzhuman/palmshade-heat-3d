export function createHud(root) {
  const add = (parent,tag,cls,content='') => {
    const el=document.createElement(tag); el.className=cls; el.textContent=content; parent.append(el); return el;
  };
  const brand=add(root,'div','brand');
  add(brand,'small','kicker','SUNCOAST COUNTY  /  1986');
  add(brand,'h1','','PALMSHADE'); add(brand,'strong','','HEAT 3D');
  const district=add(brand,'div','district');
  const mission=add(root,'div','mission panel');
  const dispatch=add(root,'aside','dispatch panel');
  add(dispatch,'div','kicker','PD DISPATCH  /  LIVE');
  const rows=add(dispatch,'div','rows');
  const radio=add(root,'div','radio panel');
  add(radio,'div','portrait','MV');
  const dialogueBody=add(radio,'div','');
  add(dialogueBody,'div','kicker','MARA VOSS  /  FIXER');
  const line=add(dialogueBody,'div','line');
  const complete=add(root,'div','complete panel');
  add(complete,'div','kicker','✓  CONTRACT CLOSED');
  const title=add(complete,'h2','');
  const reward=add(complete,'div','reward');
  const tally=add(complete,'div','kicker');
  const status=add(root,'div','status panel');
  const top=add(status,'div','status-top');
  const cash=add(top,'b','cash');
  const jobs=add(top,'span','chip');
  const weapons=add(status,'div','weapons');
  const fists=add(weapons,'span','chip','1  FISTS');
  const pistol=add(weapons,'span','chip','2  PISTOL');
  const meters=add(status,'div','meters');
  function meter(parent,name,css) {
    const el=add(parent,'div','meter '+css);
    add(el,'span','kicker',name);
    return add(add(el,'div','track'),'i','');
  }
  const hp=meter(meters,'HP','health'), ap=meter(meters,'ARMOUR','armour');
  const speed=add(status,'div','speed');
  const heat=add(root,'div','heat');
  const stars=add(heat,'div','stars');
  const bustBox=add(heat,'div','bust panel');
  const bust=meter(bustBox,'BUST IN PROGRESS','');
  const prompt=add(root,'div','prompt');
  add(root,'div','controls','WASD MOVE / DRIVE   ·   SHIFT RUN   ·   E INTERACT   ·   CLICK / SPACE FIRE   ·   M MAP');
  const display=(el,on)=>{el.hidden=!on;};
  const fill=(el,n)=>{el.style.width=(Math.max(0,Math.min(1,n))*100)+'%';};
  const money=n=>'$'+Math.round(n).toLocaleString('en-US');
  const write=(el,value)=>{if(el.textContent!==value)el.textContent=value;};
  let dialogueUntil=0, completeUntil=0;
  display(mission,false);display(radio,false);display(complete,false);display(bustBox,false);display(prompt,false);
  return {
    setDispatch(units) {
      const signature=units.map(u=>u.callsign+'|'+u.role+'|'+Math.round(u.distanceToPlayer)).join(';');
      if (rows.dataset.data===signature) return;
      rows.dataset.data=signature;
      rows.replaceChildren();
      if (!units.length) add(rows,'div','quiet','RADIO CLEAR');
      for (const u of units) {
        const row=add(rows,'div','unit');
        add(row,'b','',u.callsign); add(row,'span','',u.role); add(row,'em','',Math.round(u.distanceToPlayer)+' m');
      }
    },
    setMission(value){display(mission,!!value);write(mission,value??'');},
    showDialogue(value,ms=4500){write(line,value??'');dialogueUntil=performance.now()+ms;display(radio,!!value);},
    showComplete(job,balance){write(title,job.title);write(reward,'+'+money(job.payout));write(tally,'JOBS '+job.id+'/4  ·  CASH '+money(balance));completeUntil=performance.now()+4300;display(complete,true);},
    setStats(s) {
      write(cash,money(s.cash)); write(jobs,'JOBS '+s.jobs+'/4');
      fists.classList.toggle('selected',s.weapon==='FISTS');pistol.classList.toggle('selected',s.weapon==='PISTOL');
      fill(hp,s.health/100);fill(ap,s.armour/100);
      write(speed,s.driving ? Math.round(Math.abs(s.speed)*3.6)+' KM/H  /  DRIVE' : 'ON FOOT');
      write(district,s.district??'PALMSHADE');
      write(stars,'★'.repeat(s.wanted)+'☆'.repeat(5-s.wanted)); stars.classList.toggle('hot',s.wanted>0);
    },
    setPrompt(value){display(prompt,!!value);write(prompt,value??'');},
    setBust(value){display(bustBox,value>.015);fill(bust,value);},
    update(){const now=performance.now();if(now>=dialogueUntil)display(radio,false);if(now>=completeUntil)display(complete,false);}
  };
}
