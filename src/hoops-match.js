import * as T from 'three';
import {createCharacter,DEFAULT_APPEARANCE,residentAppearance} from './student-character.js';
import {createMatch,step,HOOPS,COURT,BALL_R} from './hoops-sim.js';
import {botInputs} from './hoops-bots.js';
import './sports-match.css';

// Partida de basquete 3x3 jogável, com 5 bots, dentro da Quadra de Basquete da cidade.
// Reaproveita a física e a IA de hoops-sim.js/hoops-bots.js (preparadas para multijogador: cada
// jogador só recebe {mx,mz,sprint,shoot,pass}); por enquanto, o único humano é o aluno e os outros 5 são bots.
const TEAM_COLOR=['#2fa36b','#ff8a3d'],TEAM_LABEL=['Verde','Laranja'];
export async function createHoopsMatch({scene,loader,progress,keys,touch,stopMovement}){
 const $=s=>document.querySelector(s);
 const ballFile=await loader.loadAsync('/models/sports/basketball.glb');
 const bounds=new T.Box3().setFromObject(ballFile.scene),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
 const scale=BALL_R*2/Math.max(size.x,size.y,size.z);ballFile.scene.scale.multiplyScalar(scale);ballFile.scene.position.copy(center).multiplyScalar(-scale);
 const ballRoot=new T.Group();ballRoot.add(ballFile.scene);ballFile.scene.traverse(o=>{if(o.isMesh)o.castShadow=true;});scene.add(ballRoot);ballRoot.visible=false;
 // Seis personagens (3 por time); o slot 0 do time 0 é o aluno.
 const roster=[];
 for(let team=0;team<2;team++)for(let slot=0;slot<3;slot++){
  const diversity=residentAppearance(team*7+slot*3).look;
  const char=await createCharacter(loader,'match',1.72+slot*.04);
  char.setAppearance({...DEFAULT_APPEARANCE,...diversity,shirt:TEAM_COLOR[team],accent:'#ffffff',pants:'#283a5c',shoes:'#ffffff',accessory:'none',glasses:'none',hearing:'none',mobility:'none'});
  scene.add(char.visual);char.visual.visible=false;roster.push(char);
 }
 // Seta flutuando sobre o aluno (slot 0 do time 0): sem ela, os 6 personagens — mesma estatura, times
 // só diferentes de cor — ficam difíceis de distinguir qual é "o seu" para movimentar. Fica no ar
 // (não gruda nos pés) para não ficar escondida atrás de outro jogador por perto.
 const youMarker=new T.Mesh(new T.ConeGeometry(.22,.4,4),new T.MeshBasicMaterial({color:'#fff23d'}));
 youMarker.rotation.x=Math.PI;youMarker.rotation.y=Math.PI/4;youMarker.renderOrder=5;youMarker.visible=false;scene.add(youMarker);
 const camera=new T.PerspectiveCamera(48,innerWidth/innerHeight,.1,160);
 const panel=document.createElement('section');panel.id='hoops-match';panel.className='sports-match';panel.hidden=true;panel.setAttribute('aria-label','Partida de basquete 3x3');
 panel.innerHTML=`<div class="sports-scoreboard" id="hoops-scoreboard"><span class="sports-team" id="hoops-team0"></span><span id="hoops-clock">3:00</span><span class="sports-team" id="hoops-team1"></span></div>
 <p class="sports-banner" id="hoops-banner" role="status" aria-live="polite"></p>
 <div class="power-meter" id="hoops-power" hidden><span class="power-fill" id="hoops-power-fill"></span></div>
 <div class="sports-controls" id="hoops-controls"><button id="hoops-shoot">Arremessar/Pular · Espaço</button><button id="hoops-pass">Passar/Roubar · E</button><button id="hoops-leave">Sair da partida · Esc</button></div>`;
 document.body.append(panel);
 $('#hoops-team0').textContent='Verde (você)';$('#hoops-team1').textContent='Laranja';
 let match=null,active=false,shootHeld=false,passHeld=false,endTimer=0;
 function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();
 function humanInput(){
  const sx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'))+touch.x;
  const sy=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'))+touch.y;
  // Câmera de transmissão lateral: D/direita move para +x (ao longo da quadra), S/baixo move para +z (para a câmera).
  return {mx:sx,mz:sy,sprint:keys.has('shift'),shoot:shootHeld,pass:passHeld};
 }
 function banner(text,ms=1600){$('#hoops-banner').textContent=text;if(ms){clearTimeout(banner.t);banner.t=setTimeout(()=>{if($('#hoops-banner').textContent===text)$('#hoops-banner').textContent='';},ms);}}
 function onEvents(events){
  for(const e of events){
   if(e.type==='score'){banner((e.team===0?'VERDE':'LARANJA')+' marcou '+e.points+'!');
    if(e.id===0&&progress.state.stage==='court')progress.dispatch({type:'shot',scored:true});}
   else if(e.type==='miss'&&e.id===0&&progress.state.stage==='court')progress.dispatch({type:'shot',scored:false});
   else if(e.type==='steal'&&e.id===0)banner('Você roubou a bola!',1100);
   else if(e.type==='intercept'&&e.id===0)banner('Interceptação!',1100);
   else if(e.type==='over')banner(match.score[0]===match.score[1]?'Empate!':(match.score[0]>match.score[1]?'VERDE':'LARANJA')+' venceu! '+match.score[0]+' × '+match.score[1],99999);
  }
 }
 function syncVisual(dt){
  for(let i=0;i<roster.length;i++){
   const p=match.players[i],char=roster[i];
   char.visual.position.set(p.x,0,p.z);char.visual.rotation.y=p.face+Math.PI;
   const holding=match.ball.holder===p.id;
   char.update(dt,{speed:Math.hypot(p.vx,p.vz),airborne:p.jump>0.02,holding:holding&&(p.charging||p.release>0),throwing:p.throwing>0,charge:p.charge});
   if(i===0)youMarker.position.set(p.x,1.9+Math.sin(performance.now()/420)*.1,p.z);
  }
  const b=match.ball;ballRoot.position.set(b.x,b.y,b.z);if(b.holder==null)ballRoot.rotation.x+=dt*Math.hypot(b.vx,b.vz)*1.2;
  $('#hoops-clock').textContent=Math.floor(match.clock/60)+':'+String(Math.floor(match.clock%60)).padStart(2,'0');
  $('#hoops-team0').textContent='Verde (você) · '+match.score[0];$('#hoops-team1').textContent='Laranja · '+match.score[1];
  const human=match.players[0];
  if(human.charging){$('#hoops-power').hidden=false;$('#hoops-power-fill').style.width=(human.charge*100).toFixed(0)+'%';}
  else $('#hoops-power').hidden=true;
  // Câmera de transmissão: acompanha a bola ao longo da quadra, vista da lateral.
  const tx=T.MathUtils.clamp(b.x,COURT.minX+3,COURT.maxX-3),tz=T.MathUtils.clamp(b.z*.5,-3,3);
  const desired=new T.Vector3(tx,9.5,17+Math.abs(tz)*.3),look=new T.Vector3(tx,1.4,tz*.4);
  camera.position.lerp(desired,1-Math.exp(-3*dt));camera.lookAt(look);
 }
 function update(dt){if(!active)return;
  if(match.phase==='over'){endTimer+=dt;if(endTimer>4.5){leave();return;}syncVisual(dt);return;}
  const inputs=botInputs(match,{skill:.5});inputs[0]=humanInput();
  onEvents(step(match,inputs,Math.min(dt,.05)));syncVisual(dt);
 }
 function start(){
  if(active)return;active=true;match=createMatch({seed:(Math.random()*1e9)|0,humans:[0],duration:180,target:11});
  stopMovement();roster.forEach(c=>c.visual.visible=true);ballRoot.visible=true;youMarker.visible=true;panel.hidden=false;document.body.classList.add('hoops-active');
  banner('Bola ao alto! Fique de frente para a cesta e segure Espaço para arremessar.',3200);endTimer=0;
 }
 function leave(){if(!active)return;active=false;roster.forEach(c=>c.visual.visible=false);ballRoot.visible=false;youMarker.visible=false;panel.hidden=true;document.body.classList.remove('hoops-active');clearTimeout(banner.t);}
 $('#hoops-leave').onclick=leave;
 const shoot=$('#hoops-shoot');shoot.onpointerdown=e=>{e.preventDefault();try{shoot.setPointerCapture(e.pointerId);}catch{}shootHeld=true;};shoot.onpointerup=shoot.onpointercancel=()=>shootHeld=false;
 const pass=$('#hoops-pass');pass.onpointerdown=e=>{e.preventDefault();passHeld=true;};pass.onpointerup=pass.onpointercancel=()=>passHeld=false;
 addEventListener('keydown',e=>{if(!active||e.target instanceof HTMLButtonElement)return;if(e.code==='Escape'){e.preventDefault();leave();}else if(e.code==='Space'){e.preventDefault();e.stopPropagation();shootHeld=true;}else if(e.key.toLowerCase()==='e'){e.preventDefault();passHeld=true;}},true);
 addEventListener('keyup',e=>{if(!active)return;if(e.code==='Space')shootHeld=false;if(e.key.toLowerCase()==='e')passHeld=false;},true);
 addEventListener('blur',()=>{shootHeld=passHeld=false;});
 return {start,leave,update,get active(){return active;},get camera(){return camera;},get score(){return match?.score;}};
}
