import * as T from 'three';
import {createCharacter,PALETTES,APPEARANCE_KEY,normalizeAppearance,PARTS,PART_LABELS,COLOR_LABELS,ITEM_NAMES,CATEGORY_COLORS,optionsFor,BODY_TYPES} from './student-character.js';
import {createWardrobeThumbnails} from './wardrobe-thumbnails.js';
import './customizer.css';

const names=PART_LABELS,colorFor=CATEGORY_COLORS;
const itemName=(category,id)=>id==='none'?({glasses:'Sem óculos',hearing:'Sem aparelho',accessory:'Sem mochila',mobility:'Andando'}[category]||'Sem acessório'):ITEM_NAMES[id];

export function createCustomizer({loader,avatar,stopMovement,canOpen}){
 const button=document.createElement('button');button.id='customize';button.textContent='Meu personagem';document.querySelector('header').append(button);
 const dialog=document.createElement('dialog');dialog.id='avatar-editor';dialog.setAttribute('aria-labelledby','avatar-title');
 dialog.innerHTML=`<div class="avatar-heading"><div><small>SEU JEITO DE JOGAR</small><h2 id="avatar-title">Meu guarda-roupa</h2></div><button id="avatar-cancel" aria-label="Cancelar alterações">Fechar</button></div>
 <div class="avatar-bodytype" role="radiogroup" aria-label="Personagem"><span class="avatar-bodytype-label">Personagem</span><div id="avatar-bodytype-options"></div></div>
 <div class="avatar-layout"><div class="avatar-preview-wrap"><div id="avatar-preview" aria-label="Prévia 3D do personagem"></div><p>Arraste para girar · experimente antes de salvar</p></div>
 <div class="avatar-options"><div id="wardrobe-tabs" role="tablist" aria-label="Categorias de peças"></div><section id="wardrobe-panel" role="tabpanel"><div class="wardrobe-summary"><strong id="wardrobe-category"></strong><span id="wardrobe-count"></span></div><div id="wardrobe-items" aria-label="Peças disponíveis"></div><p id="wardrobe-selection" role="status"></p><div id="avatar-palettes"></div></section></div></div>
 <div class="avatar-footer"><p id="avatar-message" role="status">Sua aparência será aplicada ao salvar.</p><button id="avatar-save">Salvar aparência</button></div>`;
 document.body.append(dialog);const $=s=>dialog.querySelector(s);
 let draft,preview,renderer,scene,camera,frame=0,last=0,loading=null,drag=null,category='body',thumbnails,thumbnailsLoading,renderGeneration=0;
 // Personagem (menino/menina): corpo com proporções próprias (não é só roupa/cor), por isso fica
 // separado das abas de roupa/visual — uma escolha à parte, sempre visível, antes do resto.
 for(const type of BODY_TYPES){const b=document.createElement('button');b.type='button';b.className='avatar-bodytype-option';b.dataset.bodyType=type;b.textContent=ITEM_NAMES[type];b.setAttribute('role','radio');b.onclick=()=>{draft.bodyType=type;update();};$('#avatar-bodytype-options').append(b);}
 for(const key of Object.keys(PARTS)){const tab=document.createElement('button');tab.type='button';tab.id='wardrobe-tab-'+key;tab.dataset.category=key;tab.role='tab';tab.textContent=names[key];tab.setAttribute('aria-controls','wardrobe-panel');tab.onclick=()=>showCategory(key);tab.onkeydown=e=>{const keys=Object.keys(PARTS),i=keys.indexOf(key);let next;if(e.key==='ArrowRight')next=keys[(i+1)%keys.length];if(e.key==='ArrowLeft')next=keys[(i+keys.length-1)%keys.length];if(e.key==='Home')next=keys[0];if(e.key==='End')next=keys.at(-1);if(next){e.preventDefault();showCategory(next);$('#wardrobe-tab-'+next).focus();}};$('#wardrobe-tabs').append(tab);}
 for(const [key,colors] of Object.entries(PALETTES)){const field=document.createElement('fieldset');field.dataset.palette=key;const legend=document.createElement('legend');legend.textContent=COLOR_LABELS[key];field.append(legend);
  colors.forEach((color,i)=>{const b=document.createElement('button');b.type='button';b.className='avatar-swatch';b.dataset.field=key;b.dataset.value=color;b.style.setProperty('--swatch',color);b.setAttribute('aria-label',`${COLOR_LABELS[key]} · opção ${i+1}`);b.onclick=()=>{draft[key]=color;update();};field.append(b);});$('#avatar-palettes').append(field);
 }
 function update(){draft=normalizeAppearance(draft);preview?.setAppearance(draft);dialog.querySelectorAll('.avatar-swatch').forEach(b=>b.setAttribute('aria-pressed',String(draft[b.dataset.field]===b.dataset.value)));dialog.querySelectorAll('.wardrobe-item').forEach(b=>b.setAttribute('aria-pressed',String(draft[category]===b.dataset.item)));$('#wardrobe-selection').textContent='Selecionado: '+itemName(category,draft[category]);
  dialog.querySelectorAll('.avatar-bodytype-option').forEach(b=>b.setAttribute('aria-checked',String(draft.bodyType===b.dataset.bodyType)));}
 async function fillThumbnails(generation){try{thumbnailsLoading??=createWardrobeThumbnails(loader);thumbnails=await thumbnailsLoading;
  for(const image of $('#wardrobe-items').querySelectorAll('img')){if(generation!==renderGeneration||!dialog.open)return;image.src=thumbnails.render(image.dataset.item);image.closest('button').classList.add('loaded');await new Promise(resolve=>requestAnimationFrame(resolve));}
 }catch(error){console.error(error);$('#avatar-message').textContent='As miniaturas não carregaram. Você ainda pode experimentar as peças na prévia.';thumbnailsLoading=null;}}
 function showCategory(key){category=key;const generation=++renderGeneration;$('#wardrobe-items').replaceChildren();$('#wardrobe-items').scrollTop=0;$('#wardrobe-category').textContent=names[key];const count=optionsFor(key,draft.body).filter(id=>id!=='none').length;$('#wardrobe-count').textContent=count+(count===1?' opção':' opções');$('#wardrobe-panel').setAttribute('aria-labelledby','wardrobe-tab-'+key);
  dialog.querySelectorAll('[role="tab"]').forEach(t=>{const selected=t.dataset.category===key;t.setAttribute('aria-selected',String(selected));t.tabIndex=selected?0:-1;});
  dialog.querySelectorAll('[data-palette]').forEach(f=>f.hidden=![colorFor[key]].flat().includes(f.dataset.palette));
  for(const id of optionsFor(key,draft.body)){const card=document.createElement('button');card.type='button';card.className='wardrobe-item';card.dataset.item=id;card.setAttribute('aria-label',itemName(key,id));
   if(id==='none'){const empty=document.createElement('span');empty.className='wardrobe-none';empty.textContent='∅';card.append(empty);card.classList.add('loaded');}else{const img=document.createElement('img');img.dataset.item=id;img.alt=itemName(key,id);img.width=144;img.height=144;card.append(img);}
   const label=document.createElement('span');label.className='wardrobe-item-label';label.textContent=itemName(key,id);card.append(label);card.onclick=()=>{draft[key]=id;update();$('#avatar-message').textContent='Sua aparência será aplicada ao salvar.';};$('#wardrobe-items').append(card);
  }update();void fillThumbnails(generation);
 }
 function resize(){if(!renderer)return;const el=$('#avatar-preview'),w=el.clientWidth,h=el.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}
 function render(now){if(!dialog.open)return;const dt=Math.min((now-last)/1000,.05);last=now;preview?.update(dt);renderer.render(scene,camera);frame=requestAnimationFrame(render);}
 async function initialize(){preview=await createCharacter(loader,'preview',2);scene=new T.Scene();scene.add(new T.HemisphereLight(0xfff7ed,0x6c6080,2));const light=new T.DirectionalLight(0xffffff,3);light.position.set(-3,5,-4);scene.add(light,preview.visual);
  const floor=new T.Mesh(new T.CylinderGeometry(.75,.85,.08,48),new T.MeshStandardMaterial({color:'#d8c6e9',roughness:1}));floor.position.y=.02;scene.add(floor);
  camera=new T.PerspectiveCamera(36,1,.1,20);camera.position.set(0,1.35,-4.4);camera.lookAt(0,1.02,0);
  renderer=new T.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;$('#avatar-preview').append(renderer.domElement);
  const c=renderer.domElement;c.onpointerdown=e=>{drag={id:e.pointerId,x:e.clientX};c.setPointerCapture(e.pointerId);};c.onpointermove=e=>{if(drag?.id===e.pointerId){preview.visual.rotation.y+=(e.clientX-drag.x)*.012;drag.x=e.clientX;}};c.onpointerup=c.onpointercancel=()=>drag=null;
 }
 async function open(){if(!canOpen())return;stopMovement();draft=avatar.appearance;dialog.showModal();$('#avatar-message').textContent='Sua aparência será aplicada ao salvar.';showCategory(category);$('#avatar-save').disabled=true;
  // Na primeira vez (ex.: logo na abertura do jogo), carregar o modelo 3D da prévia demora um
  // instante — sem isso, a caixa da prévia fica vazia e parece que o clique em "Abrir guarda-roupa"
  // não fez nada.
  let loadingNote=null;
  if(!loading){loadingNote=document.createElement('p');loadingNote.className='avatar-preview-loading';loadingNote.textContent='Carregando prévia…';$('#avatar-preview').append(loadingNote);}
  try{loading??=initialize();await loading;if(!dialog.open)return;loadingNote?.remove();preview.visual.rotation.y=0;update();resize();last=performance.now();frame=requestAnimationFrame(render);$('#avatar-save').disabled=false;}
  catch(error){console.error(error);loadingNote?.remove();$('#avatar-message').textContent='Não foi possível abrir a prévia. Feche e tente novamente.';loading=null;}
 }
 button.onclick=open;$('#avatar-cancel').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{++renderGeneration;cancelAnimationFrame(frame);stopMovement();button.focus();});
 $('#avatar-save').onclick=()=>{avatar.setAppearance(draft);try{localStorage.setItem(APPEARANCE_KEY,JSON.stringify(draft));dialog.close();}catch{$('#avatar-message').textContent='Aparência aplicada, mas este navegador não permitiu salvar.';}};
 addEventListener('resize',()=>{if(dialog.open)resize();});
 /** Abre o editor e devolve uma Promise que resolve quando ele fecha (salvo ou cancelado). */
 function openAndWait(){return new Promise(resolve=>{open();dialog.addEventListener('close',resolve,{once:true});});}
 return {get isOpen(){return dialog.open;},open:openAndWait};
}
