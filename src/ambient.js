import * as T from 'three';

// Vida na Praça Central: pombos que ciscam perto do chafariz e voam quando alguém se aproxima.
const SPOTS=[[-6.2,-1.5],[-5.8,2.4],[5.9,-2.6],[6.4,1.1],[-1.8,6.1],[2.2,-6.3],[1.1,6.6],[-2.6,-6]];
export async function createAmbient({scene,loader}){
 const file=await loader.loadAsync('/models/props/pombo.glb'),group=new T.Group();group.name='Pombos';group.userData.crowd=true;scene.add(group);
 const birds=SPOTS.map(([x,z],i)=>{
  const o=file.scene.clone(true);o.scale.setScalar(1.3);o.position.set(x,.14,z);o.rotation.y=i*1.7;group.add(o);
  return {o,home:new T.Vector3(x,.14,z),phase:i*.9,flying:0,away:new T.Vector3(Math.cos(i*2.1)*14,7+i%3*2,Math.sin(i*2.1)*14)};
 });
 function update(dt,player){
  for(const b of birds){
   const near=Math.hypot(player.x-b.home.x,player.z-b.home.z)<3.2;
   if(near&&!b.flying)b.flying=.001;
   if(b.flying){
    b.flying+=dt;const t=Math.min(1,b.flying/2.2),back=b.flying>9?Math.min(1,(b.flying-9)/2.5):0,k=t*(1-back);
    b.o.position.lerpVectors(b.home,b.away,k);b.o.position.y=b.home.y+Math.sin(k*Math.PI/2)*b.away.y;b.o.rotation.z=Math.sin(b.flying*30)*.25*k;
    if(back>=1&&!near){b.flying=0;b.o.position.copy(b.home);b.o.rotation.z=0;}
   }else{
    // Ciscando: inclina para a frente e gira devagar.
    b.phase+=dt;b.o.rotation.x=Math.max(0,Math.sin(b.phase*3.1))*.45;b.o.rotation.y+=Math.sin(b.phase*.7)*dt*.6;
   }
  }
 }
 return {group,update};
}
