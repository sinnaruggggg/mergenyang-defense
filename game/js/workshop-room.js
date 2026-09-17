'use strict';
// Existing artwork retained. Background has a single uniform scale and vertical camera offset.
const WorkshopRoom = {
  cameraY: -360,
  bounds: { left: 90, right: 990, top: 560, bottom: 956 },
  props: [
    {id:'forge',x:178,y:660,width:275,footW:220,footD:70},
    {id:'bench',x:840,y:680,width:286,footW:230,footD:68},
    {id:'anvil',x:420,y:814,width:144,footW:110,footD:42},
    {id:'barrel',x:858,y:923,width:130,footW:104,footD:38},
    {id:'crates',x:160,y:926,width:176,footW:144,footD:48},
  ],
  blocked(x,y,pad=26){
    const b=this.bounds;
    if(x<b.left||x>b.right||y<b.top||y>b.bottom)return true;
    return this.props.some(p=>Math.abs(x-p.x)<p.footW/2+pad&&y>p.y-p.footD-pad&&y<p.y+pad)
      || (Math.abs(x-420)<48&&Math.abs(y-866)<35);
  },
  init(ids){
    this.nodes=[];
    for(let y=560;y<=950;y+=30)for(let x=90;x<=990;x+=30)if(!this.blocked(x,y))this.nodes.push({x,y});
    this.lookup=new Map(this.nodes.map((n,i)=>[n.x+','+n.y,i]));
    this.nodes.forEach(n=>{n.next=[];for(const [dx,dy]of [[30,0],[-30,0],[0,30],[0,-30]]){const k=this.lookup.get((n.x+dx)+','+(n.y+dy));if(k!==undefined)n.next.push(k)}});
    this.travel=0;
    return ids.map((id,i)=>{const n=this.nodes[Math.floor((i+1)*this.nodes.length/(ids.length+1))];return{id,x:n.x,y:n.y,face:1,wait:.4+i*.5,phase:i,path:[],moving:false,jump:0}});
  },
  route(w,target){
    let start=0,dist=Infinity;this.nodes.forEach((n,i)=>{const d=Math.hypot(n.x-w.x,n.y-w.y);if(d<dist){start=i;dist=d}});
    const queue=[start],prev=new Map([[start,-1]]);let k=0;
    while(k<queue.length){const a=queue[k++];if(a===target)break;for(const b of this.nodes[a].next)if(!prev.has(b)){prev.set(b,a);queue.push(b)}}
    if(!prev.has(target))return[];const result=[];for(let n=target;n!==start;n=prev.get(n))result.unshift(this.nodes[n]);return result;
  },
  update(w,dt,others){
    w.jump=Math.max(0,w.jump-dt);w.wait-=dt;w.moving=false;if(w.wait>0)return;
    if(!w.path.length){w.path=this.route(w,Math.floor(Math.random()*this.nodes.length));w.wait=.5+Math.random();return}
    const target=w.path[0],dx=target.x-w.x,dy=target.y-w.y,d=Math.hypot(dx,dy),step=Math.min(d,dt*78);
    if(d<.2){w.path.shift();return}
    const x=w.x+dx/d*step,y=w.y+dy/d*step;
    // Separate cats on narrow paths without crossing a prop's ground footprint.
    if(others.some(o=>o!==w&&Math.hypot(o.x-x,o.y-y)<40)){w.wait=.3+Math.random()*.5;w.path=[];return}
    if(this.blocked(x,y)){w.path=[];return}
    w.x=x;w.y=y;w.moving=true;this.travel+=step;if(Math.abs(dx)>1)w.face=dx<0?-1:1;
  },
  draw(walkers,t){
    img('workshop2.bg',0,0,W,H);
    ctx.save();ctx.beginPath();ctx.rect(0,0,W,1010);ctx.clip();
    img('workshop2.bg',0,this.cameraY,W,H);
    const layers=[];
    // Contact shadows are painted PNGs and lie on the ground, below every sprite.
    for(const p of this.props){img('ui.ground-shadow',p.x-p.footW*.59,p.y-15,p.footW*1.18,26,.52);layers.push({y:p.y-p.footD*.3,draw:()=>{
      const im=IMG['workshop2.'+p.id];if(!im)return;const h=p.width*im.height/im.width;
      img('workshop2.'+p.id,p.x-p.width/2,p.y-h,p.width,h);
    }})}
    for(const w of walkers){const scale=.34+(w.y-560)/396*.08;
      img('ui.ground-shadow',w.x-49,w.y-9,98,18,.65);
      layers.push({y:w.y,draw:()=>drawSprite('walk.'+CATS[w.id].atkId+'.'+(w.moving?Math.floor(t*5+w.phase)%2:0),w.x,w.y-(w.jump>0?Math.sin(w.jump/.5*Math.PI)*35:0),scale,{flip:w.face<0})});
    }
    img('ui.ground-shadow',375,856,90,18,.6);
    layers.push({y:866,draw:()=>drawCatAttack('cat-smith',t%1.4<.2?1:0,420,866,.36)});
    layers.sort((a,b)=>a.y-b.y).forEach(l=>l.draw());ctx.restore();
  }
};
