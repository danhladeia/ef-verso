import * as T from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';

// Alunos a partir do Kenney Mini Characters (CC0, tools/build_kenney_students.py): esqueleto de 7
// ossos (root, torso, head, arm-left/right, leg-left/right) e as 32 animações do pacote, religadas
// num só modelo — cada cabeça e cada roupa viram peças soltas e combináveis, do mesmo jeito que o
// guarda-roupa já funcionava antes. Ao contrário do pacote anterior, aqui as roupas/cabelos já vêm
// coloridos de fábrica (sem receita de recolorir no shader) — a única cor trocável é a da mochila.
export const APPEARANCE_KEY='ef-verso-alunos-v4';
const MODEL='/models/students/kenney-alunos.glb';

// Os 12 personagens do pacote cobrem papéis bem variados (de policial a cozinheiro); só os 6 com
// cara mais jovem (3 meninas, 3 meninos) entram como opção de aluno — os outros 6, de aparência mais
// adulta, formam o grupo usado para a professora e os moradores adultos.
export const STUDENT_HEADS=['head_female-b','head_female-c','head_female-f','head_male-a','head_male-e','head_male-f'];
export const STUDENT_BODIES=['body_female-b','body_female-c','body_female-f','body_male-a','body_male-e','body_male-f'];
const ADULT_HEADS=['head_female-a','head_female-d','head_female-e','head_male-b','head_male-c','head_male-d'];
const ADULT_BODIES=['body_female-a','body_female-d','body_female-e','body_male-b','body_male-c','body_male-d'];
export const BODY_TYPES=['masc','fem'];

export const PARTS={head:STUDENT_HEADS,body:STUDENT_BODIES,glasses:['none','acc_glasses','acc_sunglasses'],hearing:['none','acc_hearing'],accessory:['none','acc_backpack'],mobility:['none','acc_wheelchair']};
export const PART_LABELS={head:'Rosto e cabelo',body:'Roupa',glasses:'Óculos',hearing:'Audição',accessory:'Mochila',mobility:'Mobilidade'};
export const ITEM_NAMES={
 'head_female-b':'Coque duplo','head_female-c':'Laço azul','head_female-f':'Tranças e macacão',
 'head_male-a':'Cabelo cacheado e óculos','head_male-e':'Colete de trilha','head_male-f':'Cabelo curto',
 'body_female-b':'Camiseta amarela','body_female-c':'Vestido esportivo','body_female-f':'Macacão jardineira',
 'body_male-a':'Camiseta verde e óculos','body_male-e':'Colete de aventura','body_male-f':'Camiseta verde-escura',
 'head_female-a':'Artes marciais','head_female-d':'Uniforme de serviço','head_female-e':'Jaleco',
 'head_male-b':'Veterano','head_male-c':'Uniforme','head_male-d':'Terno',
 'body_female-a':'Artes marciais','body_female-d':'Uniforme de serviço','body_female-e':'Jaleco',
 'body_male-b':'Veterano','body_male-c':'Uniforme','body_male-d':'Terno',
 acc_glasses:'Óculos de grau',acc_sunglasses:'Óculos escuros',acc_hearing:'Aparelho auditivo',acc_backpack:'Mochila escolar',acc_wheelchair:'Cadeira de rodas',
 masc:'Menino',fem:'Menina'
};
export const PALETTES={accessoryColor:['#713f9c','#3176bd','#279178','#de9a35','#ce5264','#263044']};
export const COLOR_LABELS={accessoryColor:'Cor da mochila'};
export const CATEGORY_COLORS={accessory:'accessoryColor'};
export const DEFAULT_APPEARANCE={head:'head_male-a',body:'body_male-a',bodyType:'masc',glasses:'none',hearing:'none',accessory:'acc_backpack',mobility:'none',accessoryColor:'#713f9c'};
const TEACHER={...DEFAULT_APPEARANCE,head:'head_female-e',body:'body_female-e',bodyType:'fem',accessory:'none',whistle:true};
/** As opções de cabeça/roupa mudam conforme Menino/Menina — as demais categorias (óculos, mochila…)
 * continuam as mesmas para os dois. */
