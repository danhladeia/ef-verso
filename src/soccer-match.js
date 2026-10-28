import * as T from 'three';
import {createCharacter,DEFAULT_APPEARANCE,residentAppearance} from './student-character.js';
import {createMatch,step,FIELD,BALL_R} from './soccer-sim.js';
import {botInputs} from './soccer-bots.js';
import './sports-match.css';
import {createCounterMission} from './quests.js';

// Futebol 3x3 jogável no Campo de Futebol: câmera lateral de transmissão (estilo FIFA), botões de
// Chutar e Passar. Mesma arquitetura do basquete: a física (soccer-sim.js) só recebe entradas por
// jogador, pronta para humanos, bots ou jogadores remotos.
const TEAM_COLOR=['#2fa36b','#ff8a3d'];
export async function createSoccerMatch({scene,loader,keys,touch,stopMovement,storage,wallet}){
 // Missão "contador" (sistema genérico de missões): o primeiro gol do aluno dá moedas e uma insígnia.
 const firstGoal=createCounterMission({id:'futebol-primeiro-gol',target:1,coinsOnComplete:20,badge:'Primeiro Gol'},storage,wallet);
 const $=s=>document.querySelector(s);
 const ballFile=await loader.loadAsync('/models/sports/soccer-ball.glb');
 const bounds=new T.Box3().setFromObject(ballFile.scene),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
 const scale=BALL_R*2/Math.max(size.x,size.y,size.z);ballFile.scene.scale.multiplyScalar(scale);ballFile.scene.position.copy(center).multiplyScalar(-scale);
 const ballRoot=new T.Group();ballRoot.add(ballFile.scene);ballFile.scene.traverse(o=>{if(o.isMesh)o.castShadow=true;});scene.add(ballRoot);ballRoot.visible=false;
 const roster=[];
 for(let team=0;team<2;team++)for(let slot=0;slot<3;slot++){
  const diversity=residentAppearance(team*5+slot*4+1).look;
  const char=await createCharacter(loader,'match',1.72+slot*.04);
  char.setAppearance({...DEFAULT_APPEARANCE,...diversity,shirt:TEAM_COLOR[team],accent:'#ffffff',pants:team===0?'#1d5c3a':'#7a3a12',shoes:'#ffffff',accessory:'none',glasses:'none',hearing:'none',mobility:'none'});
  scene.add(char.visual);char.visual.visible=false;roster.push(char);
 }
 const camera=new T.PerspectiveCamera(50,innerWidth/innerHeight,.1,160);
 const panel=document.createElement('section');panel.className='sports-match';panel.id='soccer-match';panel.hidden=true;panel.setAttribute('aria-label','Partida de futebol 3x3');
 panel.innerHTML=`<div class="sports-scoreboard"><span class="sports-team" id="soccer-team0"></span><span id="soccer-clock">2:30</span><span class="sports-team" id="soccer-team1"></span></div>
 <p class="sports-banner" id="soccer-banner" role="status" aria-live="polite"></p>
 <div class="power-meter" id="soccer-power" hidden><span class="power-fill" id="soccer-power-fill"></span></div>
 <div class="sports-controls"><button id="soccer-shoot">Chutar · Espaço</button><button id="soccer-pass">Passar/Desarmar · E</button><button id="soccer-leave">Sair da partida · Esc</button></div>`;
 document.body.append(panel);$('#soccer-team0').textContent='Verde (você)';$('#soccer-team1').textContent='Laranja';
 let match=null,active=false,shootHeld=false,passHeld=false,endTimer=0;
 function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();
 function humanInput(){
  const sx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'))+touch.x;
  const sz=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'))+touch.y;
  return {mx:sx,mz:sz,sprint:keys.has('shift'),shoot:shootHeld,pass:passHeld};
 }
 function banner(text,ms=1500){$('#soccer-banner').textContent=text;if(ms){clearTimeout(banner.t);banner.t=setTimeout(()=>{if($('#soccer-banner').textContent===text)$('#soccer-banner').textContent='';},ms);}}
 function onEvents(events){
  for(const e of events){
   if(e.type==='goal'){banner((e.team===0?'VERDE':'LARANJA')+' marcou um gol!');if(e.team===0&&e.id===0&&firstGoal.progress())setTimeout(()=>banner('Missão: Primeiro Gol · +20 moedas 🏅',2200),1600);}
   else if(e.type==='tackle'&&e.id===0)banner('Você desarmou!',1000);
   else if(e.type==='intercept'&&e.id===0)banner('Interceptação!',1000);
   else if(e.type==='over')banner(match.score[0]===match.score[1]?'Empate!':(match.score[0]>match.score[1]?'VERDE':'LARANJA')+' venceu! '+match.score[0]+' × '+match.score[1],99999);
  }
 }
 function syncVisual(dt){
  for(let i=0;i<roster.length;i++){
   const p=match.players[i],char=roster[i];
   char.visual.position.set(p.x,0,p.z);char.visual.rotation.y=p.face+Math.PI;
   const holding=match.ball.holder===p.id;
   char.update(dt,{speed:Math.hypot(p.vx,p.vz),holding:holding&&(p.charging||p.release>0),throwing:p.release>0,charge:p.charge});
  }
  const b=match.ball;ballRoot.position.set(b.x,b.y,b.z);if(b.holder==null)ballRoot.rotation.x+=dt*Math.hypot(b.vx,b.vz)*.9;
  $('#soccer-clock').textContent=Math.floor(match.clock/60)+':'+String(Math.floor(match.clock%60)).padStart(2,'0');
  $('#soccer-team0').textContent='Verde (você) · '+match.score[0];$('#soccer-team1').textContent='Laranja · '+match.score[1];
  const human=match.players[0];
  if(human.charging){$('#soccer-power').hidden=false;$('#soccer-power-fill').style.width=(human.charge*100).toFixed(0)+'%';}
  else $('#soccer-power').hidden=true;
  const tx=T.MathUtils.clamp(b.x,FIELD.minX+1,FIELD.maxX-1),tz=T.MathUtils.clamp(b.z,FIELD.minZ+4,FIELD.maxZ-4);
  const desired=new T.Vector3(tx+13,9,tz),look=new T.Vector3(tx,1.2,tz);
  camera.position.lerp(desired,1-Math.exp(-3*dt));camera.lookAt(look);
 }
 function update(dt){if(!active)return;
  if(match.phase==='over'){endTimer+=dt;if(endTimer>4.5){leave();return;}syncVisual(dt);return;}
  const inputs=botInputs(match,{skill:.5});inputs[0]=humanInput();onEvents(step(match,inputs,Math.min(dt,.05)));syncVisual(dt);
 }
 function start(){
  if(active)return;active=true;match=createMatch({seed:(Math.random()*1e9)|0,humans:[0],duration:150});
  stopMovement();roster.forEach(c=>c.visual.visible=true);ballRoot.visible=true;panel.hidden=false;document.body.classList.add('soccer-active');
  banner('Bola rolando! Use WASD para correr com a bola e Espaço para chutar.',3000);endTimer=0;
 }
 function leave(){if(!active)return;active=false;roster.forEach(c=>c.visual.visible=false);ballRoot.visible=false;panel.hidden=true;document.body.classList.remove('soccer-active');clearTimeout(banner.t);}
 $('#soccer-leave').onclick=leave;
 const shoot=$('#soccer-shoot');shoot.onpointerdown=e=>{e.preventDefault();try{shoot.setPointerCapture(e.pointerId);}catch{}shootHeld=true;};shoot.onpointerup=shoot.onpointercancel=()=>shootHeld=false;
 const pass=$('#soccer-pass');pass.onpointerdown=e=>{e.preventDefault();passHeld=true;};pass.onpointerup=pass.onpointercancel=()=>passHeld=false;
 addEventListener('keydown',e=>{if(!active||e.target instanceof HTMLButtonElement)return;if(e.code==='Escape'){e.preventDefault();leave();}else if(e.code==='Space'){e.preventDefault();e.stopPropagation();shootHeld=true;}else if(e.key.toLowerCase()==='e'){e.preventDefault();passHeld=true;}},true);
 addEventListener('keyup',e=>{if(!active)return;if(e.code==='Space')shootHeld=false;if(e.key.toLowerCase()==='e')passHeld=false;},true);
 addEventListener('blur',()=>{shootHeld=passHeld=false;});
 return {start,leave,update,get active(){return active;},get camera(){return camera;},get score(){return match?.score;}};
}
