export function createEffects(T,scene,camera) {
  const items=[];let frozen=false,seed=Number(new URLSearchParams(location.search).get('seed')??7)>>>0;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const c=canvas.getContext('2d');const gradient=c.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'#fff9d8');gradient.addColorStop(.18,'#ffdd8b');gradient.addColorStop(1,'rgba(255,170,60,0)');c.fillStyle=gradient;c.fillRect(0,0,64,64);const glowTexture=new T.CanvasTexture(canvas);
  function add(object,life,velocity){scene.add(object);items.push({object,life,total:life,velocity});return object;}
  function halo(position,color=0xffd99b,size=3,life=0){const sprite=new T.Sprite(new T.SpriteMaterial({map:glowTexture,color,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));sprite.position.copy(position);sprite.scale.setScalar(size);if(life)add(sprite,life);else scene.add(sprite);return sprite;}
  function muzzle(position){return halo(position,0xffdd91,2.3,.13);}
  function tracer(start,end,color=0xffe8a6){const geo=new T.BufferGeometry().setFromPoints([start,end]);return add(new T.Line(geo,new T.LineBasicMaterial({color,transparent:true,opacity:.95,depthWrite:false})),.18);}
  function spark(position,color=0xffd46a){for(let i=0;i<9;i++){const p=new T.Mesh(new T.SphereGeometry(.045,4,3),new T.MeshBasicMaterial({color,transparent:true}));p.position.copy(position);add(p,.35,new T.Vector3((random()-.5)*7,random()*5,(random()-.5)*7));}}
  function text(position,value,color='#ffda85'){const el=document.createElement('div');el.className='event-text';el.innerText=value;el.style.color=color;document.getElementById('events').append(el);items.push({el,position:position.clone(),life:1.3,total:1.3});}
  function smoke(position){const puff=new T.Sprite(new T.SpriteMaterial({map:glowTexture,color:0x33404a,transparent:true,opacity:.3,depthWrite:false}));puff.position.copy(position);puff.scale.setScalar(2);add(puff,1.5,new T.Vector3(.3,2,.2));}
  function update(dt,cars=[]){
    if(!frozen)for(const car of cars)if((car.health??100)<35&&random()<dt*10)smoke((car.mesh?.position??car.position).clone().add(new T.Vector3(0,1.5,1)));
    for(let i=items.length-1;i>=0;i--){const a=items[i];if(!frozen)a.life-=dt;if(a.life<=0){if(a.el)a.el.remove();else{scene.remove(a.object);a.object.geometry?.dispose();a.object.material?.dispose();}items.splice(i,1);continue;}
      if(a.el){if(!frozen)a.position.y+=dt;const p=a.position.clone().project(camera);a.el.style.left=`${(p.x*.5+.5)*innerWidth}px`;a.el.style.top=`${(-p.y*.5+.5)*innerHeight}px`;a.el.style.opacity=p.z>1?'0':String(Math.min(1,a.life));}
      else{if(a.velocity&&!frozen)a.object.position.addScaledVector(a.velocity,dt);a.object.material.opacity=a.life/a.total;}
    }
  }
  return {muzzle,tracer,spark,text,halo,smoke,update,setFrozen(value){frozen=value;}};
}
