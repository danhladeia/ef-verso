import * as T from 'three';
export function buildSports({scene,loader,box,solids,jobs,places}){
 const cache=new Map();
 async function prop(name,x,z,rotation=0,diameter=null){
  if(!cache.has(name))cache.set(name,loader.loadAsync('/models/sports/'+name+'.glb'));
  const obj=(await cache.get(name)).scene.clone(true);
  if(diameter){const b=new T.Box3().setFromObject(obj),s=b.getSize(new T.Vector3());obj.scale.multiplyScalar(diameter/Math.max(s.x,s.y,s.z));const bb=new T.Box3().setFromObject(obj),c=bb.getCenter(new T.Vector3());obj.position.set(-c.x,-bb.min.y,-c.z);const group=new T.Group();group.add(obj);group.position.set(x,.15,z);scene.add(group);return;}
  obj.position.set(x,.15,z);obj.rotation.y=rotation;scene.add(obj);
 }
 function put(...args){jobs.push(prop(...args));}
 function line(x,z,w,d){box(x,.25,z,w,.025,d,'#fff8e9');}
 function circle(x,z,r){const o=new T.Mesh(new T.RingGeometry(r-.06,r+.06,48),new T.MeshBasicMaterial({color:'#fff8e9',side:T.DoubleSide}));o.rotation.x=-Math.PI/2;o.position.set(x,.28,z);scene.add(o);}
 // Football field: eastern district, clear of the museum and ring paths.
 const fx=78,fz=67;
 box(fx,.06,fz,28,.12,42,'#3d8546');
 for(let i=0;i<8;i++)box(fx,.18,fz-17.5+i*5,24,.02,5,i%2?'#4a984d':'#438c46');
 for(const x of [fx-12,fx+12])line(x,fz,.12,40);for(const z of [fz-20,fz,fz+20])line(fx,z,24,.12);circle(fx,fz,3.4);
 for(const side of [-1,1]){const z=fz+side*20;put('goal',fx,z,side<0?0:Math.PI);line(fx,z-side*6,12,.12);for(const x of [fx-6,fx+6])line(x,z-side*3,.12,6);for(const x of [fx-3,fx+3])solids.push({x,z,w:.25,d:.25});}
 put('soccer-ball',fx,fz,0,.5);put('bleachers',fx-16,fz,Math.PI/2);solids.push({x:fx-16,z:fz,w:2,d:4});
 // Existing central basketball court receives real baskets.
 put('basket-hoop',16.5,0,Math.PI/2);put('basket-hoop',37.5,0,-Math.PI/2);put('basketball',25,2,0,.48);
 for(const x of [15.7,38.3])solids.push({x,z:0,w:.65,d:.8});
 // Volleyball court south of the central plaza.
 const vx=25,vz=76;box(vx,.06,vz,23,.12,14,'#d69a60');box(vx,.18,vz,18,.02,9,'#58a6af');
 for(const x of [vx-9,vx+9,vx-3,vx+3])line(x,vz,.12,9);for(const z of [vz-4.5,vz+4.5])line(vx,z,18,.12);
 put('volley-net',vx,vz,Math.PI/2);put('volleyball',vx-4,vz+1,0,.46);
 for(const z of [vz-5,vz+5])solids.push({x:vx,z,w:.25,d:.25});
 for(let i=0;i<5;i++)put('cone',42+i*2,39);
 box(78,.02,38,5,.04,18,'#e8dcc2');box(25,.02,62,5,.04,16,'#e8dcc2');
 places.push({name:'Campo de Futebol',x:78,z:44,text:'Campo com marcações, traves, redes e bola. Equipamentos cenográficos; a partida ainda será implementada.'},{name:'Quadra de Vôlei',x:25,z:65,text:'Quadra com rede e bola. A modalidade jogável será desenvolvida na próxima etapa.'});
}
