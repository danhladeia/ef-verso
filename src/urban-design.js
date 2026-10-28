import * as T from 'three';

// Deterministic urban dressing, with shared geometry/materials and batched repeats.
export async function buildUrbanDesign({scene,loader,solids,box,places}){
 const packs=await Promise.all(['vila-pack','floresta-pack'].map(n=>loader.loadAsync('/models/'+n+'.glb')));
 const external=new Map(),batches=new Map();let count=0;
 async function asset(path){if(!external.has(path))external.set(path,loader.loadAsync('/models/'+path+'.glb'));return (await external.get(path)).scene;}
 function place(original,x,z,size,rotation=0,collision=false,y=.06){
  const g=original.clone(true);g.position.set(0,0,0);g.updateMatrixWorld(true);
  const dims=new T.Box3().setFromObject(g).getSize(new T.Vector3());g.scale.multiplyScalar(size/Math.max(dims.x,dims.z));g.rotation.y=rotation;g.updateMatrixWorld(true);
  const b=new T.Box3().setFromObject(g),c=b.getCenter(new T.Vector3());g.position.set(x-c.x,y-b.min.y,z-c.z);g.updateMatrixWorld(true);
  g.traverse(o=>{if(!o.isMesh)return;const key=Math.floor(x/36)+','+Math.floor(z/36)+':'+o.geometry.uuid+':'+(Array.isArray(o.material)?o.material.map(m=>m.uuid).join(','):o.material.uuid);if(!batches.has(key))batches.set(key,{geometry:o.geometry,material:o.material,matrices:[]});batches.get(key).matrices.push(o.matrixWorld.clone());});
  if(collision){const dim=new T.Box3().setFromObject(g).getSize(new T.Vector3());solids.push({x,z,w:dim.x/2+.35,d:dim.z/2+.35});}count++;
 }
 const town=(name,...args)=>place(packs[0].scene.getObjectByName('M_'+name),...args);
 const forest=(name,...args)=>place(packs[1].scene.getObjectByName('M_'+name),...args);
 function paving(x,z,w,d,color='#d8d5c8'){box(x,.065,z,w,.05,d,color);}
 // Ring boulevard: kerbs, centre dashes, pedestrian crossings and streetlights.
 for(const axis of ['x','z'])for(const side of [-1,1]){
  const horizontal=axis==='x',a=side*96;
  paving(horizontal?0:a,horizontal?a:0,horizontal?204:15,horizontal?15:204);
  paving(horizontal?0:a,horizontal?a:0,horizontal?204:10,horizontal?10:204,'#67717c');
  for(let t=-88;t<=88;t+=8){
   if(Math.abs(t-54)<8||Math.abs(t+54)<8||Math.abs(t)<8)continue;
   paving(horizontal?t:a,horizontal?a:t,horizontal?3:.14,horizontal?.14:3,'#f4e2a3');
  }
  for(let t=-84;t<=84;t+=28){town('streetlight',horizontal?t:a+6.3,horizontal?a+6.3:t,.8);town('trash_A',horizontal?t+2:a-6.2,horizontal?a-6.2:t,.6);}
  for(const t of [-54,0,54])for(let j=-3;j<=3;j++)paving(horizontal?t+j*.7:a,horizontal?a:t+j*.7,horizontal?.4:9,horizontal?9:.4,'#fff6e7');
 }
 const houses=await Promise.all(['a','c','f','h'].map(n=>asset('suburban/building-type-'+n)));
 const fence=await asset('suburban/fence-low');
 const isAvailable=(x,z,w,d)=>!solids.some(s=>Math.abs(x-s.x)<w/2+s.w+1&&Math.abs(z-s.z)<d/2+s.d+1)&&!places.some(p=>Math.hypot(p.x-x,p.z-z)<15);
 // Residential districts in the three unused quadrants, facing local streets.
 let houseIndex=0;
 for(const sx of [-1,1])for(const sz of [-1,1]){
  if(sx===1&&sz===1)continue; // Football and volleyball keep their space.
  paving(sx*73,sz*81,34,5);
  for(const row of [0,1])for(const col of [0,1,2]){
   const x=sx*(61+col*12),z=sz*(row?88:69);
   // Keep the civic landmarks and their entrance yards clear.
   if(Math.abs(x-54*sx)<14&&Math.abs(z+72)<13)continue;
   paving(x,z,10,11,'#b3c795');place(houses[houseIndex++%4],x,z,7,row?0:Math.PI,true);
   for(const dx of [-4.6,4.6])place(fence,x+dx,z,8,Math.PI/2);
   forest('Bush_1_A',x-3,z+4,1.4);forest('Tree_3_A',x+3,z-4,2.5);
   town('car_hatchback',x+3,z+3.4,2.4,row?0:Math.PI);
  }
 }
 // Inner commercial street, carefully placed in vacant plots.
 for(const [i,x,z] of [[0,-34,-40],[1,-18,-42],[2,18,-42],[3,34,-42],[4,-38,22],[5,-38,36],[6,38,-22]]){
  paving(x,z,13,12);town('building_'+['F','G','H','B'][i%4],x,z,9,0,true);
  town('bench',x-3,z+6.8,2);town('streetlight',x+5,z+5,.8);forest('Bush_2_A',x+4,z+6,1.5);
 }
 // Infill housing uses available plots, keeping sports surfaces and paths clear.
 for(const x of [-80,-64,-40,-22,22,40,64,80])for(const z of [-80,-40,-22,22,40,80]){
  if(x>10&&z>55||x>15&&x<45&&Math.abs(z)<20||x<-60&&Math.abs(z)<18)continue;
  if(!isAvailable(x,z,11,12))continue;
  paving(x,z,11,12,'#c5d3a1');place(houses[houseIndex++%4],x,z,7.5,0,true);
  paving(x,z+8,3,5);place(fence,x-5,z,9,Math.PI/2);
  forest('Bush_1_A',x+4,z+4,1.7);forest('Tree_3_A',x-3,z-4,2.8);
 }
 // Market square west of the centre, including shaded produce stalls.
 paving(-75,0,28,30,'#decdb1');
 const fruit=await asset('market/display-fruit'),bread=await asset('market/display-bread');
 for(let i=0;i<4;i++){
  const x=-84+(i%2)*17,z=-7+Math.floor(i/2)*14;
  place(i%2?fruit:bread,x,z,3,0,true);box(x,2.8,z,4,.15,3,i%2?'#de8c5b':'#68a6a0');
  for(const dx of [-1.7,1.7])box(x+dx,0,z,.12,2.8,.12,'#805841',true);
 }
 // The skate pack replaces the placeholder ramps.
 const half=await asset('skate/half-pipe'),ramp=await asset('skate/ramp'),rail=await asset('skate/rail-low'),board=await asset('skate/skateboard');
 place(half,-134,-9,10,0,true);place(ramp,-134,10,6,Math.PI/2,true);place(rail,-108,8,5,0,true);place(board,-125,12,1.1);
 // Pocket gardens: varied canopies, shrubs, rocks and flowers in planted beds.
 const gardens=[[-28,44],[28,44],[-40,-8],[-42,-25],[40,-38],[-80,-46],[80,-45],[-80,44],[108,36],[-108,36],[40,110],[-40,110],[75,110],[-75,110],[50,-110],[-50,-110]];
 for(let i=0;i<gardens.length;i++){
  const [x,z]=gardens[i];paving(x,z,12,10,'#749b60');
  for(let j=0;j<3;j++)forest(['Tree_1_A','Tree_2_C','Tree_3_B'][j],x-4+j*4,z-2+(j%2)*3,3.2+j*.3);
  for(let j=0;j<5;j++)forest('Bush_2_A',x-4+j*2,z+3,1.5);
  forest('Rock_1_A',x+4,z-3,1.5);town('bench',x,z+6.5,2.3);
 }
 // Dense outer woodland with deterministic gaps around buildings and trails.
 for(let ix=-7;ix<=7;ix++)for(let iz=-7;iz<=7;iz++){
  const x=ix*19+Math.sin(ix*12+iz)*4,z=iz*19+Math.cos(iz*9+ix)*4;
  if(Math.abs(x)<124&&Math.abs(z)<124)continue;
  if(Math.abs(x)<30||Math.abs(z)<25)continue;
  forest(['Tree_1_A','Tree_2_C','Tree_3_B'][Math.abs(ix+iz)%3],x,z,4+Math.abs(ix%3));
  forest('Bush_1_A',x+3,z+2,2);forest('Rock_1_E',x-2,z-3,1.2);
 }
 for(let i=0;i<110;i++){
  const side=i%2?-1:1,x=side*(124+(i*7%22)),z=-140+(i*31%280);
  if(Math.abs(z)<28||Math.abs(z-54)<8||Math.abs(z+54)<8)continue;
  forest(['Tree_1_B','Tree_2_C','Tree_3_B'][i%3],x,z,3+(i%4)*.6);
 }
 // Flower beds along the central walking avenues.
 for(const x of [-8,8])for(const z of [-18,18,27]){
  paving(x,z,2.1,3.5,'#739957');
  for(let i=0;i<4;i++){forest('Bush_1_A',x,z-1.2+i*.8,.6);box(x,.6,z-1.2+i*.8,.22,.16,.22,i%2?'#f7c755':'#d97d94');}
 }
 // Parking pockets, alternating cars and small landscape strips.
 for(const [x,z] of [[-34,59],[34,-58],[84,24]]){
  paving(x,z,12,9,'#67717c');
  for(let i=0;i<3;i++){town(['car_sedan','car_taxi','car_stationwagon'][i],x-4+i*4,z,3.2,0,true);paving(x-5.8+i*4,z,.08,7,'#fff6e7');}
 }
 // Flower rings and low planting around the central fountain, leaving paths open.
 for(let i=0;i<12;i++){const a=i*Math.PI/6;forest('Bush_1_A',Math.cos(a)*6,Math.sin(a)*6,1.1);}
 for(const batch of batches.values()){
  const mesh=new T.InstancedMesh(batch.geometry,batch.material,batch.matrices.length);
  batch.matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();scene.add(mesh);
 }
 return {placed:count,batches:batches.size};
}
