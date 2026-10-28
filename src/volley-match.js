import * as T from 'three';
import {createCharacter,DEFAULT_APPEARANCE,residentAppearance} from './student-character.js';
import {createMatch,step,COURT,BALL_R,sideOf} from './volley-sim.js';
import {botInputs} from './volley-bots.js';
import './sports-match.css';
import {createCounterMission} from './quests.js';

// Vôlei 3x3: ao contrário do basquete/futebol (câmera lateral acompanhando a jogada), aqui a câmera
// fica fixa atrás da linha de fundo do time do aluno, de frente para a rede — como pede o esporte.
const TEAM_COLOR=['#2fa36b','#ff8a3d'];
export async function createVolleyMatch({scene,loader,keys,touch,stopMovement,storage,wallet}){
 // Missão "contador" (sistema genérico de missões): o primeiro ponto do time do aluno dá moedas e uma insígnia.
 const firstPoint=createCounterMission({id:'volei-primeiro-ponto',target:1,coinsOnComplete:20,badge:'Primeiro Ponto'},storage,wallet);
 const $=s=>document.querySelector(s);
 const ballFile=await loader.loadAsync('/models/sports/volleyball.glb');
 const bounds=new T.Box3().setFromObject(ballFile.scene),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
 const scale=BALL_R*2/Math.max(size.x,size.y,size.z);ballFile.scene.scale.multiplyScalar(scale);ballFile.scene.position.copy(center).multiplyScalar(-scale);
 const ballRoot=new T.Group();ballRoot.add(ballFile.scene);ballFile.scene.traverse(o=>{if(o.isMesh)o.castShadow=true;});scene.add(ballRoot);ballRoot.visible=false;
 const roster=[];
 for(let team=0;team<2;team++)for(let slot=0;slot<3;slot++){
  const diversity=residentAppearance(team*6+slot*2+3).look;
  const char=await createCharacter(loader,'match',1.72+slot*.04);
  char.setAppearance({...DEFAULT_APPEARANCE,...diversity,shirt:TEAM_COLOR[team],accent:'#ffffff',pants:'#2b2f3a',shoes:'#ffffff',accessory:'none',glasses:'none',hearing:'none',mobility:'none'});
  scene.add(char.visual);char.visual.visible=false;roster.push(char);
 }
 const camera=new T.PerspectiveCamera(50,innerWidth/innerHeight,.1,100);
 const panel=document.createElement('section');panel.className='sports-match';panel.id='volley-match';panel.hidden=true;panel.setAttribute('aria-label','Partida de vôlei 3x3');
 panel.innerHTML=`<div class="sports-scoreboard"><span class="sports-team" id="volley-team0"></span><span id="volley-clock">3:00</span><span class="sports-team" id="volley-team1"></span></div>
 <p class="sports-banner" id="volley-banner" role="status" aria-live="polite"></p>
 <div class="sports-controls"><button id="volley-hit">Rebater/Sacar · Espaço</button><button id="volley-leave">Sair da partida · Esc</button></div>`;
 document.body.append(panel);$('#volley-team0').textContent='Verde (você)';$('#volley-team1').textContent='Laranja';
 let match=null,active=false,hitHeld=false,endTimer=0;
 function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();
 function humanInput(){
  // De frente para a rede: D/direita e S/baixo têm o mesmo sentido do eixo do mundo usado pela câmera fixa.
  const mz=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'))+touch.x;
  const mx=-(Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'))+touch.y);
  return {mx,mz,hit:hitHeld};
 }
 function banner(text,ms=1400){$('#volley-banner').textContent=text;if(ms){clearTimeout(banner.t);banner.t=setTimeout(()=>{if($('#volley-banner').textContent===text)$('#volley-banner').textContent='';},ms);}}
 function onEvents(events){
  for(const e of events){
   if(e.type==='point'){banner((e.team===0?'VERDE':'LARANJA')+' ganhou o ponto!'+(e.out?' (bola fora)':''));if(e.team===0&&firstPoint.progress())setTimeout(()=>banner('Missão: Primeiro Ponto · +20 moedas 🏅',2200),1600);}
   else if(e.type==='over')banner(match.score[0]===match.score[1]?'Empate!':(match.score[0]>match.score[1]?'VERDE':'LARANJA')+' venceu! '+match.score[0]+' × '+match.score[1],99999);
  }
 }
 function syncVisual(dt){
  for(let i=0;i<roster.length;i++){
   const p=match.players[i],char=roster[i];
   char.visual.position.set(p.x,0,p.z);char.visual.rotation.y=p.face+Math.PI;
   char.update(dt,{speed:Math.hypot(p.vx,p.vz),airborne:p.jump>0.02,throwing:p.jump>.3});
  }
  const b=match.ball;ballRoot.position.set(b.x,b.y,b.z);ballRoot.rotation.x+=dt*2.2;
  $('#volley-clock').textContent=Math.floor(match.clock/60)+':'+String(Math.floor(match.clock%60)).padStart(2,'0');
  $('#volley-team0').textContent='Verde (você) · '+match.score[0];$('#volley-team1').textContent='Laranja · '+match.score[1];
  // Câmera fixa atrás da linha de fundo do time do aluno (time 0), olhando através da rede.
  const side=sideOf(0),behind=COURT.netX+side*11;
  camera.position.set(behind,5.4,76);camera.lookAt(COURT.netX,1.9,T.MathUtils.clamp(b.z,COURT.minZ+1,COURT.maxZ-1));
 }
 function update(dt){if(!active)return;
  if(match.phase==='over'){endTimer+=dt;if(endTimer>4.5){leave();return;}syncVisual(dt);return;}
  const inputs=botInputs(match);inputs[0]=humanInput();onEvents(step(match,inputs,Math.min(dt,.05)));syncVisual(dt);
 }
 function start(){
  if(active)return;active=true;match=createMatch({seed:(Math.random()*1e9)|0,humans:[0],duration:180,target:11});
  stopMovement();roster.forEach(c=>c.visual.visible=true);ballRoot.visible=true;panel.hidden=false;document.body.classList.add('volley-active');
  banner('Saque! Segure Espaço para sacar e rebater. Use o movimento para mirar.',3200);endTimer=0;
 }
 function leave(){if(!active)return;active=false;roster.forEach(c=>c.visual.visible=false);ballRoot.visible=false;panel.hidden=true;document.body.classList.remove('volley-active');clearTimeout(banner.t);}
 $('#volley-leave').onclick=leave;
 const hitBtn=$('#volley-hit');hitBtn.onpointerdown=e=>{e.preventDefault();try{hitBtn.setPointerCapture(e.pointerId);}catch{}hitHeld=true;};hitBtn.onpointerup=hitBtn.onpointercancel=()=>hitHeld=false;
 addEventListener('keydown',e=>{if(!active||e.target instanceof HTMLButtonElement)return;if(e.code==='Escape'){e.preventDefault();leave();}else if(e.code==='Space'){e.preventDefault();e.stopPropagation();hitHeld=true;}},true);
 addEventListener('keyup',e=>{if(!active)return;if(e.code==='Space')hitHeld=false;},true);
 addEventListener('blur',()=>{hitHeld=false;});
 return {start,leave,update,get active(){return active;},get camera(){return camera;},get score(){return match?.score;}};
}
