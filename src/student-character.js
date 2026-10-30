import * as T from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';

// Alunos no estilo do Jogo_RPG_EF7: KayKit Adventurers 2.0 (CC0) editados no Blender (tools/build_kaykit_students.py).
// Cabeças e roupas de personagens diferentes dividem o esqueleto Rig_Medium; as animações vêm dos arquivos
// KayKit Character Animations e são ligadas aos ossos pelo nome, como no RPG.
// As cores são trocadas na placa de vídeo: cada atlas KayKit tem 8 × 4 blocos de cor, e cada bloco
// pertence a uma categoria (pele, cabelo, camiseta, detalhe, bermuda, tênis), recolorida mantendo o degradê.
export const APPEARANCE_KEY='ef-verso-alunos-v3';
const MODEL='/models/students/wardrobe-collection.glb',ANIM_FILES=['General','MovementBasic','MovementAdvanced','Simulation'];
const CAT={skin:1,hair:2,shirt:3,accent:4,pants:5,shoes:6,detail:7};
// Cor no centro de cada bloco (sRGB), na ordem bloco = coluna + linha × 8; e a categoria de cada bloco usado.
const ATLAS={
 rogue:{centers:'f6c09c 9b5a45 13191b 818c91 4a5155 b17052 9b5a45 6b5c53 096253 008353 818c91 818c91 4a5155 b17052 9b5a45 6b5c53 e7cdb4 008353 55b66a 9b5a45 b17052 9b5a45 6b5c53 9b5a45 55b66a ff7c1b bd0ef0 08b9d1 ed1f24 daae7d f6c09c f6c09c',
  cats:{0:'skin',1:'hair',8:'shirt',9:'accent',15:'pants',5:'pants',23:'accent',19:'shoes',6:'detail'}},
 ranger:{centers:'f6c09c 9b5a45 13191b 818c91 4a5155 e7cdb4 e7cdb4 7e5a49 257ebc 6b5c53 d4dbde 818c91 978f86 b17052 9b5a45 6b5c53 d4dbde 257ebc e7cdb4 7e5a49 978f86 978f86 8e8e8d 7e5a49 8e8e8d 8e8e8d 8e8e8d 8e8e8d 8e8e8d 8e8e8d 8e8e8d 8e8e8d',
  cats:{0:'skin',1:'hair',6:'shirt',5:'shirt',8:'accent',9:'accent',7:'pants',23:'accent',15:'pants',19:'shoes',3:'detail'}},
 mage:{centers:'f6c09c 1b191b 13191b 818c91 818c91 b45829 9b5a45 6b5c53 484471 484471 a41a5a 818c91 4a5155 9b5a45 6b5c53 2b294b d4dbde a41a5a 2f6c73 9b5a45 978f86 978f86 55b66a f6c09c f9aa4e b45829 d09745 4d6c82 ed1f24 daae7d f6c09c f6c09c',
  cats:{0:'skin',23:'skin',1:'hair',8:'shirt',4:'accent',15:'pants',5:'pants',19:'shoes',18:'detail'}},
 knight:{centers:'f6c09c daae7d 13191b 818c91 4a5155 b17052 9b5a45 818c91 d3252a d4dbde 818c91 818c91 e8b95c 9b5a45 6b5c53 4a5155 d4dbde 978f86 d3252a 9b5a45 978f86 978f86 8e8e8d 8e8e8d 8e8e8d 8e8e8d 8e8e8d 8e8e8d 8e8e8d 8e8e8d 8e8e8d 8e8e8d',
  cats:{0:'skin',1:'hair',3:'shirt',7:'accent',6:'pants',15:'pants',10:'detail',8:'accent',4:'detail'}},
 barbarian:{centers:'f6c09c 978f86 13191b 818c91 4a5155 b17052 9b5a45 6b5c53 ac665b 8e8e8d d4dbde 818c91 978f86 9b5a45 7e5a49 978f86 d4dbde d09745 4d6c82 6b5c53 978f86 978f86 8e8e8d 978f86 8e8e8d e7cdb4 8e8e8d 8e8e8d 8e8e8d 8e8e8d 8e8e8d 8e8e8d',
  cats:{0:'skin',1:'hair'}},
};
const linear=hex=>new T.Color('#'+hex.replace('#',''));
const luminance=c=>.2126*c.r+.7152*c.g+.0722*c.b;
for(const a of Object.values(ATLAS)){a.ref=a.centers.split(' ').map(h=>luminance(linear(h)));a.cat=new Array(32).fill(0);for(const [b,name] of Object.entries(a.cats))a.cat[b]=CAT[name];}

