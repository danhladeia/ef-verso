import './travel.css';
const KEY='ef-verso-controls-v1';
export const DEFAULT_CONTROLS={forward:'w',back:'s',left:'a',right:'d',sprint:'shift',jump:' ',interact:'e',camera:'c',mirror:'h',travel:'v'};
const LABELS={forward:'Avançar',back:'Recuar',left:'Esquerda',right:'Direita',sprint:'Correr',jump:'Pular',interact:'Interagir',camera:'Trocar câmera',mirror:'Olhar de frente',travel:'Trocar transporte'};
const display=k=>k===' '?'Espaço':k==='shift'?'Shift':k.toUpperCase();
export function createSettings({stopMovement,canOpen}){
 let value={keys:{...DEFAULT_CONTROLS},sensitivity:.004,invert:false,mouse:'drag',strafe:false};
 try{const saved=JSON.parse(localStorage.getItem(KEY));if(saved){for(const [a,k] of Object.entries(saved.keys||{}))if(a in DEFAULT_CONTROLS&&typeof k==='string')value.keys[a]=k;for(const k of ['invert','strafe'])if(typeof saved[k]==='boolean')value[k]=saved[k];if(['drag','lock'].includes(saved.mouse))value.mouse=saved.mouse;if(Number.isFinite(saved.sensitivity))value.sensitivity=Math.min(.012,Math.max(.001,saved.sensitivity));}}catch{}
 const button=document.createElement('button');button.id='settings-open';button.textContent='Configurações';document.querySelector('header').append(button);
 const panel=document.createElement('dialog');panel.id='settings-dialog';panel.className='city-dialog';panel.setAttribute('aria-label','Configurações de controles');document.body.append(panel);
 let pending=null,draft;
 function refreshHelp(){const f=document.querySelector('footer');if(f)f.textContent=`${['forward','left','back','right'].map(a=>display(value.keys[a])).join('/')}: mover · ${display(value.keys.camera)}: câmera · ${display(value.keys.interact)}: interagir · ${display(value.keys.travel)}: transporte · mouse: olhar · roda: zoom`;}
 refreshHelp();
 function render(){panel.innerHTML=`<h2>Controles da cidade</h2><p>Escolha uma ação e pressione a nova tecla. As setas também movimentam o personagem.</p><div class="binding-grid">${Object.entries(LABELS).map(([a,label])=>`<label>${label}<button type="button" data-binding="${a}">${pending===a?'Pressione uma tecla…':display(draft.keys[a])}</button></label>`).join('')}</div><label>Câmera com mouse <select id="mouse-mode"><option value="drag">Arrastar no cenário</option><option value="lock">Clique para capturar o mouse · Esc libera</option></select></label><label>Sensibilidade <input id="mouse-sensitivity" type="range" min="1" max="12" value="${draft.sensitivity*1000}"></label><label><input id="mouse-invert" type="checkbox" ${draft.invert?'checked':''}> Inverter movimento vertical</label><label><input id="city-strafe" type="checkbox" ${draft.strafe?'checked':''}> A/D movimentam de lado na 3ª pessoa</label><p id="binding-message" role="status"></p><div class="dialog-actions"><button id="controls-reset">Restaurar padrão</button><button id="settings-cancel">Cancelar</button><button id="settings-save">Salvar</button></div>`;
  panel.querySelector('#mouse-mode').value=draft.mouse;
  panel.querySelectorAll('[data-binding]').forEach(b=>b.onclick=()=>{read();pending=b.dataset.binding;render();});
  panel.querySelector('#controls-reset').onclick=()=>{draft={keys:{...DEFAULT_CONTROLS},sensitivity:.004,invert:false,mouse:'drag',strafe:false};pending=null;render();};
  panel.querySelector('#settings-cancel').onclick=()=>panel.close();
  panel.querySelector('#settings-save').onclick=()=>{read();value=draft;try{localStorage.setItem(KEY,JSON.stringify(value));}catch{}refreshHelp();panel.close();};
 }
 function read(){if(!panel.querySelector('#mouse-mode'))return;draft.mouse=panel.querySelector('#mouse-mode').value;draft.sensitivity=+panel.querySelector('#mouse-sensitivity').value/1000;draft.invert=panel.querySelector('#mouse-invert').checked;draft.strafe=panel.querySelector('#city-strafe').checked;}
 button.onclick=()=>{if(!canOpen())return;document.exitPointerLock?.();stopMovement();draft=structuredClone(value);pending=null;render();panel.showModal();};
 document.addEventListener('keydown',e=>{if(!panel.open||!pending)return;e.preventDefault();e.stopPropagation();if(e.key==='Escape'){pending=null;render();return;}const key=e.key.toLowerCase();if(['control','alt','meta','tab','enter'].includes(key))return;const conflict=Object.keys(draft.keys).find(a=>a!==pending&&draft.keys[a]===key);if(conflict){panel.querySelector('#binding-message').textContent='Essa tecla já está em uso por '+LABELS[conflict]+'.';return;}draft.keys[pending]=key;pending=null;render();},true);
 panel.addEventListener('close',stopMovement);
 return {get isOpen(){return panel.open;},get value(){return value;},key(action){return value.keys[action];},pressed(keys,action){return keys.has(value.keys[action]);}};
}
