import { CITY,DISTRICTS } from './config.js';

export function createMinimap(canvas,world) {
  const ctx=canvas.getContext('2d');
  const color=t=>typeof t==='number'?'#'+t.toString(16).padStart(6,'0'):t;
  function draw({position,yaw=0,units=[],marker,wanted=0,full=false,jobs=0}) {
    const w=canvas.width,h=canvas.height,cx=w/2,cy=h/2;
    const scale=full ? Math.min(w,h)*.78/CITY.size : w/160;
    const center=full?{x:0,z:0}:position;
    const x=n=>cx+(n-center.x)*scale, y=n=>cy+(n-center.z)*scale;
    const dot=(px,py,r,c)=>{ctx.fillStyle=c;ctx.beginPath();ctx.arc(px,py,r,0,Math.PI*2);ctx.fill();};
    ctx.clearRect(0,0,w,h);
    ctx.save();
    if(!full) {ctx.beginPath();ctx.arc(cx,cy,cx-3,0,Math.PI*2);ctx.clip();}
    ctx.fillStyle='#12233e';ctx.fillRect(0,0,w,h);
    for(const d of DISTRICTS) {
      ctx.globalAlpha=.75;ctx.fillStyle=color(d.tint);
      ctx.fillRect(x(d.x0),y(d.z0),(d.x1-d.x0)*scale,(d.z1-d.z0)*scale);
      ctx.globalAlpha=1;
    }
    ctx.strokeStyle='#25243e';ctx.lineWidth=CITY.blockInset*1.7*scale;ctx.beginPath();
    const half=CITY.size/2;
    for(const p of world.roadsX){ctx.moveTo(x(p),y(-half));ctx.lineTo(x(p),y(half));}
    for(const p of world.roadsZ){ctx.moveTo(x(-half),y(p));ctx.lineTo(x(half),y(p));}
    ctx.stroke();
    ctx.strokeStyle='#f6dcc969';ctx.lineWidth=1.25;ctx.setLineDash([4,6]);ctx.stroke();ctx.setLineDash([]);
    if(wanted>=3) {
      ctx.strokeStyle='#ff8578';ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.beginPath();
      ctx.arc(x(position.x),y(position.z),44*scale,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    }
    if(marker) {
      let mx=x(marker.x),my=y(marker.z);
      const d=Math.hypot(mx-cx,my-cy), r=cx-15;
      if(!full&&d>r){mx=cx+(mx-cx)*r/d;my=cy+(my-cy)*r/d;}
      dot(mx,my,8,'#29243a');dot(mx,my,5,'#ffda85');
    }
    for(const u of units) {
      dot(x(u.position.x),y(u.position.z),u.car?4:6,'#371f45');
      dot(x(u.position.x),y(u.position.z),u.car?2.8:4,'#ff777e');
    }
    ctx.save();ctx.translate(x(position.x),y(position.z));ctx.rotate(-yaw);
    ctx.fillStyle='#eaffff';ctx.strokeStyle='#163447';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(0,10);ctx.lineTo(-6,-7);ctx.lineTo(0,-4);ctx.lineTo(6,-7);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
    ctx.restore();
    ctx.fillStyle='#ffecd6';ctx.textAlign='center';ctx.font='bold 15px monospace';ctx.fillText('N',cx,full?29:22);
    if(full) {
      ctx.font='bold 17px monospace';
      for(const d of DISTRICTS) {
        const px=x((d.x0+d.x1)/2),py=y((d.z0+d.z1)/2)-22;
        ctx.lineWidth=5;ctx.strokeStyle='#25243e';ctx.strokeText(d.name.toUpperCase(),px,py);ctx.fillText(d.name.toUpperCase(),px,py);
      }
      ctx.font='bold 13px monospace';ctx.fillText('WHITE  YOU   /   GOLD  JOB   /   CORAL  DISPATCH   /   JOBS '+jobs+'/4',cx,h-16);
    }
  }
  return {draw};
}
