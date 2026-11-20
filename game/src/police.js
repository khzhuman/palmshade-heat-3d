export function createPolice(T,scene,player,effects) {
  const state={wanted:0,topWanted:0,bust:0,unseen:0,units:[],air:null};
  const material=color=>new T.MeshStandardMaterial({color,roughness:.65});
  function cruiser(i){
    const mesh=new T.Group();
    const body=new T.Mesh(new T.BoxGeometry(2.1,.8,4.3),material(0xf0eadb));body.position.y=.85;mesh.add(body);
    const roof=new T.Mesh(new T.BoxGeometry(1.8,.65,2),material(0x172c39));roof.position.y=1.5;mesh.add(roof);
    for(const x of [-.65,.65]){const light=new T.Mesh(new T.BoxGeometry(.55,.22,.4),new T.MeshBasicMaterial({color:x<0?0xff334e:0x338aff}));light.position.set(x,1.95,0);mesh.add(light);}
    for(const x of [-1.05,1.05])for(const z of [-1.4,1.4]){const w=new T.Mesh(new T.CylinderGeometry(.4,.4,.25,10),material(0x172027));w.rotation.z=Math.PI/2;w.position.set(x,.45,z);mesh.add(w);}
    mesh.traverse(o=>{if(o.isMesh)o.castShadow=true;});scene.add(mesh);
    const unit={mesh,position:mesh.position,callsign:`PALM-${i+1}`,role:'PURSUE',speed:0,blockPosition:null};
    const a=i*2.4;mesh.position.copy(player.position).add(new T.Vector3(Math.sin(a)*35,0,Math.cos(a)*35));return unit;
  }
  function setWanted(n){state.wanted=Math.max(0,Math.min(5,Math.round(n)));state.topWanted=Math.max(state.topWanted,state.wanted);state.unseen=0;}
  function helicopter(){
    const mesh=new T.Group();const fuselage=new T.Mesh(new T.SphereGeometry(2,12,8),material(0x162b36));fuselage.scale.set(1,.7,2);mesh.add(fuselage);
    const rotor=new T.Mesh(new T.BoxGeometry(12,.1,.25),material(0x172027));rotor.position.y=2;mesh.add(rotor);
    const tail=new T.Mesh(new T.BoxGeometry(.4,.5,7),material(0x162b36));tail.position.z=4;mesh.add(tail);scene.add(mesh);
    const cone=new T.Mesh(new T.ConeGeometry(11,30,32,1,true),new T.MeshBasicMaterial({color:0xffefb4,transparent:true,opacity:.13,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending}));scene.add(cone);
    const glow=new T.Mesh(new T.CircleGeometry(10,40),new T.MeshBasicMaterial({color:0xffefb4,transparent:true,opacity:.2,depthWrite:false,blending:T.AdditiveBlending}));glow.rotation.x=-Math.PI/2;scene.add(glow);
    return {mesh,rotor,cone,glow,callsign:'AIR-1',role:'SEARCH'};
  }
  function update(dt,time){
    const count=state.wanted?Math.min(6,state.wanted+1):0;
    while(state.units.length<count)state.units.push(cruiser(state.units.length));
    while(state.units.length>count)scene.remove(state.units.pop().mesh);
    let seen=false,close=false;
    const car=player.currentCar,heading=car?.heading??car?.mesh?.rotation.y??player.mesh?.rotation.y??0;
    const forward=new T.Vector3(Math.sin(heading),0,Math.cos(heading)),side=new T.Vector3(Math.cos(heading),0,-Math.sin(heading));
    for(let i=0;i<state.units.length;i++){
      const u=state.units[i];u.role=state.wanted>=3&&i>=3?'ROADBLOCK':i%3===1?'RAM':i%3===2?'PIT':'PURSUE';
      let target=player.position.clone();
      if(u.role==='ROADBLOCK'){
        if(!u.blockPosition||u.blockPosition.distanceTo(player.position)>100)u.blockPosition=player.position.clone().addScaledVector(forward,42).addScaledVector(side,(i-4)*3);
        target.copy(u.blockPosition);
      }else u.blockPosition=null;
      if(u.role==='RAM')target.addScaledVector(forward,-3).addScaledVector(side,1.6);
      if(u.role==='PIT')target.addScaledVector(side,2.3).addScaledVector(forward,-1);
      const delta=target.sub(u.position),d=delta.length();u.speed=u.role==='ROADBLOCK'&&d<3?0:Math.min(23+state.wanted*2,d*1.2);
      if(d>.3){delta.normalize();u.position.addScaledVector(delta,Math.min(d,u.speed*dt));u.mesh.rotation.y=Math.atan2(delta.x,delta.z);}
      if(u.role==='ROADBLOCK'&&d<4)u.mesh.rotation.y=heading+Math.PI/2;
      const distance=u.position.distanceTo(player.position);seen ||= distance<65;close ||= distance<8;
      if(distance<3.3&&car&&dt>0){
        car.speed=(car.speed??0)*Math.exp(-dt*5);car.health=Math.max(0,(car.health??100)-dt*4);
        if(u.role==='PIT'){car.heading=(car.heading??heading)+dt*.8;car.position?.addScaledVector(side,dt*2);}
        if(Math.sin(time*18+i)>.8)effects?.spark(player.position,0xffb65c);
      }
    }
    if(state.wanted>=4&&!state.air)state.air=helicopter();
    if(state.air){
      const a=state.air,active=state.wanted>=4;[a.mesh,a.cone,a.glow].forEach(x=>x.visible=active);
      if(active){a.mesh.position.copy(player.position).add(new T.Vector3(Math.sin(time*.3)*8,30,Math.cos(time*.3)*8));a.rotor.rotation.y+=dt*35+.1;a.glow.position.copy(player.position);a.glow.position.y=.12;
        const ground=player.position.clone();ground.y=.1;const delta=a.mesh.position.clone().sub(ground);a.cone.position.copy(ground).addScaledVector(delta,.5);a.cone.scale.y=delta.length()/30;a.cone.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());seen ||= state.units.some(u=>u.position.distanceTo(player.position)<90);}
    }
    const speed=Math.abs(car?.speed??player.speed??0);state.bust=Math.max(0,Math.min(100,state.bust+(close&&speed<4?23:-15)*dt));
    if(state.wanted&&seen)state.unseen=0;else state.unseen+=dt;
    if(state.wanted&&state.unseen>18)setWanted(state.wanted-1);
    return state.bust>=100;
  }
  return Object.assign(state,{setWanted,update,reportGunfire(){setWanted(Math.max(1,state.wanted));},clear(){setWanted(0);state.bust=0;}});
}
