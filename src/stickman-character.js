import * as T from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';

export const APPEARANCE_KEY='ef-verso-stickman-v1';
const numbered=(prefix,count)=>Array.from({length:count},(_,i)=>`${prefix}_${String(i+1).padStart(2,'0')}`);
export const PARTS={face:numbered('Face',11),top:numbered('Top',9),bottom:numbered('Pants',9),footwear:['Shoes_01','Shoes_04','Shoes_07','Shoes_12','Shoes_16','Shoes_20','Shoes_23','Shoes_27'],hat:['none',...numbered('Hat',47)],glasses:['none','Glasses_01','Glasses_03','Glasses_07','Glasses_09','Glasses_14','Glasses_18','Glasses_21']};
export const PART_LABELS={face:'Expressão',top:'Roupa',bottom:'Calça ou bermuda',footwear:'Calçados',hat:'Chapéu ou acessório',glasses:'Óculos'};
export const PALETTES={bodyColor:['#ffcf32','#f4ece0','#323449','#ed91ba','#58bfe8','#8dd85f','#d39a73'],shirt:['#3176bd','#713f9c','#279178','#de9a35','#ce5264','#f1eee5'],pants:['#28374c','#3e4552','#594536','#253e40','#6c5190'],shoes:['#e5e9ed','#29313d','#b9443d'],accessoryColor:['#ce5264','#3176bd','#713f9c','#e5b64d','#263044'],glassesColor:['#29313d','#f1eee5','#ce5264']};
export const COLOR_LABELS={bodyColor:'Cor do Stickman',shirt:'Cor da roupa',pants:'Cor da calça',shoes:'Cor dos calçados',accessoryColor:'Cor do acessório',glassesColor:'Cor dos óculos'};
export const DEFAULT_APPEARANCE={face:'Face_01',top:'Top_01',bottom:'Pants_04',footwear:'Shoes_01',hat:'none',glasses:'none',bodyColor:'#ffcf32',shirt:'#3176bd',pants:'#28374c',shoes:'#e5e9ed',accessoryColor:'#ce5264',glassesColor:'#29313d'};
export function normalizeAppearance(value){const a={...DEFAULT_APPEARANCE};if(value&&typeof value==='object'){for(const [key,choices] of Object.entries({...PARTS,...PALETTES}))if(choices.includes(value[key]))a[key]=value[key];}return a;}
export function readAppearance(){try{return normalizeAppearance(JSON.parse(localStorage.getItem(APPEARANCE_KEY)));}catch{return {...DEFAULT_APPEARANCE};}}
let source;
export async function createCharacter(loader,role='student',height=2){
 source??=loader.loadAsync('/models/stickman/character.glb');const file=await source,model=clone(file.scene),visual=new T.Group(),holder=new T.Group();holder.rotation.y=Math.PI;holder.add(model);visual.add(holder);
 const bounds=new T.Box3();bounds.expandByObject(model.getObjectByName('Body'));bounds.expandByObject(model.getObjectByName('Face_01'));const scale=height/bounds.getSize(new T.Vector3()).y;model.scale.setScalar(scale);model.position.y=-bounds.min.y*scale+.1;
 const materials=[];model.traverse(o=>{if(o.isMesh){o.frustumCulled=false;o.castShadow=true;o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();materials.push(...(Array.isArray(o.material)?o.material:[o.material]));}});
 const clips=file.animations.map(c=>{
  const result=c.clone();for(const track of result.tracks){if(track.name==='root_x.position'){for(let i=0;i<track.values.length;i+=3){track.values[i]=track.values[0];track.values[i+2]=track.values[2];if(c.name==='jump')track.values[i+1]=track.values[1];}}}return result;
 });
 const mixer=new T.AnimationMixer(model),actions=new Map(clips.map(c=>[c.name,mixer.clipAction(c)]));
 for(const required of ['idle','walk','run','jump','push'])if(!actions.has(required))throw Error('Missing Stickman animation: '+required);
 let appearance,current,clipName='',state='idle',releaseTime=0;
 function setAppearance(value){model.getObjectByName('Body').visible=true;appearance=normalizeAppearance(value);for(const [category,ids] of Object.entries(PARTS))for(const id of ids){if(id==='none')continue;const item=model.getObjectByName(id);if(!item)throw Error('Missing Stickman part: '+id);item.visible=appearance[category]===id;}
  for(const m of materials){const type=m.name.replace(/\.\d+$/,'').replace('Stickman_',''),key={body:'bodyColor',top:'shirt',bottom:'pants',footwear:'shoes',hat:'accessoryColor',glasses:'glassesColor'}[type];if(key)m.color.set(appearance[key]);}
 }
 setAppearance(role.includes('teacher')?{...DEFAULT_APPEARANCE,face:'Face_02',top:'Top_04',bottom:'Pants_01',shirt:'#713f9c',glasses:'Glasses_03'}:readAppearance());
 function showItem(id){
  model.getObjectByName('Body').visible=false;
  for(const ids of Object.values(PARTS))for(const n of ids)if(n!=='none')model.getObjectByName(n).visible=n===id;
  visual.updateMatrixWorld(true);model.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();o.computeBoundingBox();}});
  return new T.Box3().setFromObject(model.getObjectByName(id));
 }
 return {visual,setAppearance,showItem,get handPosition(){model.updateMatrixWorld(true);return model.getObjectByName('hand_l').getWorldPosition(new T.Vector3()).add(model.getObjectByName('hand_r').getWorldPosition(new T.Vector3())).multiplyScalar(.5);},get appearance(){return {...appearance};},get poseSample(){model.updateMatrixWorld(true);return Object.fromEntries(['head_x','hand_l','hand_r','foot_l'].map(n=>[n,visual.worldToLocal(model.getObjectByName(n).getWorldPosition(new T.Vector3())).toArray()]));},animations:clips.map(c=>c.name),get state(){return state;},update(dt,{speed=0,airborne=false,holding=false,throwing=false}={}){
  state=throwing?'holding-both-shoot':airborne?'jump':holding?'holding-both':speed>8?'sprint':speed>.2?'walk':'idle';const next=holding||throwing?'push':airborne?'jump':speed>8?'run':speed>.2?'walk':'idle';
  if(next!==clipName){const action=actions.get(next);action.reset().play();if(current)current.crossFadeTo(action,.16,false);current=action;clipName=next;}
  releaseTime=throwing?releaseTime+dt:0;current.timeScale=next==='push'?0:next==='jump'?2:next==='walk'?Math.min(1.6,Math.max(.8,speed/4)):1;if(next==='push')current.time=.4+Math.min(.6,releaseTime);mixer.update(dt);
 }};
}
