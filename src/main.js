import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import './style.css';
import './reference-theme.css';
import {createFlight} from './flight.js';
import {buildCity} from './city-world.js';
import {DESTINATIONS as places,CITY_LIMIT,ROAD_AXES} from './city-layout.js';
import {createNavigation} from './navigation.js';
import {createCharacter} from './student-character.js';
import {createCustomizer} from './customizer.js';
import {createCrowd} from './crowd.js';
import {createMission} from './mission.js';
import {createProgress} from './quest-state.js';
import {createSkaters} from './skaters.js';
import {createAmbient} from './ambient.js';
import {createHoopsMatch} from './hoops-match.js';
import {createSoccerMatch} from './soccer-match.js';
import {createVolleyMatch} from './volley-match.js';
import {createSkateMatch} from './skate-match.js';
import {createOnboarding,readStudent} from './onboarding.js';
import {createTheory} from './theory.js';
import {createWallet} from './quests.js';
import {createSettings} from './settings.js';
import {createCloudSave} from './cloud-save.js';
import {createTravel} from './travel.js';
import {createTraffic} from './traffic.js';
import {createAdventure,adventureHeight,canExplore,TRAIL} from './adventure.js';
import {createSky} from './sky.js';
const $=s=>document.querySelector(s),scene=new T.Scene(),solids=[],keys=new Set(),touch={x:0,y:0};
// Céu, cor e neblina: base do visual do Jogo_RPG_EF7, agora variando com o horário real de Brasília
// (src/sky.js controla scene.background/fog, a luz do sol e a do hemisfério a cada quadro).
scene.background=new T.Color('#d9cdef');scene.fog=new T.Fog('#d9cdef',140,460);
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;$('#world').append(renderer.domElement);
renderer.shadowMap.enabled=!matchMedia('(pointer:coarse)').matches;renderer.shadowMap.type=T.PCFSoftShadowMap;
const hemi=new T.HemisphereLight(0xfff6e0,0x6f8a4e,1.6);scene.add(hemi);const sun=new T.DirectionalLight(0xffffff,2.2);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-28,right:28,top:28,bottom:-28,near:1,far:120});sun.shadow.normalBias=.03;sun.shadow.bias=-.0005;scene.add(sun,sun.target);
const sky=createSky({scene,sun,hemisphere:hemi});
// 'cima': 3/4 view from above that follows the student; 'third': behind the student. Mouse wheel zooms both.
// Campo de visão mais longe: dá para ver prédios e a montanha de longe em vez de sumirem na neblina perto.
const iso=new T.PerspectiveCamera(42,innerWidth/innerHeight,.3,650),third=new T.PerspectiveCamera(55,innerWidth/innerHeight,.1,550);
let zoom=1,thirdDistance=6;
let mode='iso',yaw=0,active=iso,thirdPitch=.07,ready=false,navigation,nearest=null,nearbyResident=null,route=[],running=false,verticalSpeed=0,elapsed=0,avatar,mission,customizer,crowd,skaters,ambient,hoopsMatch,soccerMatch,volleyMatch,skateMatch,onboarding,theory,travel,traffic,adventure,cloud;
// Skate/bicicleta ganham e perdem velocidade aos poucos (em vez de andar/parar instantâneo como a
// pé) e continuam deslizando/pedalando um pouco na última direção ao soltar as teclas (embalo).
let rideSpeed=0;const rideDir={x:0,z:1};
let storage;try{storage=localStorage;}catch{storage={getItem(){throw Error('Storage unavailable');},setItem(){throw Error('Storage unavailable');}};}
const progress=createProgress(storage),wallet=createWallet(storage),visited=new Set(progress.state.visited),dialog=$('#info'),labels=[];
const player=new T.Group();player.position.set(0,0,10);scene.add(player);
function showTeacherChip(student){
 if(student?.role!=='professor'||document.querySelector('.teacher-chip'))return;
 const chip=document.createElement('span');chip.className='chip teacher-chip';chip.textContent='👩‍🏫 Modo Professor · '+(student.name||'');
 document.querySelector('header').insertBefore(chip,document.querySelector('#camera'));
}
function stopMovement(){keys.clear();touch.x=touch.y=0;route=[];verticalSpeed=0;player.position.y=adventureHeight(player.position.x,player.position.z);$('#stick').style.transform='';}
function cityBusy(){return dialog.open||mission?.locked||mission?.practicing||customizer?.isOpen||hoopsMatch?.active||soccerMatch?.active||volleyMatch?.active||skateMatch?.active||onboarding?.active||theory?.active||settings?.isOpen||cloud?.isOpen||flight.enabled||frontView;}
const settings=createSettings({stopMovement,canOpen:()=>ready&&!cityBusy()});
cloud=createCloudSave({stopMovement,canOpen:()=>ready&&!cityBusy()});
const shadow=new T.Mesh(new T.CircleGeometry(.55,24),new T.MeshBasicMaterial({color:'#254b43',transparent:true,opacity:.22}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.19;player.add(shadow);
// Trilha guia: quando o aluno escolhe um destino (menu ou minimapa), um traço tracejado no chão mostra o caminho.
const guideMat=new T.LineDashedMaterial({color:'#ffc933',dashSize:.65,gapSize:.4,transparent:true,opacity:.92,depthTest:false});
const guideLine=new T.Line(new T.BufferGeometry(),guideMat);guideLine.renderOrder=5;guideLine.visible=false;scene.add(guideLine);
let guideLen=-1;
function updateGuide(dt=0){
 if(!route.length){if(guideLine.visible)guideLine.visible=false;guideLen=-1;return;}
 if(route.length!==guideLen){guideLen=route.length;guideLine.geometry.setFromPoints([new T.Vector3(player.position.x,adventureHeight(player.position.x,player.position.z)+.14,player.position.z),...route.map(p=>new T.Vector3(p.x,adventureHeight(p.x,p.z)+.14,p.z))]);guideLine.computeLineDistances();guideLine.visible=true;}
 guideMat.dashOffset=(guideMat.dashOffset-dt*2.2)%(guideMat.dashSize+guideMat.gapSize);
}
function label(p){const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.fillStyle='#34585b';ctx.beginPath();ctx.roundRect(0,0,512,96,20);ctx.fill();ctx.fillStyle='#fff6df';ctx.textAlign='center';ctx.font='bold 29px Trebuchet MS';ctx.fillText(p.name,256,59,480);const o=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(c),depthTest:true,transparent:true}));o.scale.set(7.5,1.4,1);o.position.set(p.x,3.8,p.z);scene.add(o);labels.push(o);}
const menu=$('nav');menu.replaceChildren();places.forEach((p,i)=>{const b=document.createElement('button');b.dataset.place=i;b.textContent=String(i+1).padStart(2,'0')+' · '+p.name;b.onclick=()=>goTo(p);menu.append(b);});
$('#progress').textContent=visited.size+' / '+places.length+' locais descobertos';$('#status').textContent='Montando os bairros…';$('aside > p').textContent='Ruas conectadas, praças e ambientes para explorar.';
const actions=document.createElement('div');actions.className='player-actions';actions.innerHTML='<button id="run" aria-pressed="false">Correr</button><button id="jump">Pular</button>';document.body.append(actions);
function jump(){if(ready&&!cityBusy()&&player.position.y-adventureHeight(player.position.x,player.position.z)<=.01)verticalSpeed=8;}
$('#run').onclick=()=>{running=!running;$('#run').setAttribute('aria-pressed',String(running));$('#run').textContent=running?'Andar':'Correr';};$('#jump').onclick=jump;
const flight=createFlight({renderer,scene,keys,touch,places,canEnter:()=>!mission?.locked&&!mission?.practicing&&!dialog.open&&!customizer?.isOpen&&!hoopsMatch?.active&&!soccerMatch?.active&&!volleyMatch?.active&&!skateMatch?.active&&!onboarding?.active&&!theory?.active&&!frontView,onExit:()=>{route=[];updateCamera(1,true);}});
function toggle(){mode=mode==='iso'?'third':'iso';active=mode==='iso'?iso:third;if(mode==='third')yaw=player.rotation.y;document.body.classList.toggle('third-person',mode==='third');$('#camera').textContent='Câmera: '+(mode==='iso'?'de cima':'3ª pessoa');resize();updateCamera(1,true);}
// O treino de basquete usa a 3ª pessoa; ao sair, volta a câmera que o aluno usava.
let modeBeforePractice=null;function practiceView(on){if(on){modeBeforePractice=mode;if(mode!=='third')toggle();yaw=player.rotation.y;thirdDistance=6.5;thirdPitch=.14;updateCamera(1,true);}else{if(modeBeforePractice==='iso'&&mode==='third')toggle();modeBeforePractice=null;}}
// H: olhar o próprio personagem de frente (como um espelho rápido), sem precisar abrir o guarda-roupa.
let frontView=false,modeBeforeFront=null;
function toggleFrontView(){
 if(!frontView&&(!ready||dialog.open||mission?.locked||mission?.practicing||customizer?.isOpen||hoopsMatch?.active||soccerMatch?.active||volleyMatch?.active||skateMatch?.active||onboarding?.active||theory?.active||flight.enabled))return;
 frontView=!frontView;document.body.classList.toggle('front-view',frontView);
 if(frontView){modeBeforeFront=mode;if(mode!=='third')toggle();stopMovement();$('#status').textContent='Se olhando de frente · H para voltar';}else{if(modeBeforeFront==='iso'&&mode==='third')toggle();modeBeforeFront=null;}
 updateCamera(1,true);
}
$('#camera').onclick=toggle;$('#reset').onclick=()=>{player.position.set(0,0,10);verticalSpeed=0;route=[];updateCamera(1,true);};
function interact(){if(dialog.open||!ready||mission?.locked||mission?.practicing||customizer?.isOpen||hoopsMatch?.active||soccerMatch?.active||volleyMatch?.active||skateMatch?.active||onboarding?.active||theory?.active||frontView)return;
 if(!nearest&&nearbyResident){const talk=crowd.talk(nearbyResident);dialog.querySelector('h2').textContent=talk.name;dialog.querySelector('p').textContent=talk.text;stopMovement();dialog.showModal();return;}
 if(!nearest)return;visited.add(nearest.name);progress.dispatch({type:'visit',name:nearest.name});mission?.refresh();$('#progress').textContent=visited.size+' / '+places.length+' locais descobertos';if(mission?.interact(nearest))return;dialog.querySelector('h2').textContent=nearest.name;dialog.querySelector('p').textContent=nearest.text;stopMovement();dialog.showModal();}
