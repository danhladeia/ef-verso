// District layout uses clear pedestrian corridors and shared asset geometry.
export function expandCity({box,disk,model,jobs,places}) {
  box(0,-.42,0,204,.4,204,'#86b85a');
  for(const x of [-54,54])box(x,.01,0,8,.04,180,'#e8dcc2');
  for(const z of [-54,54])box(0,.01,z,180,.04,8,'#e8dcc2');
  for(const z of [-12,12])box(0,.01,z,116,.04,5,'#e8dcc2');
  for(const x of [-12,12])box(x,.01,0,5,.04,116,'#e8dcc2');
  box(0,.01,-76,8,.04,44,'#cfb184');
  const districts=[
    {name:'Centro de Ginástica',x:-54,z:-54,text:'Espaço de ginástica: colchonetes e circuito de equilíbrio. As atividades pedagógicas serão implementadas depois.'},
    {name:'Praça das Danças',x:54,z:-54,text:'Praça para danças e expressão corporal. Palco e pista preparados para futuros desafios de ritmo.'},
    {name:'Dojô das Lutas',x:54,z:54,text:'Espaço para aprender sobre respeito, regras e diferentes práticas de luta. O tatame já está reservado.'},
    {name:'Bairro da Saúde',x:-54,z:54,text:'Ponto de encontro para aprender sobre saúde, hidratação e cuidados com o corpo.'},
    {name:'Entrada da Trilha',x:0,z:-84,text:'Início da área de aventura. Esta primeira clareira representa a futura trilha; a serra e seus desafios ainda serão construídos.'},
  ];
  for(const p of districts){
    disk(p.x,p.z,13,'#e8dcc2');
    // Each civic district now receives its own Blender landmark in main.js.
    for(const dx of [-10,10]){
      jobs.push(model('bench',p.x+dx,p.z+6,2.2,true));
      jobs.push(model('streetlight',p.x+dx,p.z-8,.8,false));
    }
    places.push(p);
  }
  // Exercise mats and low balance beams, outside the walking corridor.
  for(let i=0;i<4;i++)box(-64+i*3,.1,-59,2,.12,3,i%2?'#6a2fb0':'#ffc933');
  box(-61,.1,-48,5,.35,.4,'#b88858',true);
  // Dance floor remains at ground level; the stage is a solid prop.
  for(let i=0;i<4;i++)for(let j=0;j<3;j++)box(47+i*2.4,.1,-60+j*2.4,2.3,.06,2.3,(i+j)%2?'#d9c8f5':'#ffc933');
  box(60,0,-54,5,.7,8,'#6a2fb0',true);
  box(60,.7,-58,.25,3,.25,'#2a1259');box(60,.7,-50,.25,3,.25,'#2a1259');box(60,3.7,-54,.3,.2,8,'#ffc933');
  // Practice mat, distinct from the central interaction marker.
  box(48,.05,60,10,.1,8,'#2f7ee8');box(48,.16,60,7,.02,5,'#e66060');
  disk(-61,60,3,'#1fa35c');box(-61,.15,60,3,.04,.7,'#ffffff');box(-61,.15,60,.7,.04,3,'#ffffff');
  // Additional neighbourhood façades face the outer pedestrian ring.
  for(const [x,z] of [[-28,-68],[28,-68],[-28,69],[-71,-25],[71,-25],[-71,25],[71,25]])jobs.push(model('building.glb',x,z,10,true));
  // Boulevard landscaping is handled by urban-design.js.
  for(const x of [-10,10])for(let z=-68;z>=-94;z-=8)jobs.push(model('tree.glb',x,z,4,true));
}
