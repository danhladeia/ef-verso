import * as T from 'three';

export function buildEnvironments({scene,loader,box,disk,model,jobs,places,solids}) {
  const C={path:'#e8dcc2',purple:'#6a2fb0',cream:'#f0dfbb',glass:'#4598ae',wood:'#9b6846'};
  box(0,-.46,0,304,.4,304,'#86b85a');
  // External pedestrian ring connects the four new districts.
  for(const x of [-118,118])box(x,.01,0,7,.04,246,C.path);
  for(const z of [-118,118])box(0,.01,z,246,.04,7,C.path);
  for(const z of [-54,54])for(const x of [-104,104])box(x,.01,z,32,.04,7,C.path);
  box(0,.01,-105,7,.04,36,C.path);box(0,.01,104,7,.04,35,C.path);
  const cache=new Map();
  async function camping(file,x,z,size,rotation=0){
    if(!cache.has(file))cache.set(file,loader.loadAsync('/models/camping/'+file+'.glb'));
    const obj=(await cache.get(file)).scene.clone(true);obj.rotation.y=rotation;
    let bounds=new T.Box3().setFromObject(obj);const s=bounds.getSize(new T.Vector3());obj.scale.multiplyScalar(size/Math.max(s.x,s.z));bounds=new T.Box3().setFromObject(obj);const c=bounds.getCenter(new T.Vector3());obj.position.set(x-c.x,.1-bounds.min.y,z-c.z);scene.add(obj);
    const final=new T.Box3().setFromObject(obj),d=final.getSize(new T.Vector3());solids.push({x,z,w:d.x/2+.35,d:d.z/2+.35});
  }
  function path(x,z,w,d){box(x,.04,z,w,.035,d,C.path);}
  function pavilion(x,z,w,d,color){
    box(x,0,z,w,5,d,C.cream,true);box(x,5,z,w+.8,.35,d+.8,color);
    for(const dx of [-w*.33,0,w*.33])box(x+dx,1,z+d/2+.06,2,2.8,.15,C.glass);
    box(x,3.7,z+d/2+1,5,.25,2.2,color);
    for(const dx of [-w/2+1,w/2-1])box(x+dx,0,z+d/2+1,.25,3.7,.25,C.wood,true);
  }
  // Science district: observatory dome and outdoor exhibits.
  disk(118,0,20,'#d9c8f5');path(118,0,7,40);pavilion(130,-8,14,10,C.purple);
  const dome=new T.Mesh(new T.SphereGeometry(4,16,8,0,Math.PI*2,0,Math.PI/2),new T.MeshStandardMaterial({color:'#63b6cb',roughness:.55}));dome.position.set(130,5.4,-8);scene.add(dome);
  for(let i=0;i<3;i++){
    const x=107,z=-10+i*10;box(x,0,z,2.5,.7,2.5,C.cream,true);
    const mesh=new T.Mesh(new T.TorusGeometry(1,.12,6,24),new T.MeshStandardMaterial({color:['#ffc933','#e76776','#63b6cb'][i]}));mesh.position.set(x,2,z);mesh.rotation.y=i*.8;scene.add(mesh);
  }
  // Gallery: covered outdoor exhibition with accessible open circulation.
  disk(0,118,20,C.path);pavilion(0,136,18,8,C.purple);path(0,126,6,18);
  for(const x of [-11,11])for(let i=0;i<3;i++){
    const z=108+i*8;box(x,0,z,.2,2.6,.2,C.wood,true);box(x,1.1,z,3,1.8,.25,C.purple);
    box(x,1.3,z+.15,2.6,1.4,.04,['#ffc933','#6fc4b6','#ee8c77'][i]);
    jobs.push(model('bench',x+(x<0?-4:4),z,2,true));
  }
  // Urban adventure: decorative ramps, rails and a climbing wall.
  box(-120,0,0,42,.12,38,'#b7c5cc');path(-118,0,7,42);
  box(-105,0,-8,.7,5,12,'#6a2fb0',true);
  for(let i=0;i<18;i++)box(-105.5,.6+(i%4),-13+Math.floor(i/4)*2,.3,.22,.4,i%2?'#ffc933':'#60c9c0');
  // Skate ramps and rail are now loaded from the downloaded Kenney pack.
  // Forest clearing, no campfire: keeps a continuous clear central trail.
  disk(0,-123,23,'#c6b38b');path(0,-124,6,42);
  for(const [x,z,a] of [[-14,-112,.5],[14,-119,-.5],[-14,-134,1]])jobs.push(camping('tent',x,z,5,a));
  for(const x of [-8,8])jobs.push(camping('logBench',x,-126,3));
  for(const [x,z] of [[-20,-122],[21,-133],[-25,-141],[25,-109],[-26,-107],[27,-143]])jobs.push(camping('pineTree',x,z,4));
  for(let i=0;i<5;i++){const z=-106-i*8;box(5,0,z,.15,1.6,.15,C.wood,true);box(5,1.2,z,1,.6,.12,i%2?'#ffc933':'#6a2fb0');}
  places.push(
    {name:'Centro de Ciência do Corpo',x:118,z:8,text:'Pavilhão de ciência e observatório. As estações externas representam futuros conteúdos sobre movimento e corpo humano; experimentos e interior ainda serão desenvolvidos.'},
    {name:'Galeria da Turma',x:0,z:118,text:'Galeria ao ar livre com painéis e bancos. Os painéis são espaços reservados para trabalhos e conquistas; ainda não estão conectados às turmas.'},
    {name:'Aventura Urbana',x:-118,z:0,text:'Praça com rampas, corrimãos e parede de escalada. Equipamentos cenográficos: as mecânicas de skate e escalada ainda não estão disponíveis.'},
    {name:'Acampamento e Orientação',x:0,z:-124,text:'Explore a clareira com barracas, bancos e sinalizadores. O percurso está aberto para caminhada; atividades de orientação e acampamento ainda serão implementadas.'}
  );
  // Sparse border trees, using shared source meshes and leaving the gateways open.
  for(let i=0;i<48;i++){
    const a=i*Math.PI*2/48,x=Math.cos(a)*145,z=Math.sin(a)*145;
    if(Math.abs(x)<30&&z<0||Math.abs(x)<22&&z>120||Math.abs(z)<25)continue;
    jobs.push(model('tree.glb',x,z,3.5+(i%3)*.5,true));
  }
}
