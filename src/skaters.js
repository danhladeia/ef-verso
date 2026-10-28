import * as T from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';

// Skatistas do Kenney Mini Skate (CC0): mesmo esqueleto dos alunos, com animações próprias de skate.
// Percursos em coordenadas relativas ao centro da pista, iguais às de tools/build_skatepark.py.
const TOP=.128-.08;
// Mini-rampa: origem (6, -18), eixo +x; plataforma 1,8 m, transição de raio 2,2 m até 1,5 m de altura, fundo de 3,2 m.
const MINI={x:6,z:-18,plat:1.8,r:2.2,h:1.5,flat:3.2};
MINI.w=Math.sqrt(MINI.r**2-(MINI.r-MINI.h)**2);MINI.length=2*(MINI.plat+MINI.w)+MINI.flat;
function miniHeight(u){const {plat,w,r,length}=MINI,d=u<length/2?plat+w-u:u-(length-plat-w);return d<=0?0:r-Math.sqrt(Math.max(0,r*r-d*d));}
// Bowl: centro (-11, -13), fundo superelíptico de 5,2 × 3,0 m, transição de raio 1,35 m.
const BOWL={x:-11,z:-13,a:5.2,b:3,r:1.35,offset:.95};
function superellipse(t,a,b){const c=Math.cos(t),s=Math.sin(t);return [a*Math.sign(c)*Math.abs(c)**.5,b*Math.sign(s)*Math.abs(s)**.5];}

export async function createSkaters({scene,loader,center}){
 const [boy,girl,board]=await Promise.all(['skater-boy','skater-girl','skateboard'].map(n=>loader.loadAsync('/models/skate/'+n+'.glb')));
 const group=new T.Group();group.name='Skatistas';group.userData.crowd=true;group.position.set(center.x,0,center.z);scene.add(group);
 function rider(file,height){
  const model=clone(file.scene),root=new T.Group(),tilt=new T.Group();model.rotation.y=Math.PI;tilt.add(model);root.add(tilt);group.add(root);
  model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.frustumCulled=false;}});
  const deck=board.scene.clone(true);model.add(deck);
  model.updateMatrixWorld(true);const box=new T.Box3().setFromObject(model),scale=height/box.getSize(new T.Vector3()).y;model.scale.setScalar(scale);
  const mixer=new T.AnimationMixer(model),actions=Object.fromEntries(file.animations.map(c=>[c.name,mixer.clipAction(c)]));let current=null;
  return {root,tilt,mixer,play(name){if(current===actions[name])return;actions[name].reset().play();if(current)current.crossFadeTo(actions[name],.2,false);current=actions[name];}};
 }
 const riders=[
  {...rider(boy,1.55),kind:'loop',phase:0},
  {...rider(girl,1.5),kind:'loop',phase:Math.PI},
  {...rider(girl,1.5),kind:'mini',phase:.4},
  {...rider(boy,1.55),kind:'bowl',phase:1.2},
 ];
 let time=0;
 function update(dt,observer,overview=false){
  const dx=observer.x-center.x,dz=observer.z-center.z;group.visible=overview||Math.hypot(dx,dz)<95;if(!group.visible||document.hidden)return;time+=dt;
  for(const r of riders){
   if(r.kind==='loop'){
    // Volta ao redor da área de rua, sem cruzar os obstáculos.
    const t=time*.28+r.phase,x=4+13.5*Math.cos(t),z=8.5+7.5*Math.sin(t);r.root.position.set(x,TOP,z);
    r.root.rotation.y=Math.atan2(13.5*Math.sin(t),-7.5*Math.cos(t));r.tilt.rotation.set(0,0,0);r.play('skate');
   }else if(r.kind==='mini'){
    // Vai e volta como um pêndulo; no alto de cada parede, faz o aéreo.
    const s=Math.sin(time*1.15+r.phase),u=MINI.length/2+s*(MINI.length/2-MINI.plat-.15),h=miniHeight(u);
    const slope=(miniHeight(u+.05)-miniHeight(u-.05))/.1,going=Math.cos(time*1.15+r.phase)>0;
    r.root.position.set(MINI.x+u,TOP+h,MINI.z);r.root.rotation.y=going?-Math.PI/2:Math.PI/2;r.tilt.rotation.set(Math.atan(slope)*(going?1:-1),0,0);
    r.play(Math.abs(s)>.93?'skate-air':'skate');
   }else{
    // Volta contínua pela transição do bowl, inclinado para dentro.
    const t=-(time*.75+r.phase),[x,z]=superellipse(t,BOWL.a+BOWL.offset,BOWL.b+BOWL.offset),[nx,nz]=superellipse(t-.05,BOWL.a+BOWL.offset,BOWL.b+BOWL.offset);
    const lean=Math.asin(BOWL.offset/BOWL.r),h=BOWL.r*(1-Math.cos(lean));
    r.root.position.set(BOWL.x+x,TOP+.02+h,BOWL.z+z);r.root.rotation.y=Math.atan2(-(nx-x),-(nz-z));r.tilt.rotation.set(0,0,lean*.85);r.play('skate');
   }
   r.mixer.update(dt);
  }
 }
 return {group,update};
}
