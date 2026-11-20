export function createEffects(scene) {
  const pools={};
  const sphere=new THREE.IcosahedronGeometry(1,0);
  const material=(color)=>new THREE.MeshBasicMaterial({color,transparent:true,depthWrite:false});
  function take(kind,make,seconds) {
    const list=pools[kind]??(pools[kind]=[]);
    let item=list.find(e=>e.life<=0);
    if(!item&&list.length<32) {
      item={object:make(),life:0,velocity:new THREE.Vector3()};
      list.push(item);scene.add(item.object);
    }
    item??=list.reduce((a,b)=>a.life<b.life?a:b);
    item.life=item.full=seconds;item.object.visible=true;item.object.material.opacity=1;item.velocity.set(0,0,0);
    return item;
  }
  function ball(kind,pos,color,size,seconds) {
    const item=take(kind,()=>new THREE.Mesh(sphere,material(color)),seconds);
    item.object.material.color.set(color);
    item.object.position.copy(pos);item.object.scale.setScalar(size);item.size=size;
    return item;
  }
  function flash(pos,dir) {
    const core=ball('flash',pos,0xffe7a0,.38,.13);
    core.object.scale.set(.65,.3,.3);
    core.object.quaternion.setFromUnitVectors(new THREE.Vector3(1,0,0),dir);
    ball('flash',pos.clone().addScaledVector(dir,.35),0xffae48,.22,.10);
  }
  function tracer(a,b) {
    const item=take('tracer',()=>new THREE.Line(new THREE.BufferGeometry().setFromPoints([a,b]),
      new THREE.LineBasicMaterial({color:0xffd568,transparent:true,depthWrite:false})),.17);
    const p=item.object.geometry.attributes.position;
    p.setXYZ(0,a.x,a.y,a.z);p.setXYZ(1,b.x,b.y,b.z);p.needsUpdate=true;
    item.object.frustumCulled=false;
  }
  function spark(pos) {
    for(let i=0;i<6;i++) {
      const a=i*2.4;
      const item=ball('spark',pos, i%2?0xffa440:0xffffb4,.09,.29);
      item.velocity.set(Math.sin(a)*3,1.5+i*.23,Math.cos(a)*3);
    }
  }
  function smoke(pos,amount=1) {
    const item=ball('smoke',pos,0x565264,.36*amount,.85);
    item.velocity.set(.35,1.8,.28);
  }
  function glow(pos) {ball('glow',pos,0xffdf8a,.45,.08);}
  function floatText(pos,value,color='#ffffff') {
    const item=take('text',()=>{
      const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;
      const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,depthTest:false,depthWrite:false}));
      sprite.renderOrder=10;return sprite;
    },.95);
    const map=item.object.material.map, ctx=map.image.getContext('2d');
    ctx.clearRect(0,0,256,64);ctx.font='bold 40px monospace';ctx.textAlign='center';ctx.lineWidth=6;
    ctx.strokeStyle='#342339';ctx.fillStyle=color;
    ctx.strokeText(value,128,46);ctx.fillText(value,128,46);map.needsUpdate=true;
    item.object.position.copy(pos);item.object.scale.set(4,1,1);item.velocity.y=1.9;
  }
  function update(dt) {
    for(const [kind,list] of Object.entries(pools)) for(const item of list) {
      if(item.life<=0)continue;
      item.life-=dt;item.object.visible=item.life>0;
      item.object.position.addScaledVector(item.velocity,dt);
      item.object.material.opacity=Math.max(0,item.life/item.full)*(kind==='smoke'?.52:1);
      if(kind==='smoke')item.object.scale.setScalar(item.size+(item.full-item.life)*1.1);
      if(kind==='spark')item.velocity.y-=dt*10;
    }
  }
  return {flash,tracer,spark,smoke,floatText,glow,update};
}
