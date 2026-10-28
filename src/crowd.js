import * as T from 'three';
import {createCharacter,residentAppearance} from './student-character.js';

const neighborhoods=[
 {name:'Praça',points:[[-7,10],[-7,-10],[7,-10],[7,10]],people:['Ana','Bruno','Sofia','Caio'],line:'Vamos explorar? A escola fica ao norte da praça. A professora Lia está esperando por você.'},
 {name:'Escola',points:[[-8,-17],[0,-17],[8,-17]],people:['Luiza','Pedro'],line:'Gosto de experimentar atividades diferentes. Você já conversou com a professora Lia?'},
 {name:'Parque',points:[[-39,15],[-32,16],[-24,16]],people:['Marina','Davi'],line:'Brincar em grupo fica mais divertido quando todo mundo pode participar.'},
 {name:'Ginásio',points:[[18,40],[26,40],[35,40]],people:['Bia','Rafael'],line:'O ginásio é um ponto de encontro. O treino de basquete já está disponível na quadra perto da praça.'},
 {name:'Feira',points:[[-84,14],[-73,14],[-63,14]],people:['Rosa','Miguel'],line:'Bem-vindo à feira! Explore as barracas e aproveite o passeio pela cidade.'},
 {name:'Museu',points:[[65,14],[74,14],[84,14]],people:['Joana','André'],line:'Cada esporte tem uma história. O museu ainda está preparando suas exposições.'},
 {name:'Dança',points:[[63,-61],[73,-61],[83,-61]],people:['Lara','Vitor'],line:'Dançar é experimentar movimentos e ritmos. Esta praça é o nosso espaço de encontro.'},
 {name:'Saúde',points:[[-33,83],[-23,83],[-13,83]],people:['Clara','Lucas'],line:'Encontre um ritmo confortável para explorar a cidade. Também vale fazer uma pausa.'},
 {name:'Skate',points:[[-116,12],[-116,20],[-116,28]],people:['Iara','Theo'],line:'O skatepark tem rampas e corrimãos para conhecer. As manobras ainda estão em desenvolvimento.'},
 {name:'Residencial',points:[[-10,-78],[0,-78],[10,-78]],people:['Nina','Enzo'],line:'Este é o nosso bairro. Pelas ruas você chega aos outros espaços da cidade.'},
 {name:'Vôlei',points:[[14,62],[23,62],[32,62]],people:['Cecília','Otávio'],line:'Uma boa equipe abre espaço para todos. Você já conheceu as outras quadras?'}
];

export async function createCrowd({scene,loader,navigation,compact=false}){
 const group=new T.Group();group.name='Moradores';group.userData.crowd=true;scene.add(group);
 const residents=[];let serial=0;
 function safePoint([x,z]){for(let r=0;r<=5;r++)for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++)if(!navigation.blocked(x+dx,z+dz))return {x:x+dx,z:z+dz};return null;}
 for(const area of neighborhoods){const points=area.points.map(safePoint).filter(Boolean);if(points.length<2)continue;
  for(const name of (compact?[area.people[neighborhoods.indexOf(area)%2]]:area.people)){const index=serial++,{adult,look}=residentAppearance(index),actor=await createCharacter(loader,'resident',adult?1.9+(index%3)*.05:1.5+(index%4)*.05);
   actor.setAppearance(look);
   const waypoint=index%points.length,p=points[waypoint];actor.visual.position.set(p.x,0,p.z);actor.visual.name=name;group.add(actor.visual);
   const resident={id:index,name,area:area.name,line:area.line,actor,points,waypoint,path:[],wait:(index%4)*.6+.2,speed:1.25+(index%3)*.18,animationTime:0,travelled:0};residents.push(resident);
   actor.update(0);
  }
 }
 const direction=new T.Vector3();
 function update(dt,observer,{paused=false,overview=false}={}){
  for(const r of residents){const v=r.actor.visual,distance=Math.hypot(v.position.x-observer.x,v.position.z-observer.z);v.visible=overview||distance<65;if(paused||document.hidden)continue;
   let moved=0;r.wait=Math.max(0,r.wait-dt);
   if(r.wait===0&&!r.path.length){r.waypoint=(r.waypoint+1)%r.points.length;r.path=navigation.route(v.position,r.points[r.waypoint]);if(!r.path.length)r.wait=2;}
   if(r.path.length&&r.wait===0&&distance>1.6){const target=r.path[0];direction.set(target.x-v.position.x,0,target.z-v.position.z);const length=direction.length(),step=Math.min(r.speed*dt,length);
    if(length<.06){r.path.shift();if(!r.path.length)r.wait=2+(r.id%4);}else{direction.multiplyScalar(1/length);const x=v.position.x+direction.x*step,z=v.position.z+direction.z*step;
     const occupied=residents.some(other=>other!==r&&Math.hypot(x-other.actor.visual.position.x,z-other.actor.visual.position.z)<.65);
     if(!occupied&&!navigation.blocked(x,z)){v.position.set(x,0,z);const angle=Math.atan2(-direction.x,-direction.z);v.rotation.y+=Math.atan2(Math.sin(angle-v.rotation.y),Math.cos(angle-v.rotation.y))*Math.min(1,dt*10);moved=step;r.travelled+=step;}
     else {r.wait=.6;r.path=[];}
    }
   }
   r.animationTime+=dt;if(v.visible&&(distance<28||r.animationTime>.12)){r.actor.update(r.animationTime,{speed:moved>0?r.speed:0});r.animationTime=0;}
  }
 }
 function nearby(position){return residents.filter(r=>Math.hypot(r.actor.visual.position.x-position.x,r.actor.visual.position.z-position.z)<2.6).sort((a,b)=>a.actor.visual.position.distanceToSquared(position)-b.actor.visual.position.distanceToSquared(position))[0];}
 return {group,update,nearby,positions(){return residents.map(r=>({x:r.actor.visual.position.x,z:r.actor.visual.position.z,r:.35}));},get count(){return residents.length;},talk(r){r.wait=5;return {name:r.name+' · '+r.area,text:r.line};},snapshot(){return residents.map(r=>({name:r.name,area:r.area,body:r.actor.appearance.body,x:r.actor.visual.position.x,z:r.actor.visual.position.z,travelled:r.travelled,blocked:navigation.blocked(r.actor.visual.position.x,r.actor.visual.position.z),visible:r.actor.visual.visible,animation:r.actor.state}));}};
}
