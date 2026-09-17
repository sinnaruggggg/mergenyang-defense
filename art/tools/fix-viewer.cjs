const fs=require('fs'),path=require('path');const f=path.resolve(__dirname,'..','build','index.html');let s=fs.readFileSync(f,'utf8');
s=s.replace('</style>', '#stage.navigate img:not(.role-button),#stage.navigate .rect:not(.role-button){pointer-events:none}</style>');
s=s.replace("mode='inspect';$('#inspect')","mode='inspect';stage.classList.remove('navigate');$('#inspect')");
s=s.replace("mode='navigate';$('#navigate')","mode='navigate';stage.classList.add('navigate');$('#navigate')");
// Hit testing uses the same expanded rectangles as exported production data.
s=s.replace("function activate(e){", "stage.addEventListener('click',ev=>{if(mode!=='navigate')return;const r=stage.getBoundingClientRect(),x=(ev.clientX-r.left)*1080/r.width,y=(ev.clientY-r.top)*1920/r.height;const e=[...current.elements].reverse().find(e=>{if(e.role!=='button')return false;const h=e.hitRect||e;return x>=h.x&&x<=h.x+h.width&&y>=h.y&&y<=h.y+h.height});if(e){ev.stopImmediatePropagation();activate(e)}},true);\nfunction activate(e){");
fs.writeFileSync(f,s);console.log('Viewer hit testing fixed');