$('#interact').onclick=interact;$('#close').onclick=()=>dialog.close();$('#hoops-enter').onclick=()=>hoopsMatch?.start();$('#soccer-enter').onclick=()=>soccerMatch?.start();$('#volley-enter').onclick=()=>volleyMatch?.start();$('#skate-enter').onclick=()=>skateMatch?.start();$('#theory-enter').onclick=()=>theory?.open();
function goTo(p){if(!ready||mission?.locked||mission?.practicing||hoopsMatch?.active||soccerMatch?.active||volleyMatch?.active||skateMatch?.active||onboarding?.active||theory?.active||frontView)return;route=navigation.route(player.position,p);$('#status').textContent=route.length?'Caminhando até '+p.name:'Você já está perto ou o acesso exige movimento manual.';}
addEventListener('keydown',e=>{if(dialog.open||mission?.locked||customizer?.isOpen||onboarding?.active||theory?.active||settings.isOpen||cloud.isOpen)return;if(e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement||e.target instanceof HTMLTextAreaElement)return;if(e.target instanceof HTMLButtonElement&&[' ','Enter'].includes(e.key))return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();if(!frontView)keys.add(e.key.toLowerCase());
 // Durante as partidas (basquete/futebol/vôlei/skate), WASD ainda deve mover o jogador — só as ações
 // da cidade (câmera, interagir, espelho, pular) ficam de fora, pois cada partida tem as suas próprias.
 const inMatch=hoopsMatch?.active||soccerMatch?.active||volleyMatch?.active||skateMatch?.active;
 if(!e.repeat&&!inMatch){const key=e.key.toLowerCase();if(key===settings.key('camera')&&!frontView)toggle();if(key===settings.key('interact'))interact();if(key===settings.key('mirror'))toggleFrontView();if(key===settings.key('jump'))jump();if(key===settings.key('travel'))travel?.cycle();}});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