const STUDENT_HEADS=['head_castanho','head_loiro','head_ruiva','head_cabelo_preto','head_crespo','head_cacheado','head_bob','head_rabo','head_trancas','head_degrade'],STUDENT_BODIES=['body_camiseta','body_camisa_bandana','body_casaco','body_hoodie','body_bomber','body_gamer','body_football','body_basketball','body_saia'];
const ADULT_HEADS=['head_adulto_barba'],ADULT_BODIES=['body_adulto_colete'];
// Cada roupa de aluno existe em duas proporções de corpo (tools/build_body_gender_variants.py desloca
// ombro/quadril/altura sobre o MESMO esqueleto/roupa — não troca a roupa em si). O corpo adulto não
// tem variante: continua um único visual.
export const BODY_TYPES=['masc','fem'];
/** Nome da malha de verdade no modelo 3D para uma roupa (sufixo masc/fem só existe para alunos). */
function bodyMeshId(appearance){return STUDENT_BODIES.includes(appearance.body)?appearance.body+'_'+(appearance.bodyType||'masc'):appearance.body;}
const TONES={tone_1:'#f7d8bd',tone_2:'#f6c09c',tone_3:'#eab08a',tone_4:'#d99b73',tone_5:'#c08060',tone_6:'#9c6448',tone_7:'#7a4a35',tone_8:'#5c3726'};
export const TONE_SWATCHES=TONES;
export const PARTS={tone:Object.keys(TONES),head:STUDENT_HEADS,body:STUDENT_BODIES,glasses:['none','acc_glasses','acc_sunglasses','acc_glasses_square','acc_glasses_cat','acc_glasses_sport'],hearing:['none','acc_hearing','acc_hearing_pair','acc_hearing_compact','acc_hearing_recharge','acc_hearing_cord'],accessory:['none','acc_backpack','acc_bag_sport','acc_bag_gamer','acc_bag_satchel','acc_bag_hiking'],mobility:['none','acc_wheelchair','acc_chair_active','acc_chair_sport','acc_chair_comfort','acc_chair_urban'],expression:['none','expr_sorriso','expr_firme']};
export const PART_LABELS={tone:'Tom de pele',head:'Rosto e cabelo',body:'Roupa',glasses:'Óculos',hearing:'Audição',accessory:'Mochila',mobility:'Mobilidade',expression:'Expressão'};
export const ITEM_NAMES={head_castanho:'Cabelo curto',head_loiro:'Cabelo arrepiado',head_ruiva:'Cabelo comprido',head_cabelo_preto:'Cabelo liso longo',
 body_camiseta:'Camiseta e bermuda',body_camisa_bandana:'Camisa com bandana',body_casaco:'Casaco comprido',
 acc_glasses:'Óculos de grau',acc_sunglasses:'Óculos escuros',acc_hearing:'Aparelho auditivo',acc_backpack:'Mochila escolar',acc_wheelchair:'Cadeira de rodas'};
