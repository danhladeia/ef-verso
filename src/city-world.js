import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {ROAD_AXES} from './city-layout.js';

// Instances are grouped per square sector so the camera can skip whole groups outside the view.
const SECTOR=32;

/** Planned city: fixed parcel boundaries, real streets and modular street furniture. */
export async function buildCity({scene,loader,solids}){
 const cache=new Map(),batches=new Map(),audit={buildings:[],fences:[],roads:ROAD_AXES,assets:0},paved=[];
 const colors=new Map(),cube=new T.BoxGeometry(1,1,1),dummy=new T.Object3D();
 const cylinder=new T.CylinderGeometry(1,1,1,20),sphere=new T.SphereGeometry(1,10,7);
 const C={grass:'#86b85a',paving:'#e8dcc2',asphalt:'#414f5b',curb:'#c1c8c7',white:'#fff2db',teal:'#338d98',purple:'#683fad',wood:'#94704e'};
 const inRoad=(x,z,w=0,d=0)=>ROAD_AXES.some(a=>Math.abs(z)<=106&&Math.abs(x-a)<4.6+w||Math.abs(x)<=106&&Math.abs(z-a)<4.6+d);
 audit.clearedRoadItems=0;
 const mat=c=>{if(!colors.has(c))colors.set(c,new T.MeshStandardMaterial({color:c,roughness:.92}));return colors.get(c);};
 function batch(geometry,material,matrix,x,z){
  const mk=Array.isArray(material)?material.map(m=>m.uuid).join(','):material.uuid;
  const key=`${Math.floor(x/SECTOR)},${Math.floor(z/SECTOR)}:${geometry.uuid}:${mk}`;
  if(!batches.has(key))batches.set(key,{geometry,material,matrices:[]});batches.get(key).matrices.push(matrix.clone());
 }
 function solid(x,z,w,d,kind='prop'){if(inRoad(x,z)&&Math.max(w,d)<12){audit.clearedRoadItems++;return;}solids.push({x,z,w:w/2+.32,d:d/2+.32,kind});}
 /** Round obstacle (trees, posts, fountains): the student slides around it instead of hitting a square corner. */
 function round(x,z,r,kind='prop'){if(inRoad(x,z,r,r))return;solids.push({x,z,r,circle:true,w:r+.32,d:r+.32,kind});}
 function shape(g,x,y,z,w,h,d,color,rot=0){dummy.position.set(x,y+h/2,z);dummy.scale.set(w,h,d);dummy.rotation.set(0,rot,0);dummy.updateMatrix();batch(g,mat(color),dummy.matrix,x,z);}
 function box(x,y,z,w,h,d,c,collide=false,rot=0){if(collide&&h>.4&&inRoad(x,z)&&Math.max(w,d)<12){audit.clearedRoadItems++;return;}shape(cube,x,y,z,w,h,d,c,rot);if(collide)solid(x,z,Math.abs(w*Math.cos(rot))+Math.abs(d*Math.sin(rot)),Math.abs(w*Math.sin(rot))+Math.abs(d*Math.cos(rot)));}
 function slab(x,z,w,d,c=C.paving,y=.035){box(x,y,z,w,.035,d,c);}
 function disc(x,z,r,c,y=.07,h=.08){shape(cylinder,x,y,z,r,h,r,c);}
 function ball(x,y,z,r,c){shape(sphere,x,y-r/2,z,r,r,r,c);}
 function line(x,z,w,d,c=C.white,y=.16){box(x,y,z,w,.012,d,c);}
 function circle(x,z,r,c=C.white,y=.18){const mesh=new T.Mesh(new T.RingGeometry(r-.065,r+.065,48),mat(c));mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y,z);scene.add(mesh);}
 async function asset(path){if(!cache.has(path))cache.set(path,loader.loadAsync('/models/'+path+'.glb'));return (await cache.get(path)).scene;}
 const [city,forest]=await Promise.all([asset('vila-pack'),asset('floresta-pack')]);
 // Kenney Nature Kit: light trees (50–200 triangles) for streets and gardens, plus flowers and shrubs.
 const nk={};for(const n of ['tree_oak','tree_default','tree_fat','flower_redA','flower_yellowB','flower_purpleC','grass_large','plant_bush','plant_bushSmall','rock_smallFlatA'])nk[n]=await asset('nature-kit/'+n);
 // The kit exports metallic materials with very light colours; give them the city's foliage palette instead.
 const NATURE={leafsGreen:'#5aa64c',grass:'#6eae55',woodBark:'#8b5e3c',dirt:'#9a7b5a',colorRed:'#e2574c',colorYellow:'#f2c14e',colorPurple:'#8e63c9',colorWhite:'#f4f1e8'};
 for(const model of Object.values(nk))model.traverse(o=>{if(o.isMesh&&NATURE[o.material.name]){o.material.color.set(NATURE[o.material.name]);o.material.metalness=0;o.material.roughness=.9;}});
 function place(original,x,z,size,rot=0,collision=false,y=.08){
  if(!original)throw Error('Missing source model');
  const obj=original.clone(true);obj.position.set(0,0,0);obj.updateMatrixWorld(true);
  let bounds=new T.Box3().setFromObject(obj),dimensions=bounds.getSize(new T.Vector3());
  if(size)obj.scale.multiplyScalar(size/Math.max(dimensions.x,dimensions.z));obj.rotation.y=rot;obj.updateMatrixWorld(true);
  bounds=new T.Box3().setFromObject(obj);const center=bounds.getCenter(new T.Vector3());obj.position.set(x-center.x,y-bounds.min.y,z-center.z);obj.updateMatrixWorld(true);
  if(dimensions.y>.4&&inRoad(x,z)&&Math.max(size||dimensions.x,size||dimensions.z)<12){audit.clearedRoadItems++;return new T.Box3().setFromObject(obj);}
  obj.traverse(o=>{if(o.isMesh)batch(o.geometry,o.material,o.matrixWorld,x,z);});
  if(collision){dimensions=new T.Box3().setFromObject(obj).getSize(new T.Vector3());solid(x,z,dimensions.x,dimensions.z,'model');}
  audit.assets++;return new T.Box3().setFromObject(obj);
 }
 const town=(n,...args)=>place(city.getObjectByName('M_'+n),...args);
 const tree=(x,z,i=0,s=4)=>{place(forest.getObjectByName('M_'+['Tree_1_A','Tree_2_C','Tree_3_B'][Math.abs(i)%3]),x,z,s);round(x,z,.35,'tree');};
 const bush=(x,z,s=1.2)=>place(forest.getObjectByName('M_Bush_2_A'),x,z,s);
 const lightTree=(x,z,i=0,s=3.2)=>{place(nk[['tree_oak','tree_default','tree_fat'][Math.abs(i)%3]],x,z,s,i);round(x,z,.35,'tree');};
 function lamp(x,z,rot=0){town('streetlight',x,z,.9,rot);round(x,z,.18,'lamp');}
 function bench(x,z,rot=0){town('bench',x,z,2.3,rot,true);}
 function sign(text,x,z,width=5,y=2.4){
  box(x,0,z,.12,y,.12,C.wood,true);const cvs=document.createElement('canvas');cvs.width=512;cvs.height=128;const ctx=cvs.getContext('2d');ctx.fillStyle='#2d4a54';ctx.fillRect(0,0,512,128);ctx.fillStyle='#ffcc58';ctx.fillRect(0,0,12,128);ctx.font='bold 35px Trebuchet MS';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff8e8';ctx.fillText(text,262,66,475);
  const m=new T.Mesh(new T.PlaneGeometry(width,width/4),new T.MeshBasicMaterial({map:new T.CanvasTexture(cvs),side:T.DoubleSide}));m.position.set(x,y,z+.08);scene.add(m);
 }
 /** Painel informativo com título e lista de itens, em pé sobre dois postes. */
 function board(title,items,x,z,rot=0,width=3.2){
  const height=width*1.25,cvs=document.createElement('canvas');cvs.width=512;cvs.height=640;const ctx=cvs.getContext('2d');
  ctx.fillStyle='#fffaf0';ctx.fillRect(0,0,512,640);ctx.fillStyle='#683fad';ctx.fillRect(0,0,512,118);ctx.fillStyle='#ffcc58';ctx.fillRect(0,118,512,12);
  ctx.font='bold 44px Trebuchet MS';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff8e8';ctx.fillText(title,256,62,470);
  ctx.textAlign='left';ctx.font='bold 31px Trebuchet MS';items.forEach((t,i)=>{const y=180+i*(440/Math.max(items.length,1));ctx.fillStyle='#683fad';ctx.beginPath();ctx.arc(40,y,15,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.font='bold 22px Trebuchet MS';ctx.textAlign='center';ctx.fillText(String(i+1),40,y+1);ctx.textAlign='left';ctx.font='bold 29px Trebuchet MS';ctx.fillStyle='#2d3b48';ctx.fillText(t,70,y,425);});
  const holder=new T.Group();holder.position.set(x,0,z);holder.rotation.y=rot;scene.add(holder);
  const panel=new T.Mesh(new T.PlaneGeometry(width,height),new T.MeshBasicMaterial({map:new T.CanvasTexture(cvs)}));panel.position.set(0,.9+height/2,.07);holder.add(panel);
  const back=new T.Mesh(new T.BoxGeometry(width+.16,height+.16,.1),mat('#3b4d58'));back.position.set(0,.9+height/2,0);holder.add(back);
  for(const dx of [-width/2+.2,width/2-.2]){const post=new T.Mesh(new T.BoxGeometry(.12,.9,.12),mat('#3b4d58'));post.position.set(dx,.45,0);holder.add(post);}
  const c=Math.cos(rot),s=Math.sin(rot);solid(x,z,Math.abs(width*c)+.3,Math.abs(width*s)+.3);
 }
 function path(x,z,w,d,c=C.paving,y=.075){slab(x,z,w,d,c,y);paved.push({x,z,w,d});}
 function bed(x,z,w=5,d=3){box(x,.07,z,w,.18,d,'#d2ccb9');slab(x,z,w-.3,d-.3,'#618e56',.26);for(let i=0;i<Math.floor(w);i++){bush(x-w/2+.5+i,z,.8);ball(x-w/2+.5+i,.8,z,.13,i%2?'#efbd45':'#e78c9c');}}
 // All fences have explicit metre dimensions, no uniform scaling of whole meshes.
 function fence(ax,az,bx,bz,height=1.05,color='#e8dcc2',gate=null){
  const length=Math.hypot(bx-ax,bz-az),steps=Math.ceil(length/2),angle=Math.atan2(-(bz-az),bx-ax);
  for(let i=0;i<steps;i++){
   const s=i*length/steps,e=(i+1)*length/steps;if(gate&&s<gate[1]&&e>gate[0])continue;
   const mid=(s+e)/2,x=ax+(bx-ax)*mid/length,z=az+(bz-az)*mid/length;if(inRoad(x,z)){audit.clearedRoadItems++;continue;}
   for(const t of [s,e])box(ax+(bx-ax)*t/length,.08,az+(bz-az)*t/length,.13,height+.1,.13,color);
   for(const y of [height*.35,height*.8])box(x,y,z,e-s,.09,.08,color,false,angle);
   // Pickets / screen uprights, always the requested height.
   for(let k=0;k<4;k++){const t=s+(k+.5)*(e-s)/4;box(ax+(bx-ax)*t/length,.1,az+(bz-az)*t/length,.06,height,.06,color);}
   const w=Math.abs((e-s)*Math.cos(angle))+.08,d=Math.abs((e-s)*Math.sin(angle))+.08;solid(x,z,w,d,'fence');
  }
  audit.fences.push({ax,az,bx,bz,height,gate});
 }
 async function landmark(name,x,z){const obj=await asset('landmarks/'+name);const b=place(obj,x,z,null,0,true);audit.buildings.push({name,minX:b.min.x,maxX:b.max.x,minZ:b.min.z,maxZ:b.max.z});}
 // Ground and connected road network; layers use distinct heights to avoid flicker.
 box(0,-.35,0,352,.35,352,C.grass);
 for(const axis of ['x','z'])for(const a of ROAD_AXES){
  const horizontal=axis==='x';slab(horizontal?0:a,horizontal?a:0,horizontal?216:16,horizontal?16:216,C.paving,.035);
 }
 for(const axis of ['x','z'])for(const a of ROAD_AXES){
  const horizontal=axis==='x';slab(horizontal?0:a,horizontal?a:0,horizontal?210:9,horizontal?9:210,C.asphalt,.08);
  for(let t=-103;t<=103;t+=5){if(ROAD_AXES.some(j=>Math.abs(t-j)<8))continue;line(horizontal?t:a,horizontal?a:t,horizontal?2.1:.12,horizontal?.12:2.1,'#eac36c',.14);}
  for(const side of [-1,1])for(let t=-104;t<104;t+=2){
   if(ROAD_AXES.some(j=>Math.abs(t-j)<6))continue;
   box(horizontal?t:a+side*4.7,.04,horizontal?a+side*4.7:t,horizontal?2:.25,.13,horizontal?.25:2,C.curb);
  }
  for(let t=-84;t<=84;t+=28){if(ROAD_AXES.some(j=>Math.abs(t-j)<10))continue;lamp(horizontal?t:a+6.2,horizontal?a+6.2:t);}
 }
 for(const x of ROAD_AXES)for(const z of ROAD_AXES){
  for(const side of [-1,1])for(let i=-3;i<=3;i++){
   line(x+i*.85,z+side*7,.5,2.5,C.white,.15);line(x+side*7,z+i*.85,2.5,.5,C.white,.15);
  }
  town('trafficlight_A',x+6,z+6,.7,Math.PI);round(x+6,z+6,.2,'traffic-light');
 }
 // Street trees in square pits along every sidewalk, clear of lamps, crossings and bus stops.
 const stops=[['x',48,14,1],['x',48,-70,-1],['x',-48,-14,1],['x',-48,70,-1],['z',48,14,1],['z',48,-70,-1],['z',-48,-14,-1],['z',-48,70,1]];
 for(const axis of ['x','z'])for(const a of ROAD_AXES)for(const side of [-1,1])for(let t=-98;t<=98;t+=14){
  if(ROAD_AXES.some(j=>Math.abs(t-j)<12))continue;if(side>0&&Math.abs(((t%28)+28)%28)<5)continue;
  if(stops.some(([ax,sa,st,ss])=>ax===axis&&sa===a&&ss===side&&Math.abs(st-t)<5))continue;
  const off=a+side*7,x=axis==='x'?t:off,z=axis==='x'?off:t;slab(x,z,1.5,1.5,'#7b6a55',.12);lightTree(x,z,t+a,3.2);
 }
 // Bus shelters on the sidewalks, open side facing the road.
 const shelterAsset=await asset('props/ponto-onibus');
 for(const [axis,a,t,side] of stops){
  const off=a+side*6.6,x=axis==='x'?t:off,z=axis==='x'?off:t;
  const rot=axis==='x'?(side>0?0:Math.PI):(side>0?Math.PI/2:-Math.PI/2);place(shelterAsset,x,z,null,rot,true,.1);
 }
 // Central pedestrian precinct: cross paths, fountain, landscaping and streets on all sides.
 path(0,0,8,80);path(0,0,80,8);path(0,18,80,5);
 // Blender props (tools/build_city_props.py): wave-patterned Portuguese pavement, tiered fountain and planters.
 const props={};for(const n of ['praca-central','academia','coreto','ponto-onibus','banca','sorvete','coleta','bicicleta','bicicletario','bebedouro','mesa-piquenique','podio','relogio-sol'])props[n]=await asset('props/'+n);
 const prop=(n,x,z,rot=0,collide=true,y=.08)=>place(props[n],x,z,null,rot,collide,y);
 prop('praca-central',0,0,0,false,0);round(0,0,4.7,'fountain');
 for(let k=0;k<4;k++){const a=-Math.PI/4-k*Math.PI/2;for(const da of [-.2,0,.2])solid(10.2*Math.cos(a+da),10.2*Math.sin(a+da),2.4,2.4,'planter');tree(10.3*Math.cos(a),10.3*Math.sin(a),k,4.2);}
 for(const a of [.32,1.25,1.89,2.82,3.46,4.39,5.03,5.96])lamp(13.4*Math.cos(a),13.4*Math.sin(a));
 prop('banca',-12.5,14.6);prop('sorvete',12.4,14.2,.3);prop('coleta',6.8,14.4);prop('bebedouro',-4.6,13.4);
 prop('bicicletario',17,15,0,true,.06);prop('bicicleta',16.5,15.05,Math.PI/2,false,.1);prop('bicicleta',17.5,15.05,Math.PI/2,false,.1);
 for(const [x,z] of [[-14,-12],[14,-12]])town('trash_A',x,z,.7,0,true);
 sign('PRAÇA CENTRAL',-7,14,5);
 await landmark('escola',0,-29);path(0,-19,18,9);path(0,-39,5,10);
 for(const x of [-12,12]){bed(x,-27,3,9);tree(x,-34,1,3.8);}sign('ESCOLA',-7,-18,4);
 for(const [x,z,n] of [[-26,-29,'F'],[26,-29,'G'],[-26,28,'H']]){path(x,z,18,17);town('building_'+n,x,z,12,0,true);bench(x-5,z+10);bed(x+6,z+10,3,2);}
 await landmark('ginasio',26,28);path(26,39,20,8);bed(15,28,3,8);sign('GINÁSIO',34,39,4);
 // Playground: hopscotch, low balancing course, swings and shaded seating.
 path(-27,0,25,26,'#cdbb94');
 for(let i=0;i<8;i++){const x=-31+(i%2)*2,z=-7+Math.floor(i/2)*2;slab(x,z,1.8,1.8,i%2?'#d68f6d':'#70a8af',.14);}
 for(const x of [-36,-27])box(x,0,3,.2,3,.2,C.wood,true);box(-31.5,3,3,9.2,.25,.25,C.wood);
 for(const x of [-33,-30]){for(const dx of [-.5,.5])box(x+dx,.6,3,.04,2.4,.04,'#3b4d58');box(x,.6,3,1.2,.15,.6,'#dda448');}
 bench(-36,10);tree(-39,-8,2,4);tree(-39,12,0,4);for(const [x,z] of [[-34,-11],[-16,-11]])prop('mesa-piquenique',x,z,0,true,.1);sign('BRINCAR E CONVIVER',-26,13,6);
 // Buildings and forecourts of the outer civic districts.
 for(const [name,x,z] of [['ginastica',-74,-77],['cultural',74,-77],['dojo',-74,65],['saude',-23,68],['museu',74,-4],['visitantes',14,-122]])await landmark(name,x,z);
 for(const [x,z,w,d] of [[-74,-65,35,17],[74,-65,35,17],[-74,80,35,18],[-23,81,30,15],[74,13,35,21],[0,-114,22,10]])path(x,z,w,d);
 for(const [x,z] of [[-87,-66],[91,-58],[-87,81],[-36,82],[87,17]]){bench(x,z);bed(x,z-5,4,3);lamp(x,z+4);}
 for(let i=0;i<4;i++)slab(-85+i*4,-64,2.4,4,i%2?'#9c76c4':'#e9b658',.14);
 for(let i=0;i<3;i++){box(-82+i*5,.12,-57,3,.3,.35,C.wood,true);}
 // Outdoor gyms (academia ao ar livre), as found in Brazilian squares: one per health-related district.
 function outdoorGym(x,z){prop('academia',x,z,0,false,.05);for(const [dx,dz] of [[-4.2,-2.6],[-1.4,-2.6],[1.6,-2.6],[4.4,-2.4],[-4,2.4],[-1,2.6],[1.8,2.5],[4.4,2.6],[-5.3,0]])solid(x+dx,z+dz,1.3,1.1,'gym');}
 outdoorGym(-63,-64);
 board('AULA EM TRÊS PARTES',['Aquecimento: prepara o corpo','Parte principal: objetivo do dia','Volta à calma: alongar e respirar','Pare se sentir dor ou tontura'],-88,-59,Math.PI,2.8);
 sign('GINÁSTICA',-74,-57,5);
 // Bandstand (coreto) for music and dance, facing the patterned dance floor.
 prop('coreto',84,-65,-Math.PI/2,false,.02);round(84,-65,4.9,'bandstand');solid(78.6,-65,1.2,2.4,'bandstand-steps');
 for(let i=0;i<4;i++)for(let j=0;j<4;j++)slab(61+i*3,-70+j*3,2.9,2.9,(i+j)%2?'#e6bd62':'#a486c7',.13);
 sign('DANÇA E CULTURA',73,-57,6);
 slab(-74,80,15,10,'#587f9e',.13);slab(-74,80,11,7,'#d9907d',.18);sign('RESPEITO NO TATAME',-84,88,6);
 prop('bebedouro',-24,86);bed(-35,70,4,6);outdoorGym(-13,80);
 board('HIDRATAÇÃO',['Beba água antes, durante e depois','Mesmo sem sentir sede','Descanso também faz parte do treino','Tontura ou dor no peito: pare e avise'],-31,87.5,Math.PI,2.8);
 board('LUTAR NÃO É BRIGAR',['Cumprimente o colega','Combine o sinal de parar','Nada de golpes fortes','Luta é para todas as pessoas'],-66,88,Math.PI,2.8);sign('SAÚDE E BEM-ESTAR',-24,89,6);
 // Museum sculpture forecourt, without objects blocking its entrance.
 for(const x of [63,85]){disc(x,12,1.5,'#b0b8b2',.12,.55);ball(x,1.5,12,.7,x===63?'#d99c44':'#6b9ea2');round(x,12,1.5,'sculpture');bench(x,21);}
 prop('podio',80,17,0,true,.1);sign('MUSEU DO ESPORTE',74,24,6);
 board('FAIR PLAY',['Jogue com honestidade','Respeite a arbitragem','Cumprimente antes e depois','Torça sem ofender ninguém'],66,21.5,Math.PI,2.8);
 // Residential lots: continuous low fences with deliberately open front gates.
 const houses=await Promise.all(['a','c','f','h'].map(n=>asset('suburban/building-type-'+n)));
 let houseNo=0;
 function house(x,z,back=false){
  const front=back?-1:1;path(x,z,14,16,'#acc18a');place(houses[houseNo++%4],x,z,8,back?Math.PI:0,true);
  fence(x-7,z-8,x-7,z+8);fence(x+7,z-8,x+7,z+8);
  fence(x-7,z-front*8,x+7,z-front*8);
  fence(x-7,z+front*8,x+7,z+front*8,1.05,'#e8dcc2',[5,9]);
  path(x,z+front*8,3,6);bush(x-4,z+front*5,1.5);tree(x+4,z-front*5,houseNo,2.5);
 }
 for(const x of [-30,-10,10,30]){house(x,-66,true);house(x,-87,false);}path(0,-76,84,5);path(0,-75,5,40);
 for(const z of [-28,-9,10,29]){house(-85,z);}
 for(const z of [-27,28])house(86,z);
 sign('VILA DOS IPÊS',-32,-76,5);
 // Market on the western block, separate from the residential row.
 path(-65,0,18,40,'#dcc7a7');const fruit=await asset('market/display-fruit'),bread=await asset('market/display-bread');
 for(let i=0;i<4;i++){
  const x=-64,z=-15+i*9;place(i%2?fruit:bread,x,z,3,Math.PI/2,true);
  box(x,2.8,z,4.5,.18,4,i%2?'#c77b5b':'#5a9897');for(const dx of [-2,2])box(x+dx,0,z-1.7,.12,2.8,.12,C.wood,true);
 }
 for(const z of [-10,0,10]){disc(-72,z,1.1,'#9c7454',.75,.12);solid(-72,z,2.2,2.2);bench(-76,z,Math.PI/2);}sign('FEIRA E SABORES',-66,23,6);
 // Sports asset helpers; authored metre units are retained for equipment.
 const sports={};for(const n of ['goal','basket-hoop','volley-net','bleachers','cone','soccer-ball','basketball','volleyball'])sports[n]=await asset('sports/'+n);
 const equipment=(n,x,z,size=null,rot=0)=>place(sports[n],x,z,size,rot,false,.17);
 function floodlight(x,z){box(x,0,z,.18,7,.18,'#3b4d58',true);box(x,7,z,1.8,.2,.3,'#3b4d58');for(const dx of [-.6,0,.6])box(x+dx,6.8,z+.15,.4,.4,.12,'#fff0c0');}
 // Basketball: 22 x 14, two keys, arcs and a central circle.
 path(27,0,29,23,'#c98164',.115);slab(27,0,22,14,C.teal,.13);
 for(const z of [-7,7])line(27,z,22,.12);for(const x of [16,27,38])line(x,0,.12,14);circle(27,0,2.2);
 for(const side of [-1,1]){const x=27+side*11;equipment('basket-hoop',x,0,null,side<0?Math.PI/2:-Math.PI/2);solid(x+side*.8,0,1,1);line(x-side*4,0,.12,5);for(const z of [-2.5,2.5])line(x-side*2,z,4,.12);circle(x-side*4,0,1.3);
  // Linha de 3 pontos do jogo 3x3 (raio 5,8 m a partir do aro, cortada na linha de fundo).
  const open=Math.acos(.93/5.8),arc=new T.Mesh(new T.RingGeometry(5.74,5.86,64,1,side>0?open:-Math.PI+open,2*(Math.PI-open)),mat(C.white));arc.rotation.x=-Math.PI/2;arc.position.set(x-side*.9325,.17,0);scene.add(arc);}
 const hoopBounds=new T.Box3().setFromObject(sports['basket-hoop']);
 audit.basketballHoop={x:38-(.5-hoopBounds.getCenter(new T.Vector3()).z),y:3.05-hoopBounds.min.y+.17,z:0};
 bench(27,-10);floodlight(40,-10);floodlight(14,10);
 // Football: occupies its own parcel, behind an open-gated screen.
 const fx=75,fz=74;path(fx,fz,38,39,'#b5b9a3');
 for(let i=0;i<6;i++)slab(fx,fz-12.5+i*5,24,5,i%2?'#4e9852':'#40874b',.13);
 for(const x of [63,87])line(x,fz,.12,30);for(const z of [59,74,89])line(fx,z,24,.12);circle(fx,fz,3);
 for(const side of [-1,1]){const z=fz+side*15;equipment('goal',fx,z,null,side<0?0:Math.PI);for(const x of [72,78])solid(x,z,.2,.2);line(fx,z-side*5,11,.12);for(const x of [69.5,80.5])line(x,z-side*2.5,.12,5);}
 equipment('bleachers',59,74,null,Math.PI/2);solid(59,74,2.6,7);
 fence(56,55,94,55,2.4,'#638384');fence(56,93,94,93,2.4,'#638384');fence(94,55,94,93,2.4,'#638384');fence(56,55,56,93,2.4,'#638384',[16,22]);
 for(const x of [58,92])for(const z of [57,91])floodlight(x,z);sign('CAMPO MUNICIPAL',59,88,6);
 // Volleyball and shaded sideline seats.
 path(23,76,34,30,'#d5a96c');slab(23,76,18,9,C.teal,.13);
 for(const x of [14,20,23,26,32])line(x,76,.1,9);for(const z of [71.5,80.5])line(23,z,18,.12);
 equipment('volley-net',23,76,null,Math.PI/2);for(const z of [71,81])solid(23,z,.2,.2);
 bench(16,87);bench(30,87);floodlight(8,65);floodlight(38,87);sign('VÔLEI',23,64,4);
 // Skate plaza: complete Blender skatepark (tools/build_skatepark.py) inside the fenced lot.
 // Coordinates of its elements are relative to the park centre, as in the Blender script.
 const SK={x:-137,z:0};
 // Paved frame between the skatepark slab (50 × 54) and the fence; the slab itself is the floor inside.
 for(const s of [-1,1]){path(SK.x,SK.z+s*28,54,2,'#a7b5b9');path(SK.x+s*26,SK.z,2,58,'#a7b5b9');}path(-105.5,18,9,5);
 // place() ancora pelo ponto mais baixo do modelo; o bowl agora é um buraco de 1,7 m, então o ponto
 // mais baixo é o fundo do bowl, não mais o piso — sem isso o chão da pista flutuaria ~1,5 m no ar.
 place(await asset('skate/skatepark'),SK.x,SK.z,null,0,false,-1.78);audit.skatepark=SK;
 // O bowl virou um buraco no chão (tools/build_skatepark.py): a caixa de colisão normal (passeio a pé)
 // cobre só a borda com grade; andar de skate dentro dele usa a própria física da pista, não esta grade.
 // As rampas de verdade (bowl, mini-rampa, quarter pipes) ficam marcadas 'skate-ramp', não 'skate':
 // só pedestres a pé ficam de fora delas (navigation.js ignora esse tipo para quem anda de skate/bike),
 // os obstáculos de rua e os limites da pista continuam bloqueando todo mundo.
 for(const [x,z,w,d] of [[-11,-13,7.0,4.8],[11.5,-18,11,7],[18,-18,1.6,1.8],[-18.7,5,2.5,4],[-18.7,12,2.5,4]])solid(SK.x+x,SK.z+z,w,d,'skate-ramp');
 for(const [x,z,w,d] of [[-15,-5.7,2.6,2.1],[-4,9.4,9,5.8],[8,4,7.2,2.6],[8,13,4.5,2],[16,10,.7,6],[-14,0,5,.3],[18.6,-6,1.7,1.8],[9,-6,6.2,6.2],[.4,-1,4.1,3],[-24.3,8,.6,20.2],[2,-25.4,12,2.7],[22.5,11.2,2.2,.6],[-24,-20,1.6,12],[24,-4,1.6,20],[-12,25.6,22,1.2]])solid(SK.x+x,SK.z+z,w,d,'skate');
 fence(-164,-29,-110,-29,1.1,'#647d80');fence(-164,29,-110,29,1.1,'#647d80');fence(-164,-29,-164,29,1.1,'#647d80');fence(-110,-29,-110,29,1.1,'#647d80',[43,51]);
 for(const z of [-25,-20,-15])tree(SK.x-24,SK.z+z,Math.round(z),3.4);
 for(const z of [-12,-4,4])tree(SK.x+24,SK.z+z,Math.round(z),3.4);
 for(const x of [-21,-12,-3])tree(SK.x+x,SK.z+25.6,x,3.2);
 for(const [x,z] of [[-23,-27],[23,-27],[-23,27],[23,27]])floodlight(SK.x+x,SK.z+z);
 for(const [x,z,r] of [[-20.5,17.2,0],[-15.5,20.3,0],[-19,22.4,Math.PI]])bench(SK.x+x,SK.z+z,r);
 for(const [x,z] of [[21,8.6],[-22,15],[12,-24.5]])town('trash_A',SK.x+x,SK.z+z,.75,0,true);
 // Hydration point and bike rack next to the gate.
 box(SK.x+20.5,0,SK.z+24.5,.5,1,.5,'#6b9ea2',true);disc(SK.x+20.5,SK.z+24.5,.35,'#a0c7c5',1.02,.05);
 for(let i=0;i<5;i++){const x=SK.x+12+i*.9;box(x,0,SK.z+26.3,.08,.8,.9,'#3b4d58');box(x,.75,SK.z+26.3,.08,.08,.9,'#3b4d58');}solid(SK.x+13.8,SK.z+26.3,4.6,1);
 board('REGRAS DA PISTA',['Espere a sua vez','Capacete e joelheiras sempre','Comece pela área de iniciantes','Dê preferência a quem está aprendendo','Deixe a pista limpa'],SK.x+30,SK.z+11.5,Math.PI/2);
 for(const z of [-32,32]){bench(-135,z);bench(-145,z);floodlight(-159,z);tree(-121,z,1,4);}
 sign('PARQUE DE SKATE',-118,27,6);
 // Science pavilion with dome, orbit sculptures and varied landscaping.
 path(132,0,49,48);path(107,13,16,5);await landmark('ciencia',135,-9);
 const dome=new T.Mesh(new T.SphereGeometry(4,20,10,0,Math.PI*2,0,Math.PI/2),mat('#4b9dae'));dome.position.set(135,5.8,-9);scene.add(dome);
 for(const x of [119,147])for(const z of [2,15]){disc(x,z,1.5,'#b9c7bc',.1,.4);round(x,z,1.5,'sculpture');const hoop=new T.Mesh(new T.TorusGeometry(1,.1,6,24),mat('#c49b45'));hoop.position.set(x,1.8,z);hoop.rotation.y=x;scene.add(hoop);}
 bed(132,22,14,3);sign('CIÊNCIA DO CORPO',132,18,7);prop('relogio-sol',133,8,0,true,.1);
 board('FREQUÊNCIA CARDÍACA',['Dois dedos no pulso ou no pescoço','Conte as batidas por 15 segundos','Multiplique por 4','Compare: repouso e depois do esforço'],122,20.5,Math.PI,2.8);bench(151,8,Math.PI/2);tree(153,-19,2,5);
 // Gallery: covered avenue, not empty boards on a circular patch.
 path(0,135,43,47);path(0,109,6,20);await landmark('galeria',0,149);
 for(const x of [-13,13]){
  for(let i=0;i<3;i++){
   const z=119+i*9;box(x,0,z,.18,3,.18,C.wood,true);box(x,1.1,z,4,2,.2,'#476b74');
   for(let j=0;j<3;j++)box(x-1.2+j*1.2,1.35,z+.14,.9,1.4,.04,['#e2aa55','#6da7a0','#9574ba'][j]);
  }
  box(x,3.3,128,6,.2,29,'#e3bf78');bench(x,142);bed(x,112,5,3);
 }
 sign('GALERIA DA TURMA',0,114,7);
 // Visitor centre, walking trail and campsite.
 path(0,-130,5,55,'#c5ad80');path(0,-145,38,29,'#c2b38e');
 const tent=await asset('camping/tent'),log=await asset('camping/logBench'),pine=await asset('camping/pineTree');
 for(const [x,z,rot] of [[-12,-138,.4],[13,-144,-.6],[-12,-154,.8]])place(tent,x,z,5.5,rot,true);
 for(const x of [-6,6])place(log,x,-147,3,0,true);
 for(let i=0;i<5;i++){const z=-112-i*10;box(4,0,z,.12,1.5,.12,C.wood);box(4,1.1,z,1,.4,.15,i%2?'#d0ad55':'#577f6a');}
 sign('TRILHA · ACAMPAMENTO',-7,-113,7);
 board('NÃO DEIXE RASTRO',['Fique na trilha marcada','Siga a sinalização','Leve seu lixo de volta','Não retire plantas nem pedras','Nunca vá sozinho'],8.5,-110,0,2.8);sign('CLAREIRA DO ENCONTRO',0,-132,7);
 for(const x of [-23,23])for(let z=-118;z>=-162;z-=10)place(pine,x,z,4.5,0,false);
 // Trees, curbside gardens, bike racks and seating enrich every district.
 for(const x of [-40,40])for(const z of [-38,-12,12,39]){tree(x,z,Math.round(z),3.5);bush(x-2,z,1.3);}
 for(const x of [-92,92])for(const z of [-85,-60,39,88]){tree(x,z,Math.round(z),3.5);}
 for(const [x,z] of [[-60,-89],[60,-89],[-90,61],[-7,91],[36,90],[12,-40],[-12,40]])bed(x,z,5,3);
 // Shaded rest areas and planting frame the civic plazas without closing their entries.
 function pergola(x,z){
  path(x,z,7,5);for(const dx of [-3,3])for(const dz of [-2,2])box(x+dx,0,z+dz,.18,3.2,.18,C.wood,true);
  for(const dz of [-2,2])box(x,3.2,z+dz,6.4,.2,.2,C.wood);
  for(let i=-3;i<=3;i++)box(x+i,3.4,z,.16,.12,4.6,'#c5a478');bench(x,z,Math.PI);
 }
 for(const [x,z] of [[-62,64],[-10,70],[62,-5],[145,-19],[-26,-122]])pergola(x,z);
 for(const [x,z] of [[-89,-78],[-60,-78],[60,-78],[89,-78],[-89,67],[-60,86],[-36,65],[-9,86],[62,3],[87,3],[8,89],[38,65],[116,-19],[151,20],[-19,117],[19,138]]){
  tree(x,z,Math.round(x),3.1);bed(x,z,3,2);
 }
 for(let i=0;i<5;i++)disc(-20,-8+i*2,.48,'#aa8055',.1,.2+(i%3)*.12);
 box(-21,.1,7,.4,.32,5,'#bc9869',true);bench(-35,-10,Math.PI);
 for(const x of [-12,12]){
  box(x,.9,-148,3,.15,1.3,C.wood,true);for(const dz of [-1.2,1.2])box(x,.5,-148+dz,3,.14,.45,'#b59369',true);
  for(const dx of [-1,1])box(x+dx,.1,-148,.15,.8,1.4,C.wood);
 }
 for(const [x,z] of [[-28,40],[73,-91],[-74,-90],[-88,20],[85,37]]){
  path(x,z,12,6,'#56636d');for(let i=0;i<3;i++){town(['car_sedan','car_taxi','car_hatchback'][i],x-4+i*4,z,3.4,Math.PI/2,true);line(x-5.7+i*4,z,.08,5);}
 }
 for(let i=0;i<170;i++){
  const a=i*2.399963,r=127+(i%8)*5,x=Math.cos(a)*r,z=Math.sin(a)*r;
  // Protect the four exterior facilities and walking approaches.
  if(Math.abs(x)<33||Math.abs(z)<40)continue;
  tree(x,z,i,3.5+i%3);if(i%2===0)bush(x+2,z+1,1.6);
  if(i%4===0)place(forest.getObjectByName('M_Rock_1_E'),x-2,z-2,1.8);
 }
 // Neighbourhood gardens: the remaining lawn between streets, paved areas and buildings receives
 // clustered trees, shrubs, flowers, grass and the occasional picnic table (deterministic layout).
 let seed=20261027;const rnd=()=>(seed=seed*16807%2147483647)/2147483647;
 const free=(x,z,m)=>!ROAD_AXES.some(a=>Math.abs(x-a)<9.5||Math.abs(z-a)<9.5)&&!paved.some(p=>Math.abs(x-p.x)<p.w/2+m&&Math.abs(z-p.z)<p.d/2+m)&&!solids.some(s=>Math.abs(x-s.x)<s.w+m&&Math.abs(z-s.z)<s.d+m);
 const flowers=['flower_redA','flower_yellowB','flower_purpleC'];let gardens=0;
 for(let x=-102;x<=102;x+=6.5)for(let z=-102;z<=102;z+=6.5){
  const px=x+(rnd()-.5)*4,pz=z+(rnd()-.5)*4,r=rnd();if(!free(px,pz,2))continue;gardens++;
  if(r<.24){lightTree(px,pz,Math.floor(rnd()*3),3.2+rnd()*1.6);if(rnd()<.6)place(nk.plant_bush,px+1.5,pz+.7,1.3,rnd()*6);}
  else if(r<.48){const f=flowers[Math.floor(rnd()*3)];for(let i=0;i<6;i++)place(nk[f],px+(rnd()-.5)*2.6,pz+(rnd()-.5)*2.6,.6+rnd()*.35,rnd()*6);}
  else if(r<.64)place(nk.grass_large,px,pz,1.1+rnd()*.6,rnd()*6);
  else if(r<.74)place(nk.plant_bushSmall,px,pz,1+rnd()*.5,rnd()*6);
  else if(r<.78&&free(px,pz,3.5))place(props['mesa-piquenique'],px,pz,null,rnd()*3,true,.02);
  else if(r<.84)place(nk.rock_smallFlatA,px,pz,1.3,rnd()*6);
 }
 audit.gardens=gardens;
 // Final batches, bounded per sector for frustum culling. Static pieces that share a material inside a
 // sector are merged into one mesh (one draw call per material); multi-material pieces stay instanced.
 // Plain-coloured materials (no texture, opaque) become vertex colours of one shared material.
 const merged=new Map(),flat=new T.MeshStandardMaterial({vertexColors:true,roughness:.88});let instanced=0;
 // Slightly livelier colours, closer to the saturated KayKit palette used in Jogo_RPG_EF7.
 const vivid=c=>{const hsl={};c.getHSL(hsl);return new T.Color().setHSL(hsl.h,Math.min(1,hsl.s*1.12),hsl.l);};
 const plain=m=>m.isMeshStandardMaterial&&!m.map&&!m.transparent&&m.opacity===1&&m.emissive.getHex()===0;
 const copy=attr=>attr.isInterleavedBufferAttribute?new T.BufferAttribute(Float32Array.from({length:attr.count*attr.itemSize},(_,i)=>attr.array[Math.floor(i/attr.itemSize)*attr.data.stride+attr.offset+i%attr.itemSize]),attr.itemSize,attr.normalized):attr.clone();
 for(const [key,b] of batches){
  const g=b.geometry,sector=key.split(':')[0];
  if(Array.isArray(b.material)||g.groups.length>1){const mesh=new T.InstancedMesh(g,b.material,b.matrices.length);b.matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);instanced++;continue;}
  const colour=plain(b.material),signature=colour?'flat':Object.keys(g.attributes).sort().join(',')+(g.index?':indexed':''),groupKey=`${sector}|${colour?'flat':b.material.uuid}|${signature}`;
  if(!merged.has(groupKey))merged.set(groupKey,{material:colour?flat:b.material,parts:[]});
  for(const m of b.matrices){
   let part=new T.BufferGeometry();
   if(colour){for(const name of ['position','normal'])part.setAttribute(name,copy(g.attributes[name]));if(g.index)part.setIndex(g.index.clone());part=part.toNonIndexed();const c=vivid(b.material.color),n=part.attributes.position.count,rgb=new Float32Array(n*3);for(let i=0;i<n;i++)rgb.set([c.r,c.g,c.b],i*3);part.setAttribute('color',new T.BufferAttribute(rgb,3));}
   else{for(const [name,attr] of Object.entries(g.attributes))part.setAttribute(name,copy(attr));if(g.index)part.setIndex(g.index.clone());}
   part.applyMatrix4(m);merged.get(groupKey).parts.push(part);
  }
 }
 for(const {material,parts} of merged.values()){const geometry=mergeGeometries(parts,false);for(const p of parts)p.dispose();if(!geometry)continue;geometry.computeBoundingSphere();const mesh=new T.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);}
 audit.batches=merged.size+instanced;return audit;
}
