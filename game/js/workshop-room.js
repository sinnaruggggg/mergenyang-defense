'use strict';
// Fixed camera and original raster pixels from the approved illustration.
const WorkshopRoom = {
  scale:1080/941,
  bounds:{left:285*1080/941,right:825*1080/941,top:620*1080/941,bottom:1140*1080/941},
  sourceLayers:[
    {id:'forge',x:0,y:260,w:319,h:622,depth:878},
    {id:'weapons',x:286,y:499,w:84,h:253,depth:753},
    {id:'small-barrel',x:676,y:649,w:50,h:111,depth:763},
    {id:'right-workbench',x:675,y:320,w:266,h:610,depth:964},
    {id:'central-table',x:321,y:820,w:438,h:268,depth:1080},
    {id:'left-chest',x:0,y:994,w:183,h:293,depth:1280},
    {id:'right-armor',x:717,y:895,w:224,h:525,depth:1420}
  ],
  props:[],
  blocked(x,y){
    const s=this.scale;x/=s;y/=s;
    if(x<285||x>825||y<620||y>1140)return true;
    return(x<305&&y>675&&y<940)||(x>680&&y>715&&y<960)||(x>315&&x<765&&y>930&&y<1100);
  },
  init(ids){
    const s=this.scale;this.nodes=[];
    for(let y=620;y<=1140;y+=20)for(let x=285;x<=825;x+=20)if(!this.blocked(x*s,y*s))this.nodes.push({x:x*s,y:y*s});
    this.lookup=new Map(this.nodes.map((n,i)=>[Math.round(n.x/s)+','+Math.round(n.y/s),i]));
    this.nodes.forEach(n=>{n.next=[];for(const[dx,dy]of[[20,0],[-20,0],[0,20],[0,-20]]){const k=this.lookup.get((Math.round(n.x/s)+dx)+','+(Math.round(n.y/s)+dy));if(k!==undefined)n.next.push(k)}});
    this.props=this.sourceLayers.map(p=>({id:p.id,x:(p.x+p.w/2)*s,y:p.depth*s,width:p.w*s,footW:p.w*s,footD:40*s}));this.travel=0;
    return ids.map((id,i)=>{const target={x:(i?605:425)*s,y:(i?800:700)*s};const n=this.nodes.reduce((best,v)=>Math.hypot(v.x-target.x,v.y-target.y)<Math.hypot(best.x-target.x,best.y-target.y)?v:best,this.nodes[0]);return{id,x:n.x,y:n.y,face:1,wait:.3+i*.7,phase:i,path:[],moving:false,jump:0,art:id==='warrior'||id==='tank'?'warrior':id==='mage'?'mage':'scout'}});
  },
  route(w,target){
    let start=0,dist=Infinity;this.nodes.forEach((n,i)=>{const d=Math.hypot(n.x-w.x,n.y-w.y);if(d<dist){start=i;dist=d}});
    const queue=[start],prev=new Map([[start,-1]]);let k=0;
    while(k<queue.length){const a=queue[k++];if(a===target)break;for(const b of this.nodes[a].next)if(!prev.has(b)){prev.set(b,a);queue.push(b)}}
    if(!prev.has(target))return[];const result=[];for(let n=target;n!==start;n=prev.get(n))result.unshift(this.nodes[n]);return result;
  },
  update(w,dt,others){
    w.jump=Math.max(0,w.jump-dt);w.wait-=dt;w.moving=false;if(w.wait>0)return;
    if(!w.path.length){w.path=this.route(w,Math.floor(Math.random()*this.nodes.length));w.wait=.3+Math.random()*.7;return}
    const target=w.path[0],dx=target.x-w.x,dy=target.y-w.y,d=Math.hypot(dx,dy),step=Math.min(d,dt*65);
    if(d<.2){w.path.shift();return}
    const x=w.x+dx/d*step,y=w.y+dy/d*step;
    if(others.some(o=>o!==w&&Math.hypot(o.x-x,o.y-y)<45)){w.wait=.3;w.path=[];return}
    if(this.blocked(x,y)){w.path=[];return}
    w.x=x;w.y=y;w.moving=true;this.travel+=step;if(Math.abs(dx)>1)w.face=dx<0?-1:1;
  },
  draw(walkers,t){
    const s=this.scale;img('workshop.approved.background',0,0,941*s,1672*s);
    ctx.save();ctx.beginPath();ctx.rect(0,0,W,1350);ctx.clip();
    const layers=this.sourceLayers.map(p=>({y:p.depth*s,draw:()=>img('workshop.approved.'+p.id,p.x*s,p.y*s,p.w*s,p.h*s)}));
    for(const w of walkers){const key='workshop.approved.'+w.art,im=IMG[key];if(!im)continue;
      const height=(150+(w.y/s-620)*.17)*s,width=height*im.width/im.height;
      img('ui.ground-shadow',w.x-width*.33,w.y-8,width*.66,17,.55);
      layers.push({y:w.y,draw:()=>{const bob=w.moving?(Math.floor(t*5+w.phase)%2)*2:0;ctx.save();ctx.translate(w.x,w.y-bob-(w.jump>0?Math.sin(w.jump/.5*Math.PI)*25:0));if(w.face<0)ctx.scale(-1,1);img(key,-width/2,-height,width,height);ctx.restore();}});
    }
    layers.sort((a,b)=>a.y-b.y).forEach(l=>l.draw());ctx.restore();
  }
};
