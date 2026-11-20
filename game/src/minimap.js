export function createMinimap(player,police,missions,world={}) {
  const canvas=document.getElementById('minimap');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');
  const overlay=document.getElementById('map-overlay');const full=document.getElementById('city-map');full.width=full.height=800;const fc=full.getContext('2d');
  const districts=[[-240,-240,'OLD PORT','#3b5967'],[0,-240,'THE FLATS','#6b6549'],[-240,0,'CORAL HEIGHTS','#385b54'],[0,0,'NEON MILE','#61505c']];
  let open=false;
  function draw(c,size,scale,cx,cz,labels){
    c.fillStyle='#143c49';c.fillRect(0,0,size,size);c.save();c.translate(size/2-cx*scale,size/2-cz*scale);
    for(const [x,z,name,color] of districts){c.fillStyle=color;c.fillRect(x*scale,z*scale,240*scale,240*scale);if(labels){c.fillStyle='#f5e6bc';c.font='bold 17px system-ui';c.fillText((world.districtAt?.(x+120,z+120)??name).toUpperCase(),(x+20)*scale,(z+35)*scale);}}
    c.strokeStyle='#979d93';c.lineWidth=10*scale;
    for(let r=-180;r<=180;r+=60){c.beginPath();c.moveTo(-240*scale,r*scale);c.lineTo(240*scale,r*scale);c.stroke();c.beginPath();c.moveTo(r*scale,-240*scale);c.lineTo(r*scale,240*scale);c.stroke();}
    c.strokeStyle='#cfbd8e';c.lineWidth=.45*scale;for(let r=-180;r<=180;r+=60){c.beginPath();c.moveTo(-240*scale,r*scale);c.lineTo(240*scale,r*scale);c.stroke();c.beginPath();c.moveTo(r*scale,-240*scale);c.lineTo(r*scale,240*scale);c.stroke();}
    if(police.wanted>=4){c.strokeStyle='rgba(255,94,91,.65)';c.lineWidth=2;c.beginPath();c.arc(player.position.x*scale,player.position.z*scale,65*scale,0,Math.PI*2);c.stroke();}
    for(const [i,u] of police.units.entries()){c.fillStyle=i%2?'#579dff':'#ff465f';c.beginPath();c.arc(u.position.x*scale,u.position.z*scale,4,0,Math.PI*2);c.fill();}
    if(police.wanted>=4){c.strokeStyle='#ffbdc5';c.beginPath();c.arc(player.position.x*scale+8,player.position.z*scale-8,4,0,Math.PI*2);c.stroke();}
    const m=missions.marker??missions.objective();if(m){c.fillStyle='#ffda85';c.beginPath();c.arc(m.x*scale,m.z*scale,6,0,Math.PI*2);c.fill();}
    c.save();c.translate(player.position.x*scale,player.position.z*scale);c.rotate(-(player.currentCar?.mesh?.rotation.y??player.mesh?.rotation.y??0));c.fillStyle='#eaffff';c.beginPath();c.moveTo(0,12);c.lineTo(-6,-5);c.lineTo(0,-2);c.lineTo(6,-5);c.closePath();c.fill();c.restore();c.restore();
    c.fillStyle='#eaffff';c.font='bold 14px system-ui';c.fillText('N ↑',12,22);
  }
  function update(){draw(ctx,256,1.6,player.position.x,player.position.z,false);overlay.hidden=!open;if(open){draw(fc,800,1.55,0,0,true);document.getElementById('map-status').innerText=`${missions.line()}\nJOBS ${missions.done}/4   ·   ◆ OBJECTIVE   ▲ YOU   ● POLICE   ·   M TO CLOSE`;}}
  return {update,toggle(){open=!open;},setOpen(value){open=value;},get open(){return open;}};
}
