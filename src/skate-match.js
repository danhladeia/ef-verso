import * as T from 'three';
import {createCharacter} from './student-character.js';
import {terrainHeight,createSkateRide} from './skate-sim.js';
import './sports-match.css';

// Andar de skate na pista da Aventura Urbana: o aluno (com a própria aparência) anda sobre o relevo
// real da pista — desce e sobe o bowl, a mini-rampa e os quarter pipes com física de verdade
// (skate-sim.js), e pode saltar (ollie) para vencer a borda das rampas. Câmera própria, em 3ª pessoa,
// igual na ideia às outras partidas (futebol, vôlei, basquete), mas sem bots: é um passeio livre.
export async function createSkateMatch({scene,loader,keys,touch,stopMovement,center,setMainAvatarVisible=()=>{}}){
 const $=s=>document.querySelector(s);
 const rider=await createCharacter(loader,'student');scene.add(rider.visual);rider.visual.visible=false;
 const boardFile=await loader.loadAsync('/models/skate/skateboard.glb'),board=boardFile.scene;
 const bounds=new T.Box3().setFromObject(board),size=bounds.getSize(new T.Vector3());
 const scale=.78/Math.max(size.x,size.z);board.scale.multiplyScalar(scale);board.position.sub(bounds.getCenter(new T.Vector3()).multiplyScalar(scale));
 board.traverse(o=>{if(o.isMesh)o.castShadow=true;});rider.visual.add(board);board.position.y+=.06;
 const camera=new T.PerspectiveCamera(55,innerWidth/innerHeight,.1,120);
 const panel=document.createElement('section');panel.className='sports-match';panel.id='skate-match';panel.hidden=true;panel.setAttribute('aria-label','Andar de skate');
 panel.innerHTML=`<p class="sports-banner" id="skate-banner" role="status" aria-live="polite"></p>
 <div class="sports-controls"><span>WASD/joystick: andar e virar · Espaço: ollie (salta a borda)</span><button id="skate-leave">Descer do skate · Esc</button></div>`;
 document.body.append(panel);
 let ride=null,active=false,yaw=0,camYaw=0,first=true;
 function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();
 function banner(text,ms=2200){$('#skate-banner').textContent=text;if(ms){clearTimeout(banner.t);banner.t=setTimeout(()=>{if($('#skate-banner').textContent===text)$('#skate-banner').textContent='';},ms);}}
 function input(){
  const sx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'))+touch.x;
  const sy=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'))+touch.y;
  return {forward:-sy,turn:sx,jump:keys.has(' ')};
 }
 function update(dt){if(!active)return;
  const s=ride.update(Math.min(dt,.05),input());
  yaw+=Math.atan2(Math.sin(s.yaw-yaw),Math.cos(s.yaw-yaw))*Math.min(1,dt*8);
  rider.visual.position.set(center.x+s.x,s.height,center.z+s.z);rider.visual.rotation.y=yaw+Math.PI;
  rider.update(dt,{speed:Math.abs(s.speed),airborne:s.airborne||s.onLip});
  if(s.onLip&&!s.airborne)banner('Precisa de um salto (Espaço) para vencer essa borda!',900);
  camYaw+=Math.atan2(Math.sin(s.yaw-camYaw),Math.cos(s.yaw-camYaw))*Math.min(1,dt*3);
  const back=new T.Vector3(Math.sin(camYaw),0,Math.cos(camYaw)),pivot=rider.visual.position.clone().add(new T.Vector3(0,1.1,0));
  const desired=pivot.clone().addScaledVector(back,3.4);desired.y+=1.1;
  if(first){camera.position.copy(desired);first=false;}else camera.position.lerp(desired,1-Math.exp(-6*dt));
  camera.lookAt(pivot.clone().addScaledVector(back,-3));
 }
 function start(){
  if(active)return;active=true;stopMovement();setMainAvatarVisible(false);
  ride=createSkateRide({x:16,z:19});yaw=camYaw=0;first=true;
  rider.visual.visible=true;panel.hidden=false;document.body.classList.add('skate-active');
  banner('Desça pelas rampas e use Espaço para saltar as bordas!',3200);
 }
 function leave(){if(!active)return;active=false;rider.visual.visible=false;setMainAvatarVisible(true);panel.hidden=true;document.body.classList.remove('skate-active');clearTimeout(banner.t);}
 $('#skate-leave').onclick=leave;
 addEventListener('keydown',e=>{if(!active||e.target instanceof HTMLButtonElement)return;if(e.code==='Escape'){e.preventDefault();leave();}},true);
 return {start,leave,update,get active(){return active;},get camera(){return camera;},_terrainHeight:terrainHeight,_ride:()=>ride};
}
