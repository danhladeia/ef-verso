import * as T from 'three';
// O laço segue os dois eixos internos (ou externos) da malha viária. LANE empurra o veículo para
// FORA do retângulo em cada lado: como o laço sempre vira à direita nos cantos, isso é a mão
// correta (direita) da via — antes o laço ficava encolhido 2,2 m para DENTRO, ou seja na contramão.
const LANE=2.3,CAR_LENGTH=3.3;
function makeRoute(axisLo,axisHi){
 const lo=axisLo-LANE,hi=axisHi+LANE;
 const points=[new T.Vector3(lo,0,lo),new T.Vector3(hi,0,lo),new T.Vector3(hi,0,hi),new T.Vector3(lo,0,hi)],path=new T.CurvePath(),r=5;
 for(let i=0;i<4;i++){
  const a=points[i],b=points[(i+1)%4],c=points[(i+2)%4],d=b.clone().sub(a).normalize(),next=c.clone().sub(b).normalize();
  path.add(new T.LineCurve3(a.clone().addScaledVector(d,r),b.clone().addScaledVector(d,-r)));
  path.add(new T.QuadraticBezierCurve3(b.clone().addScaledVector(d,-r),b,b.clone().addScaledVector(next,r)));
 }
 return path;
}
// A rotação da rota usa yaw=atan2(-tangente.x,-tangente.z): sem nenhuma rotação própria, o modelo
// precisa estar de frente para -Z. As rodas do pacote de carros se chamam "wheel_front_*"/
// "wheel_rear_*", então a frente de verdade é descoberta por elas em vez de um ângulo fixo — um
// ângulo fixo (90°) foi o que fazia os carros andarem de lado, pois somava com o yaw da rota.
function alignForward(model){
 let front=null,rear=null;
 model.traverse(o=>{if(!front&&/wheel_front/.test(o.name))front=o;if(!rear&&/wheel_rear/.test(o.name))rear=o;});
 if(!front||!rear)return false;
 const dx=front.position.x-rear.position.x,dz=front.position.z-rear.position.z;
 model.rotation.y=Math.atan2(-dx,-dz);
 return true;
}
// Escala (se length>0), centraliza em x/z e apoia no chão (min.y=0) — depois de girar, então a
// caixa usada para centralizar já reflete a frente correta.
function fitVehicle(original,length){
 original.updateMatrixWorld(true);
 const box=new T.Box3().setFromObject(original),size=box.getSize(new T.Vector3());
 if(length)original.scale.multiplyScalar(length/Math.max(size.x,size.z));
 original.updateMatrixWorld(true);
 const fitted=new T.Box3().setFromObject(original),center=fitted.getCenter(new T.Vector3());
 original.position.set(-center.x,-fitted.min.y,-center.z);
 original.traverse(o=>{if(o.isMesh)o.castShadow=true;});
}
export async function createTraffic({scene,loader}){
 const [file,busFile]=await Promise.all([loader.loadAsync('/models/vila-pack.glb'),loader.loadAsync('/models/props/onibus.glb')]);
 const group=new T.Group();group.name='Trânsito';group.userData.noCameraCollision=true;scene.add(group);
 const inner=makeRoute(-48,48),outer=makeRoute(-100,100),vehicles=[];
 for(let i=0;i<10;i++){
  const bus=i>=8,route=bus?outer:inner;
  const original=bus?busFile.scene.clone(true):file.scene.getObjectByName('M_'+['car_hatchback','car_sedan','car_taxi','car_stationwagon'][i%4]).clone(true);
  if(!bus)alignForward(original); // o ônibus já foi modelado de frente para -Z (ver tools/build_city_props.py).
  fitVehicle(original,bus?0:CAR_LENGTH);
  const root=new T.Group();root.add(original);group.add(root);
  vehicles.push({root,bus,route,length:route.getLength(),distance:route.getLength()*(bus?(i-8)/2:i/8),speed:bus?7:9+i%3,wait:0,lastStop:-1});
 }
 let time=0;
 return {group,update(dt,player,paused=false){if(paused)return;time+=dt;for(const v of vehicles){
  const t=(v.distance%v.length)/v.length,p=v.route.getPointAt(t),tangent=v.route.getTangentAt(t),dx=player.x-p.x,dz=player.z-p.z;
  const pedestrian=Math.abs(dx*tangent.z-dz*tangent.x)<2.1&&dx*tangent.x+dz*tangent.z>0&&dx*tangent.x+dz*tangent.z<7;
  const leader=vehicles.some(o=>o!==v&&o.route===v.route&&(o.distance-v.distance+v.length)%v.length<(v.bus?11:6));
  const lap=Math.floor(v.distance/v.length),stopId=lap*4+Math.floor(t*4);
  if(v.bus&&Math.abs(p.z+100+LANE)<1&&Math.abs(p.x-14)<1&&v.lastStop!==stopId){v.wait=3;v.lastStop=stopId;}
  v.wait=Math.max(0,v.wait-dt);if(!pedestrian&&!leader&&v.wait===0)v.distance+=v.speed*dt;
  v.root.position.set(p.x,.12,p.z);v.root.rotation.y=Math.atan2(-tangent.x,-tangent.z);
 }},snapshot(){return vehicles.map(v=>({bus:v.bus,x:v.root.position.x,z:v.root.position.z,distance:v.distance,waiting:v.wait>0}));}};
}
