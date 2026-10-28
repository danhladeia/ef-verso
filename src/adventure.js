import * as T from 'three';
import {SEASON_LEAF,SEASON_LEAF2} from './sky.js';
export const ADVENTURE_BOUNDS={minX:174,maxX:312,minZ:-108,maxZ:88};
export const canExplore=(x,z)=>Math.abs(x)<=172&&Math.abs(z)<=172||(x>=170&&x<=312&&z>=-108&&z<=88);
export const adventureHeight=(x,z)=>{
 if(x<174||x>312||z< -108||z>88)return 0;
 const edge=Math.min(1,(x-174)/22,(312-x)/15,(z+108)/18,(88-z)/18);
 const peak=(px,pz,h,r)=>h*Math.exp(-((x-px)**2+(z-pz)**2)/r**2);
 return Math.max(0,edge)**2*(peak(264,-54,36,37)+peak(242,22,22,32)+peak(294,44,30,28));
};
export const TRAIL=[[171,-30],[185,-30],[198,-42],[211,-62],[232,-76],[251,-65],[267,-49],[282,-30],[270,-9],[248,12],[229,33],[208,29],[189,9],[180,-11],[171,-30]];
export function createAdventure({scene}){
 const group=new T.Group();group.name='Parque de Aventura';scene.add(group);
 const terrain=new T.PlaneGeometry(138,196,92,124);terrain.rotateX(-Math.PI/2);terrain.translate(243,0,-10);
 const p=terrain.attributes.position,colors=[];
 for(let i=0;i<p.count;i++){
  const y=adventureHeight(p.getX(i),p.getZ(i));p.setY(i,y-.035);
  const color=new T.Color(y>24?'#8a9484':y>12?'#70915c':'#8bb462');colors.push(color.r,color.g,color.b);
 }
 terrain.setAttribute('color',new T.Float32BufferAttribute(colors,3));terrain.computeVertexNormals();
 const mountain=new T.Mesh(terrain,new T.MeshStandardMaterial({vertexColors:true,roughness:1}));mountain.receiveShadow=true;group.add(mountain);
 const vertices=[],indices=[];
 for(let i=0;i<TRAIL.length-1;i++){
  const [ax,az]=TRAIL[i],[bx,bz]=TRAIL[i+1],length=Math.hypot(bx-ax,bz-az),n=Math.ceil(length/1.5),nx=-(bz-az)/length,nz=(bx-ax)/length;
  const base=vertices.length/3;
  for(let j=0;j<=n;j++)for(const s of [-1,1]){const x=ax+(bx-ax)*j/n+nx*s*1.6,z=az+(bz-az)*j/n+nz*s*1.6;vertices.push(x,adventureHeight(x,z)+.035,z);}
  for(let j=0;j<n;j++){const k=base+j*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 group.add(new T.Mesh(geometry,new T.MeshStandardMaterial({color:'#c9a577',roughness:1,side:T.DoubleSide})));
 const milestones=[{x:185,z:-30,name:'Portal da Trilha'},{x:211,z:-62,name:'Trilha do Bosque'},{x:267,z:-49,name:'Mirante da Serra'},{x:229,z:33,name:'Circuito Mountain Bike'}];
 for(const mark of milestones){
  const base=adventureHeight(mark.x,mark.z),canvas=document.createElement('canvas');canvas.width=512;canvas.height=160;
  const c=canvas.getContext('2d');c.fillStyle='#244d40';c.fillRect(0,0,512,160);c.fillStyle='#ffe7a0';c.font='bold 34px sans-serif';c.textAlign='center';c.fillText(mark.name,256,64);c.font='23px sans-serif';c.fillText('Siga a trilha · cuide da natureza',256,115);
  const sign=new T.Mesh(new T.PlaneGeometry(4,1.25),new T.MeshBasicMaterial({map:new T.CanvasTexture(canvas),side:T.DoubleSide}));sign.position.set(mark.x+2.5,base+2,mark.z);group.add(sign);
  const post=new T.Mesh(new T.CylinderGeometry(.07,.09,2,8),new T.MeshStandardMaterial({color:'#805942'}));post.position.set(mark.x+2.5,base+1,mark.z);group.add(post);
 }
 // Trees are deliberately outside the trail corridor, so both walkers and bikes can pass.
 const trunkMat=new T.MeshStandardMaterial({color:'#826345'}),leafMat=new T.MeshStandardMaterial({color:'#467750'}),leafMat2=new T.MeshStandardMaterial({color:'#5a9159'});
 const distanceToTrail=(x,z)=>Math.min(...TRAIL.slice(0,-1).map(([a,b],i)=>{const [c,d]=TRAIL[i+1],t=T.MathUtils.clamp(((x-a)*(c-a)+(z-b)*(d-b))/((c-a)**2+(d-b)**2),0,1);return Math.hypot(x-a-(c-a)*t,z-b-(d-b)*t);}));
 const CAMP={x:300,z:78,r:11};
 const nearCamp=(x,z)=>Math.hypot(x-CAMP.x,z-CAMP.z)<CAMP.r;
 // Mata mais densa (240 árvores, o dobro de antes): duas copas diferentes, afastadas da trilha e da clareira do acampamento.
 for(let i=0;i<240;i++){
  const x=176+(i*23.7%134),z=-106+(i*41.3%192);if(distanceToTrail(x,z)<4.5||nearCamp(x,z))continue;
  const y=adventureHeight(x,z),h=2.6+(i%5)*.7,leaf=i%3?leafMat:leafMat2;
  const trunk=new T.Mesh(new T.CylinderGeometry(.12,.2,h,6),trunkMat);trunk.position.set(x,y+h/2,z);trunk.castShadow=true;group.add(trunk);
  const leaves=new T.Mesh(new T.ConeGeometry(1.5+i%3*.3,h+1.8,7),leaf);leaves.position.set(x,y+h+.9,z);leaves.castShadow=true;group.add(leaves);
 }
 // Acampamento: clareira com cabanas de toras, fogueira e bancos — perto do Mirante, numa área mais plana.
 const cabinWall=new T.MeshStandardMaterial({color:'#8a6239',roughness:.95}),cabinRoof=new T.MeshStandardMaterial({color:'#5c3a28',roughness:.85}),cabinDoor=new T.MeshStandardMaterial({color:'#3a2415'}),stoneMat=new T.MeshStandardMaterial({color:'#8a8a86',roughness:1}),logMat=new T.MeshStandardMaterial({color:'#6b4a30',roughness:.9});
 function cabin(x,z,rot){
  const y=adventureHeight(x,z);
  const walls=new T.Mesh(new T.BoxGeometry(4.4,2.3,3.6),cabinWall);walls.position.set(x,y+1.15,z);walls.rotation.y=rot;walls.castShadow=walls.receiveShadow=true;group.add(walls);
  const roof=new T.Mesh(new T.ConeGeometry(3.5,1.7,4),cabinRoof);roof.position.set(x,y+2.3+.85,z);roof.rotation.y=rot+Math.PI/4;roof.castShadow=true;group.add(roof);
  const door=new T.Mesh(new T.BoxGeometry(.9,1.65,.1),cabinDoor);door.position.set(x+Math.sin(rot)*1.81,y+.82,z+Math.cos(rot)*1.81);door.rotation.y=rot;group.add(door);
  const chimney=new T.Mesh(new T.BoxGeometry(.5,1.5,.5),stoneMat);chimney.position.set(x-Math.sin(rot)*1.4-Math.cos(rot)*1,y+2.3+1,z-Math.cos(rot)*1.4+Math.sin(rot)*1);group.add(chimney);
 }
 cabin(CAMP.x-6,CAMP.z-2,Math.PI*.15);
 cabin(CAMP.x+5,CAMP.z+4,-Math.PI*.6);
 cabin(CAMP.x-2,CAMP.z+8,Math.PI*.95);
 // Fogueira central: pedras em círculo, lenha cruzada e uma luz quente.
 const fireY=adventureHeight(CAMP.x,CAMP.z);
 for(let i=0;i<10;i++){const a=i/10*Math.PI*2,sx=CAMP.x+Math.cos(a)*.9,sz=CAMP.z+Math.sin(a)*.9;const stone=new T.Mesh(new T.SphereGeometry(.18,6,5),stoneMat);stone.position.set(sx,fireY+.1,sz);stone.scale.y=.7;group.add(stone);}
 for(const r of [0,Math.PI/2]){const log=new T.Mesh(new T.CylinderGeometry(.08,.08,1.3,6),logMat);log.position.set(CAMP.x,fireY+.15,CAMP.z);log.rotation.z=Math.PI/2;log.rotation.y=r;group.add(log);}
 const fireLight=new T.PointLight('#ff9a4d',6,9,2);fireLight.position.set(CAMP.x,fireY+.6,CAMP.z);group.add(fireLight);
 for(const [dx,dz] of [[-2.6,-1.6],[2.6,1.6],[0,2.8]]){const bench=new T.Mesh(new T.BoxGeometry(1.5,.4,.4),logMat);bench.position.set(CAMP.x+dx,fireY+.2,CAMP.z+dz);bench.lookAt(CAMP.x,fireY+.2,CAMP.z);group.add(bench);}
 {const canvas=document.createElement('canvas');canvas.width=512;canvas.height=160;const c=canvas.getContext('2d');c.fillStyle='#244d40';c.fillRect(0,0,512,160);c.fillStyle='#ffe7a0';c.font='bold 34px sans-serif';c.textAlign='center';c.fillText('Acampamento da Serra',256,64);c.font='23px sans-serif';c.fillText('Cabanas, fogueira e bancos de tora',256,115);
  const sign=new T.Mesh(new T.PlaneGeometry(4,1.25),new T.MeshBasicMaterial({map:new T.CanvasTexture(canvas),side:T.DoubleSide}));sign.position.set(CAMP.x+9,fireY+2,CAMP.z-7);group.add(sign);
  const post=new T.Mesh(new T.CylinderGeometry(.07,.09,2,8),new T.MeshStandardMaterial({color:'#805942'}));post.position.set(CAMP.x+9,fireY+1,CAMP.z-7);group.add(post);
  milestones.push({x:CAMP.x+9,z:CAMP.z-7,name:'Acampamento da Serra'});}
 const readout=document.createElement('div');readout.className='adventure-readout';readout.hidden=true;document.body.append(readout);
 const visited=new Set();let lastSeason=-1;
 return {height:adventureHeight,update(pos,mode,season){
  if(season!==undefined&&season!==lastSeason){lastSeason=season;leafMat.color.set(SEASON_LEAF[season]);leafMat2.color.set(SEASON_LEAF2[season]);}
  readout.hidden=pos.x<174||pos.x>312||pos.z< -108||pos.z>88;if(readout.hidden)return;for(const m of milestones)if(Math.hypot(pos.x-m.x,pos.z-m.z)<5)visited.add(m.name);readout.textContent=`Parque de Aventura · ${Math.round(pos.y)} m · ${mode==='bike'?'Mountain bike':'Trilha / trekking'} · ${visited.size}/${milestones.length} pontos explorados`;
 },get snapshot(){return {visited:[...visited],milestones};}};
}
