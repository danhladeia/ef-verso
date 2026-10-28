import * as T from 'three';
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
 const trunkMat=new T.MeshStandardMaterial({color:'#826345'}),leafMat=new T.MeshStandardMaterial({color:'#467750'});
 const distanceToTrail=(x,z)=>Math.min(...TRAIL.slice(0,-1).map(([a,b],i)=>{const [c,d]=TRAIL[i+1],t=T.MathUtils.clamp(((x-a)*(c-a)+(z-b)*(d-b))/((c-a)**2+(d-b)**2),0,1);return Math.hypot(x-a-(c-a)*t,z-b-(d-b)*t);}));
 for(let i=0;i<95;i++){
  const x=182+(i*37%120),z=-94+(i*53%165);if(distanceToTrail(x,z)<5)continue;
  const y=adventureHeight(x,z),h=3+i%3;
  const trunk=new T.Mesh(new T.CylinderGeometry(.13,.22,h,6),trunkMat);trunk.position.set(x,y+h/2,z);group.add(trunk);
  const leaves=new T.Mesh(new T.ConeGeometry(1.8,h+2,7),leafMat);leaves.position.set(x,y+h+1,z);group.add(leaves);
 }
 const readout=document.createElement('div');readout.className='adventure-readout';readout.hidden=true;document.body.append(readout);
 const visited=new Set();
 return {height:adventureHeight,update(pos,mode){readout.hidden=pos.x<174||pos.x>312||pos.z< -108||pos.z>88;if(readout.hidden)return;for(const m of milestones)if(Math.hypot(pos.x-m.x,pos.z-m.z)<5)visited.add(m.name);readout.textContent=`Parque de Aventura · ${Math.round(pos.y)} m · ${mode==='bike'?'Mountain bike':'Trilha / trekking'} · ${visited.size}/${milestones.length} pontos explorados`;},get snapshot(){return {visited:[...visited],milestones};}};
}