Object.assign(ITEM_NAMES,{
 head_crespo:'Crespo volumoso',head_cacheado:'Cacheado curto',head_bob:'Chanel com franja',head_rabo:'Rabo de cavalo',head_trancas:'Tranças duplas',head_degrade:'Degradê com topete',
 body_hoodie:'Moletom casual com bolso',body_bomber:'Jaqueta bomber com zíper',body_gamer:'Camiseta gamer PLAY',body_football:'Uniforme de futebol · 10',body_basketball:'Uniforme de basquete · 23',body_saia:'Saia esportiva (skort)',
 expr_sorriso:'Sorriso',expr_firme:'Determinado(a)',
 acc_glasses_square:'Armação retangular',acc_glasses_cat:'Armação gatinho',acc_glasses_sport:'Óculos esportivos',
 acc_bag_sport:'Mochila esportiva',acc_bag_gamer:'Mochila pixel gamer',acc_bag_satchel:'Bolsa carteiro',acc_bag_hiking:'Mochila de aventura',
 acc_hearing_pair:'Aparelhos bilaterais',acc_hearing_compact:'Aparelho compacto',acc_hearing_recharge:'Aparelho recarregável',acc_hearing_cord:'Aparelhos com cordão',
 acc_chair_active:'Cadeira de rodas ativa',acc_chair_sport:'Cadeira com aros esportivos',acc_chair_comfort:'Cadeira com apoios acolchoados',acc_chair_urban:'Cadeira urbana',
 masc:'Menino',fem:'Menina'
});
Object.keys(TONES).forEach((id,i)=>ITEM_NAMES[id]='Tom '+(i+1));
export const PALETTES={hairColor:['#2a2220','#4a2f22','#7a4a2c','#b0683c','#d9b46a','#8a8f99','#6b4fb8'],shirt:['#f4f1ea','#3176bd','#d94b45','#2fa36b','#f2c14e','#7b45c2','#ff8a3d'],accent:['#f2c14e','#3176bd','#d94b45','#2fa36b','#f4f1ea','#7b45c2'],pants:['#283a5c','#3e4552','#2b2f3a','#5c4a3a','#3176bd','#7b45c2'],shoes:['#f4f1ea','#2b2f3a','#d94b45','#3176bd','#f2c14e'],accessoryColor:['#713f9c','#3176bd','#279178','#de9a35','#ce5264','#263044']};
export const COLOR_LABELS={hairColor:'Cor do cabelo',shirt:'Cor da roupa',accent:'Cor do detalhe',pants:'Cor da bermuda ou calça',shoes:'Cor do tênis',accessoryColor:'Cor da mochila'};
export const CATEGORY_COLORS={head:'hairColor',body:['shirt','accent','pants','shoes'],accessory:'accessoryColor'};
export const DEFAULT_APPEARANCE={tone:'tone_3',head:'head_castanho',body:'body_camiseta',bodyType:'masc',glasses:'none',hearing:'none',accessory:'acc_backpack',mobility:'none',expression:'none',hairColor:'#4a2f22',shirt:'#f4f1ea',accent:'#3176bd',pants:'#283a5c',shoes:'#f4f1ea',accessoryColor:'#713f9c'};
const TEACHER={...DEFAULT_APPEARANCE,tone:'tone_4',head:'head_cabelo_preto',body:'body_camisa_bandana',bodyType:'fem',accessory:'none',hairColor:'#2a2220',shirt:'#7b45c2',accent:'#f2c14e',pants:'#2b2f3a',shoes:'#f4f1ea',whistle:true};
export function optionsFor(category){return PARTS[category];}
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
 const adult=index%3===2,pick=(list,k)=>list[(index*k)%list.length],P=PALETTES;
 // Só as 5 primeiras cores (castanhos/preto) entram no sorteio automático: as duas últimas (cinza,
 // roxo) ficam só para quem escolhe no guarda-roupa — num penteado grande (crespo/cacheado), que cobre
 // quase a cabeça toda com bolhas sem padrão de fio, uma cor lisa e fria "apaga" o rosto e parece um
 // capacete quebrado em vez de cabelo.
 return {adult,look:{tone:pick(PARTS.tone,3),head:adult&&index%2?pick(ADULT_HEADS,1):pick(STUDENT_HEADS,5),body:adult?pick([...ADULT_BODIES,...STUDENT_BODIES],3):pick(STUDENT_BODIES,7),
  bodyType:index%2?'fem':'masc',
  glasses:index%5===0?'acc_glasses':index%11===4?'acc_sunglasses':'none',hearing:index%9===3?'acc_hearing':'none',accessory:!adult&&index%2===0?'acc_backpack':'none',mobility:index%10===6?'acc_wheelchair':'none',
  expression:index%4===0?'expr_sorriso':index%7===0?'expr_firme':'none',
  hairColor:pick(P.hairColor.slice(0,5),5),shirt:pick(P.shirt,3),accent:pick(P.accent,5),pants:pick(P.pants,7),shoes:pick(P.shoes,3),accessoryColor:pick(P.accessoryColor,1)}};
}
// Recoloração por bloco do atlas, no fragment shader (o mesmo programa para todos os alunos).
function recolorable(material,atlas){
 const m=material.clone();m.userData.atlas=atlas;m.userData.colors=Array.from({length:8},()=>new T.Color(1,1,1));
 m.onBeforeCompile=shader=>{
  shader.uniforms.uCat={value:atlas.cat};shader.uniforms.uRef={value:atlas.ref};shader.uniforms.uCol={value:m.userData.colors};
  shader.fragmentShader='uniform float uCat[32];\nuniform float uRef[32];\nuniform vec3 uCol[8];\n'+shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
  #ifdef USE_MAP
   int blockIndex=int(clamp(floor(vMapUv.x*8.0),0.0,7.0))+int(clamp(floor(vMapUv.y*4.0),0.0,3.0))*8;
   int category=int(uCat[blockIndex]+.5);
   if(category>0){float l=dot(sampledDiffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=uCol[category]*clamp(l/max(uRef[blockIndex],.001),.45,1.5);}
  #endif`);
 };
 m.customProgramCacheKey=()=>'ef-verso-kaykit-recolor';
 return m;
}
const ARMS=/^(upperarm|lowerarm|wrist|hand|handslot)[lr]\./;
function compose(name,base,arms){return new T.AnimationClip(name,Math.max(base.duration,arms.duration),[...base.tracks.filter(t=>!ARMS.test(t.name)).map(t=>t.clone()),...arms.tracks.filter(t=>ARMS.test(t.name)).map(t=>t.clone())]);}
let sources;
/** Tempos do clipe Throw (KayKit): começo do balanço, braço armado e momento em que a bola sai da mão. */
export const THROW={windup:.28,cocked:.6,release:.66};
export async function createCharacter(loader,role='student',height=role.includes('teacher')?2:1.75){
 sources??=Promise.all([loader.loadAsync(MODEL),...ANIM_FILES.map(f=>loader.loadAsync('/models/students/anims/'+f+'.glb'))]);
 const [file,...animFiles]=await sources,visual=new T.Group(),model=clone(file.scene),holder=new T.Group();
 visual.userData.character=true;
 holder.rotation.y=Math.PI;holder.add(model);visual.add(holder);
 const parts={},recolor=[],tinted=[],wear=[],named=new Set([...Object.entries(PARTS).filter(([key])=>key!=='tone').flatMap(([key,ids])=>ids.filter(id=>id!=='none').flatMap(id=>key==='body'?BODY_TYPES.map(t=>id+'_'+t):[id])),...ADULT_HEADS,...ADULT_BODIES,'acc_whistle']);
 model.traverse(o=>{
  if(named.has(o.name)&&!parts[o.name])parts[o.name]=o;
  if(!o.isMesh)return;o.frustumCulled=false;o.castShadow=true;
  function prepare(mat){
   const atlas=ATLAS[mat.name.replace(/\.\d+$/,'')];
   if(atlas&&mat.map){const m=recolorable(mat,atlas);recolor.push(m);return m;}
   if(mat.name==='acc_backpack'){const m=mat.clone();tinted.push(m);return m;}
   const field=mat.name.match(/^Wear_(shirt|accent|hairColor|accessoryColor)(?:\.\d+)?$/)?.[1];
   if(field){const m=mat.clone();wear.push({m,field});return m;}
   return mat;
  }
  o.material=Array.isArray(o.material)?o.material.map(prepare):prepare(o.material);
 });
 for(const id of named)if(!parts[id])throw Error('Missing student part: '+id);
 // Altura medida na pose de repouso, com cabeça e roupa de referência.
 model.updateMatrixWorld(true);const ref=new T.Box3().setFromObject(parts.head_castanho).union(new T.Box3().setFromObject(parts.body_camiseta_masc));
 const scale=height/ref.getSize(new T.Vector3()).y;model.scale.setScalar(scale);model.position.y=-ref.min.y*scale+.04;
 const raw=new Map();for(const f of animFiles)for(const c of f.animations)raw.set(c.name,c);
 for(const n of ['Idle_A','Walking_A','Running_A','Jump_Idle','Throw','Sit_Chair_Idle'])if(!raw.has(n))throw Error('Missing student animation: '+n);
 raw.set('Wheel_Throw',compose('Wheel_Throw',raw.get('Sit_Chair_Idle'),raw.get('Throw')));
 const mixer=new T.AnimationMixer(model),actions=new Map([...raw].map(([n,c])=>[n,mixer.clipAction(c)]));
 for(const n of ['Throw','Wheel_Throw']){const a=actions.get(n);a.setLoop(T.LoopOnce,1);a.clampWhenFinished=true;}
 const hands=[model.getObjectByName('hand_left'),model.getObjectByName('hand_right')];
 let appearance,state='idle',current=null,clipName='';
 function setAppearance(value,free=role!=='student'&&role!=='preview'&&role!=='catalogue'){
  appearance=normalizeAppearance(value,free);
  const bodyId=bodyMeshId(appearance);
  for(const [id,o] of Object.entries(parts))o.visible=id===appearance.head||id===bodyId||(id==='acc_whistle'&&appearance.whistle)||Object.values(appearance).includes(id);
  const colors=[null,TONES[appearance.tone],appearance.hairColor,appearance.shirt,appearance.accent,appearance.pants,appearance.shoes,'#4a4f5a'];
  for(const m of recolor)colors.forEach((c,i)=>{if(c)m.userData.colors[i].set(c);});
  for(const m of tinted)m.color.set(appearance.accessoryColor);
  for(const {m,field} of wear)m.color.set(appearance[field]);
 }
 setAppearance(role.includes('teacher')?TEACHER:role==='student'||role==='preview'?readAppearance():DEFAULT_APPEARANCE);
 function measure(item){visual.updateMatrixWorld(true);const box=new T.Box3();item.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();o.computeBoundingBox();box.union(o.boundingBox.clone().applyMatrix4(o.matrixWorld));}else if(o.isMesh)box.expandByObject(o);});return box;}
 /** Prévia de uma peça para o catálogo: mostra só o necessário e devolve o enquadramento. */
 function showItem(id){
  const look={...DEFAULT_APPEARANCE,accessory:'none'};
  const category=Object.keys(PARTS).find(key=>PARTS[key].includes(id));if(category)look[category]=id;
  setAppearance(look);update(.3);
  // Clothing cards show the complete student too. Hiding the head made the
  // wardrobe look broken and left mutable visibility state in the catalogue actor.
  if(id.startsWith('body_'))return measure(parts[bodyMeshId(look)]).union(measure(parts[look.head]));
  if(category==='accessory'||category==='mobility')return measure(model);
  return measure(parts[look.head]);
 }
 function play(name,fade=.18){if(name===clipName)return;const action=actions.get(name);action.reset().play();if(current)current.crossFadeTo(action,fade,false);current=action;clipName=name;}
 function update(dt,{speed=0,airborne=false,holding=false,throwing=false,charge=0,riding='walk'}={}){
  const wheel=appearance.mobility!=='none';
  state=throwing?'holding-both-shoot':airborne?'jump':holding?'holding-both':speed>8?'sprint':speed>.2?'walk':'idle';
  // No skate, uma postura agachada (sem clipe de empurrar o skate no pacote) pelo menos muda quando
  // anda, em vez de ficar parado em pé "flutuando" sobre a prancha com o skate em movimento.
  const next=throwing||holding?(wheel?'Wheel_Throw':'Throw'):wheel||riding==='bike'?'Sit_Chair_Idle':airborne?'Jump_Idle':riding==='skate'?(speed>.3?'Crouching':'Idle_A'):speed>8?'Running_A':speed>.2?'Walking_A':'Idle_A';
  play(next,throwing?.05:.18);
  // Carregando o arremesso: quanto mais força, mais o braço vai para trás (balanço de 0,28 s a 0,6 s do Throw).
  if(holding&&!throwing){current.paused=false;current.time=THROW.windup+charge*(THROW.cocked-THROW.windup);}
  current.timeScale=next==='Walking_A'?Math.min(1.7,Math.max(.6,speed/3.4)):next==='Running_A'?Math.min(1.4,Math.max(.8,speed/9)):1;
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