// Alt-tab, trocar de aba ou clicar fora do jogo pode engolir o keyup e deixar o aluno "andando sozinho":
// zera o estado de teclas sempre que a janela/aba deixa de estar em primeiro plano, e de novo ao voltar
// (a tecla física pode continuar pressionada, mas sem um keydown novo é mais seguro considerá-la solta).
function clearKeys(){keys.clear();touch.x=touch.y=0;}
addEventListener('blur',clearKeys);addEventListener('focus',clearKeys);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearKeys();});
let drag=null;
function canLook(){return ready&&!dialog.open&&!mission?.locked&&!customizer?.isOpen&&!onboarding?.active&&!theory?.active&&!settings.isOpen&&!cloud.isOpen&&!hoopsMatch?.active&&!soccerMatch?.active&&!volleyMatch?.active&&!skateMatch?.active&&!flight.enabled&&!frontView;}
function mouseLook(dx,dy){if(!canLook())return;yaw-=dx*settings.value.sensitivity;if(mode==='third')thirdPitch=T.MathUtils.clamp(thirdPitch+dy*settings.value.sensitivity*(settings.value.invert?-1:1),-.38,.65);route=[];}
renderer.domElement.onpointerdown=e=>{if(!canLook())return;if(mode==='third'&&settings.value.mouse==='lock'&&e.pointerType==='mouse'){renderer.domElement.requestPointerLock?.();return;}drag={id:e.pointerId,x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);};
renderer.domElement.onpointermove=e=>{if(document.pointerLockElement===renderer.domElement)return;if(drag?.id===e.pointerId){mouseLook(e.clientX-drag.x,e.clientY-drag.y);drag.x=e.clientX;drag.y=e.clientY;}};
document.addEventListener('mousemove',e=>{if(document.pointerLockElement===renderer.domElement)mouseLook(e.movementX,e.movementY);});
renderer.domElement.onpointerup=renderer.domElement.onpointercancel=()=>drag=null;
const joy=$('#joystick');let joyId=null;function moveJoy(e){const r=joy.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,l=Math.max(38,Math.hypot(dx,dy));touch.x=dx/l;touch.y=dy/l;$('#stick').style.transform=`translate(${touch.x*34}px,${touch.y*34}px)`;}
joy.onpointerdown=e=>{if(joyId!==null)return;joyId=e.pointerId;joy.setPointerCapture(e.pointerId);moveJoy(e);};joy.onpointermove=e=>{if(e.pointerId===joyId)moveJoy(e);};joy.onpointerup=joy.onpointercancel=()=>{joyId=null;touch.x=touch.y=0;$('#stick').style.transform='';};
function resize(){renderer.setSize(innerWidth,innerHeight);const a=innerWidth/innerHeight;iso.aspect=third.aspect=a;iso.updateProjectionMatrix();third.updateProjectionMatrix();}
renderer.domElement.addEventListener('wheel',e=>{if(flight.enabled)return;e.preventDefault();const step=Math.sign(e.deltaY);if(mode==='third')thirdDistance=T.MathUtils.clamp(thirdDistance+step*.7,3.5,11);else zoom=T.MathUtils.clamp(zoom+step*.1,.55,1.6);},{passive:false});addEventListener('resize',resize);resize();
function updateCamera(dt,snap=false){
 const focus=player.position.clone().add(new T.Vector3(0,1,0));
 if(mode==='iso'){if(avatar)avatar.visual.visible=true;const k=(innerWidth<700?1.25:1)*zoom,desired=focus.clone().add(new T.Vector3(Math.sin(yaw)*15*k,15*k,Math.cos(yaw)*15*k));if(snap)iso.position.copy(desired);else iso.position.lerp(desired,1-Math.exp(-8*dt));iso.lookAt(focus);return;}
 if(route.length&&!frontView){const p=route[0],angle=Math.atan2(player.position.x-p.x,player.position.z-p.z);yaw+=Math.atan2(Math.sin(angle-yaw),Math.cos(angle-yaw))*(1-Math.exp(-5*dt));}if(!frontView)player.rotation.y=yaw;
 const dir=frontView?-1:1,back=new T.Vector3(Math.sin(yaw)*dir,0,Math.cos(yaw)*dir),right=new T.Vector3(Math.cos(yaw)*dir,0,-Math.sin(yaw)*dir);
 const distance=frontView?3.1:thirdDistance,pivot=player.position.clone().add(new T.Vector3(0,frontView?1.45:2.1,0)),desired=pivot.clone().addScaledVector(back,distance).addScaledVector(right,frontView?0:.9);if(!frontView)desired.y+=.9*thirdDistance/6;
 const ray=new T.Raycaster(pivot,desired.clone().sub(pivot).normalize(),.15,pivot.distanceTo(desired));
 // Raycaster also hits invisible meshes. Hidden match avatars were pushing the camera
 // into the player; the old distance guard then hid the entire student's avatar.
 const visibleStatic=o=>{for(let n=o;n;n=n.parent)if(!n.visible||n===player||n.userData.crowd||n.userData.character||n.userData.noCameraCollision)return false;return o.isMesh&&!o.isSkinnedMesh;};
 const obstacles=[];scene.traverseVisible(o=>{if(visibleStatic(o))obstacles.push(o);});
 const hit=ray.intersectObjects(obstacles,false)[0];if(hit)desired.copy(pivot).addScaledVector(ray.ray.direction,Math.max(1.45,hit.distance-.25));third.position.copy(desired);
 const look=pivot.clone().addScaledVector(back,-12).addScaledVector(right,frontView?0:.65);if(!frontView)look.y-=Math.tan(thirdPitch)*16.5;third.lookAt(look);if(avatar)avatar.visual.visible=true;
}
const map=document.createElement('canvas');map.id='minimap';map.width=220;map.height=220;map.setAttribute('aria-label','Minimapa da cidade');document.body.append(map);
function drawMap(){const ctx=map.getContext('2d'),scale=220/510;ctx.fillStyle='#b5cb9e';ctx.fillRect(0,0,220,220);ctx.save();ctx.translate(78,110);ctx.scale(scale,scale);ctx.fillStyle='#719269';ctx.fillRect(174,-108,138,196);ctx.strokeStyle='#c7a273';ctx.lineWidth=5;ctx.beginPath();TRAIL.forEach(([x,z],i)=>i?ctx.lineTo(x,z):ctx.moveTo(x,z));ctx.stroke();ctx.strokeStyle='#4b5964';ctx.lineWidth=9;for(const a of ROAD_AXES){ctx.beginPath();ctx.moveTo(-105,a);ctx.lineTo(105,a);ctx.moveTo(a,-105);ctx.lineTo(a,105);ctx.stroke();}for(const p of places){ctx.fillStyle=visited.has(p.name)?'#2e7954':'#7741a7';ctx.beginPath();ctx.arc(p.x,p.z,4,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#fbc53d';ctx.strokeStyle='#3b3342';ctx.lineWidth=2;ctx.beginPath();ctx.arc(player.position.x,player.position.z,6,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();}
const clock=new T.Clock();let lastMap=0;
function frame(){requestAnimationFrame(frame);const dt=Math.min(clock.getDelta(),.05);elapsed+=dt;
 sky.update(dt,player.position);
 if(!canLook()&&document.pointerLockElement)document.exitPointerLock();
 travel?.update(avatar,0);traffic?.update(dt,player.position,document.hidden||onboarding?.active||settings.isOpen);adventure?.update(player.position,travel?.mode);
 crowd?.update(dt,player.position,{paused:dialog.open||customizer?.isOpen||mission?.locked||hoopsMatch?.active||soccerMatch?.active||volleyMatch?.active||skateMatch?.active||onboarding?.active||theory?.active||frontView,overview:flight.enabled});skaters?.update(dt,player.position,flight.enabled);ambient?.update(dt,player.position);
 if(hoopsMatch?.active){labels.forEach(o=>o.visible=false);hoopsMatch.update(dt);renderer.render(scene,hoopsMatch.camera);return;}
 if(soccerMatch?.active){labels.forEach(o=>o.visible=false);soccerMatch.update(dt);renderer.render(scene,soccerMatch.camera);return;}
 if(volleyMatch?.active){labels.forEach(o=>o.visible=false);volleyMatch.update(dt);renderer.render(scene,volleyMatch.camera);return;}
 if(skateMatch?.active){labels.forEach(o=>o.visible=false);skateMatch.update(dt);renderer.render(scene,skateMatch.camera);return;}
 if(flight.enabled){labels.forEach(o=>o.visible=false);flight.update(dt);return;}
 const beforeX=player.position.x,beforeZ=player.position.z;
 if(ready&&!dialog.open&&!mission?.locked&&!customizer?.isOpen&&!onboarding?.active&&!theory?.active&&!frontView&&!settings.isOpen&&!cloud.isOpen){const ground=adventureHeight(player.position.x,player.position.z),grounded=player.position.y<=ground+.02&&verticalSpeed<=0;verticalSpeed-=22*dt;player.position.y=Math.max(ground,player.position.y+verticalSpeed*dt);if(player.position.y<=ground)verticalSpeed=0;shadow.position.y=ground+.19-player.position.y;
  let sx=Number(settings.pressed(keys,'right')||keys.has('arrowright'))-Number(settings.pressed(keys,'left')||keys.has('arrowleft'))+touch.x,sy=Number(settings.pressed(keys,'back')||keys.has('arrowdown'))-Number(settings.pressed(keys,'forward')||keys.has('arrowup'))+touch.y;
  // Third person: A/D (or the joystick sideways) turn the student and the camera; W/S walk forward and back.
  if(mode==='third'&&sx&&!settings.value.strafe){yaw-=sx*2.6*dt;if(sx)route=[];sx=0;}
  let dx=sx*Math.cos(yaw)+sy*Math.sin(yaw),dz=-sx*Math.sin(yaw)+sy*Math.cos(yaw);if(sx||sy)route=[];
  if(route.length){const p=route[0];dx=p.x-player.position.x;dz=p.z-player.position.z;if(Math.hypot(dx,dz)<.3){route.shift();if(!route.length)$('#status').textContent='Você chegou. Explore o marcador próximo.';}}
  const len=Math.hypot(dx,dz),riding=travel?.mode!=='walk'&&!route.length;
  if(len>.03){dx/=len;dz/=len;if(riding){rideDir.x=dx;rideDir.z=dz;}}
  let moveX=0,moveZ=0;
  if(riding){
   const top=travel?.speed||6,accel=travel.mode==='bike'?42:30,drag=travel.mode==='bike'?6:4;
   rideSpeed=len>.03?Math.min(top,rideSpeed+accel*dt):Math.max(0,rideSpeed-drag*dt);
   if(rideSpeed>.01){const step=rideSpeed*dt;moveX=rideDir.x*step;moveZ=rideDir.z*step;}
  }else{
   rideSpeed=0;
   if(len>.03){const top=running||settings.pressed(keys,'sprint')?11:6,step=route.length?Math.min(top*dt,len):top*dt;moveX=dx*step;moveZ=dz*step;}
  }
  if(Math.hypot(moveX,moveZ)>.0005){const next={x:player.position.x+moveX,z:player.position.z+moveZ};navigation.resolve(next,.35,crowd?.positions()||[]);player.position.x=next.x;player.position.z=next.z;player.position.y=grounded?adventureHeight(next.x,next.z):Math.max(adventureHeight(next.x,next.z),player.position.y);if(mode!=='third'||sy<=0)player.rotation.y=Math.atan2(-moveX,-moveZ);}
 }
 updateGuide(dt);
 const moveSpeed=Math.hypot(player.position.x-beforeX,player.position.z-beforeZ)/Math.max(dt,.001);shadow.position.y=adventureHeight(player.position.x,player.position.z)+.19-player.position.y;mission?.update(dt,dialog.open);avatar?.update(dt,{speed:moveSpeed,airborne:player.position.y-adventureHeight(player.position.x,player.position.z)>.1,holding:mission?.holding,throwing:mission?.throwing,charge:mission?.charge,riding:travel?.mode});travel?.update(avatar,moveSpeed);
 nearest=places.find(p=>Math.hypot(player.position.x-p.x,player.position.z-p.z)<3);nearbyResident=crowd?.nearby(player.position);$('#interact').disabled=(!nearest&&!nearbyResident)||!ready||!!mission?.locked;$('#interact').textContent=mission?.prompt(nearest)||(nearest?'Explorar · '+nearest.name:nearbyResident?'Conversar · '+nearbyResident.name:'Aproxime-se de um local ou morador');
 $('#hoops-enter').hidden=!(ready&&hoopsMatch&&!hoopsMatch.active&&!mission?.locked&&!mission?.practicing&&nearest?.name==='Quadra de Basquete');
 $('#soccer-enter').hidden=!(ready&&soccerMatch&&!soccerMatch.active&&!mission?.locked&&!mission?.practicing&&nearest?.name==='Campo de Futebol');
 $('#volley-enter').hidden=!(ready&&volleyMatch&&!volleyMatch.active&&!mission?.locked&&!mission?.practicing&&nearest?.name==='Quadra de Vôlei');
 $('#skate-enter').hidden=!(ready&&skateMatch&&!skateMatch.active&&!mission?.locked&&!mission?.practicing&&nearest?.name==='Aventura Urbana');
 $('#theory-enter').hidden=!(ready&&theory&&!theory.active&&!mission?.locked&&!mission?.practicing&&nearest?.name==='Escola do Movimento');
 updateCamera(dt);
 for(const o of labels){const d=Math.hypot(o.position.x-player.position.x,o.position.z-player.position.z);o.visible=!mission?.practicing&&d<30&&(mode!=='third'||d>5);const width=mode==='third'?Math.min(6,third.position.distanceTo(o.position)*.2):7.5;o.scale.set(width,width*1.4/7.5,1);o.material.opacity=T.MathUtils.clamp((30-d)/10,0,1);}if(elapsed-lastMap>.1){drawMap();lastMap=elapsed;}renderer.render(scene,active);
}
iso.position.set(0,16,26);third.position.set(6,6,16);frame();
buildCity({scene,loader:new GLTFLoader(),solids}).then(async audit=>{
 const loader=new GLTFLoader();avatar=await createCharacter(loader,'student');player.add(avatar.visual);
 adventure=createAdventure({scene});traffic=await createTraffic({scene,loader});travel=await createTravel({loader,player,stopMovement,canChange:()=>ready&&!cityBusy()});
 mission=await createMission({scene,loader,player,solids,hoop:audit.basketballHoop,progress,wallet,goTo,stopMovement,handPosition:()=>avatar.handPosition,rightHand:()=>avatar.rightHand,onPractice:practiceView});
 customizer=createCustomizer({loader,avatar,stopMovement,canOpen:()=>ready&&!mission.locked&&!flight.enabled&&!dialog.open&&!hoopsMatch?.active&&!soccerMatch?.active&&!volleyMatch?.active&&!skateMatch?.active});
 onboarding=createOnboarding({player,updateCamera,onFinish:showTeacherChip});onboarding.onCharacterStep(customizer.open);
 theory=await createTheory({stopMovement,wallet});
 hoopsMatch=await createHoopsMatch({scene,loader,progress,keys,touch,stopMovement});
 soccerMatch=await createSoccerMatch({scene,loader,keys,touch,stopMovement,storage,wallet});
 volleyMatch=await createVolleyMatch({scene,loader,keys,touch,stopMovement,storage,wallet});
 skateMatch=await createSkateMatch({scene,loader,keys,touch,stopMovement,center:audit.skatepark,setMainAvatarVisible:v=>{if(avatar)avatar.visual.visible=v;}});
 skaters=await createSkaters({scene,loader,center:audit.skatepark});ambient=await createAmbient({scene,loader});
 navigation=createNavigation(solids,CITY_LIMIT,canExplore);crowd=await createCrowd({scene,loader,navigation,compact:matchMedia('(pointer:coarse)').matches||innerWidth<700});places.forEach(label);ready=true;$('#status').textContent='Cidade viva · '+crowd.count+' moradores · '+places.length+' destinos';
 showTeacherChip(readStudent());window.cityReady=true;window.cityDesign=audit;window.cityStats=()=>({drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,residents:crowd.count,failures:0});
 if(import.meta.env.DEV){window.crowdReview=()=>crowd.snapshot();window.cityScene=scene;}
 if(import.meta.env.DEV)window.cityReview={places,solids,inspect:(i)=>flight.inspect(...places[i].view),inspectAt:(x,z,d)=>flight.inspect(x,z,d),player:()=>({x:player.position.x,y:player.position.y,z:player.position.z}),routes:()=>places.map(p=>({name:p.name,blocked:navigation.blocked(p.x,p.z),steps:navigation.route({x:0,z:10},p).length})),visit:i=>{player.position.set(places[i].x,0,places[i].z);route=[];updateCamera(1,true);}};
 if(import.meta.env.DEV)window.missionReview=()=>({...mission.snapshot,asset:'KayKit Adventurers (alunos editados)',animation:avatar.state,animations:avatar.animations,appearance:avatar.appearance,pose:avatar.poseSample});
 if(import.meta.env.DEV)window.questReview={wallet:()=>({coins:wallet.coins,badges:wallet.badges}),soccerScore:()=>soccerMatch.score,volleyScore:()=>volleyMatch.score};
 if(import.meta.env.DEV)window.travelReview={traffic:()=>traffic.snapshot(),mode:()=>travel.mode,select:mode=>travel.select(mode),adventure:()=>adventure.snapshot,camera:()=>({mode,yaw,pitch:thirdPitch,avatarVisible:avatar.visual.visible}),avatar:()=>avatar.visual,settings:()=>settings.value};
 if(import.meta.env.DEV)window.skateReview={terrainHeight:skateMatch._terrainHeight,active:()=>skateMatch.active,state:()=>skateMatch._ride()?.state,enter:()=>skateMatch.start(),leave:()=>skateMatch.leave()};
 if(import.meta.env.DEV)window.skyReview={hour:()=>sky.hour,setHour:h=>sky.setHourOverride(h),background:()=>'#'+scene.background.getHexString(),sunIntensity:()=>sun.intensity,hemiIntensity:()=>hemi.intensity};
}).catch(error=>{console.error(error);$('#status').textContent='Falha ao carregar a cidade. Recarregue a página.';window.cityReady=true;window.cityStats=()=>({failures:1});});