export function optionsFor(category,appearance){
 if((category==='head'||category==='body')&&appearance){
  const pool=category==='head'?STUDENT_HEADS:STUDENT_BODIES,tag=appearance.bodyType==='fem'?'female':'male';
  return pool.filter(id=>id.includes('_'+tag+'-'));
 }
 return PARTS[category];
}
export function normalizeAppearance(value,free=false){
 const a={...DEFAULT_APPEARANCE};
 for(const key of Object.keys(PARTS)){const extra=free?{head:ADULT_HEADS,body:ADULT_BODIES}[key]||[]:[];if([...PARTS[key],...extra].includes(value?.[key]))a[key]=value[key];}
 for(const [key,choices] of Object.entries(PALETTES))if(choices.includes(value?.[key])||(free&&/^#[0-9a-f]{6}$/i.test(value?.[key]||'')))a[key]=value[key];
 a.bodyType=BODY_TYPES.includes(value?.bodyType)?value.bodyType:'masc';
 a.whistle=free&&!!value?.whistle;return a;
}
export function readAppearance(){try{return normalizeAppearance(JSON.parse(localStorage.getItem(APPEARANCE_KEY)));}catch{return {...DEFAULT_APPEARANCE};}}
/** Aparência variada e determinística para os moradores: crianças, adultos e acessibilidade. */
export function residentAppearance(index){
 const adult=index%3===2,pick=(list,k)=>list[(index*k)%list.length],P=PALETTES,fem=index%2===1;
 const headPool=adult?ADULT_HEADS:STUDENT_HEADS.filter(id=>id.includes(fem?'_female-':'_male-'));
 const bodyPool=adult?ADULT_BODIES:STUDENT_BODIES.filter(id=>id.includes(fem?'_female-':'_male-'));
 return {adult,look:{head:pick(headPool,5),body:pick(bodyPool,7),bodyType:fem?'fem':'masc',
  glasses:index%5===0?'acc_glasses':index%11===4?'acc_sunglasses':'none',hearing:index%9===3?'acc_hearing':'none',accessory:!adult&&index%2===0?'acc_backpack':'none',mobility:index%10===6?'acc_wheelchair':'none',
  accessoryColor:pick(P.accessoryColor,1)}};
}
const ARMS=/arm-(left|right)/;
function compose(name,base,arms){return new T.AnimationClip(name,Math.max(base.duration,arms.duration),[...base.tracks.filter(t=>!ARMS.test(t.name)).map(t=>t.clone()),...arms.tracks.filter(t=>ARMS.test(t.name)).map(t=>t.clone())]);}
let sources;
/** Delay fixo (s) entre soltar o arremesso e a bola sair da mão — o clipe de arremesso do Kenney é
 * curto (sem balanço progressivo pra carregar), então não depende mais da força carregada. */
export const THROW={windup:0,cocked:0,release:.08};
export async function createCharacter(loader,role='student',height=role.includes('teacher')?2:1.75){
 sources??=loader.loadAsync(MODEL);
 const file=await sources,visual=new T.Group(),model=clone(file.scene),holder=new T.Group();
 visual.userData.character=true;
 holder.rotation.y=Math.PI;holder.add(model);visual.add(holder);
 const parts={},tinted=[],named=new Set([...STUDENT_HEADS,...STUDENT_BODIES,...ADULT_HEADS,...ADULT_BODIES,'acc_glasses','acc_sunglasses','acc_hearing','acc_wheelchair','acc_backpack','acc_whistle']);
 model.traverse(o=>{
  if(named.has(o.name)&&!parts[o.name])parts[o.name]=o;
  if(!o.isMesh)return;o.frustumCulled=false;o.castShadow=true;
  function prepare(mat){
   if(mat.name==='acc_backpack'){const m=mat.clone();tinted.push(m);return m;}
   return mat;
  }
  o.material=Array.isArray(o.material)?o.material.map(prepare):prepare(o.material);
 });
 for(const id of named)if(!parts[id])throw Error('Missing student part: '+id);
 // Altura medida na pose de repouso, com cabeça e roupa de referência.
 model.updateMatrixWorld(true);const ref=new T.Box3().setFromObject(parts['head_male-a']).union(new T.Box3().setFromObject(parts['body_male-a']));
 const scale=height/ref.getSize(new T.Vector3()).y;model.scale.setScalar(scale);model.position.y=-ref.min.y*scale+.04;
 const raw=new Map();for(const c of file.animations)raw.set(c.name,c);
 for(const n of ['idle','walk','sprint','jump','holding-both','holding-both-shoot','wheelchair-sit','wheelchair-move-forward','crouch','sit'])if(!raw.has(n))throw Error('Missing student animation: '+n);
 raw.set('wheelchair-throw',compose('wheelchair-throw',raw.get('wheelchair-sit'),raw.get('holding-both-shoot')));
 const mixer=new T.AnimationMixer(model),actions=new Map([...raw].map(([n,c])=>[n,mixer.clipAction(c)]));
 for(const n of ['holding-both-shoot','wheelchair-throw']){const a=actions.get(n);a.setLoop(T.LoopOnce,1);a.clampWhenFinished=true;}
 const hands=[model.getObjectByName('hand_left'),model.getObjectByName('hand_right')];
 let appearance,state='idle',current=null,clipName='';
 function setAppearance(value,free=role!=='student'&&role!=='preview'&&role!=='catalogue'){
  appearance=normalizeAppearance(value,free);
  for(const [id,o] of Object.entries(parts))o.visible=id===appearance.head||id===appearance.body||(id==='acc_whistle'&&appearance.whistle)||Object.values(appearance).includes(id);
  for(const m of tinted)m.color.set(appearance.accessoryColor);
 }
 setAppearance(role.includes('teacher')?TEACHER:role==='student'||role==='preview'?readAppearance():DEFAULT_APPEARANCE);
 function measure(item){visual.updateMatrixWorld(true);const box=new T.Box3();item.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();o.computeBoundingBox();box.union(o.boundingBox.clone().applyMatrix4(o.matrixWorld));}else if(o.isMesh)box.expandByObject(o);});return box;}
 /** Prévia de uma peça para o catálogo: mostra só o necessário e devolve o enquadramento. */
 function showItem(id){
  const look={...DEFAULT_APPEARANCE,accessory:'none'};
  const category=Object.keys(PARTS).find(key=>PARTS[key].includes(id));if(category)look[category]=id;
  setAppearance(look);update(.3);
  if(id.startsWith('body_'))return measure(parts[look.body]).union(measure(parts[look.head]));
  if(category==='accessory'||category==='mobility')return measure(model);
  return measure(parts[look.head]);
 }
 function play(name,fade=.18){if(name===clipName)return;const action=actions.get(name);action.reset().play();if(current)current.crossFadeTo(action,fade,false);current=action;clipName=name;}
 function update(dt,{speed=0,airborne=false,holding=false,throwing=false,charge=0,riding='walk'}={}){
  const wheel=appearance.mobility!=='none';
  state=throwing?'holding-both-shoot':airborne?'jump':holding?'holding-both':speed>8?'sprint':speed>.2?'walk':'idle';
  const next=throwing?(wheel?'wheelchair-throw':'holding-both-shoot')
   :holding?(wheel?'wheelchair-sit':'holding-both')
   :wheel?(speed>.3?'wheelchair-move-forward':'wheelchair-sit')
   :riding==='bike'?'sit'
   :airborne?'jump'
   :riding==='skate'?(speed>.3?'crouch':'idle')
   :speed>8?'sprint':speed>.2?'walk':'idle';
  play(next,throwing?.05:.18);
  current.timeScale=next==='walk'?Math.min(1.7,Math.max(.6,speed/3.4)):next==='sprint'?Math.min(1.4,Math.max(.8,speed/9)):1;
  mixer.update(dt);
 }
 update(0);
 return {visual,setAppearance,showItem,update,
  get rightHand(){visual.updateMatrixWorld(true);return hands[1].getWorldPosition(new T.Vector3());},
  get handPosition(){visual.updateMatrixWorld(true);return hands[0].getWorldPosition(new T.Vector3()).add(hands[1].getWorldPosition(new T.Vector3())).multiplyScalar(.5);},
  get appearance(){return {...appearance};},
  get poseSample(){visual.updateMatrixWorld(true);return Object.fromEntries(Object.entries({head:parts[appearance.head],hand_l:hands[0],hand_r:hands[1]}).map(([k,o])=>[k,visual.worldToLocal(o.getWorldPosition(new T.Vector3())).toArray()]));},
  animations:[...raw.keys()],get state(){return state;}};
}
