import * as T from 'three';
export function createFlight({renderer,scene,keys,touch,places=[],onExit,canEnter=()=>true}){
 const camera=new T.PerspectiveCamera(60,innerWidth/innerHeight,.2,1800);
 let enabled=false,drag=null,rise=0;const fog=scene.fog;
 const panel=document.createElement('div');panel.className='flight-panel';panel.hidden=true;
 panel.innerHTML='<strong>ADMIN · INSPEÇÃO LOCAL</strong><span>WASD: voar · Espaço/Q: subir · Ctrl/E: descer · Shift: acelerar · Arraste: olhar · Roda: aproximar</span><button data-action="overview">Ver cidade inteira</button><button data-action="up">Subir ↑</button><button data-action="down">Descer ↓</button><button data-action="exit">Voltar ao personagem</button>';
 document.body.append(panel);
 const select=document.createElement('select');select.setAttribute('aria-label','Inspecionar ambiente');select.innerHTML='<option value="">Ir para um ambiente…</option>';places.forEach((p,i)=>{const o=document.createElement('option');o.value=i;o.textContent=p.name;select.append(o);});panel.insertBefore(select,panel.querySelector('button'));select.onchange=()=>{if(select.value!=='')inspect(...places[Number(select.value)].view);};
 // Ferramenta de inspeção do desenvolvedor: fica fora da tela (F2 ainda funciona) em vez do botão visível
 // no cabeçalho de uma versão publicada, como já avisava o README.
 const button=document.createElement('button');button.textContent='Admin · Voar';button.id='admin-flight';
 if(import.meta.env.DEV)document.querySelector('header').append(button);
 function overview(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();const distance=230/Math.tan(Math.PI/6)/Math.min(1,camera.aspect);camera.position.set(0,distance*.8,distance*.6);camera.lookAt(0,0,0);camera.rotation.order='YXZ';}
 function toggle(){if(!enabled&&!canEnter())return;enabled=!enabled;panel.hidden=!enabled;document.body.classList.toggle('flying',enabled);button.setAttribute('aria-pressed',String(enabled));keys.clear();touch.x=touch.y=0;rise=0;scene.fog=enabled?null:fog;if(enabled)overview();else onExit();}
 function inspect(x,z,d=40){if(!enabled)toggle();camera.position.set(x+d*.45,d*.95,z+d*.8);camera.lookAt(x,0,z);camera.rotation.order='YXZ';}
 button.onclick=toggle;panel.querySelector('[data-action="exit"]').onclick=toggle;panel.querySelector('[data-action="overview"]').onclick=overview;
 for(const [name,v] of [['up',1],['down',-1]]){const b=panel.querySelector(`[data-action="${name}"]`);b.onpointerdown=e=>{rise=v;b.setPointerCapture(e.pointerId);};b.onpointerup=b.onpointercancel=()=>rise=0;}
 const canvas=renderer.domElement;
 canvas.addEventListener('pointerdown',e=>{if(!enabled)return;e.stopImmediatePropagation();drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);},true);
 canvas.addEventListener('pointermove',e=>{if(!enabled)return;e.stopImmediatePropagation();if(drag?.id!==e.pointerId)return;camera.rotation.y-=(e.clientX-drag.x)*.005;camera.rotation.x=T.MathUtils.clamp(camera.rotation.x-(e.clientY-drag.y)*.005,-1.5,1.5);drag.x=e.clientX;drag.y=e.clientY;},true);
 for(const event of ['pointerup','pointercancel'])canvas.addEventListener(event,()=>drag=null);
 canvas.addEventListener('wheel',e=>{if(!enabled)return;e.preventDefault();camera.translateZ(e.deltaY*.06);camera.position.y=T.MathUtils.clamp(camera.position.y,2,800);},{passive:false});
 addEventListener('keydown',e=>{if(e.code==='F2'){e.preventDefault();toggle();return;}if(!enabled)return;e.preventDefault();e.stopImmediatePropagation();keys.add(e.key.toLowerCase());if(e.code==='Escape')toggle();},true);
 addEventListener('blur',()=>rise=0);
 addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});
 return {inspect,get enabled(){return enabled;},update(dt){
  const speed=(keys.has('shift')?65:25)*dt;
  const x=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'))+touch.x;
  const z=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'))+touch.y;
  const length=Math.max(1,Math.hypot(x,z));camera.translateX(x/length*speed);camera.translateZ(z/length*speed);
  camera.position.y+=speed*(rise+Number(keys.has(' ')||keys.has('q'))-Number(keys.has('control')||keys.has('e')));
  camera.position.y=T.MathUtils.clamp(camera.position.y,2,800);
  renderer.render(scene,camera);
 }};
}
