export function createCombat(T,scene,player,missions,police,effects,onGunfire){
  let cooldown=0,time=0;const bars=new Map();
  function bar(target){
    const canvas=document.createElement('canvas');canvas.width=128;canvas.height=24;
    const texture=new T.CanvasTexture(canvas),sprite=new T.Sprite(new T.SpriteMaterial({map:texture,depthTest:false}));sprite.scale.set(2.8,.5,1);scene.add(sprite);
    const result={canvas,texture,sprite};bars.set(target,result);return result;
  }
  function damagePlayer(amount){const absorbed=Math.min(player.armour??0,amount);player.armour=Math.max(0,(player.armour??0)-absorbed);player.health=Math.max(0,player.health-(amount-absorbed));}
  function fire(force=false){
    if(!force&&(cooldown>0||player.currentCar))return false;cooldown=.3;
    const yaw=player.mesh?.rotation.y??player.rotation??0,direction=new T.Vector3(Math.sin(yaw),0,Math.cos(yaw));
    const origin=player.position.clone().add(new T.Vector3(0,1.5,0)).addScaledVector(direction,.5);let target=null,best=Infinity;
    for(const rival of missions.rivals){if(rival.health<=0)continue;const delta=rival.position.clone().sub(player.position),distance=delta.length();if(distance<48&&delta.normalize().dot(direction)>.58&&distance<best){target=rival;best=distance;}}
    const end=target?target.position.clone().add(new T.Vector3(0,1.3,0)):origin.clone().addScaledVector(direction,40);
    effects.muzzle(origin);effects.tracer(origin,end);onGunfire?.(origin);police.reportGunfire();
    if(target){target.health=Math.max(0,target.health-50);effects.spark(end);effects.text(end,'50','#fff3a3');if(!target.health){target.mesh.rotation.z=Math.PI/2;target.mesh.position.y=.35;}}
    return true;
  }
  function update(dt,shoot=false){
    time+=dt;cooldown=Math.max(0,cooldown-dt);if(shoot)fire();
    for(const [i,target] of missions.rivals.entries()){
      const b=bars.get(target)??bar(target);b.sprite.visible=target.health>0;b.sprite.position.copy(target.position).add(new T.Vector3(0,2.8,0));
      const c=b.canvas.getContext('2d');c.clearRect(0,0,128,24);c.fillStyle='#111c29';c.fillRect(0,3,128,18);c.fillStyle='#ff5066';c.fillRect(3,6,122*target.health/100,12);b.texture.needsUpdate=true;
      if(target.health<=0||!missions.active||missions.index!==2||missions.stage!==1||player.currentCar)continue;
      target.attack-=dt;const delta=player.position.clone().sub(target.position),distance=delta.length();
      if(distance<30){
        if(distance>18)target.position.addScaledVector(delta.normalize(),dt*1.8);
        else target.position.x+=Math.sin(time*1.5+i*Math.PI)*dt*.7;
        target.mesh.lookAt(player.position.x,0,player.position.z);
        if(target.attack<=0){target.attack=1.6;damagePlayer(7);onGunfire?.(target.position);effects.tracer(target.position.clone().add(new T.Vector3(0,1.5,0)),player.position.clone().add(new T.Vector3(0,1,0)),0xff695b);}
      }
    }
  }
  return {fire,update,damagePlayer};
}
