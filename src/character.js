import * as T from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';

export const APPEARANCE_KEY='ef-verso-avatar-v1';
export const PALETTES={skin:['#f1c6a5','#d9a174','#b8784e','#875137','#503426'],hairColor:['#241810','#543524','#92552d','#d5b268','#46312b'],shirt:['#3176bd','#713f9c','#279178','#de9a35','#ce5264','#f1eee5'],pants:['#28374c','#3e4552','#594536','#253e40','#6c5190'],shoes:['#e5e9ed','#29313d','#b9443d']};
export const DEFAULT_APPEARANCE={body:'male',hair:'simpleparted',skin:'#b8784e',hairColor:'#241810',shirt:'#3176bd',pants:'#28374c',shoes:'#e5e9ed'};
export function normalizeAppearance(value){const result={...DEFAULT_APPEARANCE};if(!value||typeof value!=='object')return result;if(['male','female'].includes(value.body))result.body=value.body;if(['simpleparted','buzzed','long','buns','none'].includes(value.hair))result.hair=value.hair;for(const key of Object.keys(PALETTES))if(PALETTES[key].includes(value[key]))result[key]=value[key];return result;}
export function readAppearance(){try{return normalizeAppearance(JSON.parse(localStorage.getItem(APPEARANCE_KEY)));}catch{return {...DEFAULT_APPEARANCE};}}
const cache=new Map();
function source(loader,name){if(!cache.has(name))cache.set(name,loader.loadAsync('/models/avatars/'+name+'.glb'));return cache.get(name);}
export async function createCharacter(loader,role='student',height=2){
 const teacher=role.includes('teacher'),initial=teacher?{...DEFAULT_APPEARANCE,body:'female',hair:'buns',skin:'#d9a174',shirt:'#713f9c',pants:'#3e4552'}:readAppearance();
 const [male,female,movement,...hairSources]=await Promise.all(['male','female','movement','hair-simpleparted','hair-buzzed','hair-long','hair-buns'].map(n=>source(loader,n)));
 if(!cache.has('bind'))cache.set('bind',fetch('/models/avatars/hair-bind.json').then(r=>{if(!r.ok)throw Error('Hair bind unavailable');return r.json();}));const binds=await cache.get('bind');
 const names=['simpleparted','buzzed','long','buns'],visual=new T.Group(),variants={};
 // Rotation-only clips preserve each body's own bone lengths.
 const clips=movement.animations.map(c=>new T.AnimationClip(c.name,c.duration,c.tracks.filter(t=>t.name.endsWith('.quaternion')).map(t=>t.clone())));
 for(const [type,file] of [['male',male],['female',female]]){
  const model=clone(file.scene),holder=new T.Group();holder.rotation.y=Math.PI;holder.add(model);visual.add(holder);
  const bounds=new T.Box3().setFromObject(model),scale=height/bounds.getSize(new T.Vector3()).y;model.scale.setScalar(scale);model.position.y=-bounds.min.y*scale+.1;
  const materials=[];model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.frustumCulled=false;o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();materials.push(...(Array.isArray(o.material)?o.material:[o.material]));}});
  const head=model.getObjectByName('Head'),hairs={};
  hairSources.forEach((file,i)=>{const h=file.scene.clone(true);h.applyMatrix4(new T.Matrix4().fromArray(binds[i<2?'male':'female']).invert());h.traverse(o=>{if(o.isMesh){o.material=o.material.clone();materials.push(o.material);o.castShadow=true;}});head.add(h);hairs[names[i]]=h;});
  const mixer=new T.AnimationMixer(model),actions=new Map(clips.map(c=>[c.name,mixer.clipAction(c)]));
  variants[type]={holder,model,materials,hairs,mixer,actions,current:null,clip:''};
 }
 let appearance,name='idle';
 function setAppearance(value){appearance=normalizeAppearance(value);for(const [type,v] of Object.entries(variants)){v.holder.visible=type===appearance.body;for(const [n,h] of Object.entries(v.hairs))h.visible=n===appearance.hair;for(const m of v.materials){const key=m.name.startsWith('Avatar_Skin')?'skin':m.name.startsWith('Avatar_Hair')?'hairColor':m.name.startsWith('Avatar_Shirt')?'shirt':m.name.startsWith('Avatar_Pants')?'pants':m.name.startsWith('Avatar_Shoes')?'shoes':null;if(key)m.color.set(appearance[key]);}}}
 setAppearance(initial);
 function aimBone(model,boneName,childName,target){
  const bone=model.getObjectByName(boneName),child=model.getObjectByName(childName);if(!bone||!child)return;
  model.updateMatrixWorld(true);const p=bone.getWorldPosition(new T.Vector3()),from=child.getWorldPosition(new T.Vector3()).sub(p).normalize(),to=model.localToWorld(target.clone()).sub(p).normalize();
  const world=bone.getWorldQuaternion(new T.Quaternion()),parent=bone.parent.getWorldQuaternion(new T.Quaternion());bone.quaternion.copy(parent.invert().multiply(new T.Quaternion().setFromUnitVectors(from,to).multiply(world)));model.updateMatrixWorld(true);
 }
 return {visual,setAppearance,get appearance(){return {...appearance};},animations:['idle','walk','sprint','jump','holding-both','holding-both-shoot'],get state(){return name;},update(dt,{speed=0,airborne=false,holding=false,throwing=false}={}){
  name=throwing?'holding-both-shoot':airborne?'jump':holding?'holding-both':speed>8?'sprint':speed>.2?'walk':'idle';
  const v=variants[appearance.body],clip=airborne?'Jump_Loop':speed>8?'Sprint_Loop':speed>.2?'Walk_Loop':'Idle_Loop';
  if(v.clip!==clip){const action=v.actions.get(clip);action.reset().play();if(v.current)v.current.crossFadeTo(action,.18,false);v.current=action;v.clip=clip;}
  v.current.timeScale=clip==='Walk_Loop'?Math.min(1.6,Math.max(.8,speed/4)):1;v.mixer.update(dt);
  if(holding||throwing)for(const [side,sign] of [['l',1],['r',-1]]){
   aimBone(v.model,'upperarm_'+side,'lowerarm_'+side,new T.Vector3(sign*.24,throwing?1.55:1.14,.2));
   aimBone(v.model,'lowerarm_'+side,'hand_'+side,new T.Vector3(sign*.12,throwing?1.84:1.32,.45));
  }
 }};
}
