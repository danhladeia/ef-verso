import * as T from 'three';
import {createCharacter,THROW} from './student-character.js';
import {SHOT,throwShot,idealPower,shotPosition,rimCrossing} from './basketball.js';
import './mission.css';

const COURT={minX:15,maxX:39.5,minZ:-8.5,maxZ:8.5},RIM=.3;
export async function createMission({scene,loader,player,solids,hoop,progress,wallet,goTo,stopMovement,handPosition,rightHand=handPosition,onPractice=()=>{}}){
 const $=s=>document.querySelector(s);
 const [teacher,ballFile]=await Promise.all([createCharacter(loader,'teacher',2.05),loader.loadAsync('/models/sports/basketball.glb')]);
 teacher.visual.position.set(3,.12,-18);teacher.visual.rotation.y=Math.PI;scene.add(teacher.visual);solids.push({x:3,z:-18,w:.65,d:.65,kind:'teacher'});
 const ball=ballFile.scene,bounds=new T.Box3().setFromObject(ball),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
 const scale=.34/Math.max(size.x,size.y,size.z);ball.scale.multiplyScalar(scale);ball.position.copy(center).multiplyScalar(-scale);
 const ballRoot=new T.Group();ballRoot.add(ball);scene.add(ballRoot);ball.traverse(o=>{if(o.isMesh)o.castShadow=true;});
 const marker=new T.Mesh(new T.RingGeometry(.9,1.05,40),new T.MeshBasicMaterial({color:'#ffc933',side:T.DoubleSide}));marker.rotation.x=-Math.PI/2;marker.position.set(0,.21,-17);scene.add(marker);
 const card=document.createElement('section');card.id='mission-card';card.setAttribute('aria-label','Missão atual');
 card.innerHTML='<small>MISSÃO 01 · PRIMEIRAS CESTAS</small><h2 id="mission-title"></h2><p id="mission-objective"></p><button id="mission-go"></button><div class="mission-wallet" id="mission-wallet"></div><div id="save-notice"></div>';
 $('#progress').after(card);document.body.classList.add('has-mission');
 const dialog=document.createElement('dialog');dialog.id='mission-dialog';dialog.innerHTML='<small>PROFESSORA LIA</small><h2></h2><p></p><div class="dialog-buttons"><button id="mission-accept"></button><button id="mission-later">Agora não</button></div>';document.body.append(dialog);
 const touchHelp=matchMedia('(pointer:coarse)').matches;
 const panel=document.createElement('section');panel.className='practice-panel';panel.hidden=true;panel.setAttribute('aria-label','Treino de basquete');
 panel.innerHTML=`<h2>Primeiras cestas · <span id="basket-count">0 / 3</span></h2><p>${touchHelp?'Use o controle para andar e virar. Segure o botão para carregar a força e solte para arremessar.':'Ande com W/S, vire com A/D e fique de frente para a cesta. Segure Espaço para carregar a força e solte para arremessar.'}</p>
 <div class="power-meter" id="power-meter" role="meter" aria-label="Força do arremesso" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span class="power-zone" id="power-zone"></span><span class="power-fill" id="power-fill"></span></div>
 <p class="shot-feedback" id="shot-feedback" role="status" aria-live="polite"></p><div class="shot-buttons"><button id="shoot">Segure para arremessar</button><button id="leave-court"></button></div>`;
 document.body.append(panel);
 let practicing=false,shot=null,shotTime=0,resolved=false,throwTime=0,replayHits=0,localAttempts=0,acceptAction=null,charging=false,charge=0,moving=false,dribble=0,result=null,launch=null,landed=null;
 const last=new T.Vector3();
 const state=()=>progress.state;
 const total=()=>state().stage==='complete'?replayHits:state().baskets;
 const school={x:0,z:-17,name:'Professora Lia'},court={x:28,z:3,name:'Quadra de Basquete'};
 function refresh(){
  const s=state(),copy={school:['Converse com a professora','Encontre a professora Lia em frente à escola.','Ir até a escola'],court:['Treino de basquete',`Faça 3 cestas na quadra. Progresso: ${s.baskets} / 3.`,'Ir até a quadra'],return:['Volte à professora','Você acertou as 3 cestas! Volte à escola para receber sua recompensa.','Voltar à escola'],complete:['Missão concluída!','Insígnia Primeiras Cestas conquistada. Você pode continuar treinando.','Treinar novamente']}[s.stage];
  $('#mission-title').textContent=copy[0];$('#mission-objective').textContent=copy[1];$('#mission-go').textContent=copy[2];
  $('#mission-wallet').textContent=`${wallet.coins} moedas${wallet.badges.length?' · 🏅 '+wallet.badges.join(', 🏅 '):''}`;
  $('#save-notice').textContent=progress.saved?'Progresso salvo neste navegador':'Não foi possível salvar; mantenha esta página aberta.';
  marker.position.set(s.stage==='school'||s.stage==='return'?school.x:court.x,.21,s.stage==='school'||s.stage==='return'?school.z:court.z);
 }
 function dispatch(event){progress.dispatch(event);refresh();}
 $('#mission-go').onclick=()=>goTo(state().stage==='school'||state().stage==='return'?school:court);
 function openConversation(){
  stopMovement();const s=state();$('#mission-later').hidden=false;
  if(s.stage==='school'){
   dialog.querySelector('h2').textContent='Vamos às primeiras cestas?';dialog.querySelector('p').textContent='Sou a professora Lia! No basquete, direção e força trabalham juntas. Vá à quadra, pegue a bola e experimente acertar 3 cestas: fique de frente para a cesta e segure o arremesso para dar força. Você pode tentar quantas vezes quiser. Depois, volte para conversar comigo.';
   $('#mission-accept').textContent='Aceitar missão';acceptAction=()=>dispatch({type:'accept'});
  }else if(s.stage==='return'){
   dialog.querySelector('h2').textContent='Você conseguiu!';dialog.querySelector('p').textContent='Você ajustou seus movimentos e acertou 3 cestas. Cada tentativa faz parte da aprendizagem! Receba 100 moedas e a insígnia Primeiras Cestas.';
   $('#mission-accept').textContent='Receber recompensa';acceptAction=()=>{wallet.award(100,'Primeiras Cestas');dispatch({type:'claim'});};
  }else{
   dialog.querySelector('h2').textContent=s.stage==='complete'?'Continue em movimento!':'Uma tentativa de cada vez';dialog.querySelector('p').textContent=s.stage==='complete'?'Sua insígnia já está salva. Você pode explorar a cidade ou repetir o treino de basquete.':'Na quadra, olhe para a cesta e observe a barra de força. Se a bola cair antes do aro, segure mais. Se passar dele, solte antes. Sem limite de tentativas!';
   $('#mission-accept').textContent='Continuar';$('#mission-later').hidden=true;acceptAction=null;
  }dialog.showModal();
 }
 $('#mission-accept').onclick=()=>{acceptAction?.();acceptAction=null;dialog.close();};$('#mission-later').onclick=()=>dialog.close();dialog.addEventListener('close',stopMovement);
 const forward=()=>({x:-Math.sin(player.rotation.y),z:-Math.cos(player.rotation.y)});
 // Onde a bola sai da mão direita no arremesso (estimativa usada pela barra de força).
 function startPoint(){const f=forward();return {x:player.position.x+f.x*.5-f.z*.4,y:1.25,z:player.position.z+f.z*.5+f.x*.4};}
 function feedback(text){$('#shot-feedback').textContent=text;}
 function startPractice(){
  if(state().stage==='school'||state().stage==='return'){goTo(school);return;}
  stopMovement();practicing=true;replayHits=0;localAttempts=0;shot=null;launch=null;shotTime=0;charging=false;charge=0;panel.hidden=false;document.body.classList.add('practicing');$('#shoot').disabled=false;
  // Começa a 5 m da cesta, olhando para ela; depois o aluno anda livremente pela quadra.
  player.position.set(hoop.x-5,0,0);player.rotation.y=Math.atan2(-(hoop.x-player.position.x),-(hoop.z-player.position.z));last.copy(player.position);
  $('#basket-count').textContent=`${total()} / 3`;$('#leave-court').textContent=touchHelp?'Sair do treino':'Sair do treino · Esc';feedback('A faixa amarela na barra mostra a força certa para onde você está.');onPractice(true);
 }
 function leave(){if(!practicing)return;practicing=false;shot=null;launch=null;charging=false;panel.hidden=true;document.body.classList.remove('practicing');stopMovement();refresh();onPractice(false);}
 $('#leave-court').onclick=leave;
 const canShoot=()=>practicing&&!shot&&!launch&&total()<3&&!dialog.open&&!document.hidden;
 function beginCharge(){if(!canShoot()||charging)return;charging=true;charge=0;}
 function release(){
  if(!charging)return;charging=false;if(!canShoot())return;
  if(player.position.x>hoop.x-.6){feedback('Fique na frente da cesta, do lado da quadra, para arremessar.');charge=0;return;}
  // O braço termina o movimento e a bola sai da mão no ponto de soltura da animação.
  throwTime=.9;launch={power:charge,delay:Math.max(.04,THROW.release-(THROW.windup+charge*(THROW.cocked-THROW.windup)))};$('#shoot').disabled=true;
 }
 function launchBall(){
  const hand=rightHand(),start={x:hand.x,y:hand.y+.1,z:hand.z};
  shot=throwShot(start,hoop,forward(),launch.power);result=rimCrossing(shot,hoop,RIM);launch=null;shotTime=0;resolved=false;landed=null;localAttempts++;feedback('Bola no ar…');
 }
 const shootButton=$('#shoot');
 shootButton.onpointerdown=e=>{e.preventDefault();try{shootButton.setPointerCapture(e.pointerId);}catch{}beginCharge();};shootButton.onpointerup=shootButton.onpointercancel=()=>release();
 shootButton.onkeydown=e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();if(!e.repeat)beginCharge();}};shootButton.onkeyup=e=>{if(e.code==='Space'||e.code==='Enter')release();};
 addEventListener('keydown',e=>{if(!practicing||dialog.open||e.target instanceof HTMLButtonElement)return;if(e.code==='Escape'){e.preventDefault();leave();}else if(e.code==='Space'){e.preventDefault();e.stopPropagation();if(!e.repeat)beginCharge();}},true);
 addEventListener('keyup',e=>{if(practicing&&e.code==='Space'&&!(e.target instanceof HTMLButtonElement)){e.preventDefault();release();}},true);
 addEventListener('blur',()=>{charging=false;});
 function updateMeter(){
  const ideal=idealPower(startPoint(),hoop),zone=Math.min(1,Math.max(0,ideal));
  $('#power-fill').style.width=(charge*100).toFixed(1)+'%';$('#power-meter').setAttribute('aria-valuenow',String(Math.round(charge*100)));
  $('#power-zone').style.left=((zone-SHOT.powerWindow)*100).toFixed(1)+'%';$('#power-zone').style.width=(SHOT.powerWindow*200).toFixed(1)+'%';$('#power-zone').hidden=!(ideal>0&&ideal<1.05);
 }
 function update(dt,paused=false){
  teacher.update(dt);throwTime=Math.max(0,throwTime-dt);
  if(!practicing){ballRoot.visible=state().stage!=='school';ballRoot.position.set(28,.42,1);ballRoot.rotation.set(0,0,0);return;}
  const step=Math.hypot(player.position.x-last.x,player.position.z-last.z);moving=step/Math.max(dt,.001)>.5;last.copy(player.position);
  if(player.position.x<COURT.minX||player.position.x>COURT.maxX||player.position.z<COURT.minZ||player.position.z>COURT.maxZ){leave();return;}
  if(charging)charge=Math.min(1,charge+dt/SHOT.chargeTime);
  updateMeter();ballRoot.visible=true;
  if(launch){launch.delay-=dt;if(launch.delay>0){ballRoot.position.copy(rightHand()).y+=.1;return;}launchBall();}
  if(!shot){
   const f=forward(),side={x:-f.z,z:f.x};
   if(charging)ballRoot.position.copy(rightHand()).y+=.1;
   else if(moving){dribble+=dt*7.5;ballRoot.position.set(player.position.x+f.x*.4+side.x*.42,.2+.75*Math.abs(Math.sin(dribble)),player.position.z+f.z*.4+side.z*.42);}
   else{const hand=rightHand();ballRoot.position.set(hand.x+side.x*.12+f.x*.08,hand.y+.02,hand.z+side.z*.12+f.z*.08);}
   return;
  }
  if(paused||document.hidden)return;
  shotTime+=dt;
  // Depois de chegar ao chão (ou ao fundo da rede, numa cesta), a bola para ali — antes, ela seguia a
  // parábola pura mesmo com a altura travada em .4, então "deslizava" flutuando pela quadra até o fim
  // da janela de 2,4 s em vez de parar onde caiu.
  if(!landed){const p=shotPosition(shot,shotTime);if(p.y<=.4){landed={x:p.x,y:.4,z:p.z};ballRoot.position.set(landed.x,landed.y,landed.z);}else{ballRoot.position.set(p.x,p.y,p.z);ballRoot.rotation.z-=dt*5;}}
  if(!resolved&&shotTime>=result.time){
   resolved=true;if(state().stage==='court')dispatch({type:'shot',scored:result.scored});else if(result.scored)replayHits++;
   $('#basket-count').textContent=`${total()} / 3`;
   feedback(result.scored?(total()>=3?'Três cestas! Treino concluído.':'Cesta! Muito bem. Tente de outro lugar da quadra.'):shot.ideal>1?'Muito longe! Chegue mais perto da cesta.':Math.abs(result.across)>RIM&&Math.abs(result.across)>Math.abs(result.along)?'Quase! Vire um pouco mais para a cesta antes de soltar.':result.along<0?'Faltou força: segure um pouco mais.':'Passou do aro: solte um pouco antes.');
  }
  if(!resolved&&shotTime>2.4){resolved=true;if(state().stage==='court')dispatch({type:'shot',scored:false});feedback(shot.ideal>1?'Muito longe! Chegue mais perto da cesta.':'Faltou força: segure um pouco mais.');}
  if(shotTime>2.15&&resolved){
   shot=null;charge=0;
   if(total()>=3){$('#shoot').disabled=true;$('#leave-court').textContent=state().stage==='return'?'Voltar à cidade · falar com Lia':'Concluir treino';}else $('#shoot').disabled=false;
  }
 }
 function prompt(nearest){if(nearest?.name==='Escola do Movimento')return 'Conversar · Professora Lia';if(nearest?.name==='Quadra de Basquete')return state().stage==='school'?'Ir à professora primeiro':state().stage==='return'?'Voltar à professora':'Pegar bola e treinar';return null;}
 function interact(nearest){if(nearest?.name==='Escola do Movimento'){openConversation();return true;}if(nearest?.name==='Quadra de Basquete'){startPractice();return true;}return false;}
 if(state().stage==='complete')wallet.award(100,'Primeiras Cestas'); // reforço para quem já tinha completado antes da carteira única existir
 refresh();
 return {update,interact,prompt,refresh,
  get locked(){return dialog.open;},get practicing(){return practicing;},
  get holding(){return practicing&&charging;},get charge(){return charge;},get throwing(){return throwTime>0;},
  get snapshot(){return {stage:state().stage,baskets:state().baskets,coins:state().coins,practicing,shotTime,shooting:!!shot,charging,charge,attempts:state().attempts,localAttempts,hoop,ideal:practicing?idealPower(startPoint(),hoop):null,lastShot:shot&&{start:shot.start,velocity:shot.velocity,power:shot.power,ideal:shot.ideal,result}};}};
}
