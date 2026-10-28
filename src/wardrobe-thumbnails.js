import * as T from 'three';
import {createCharacter,DEFAULT_APPEARANCE,PARTS} from './student-character.js';

// Render actual exported meshes, with one shared renderer for the whole catalogue.
export async function createWardrobeThumbnails(loader){
 const actor=await createCharacter(loader,'catalogue'),scene=new T.Scene();scene.add(actor.visual);
 scene.add(new T.HemisphereLight(0xfff8ee,0x776586,2.3));const light=new T.DirectionalLight(0xffffff,3);light.position.set(-3,5,-4);scene.add(light);
 const camera=new T.PerspectiveCamera(32,1,.01,30),renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setSize(144,144);renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;
 const cache=new Map();actor.update(0);
 return {render(id){if(cache.has(id))return cache.get(id);actor.setAppearance(DEFAULT_APPEARANCE);const bounds=actor.showItem(id),center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3());
  const distance=Math.max(size.x,size.y,size.z,.1)/2/Math.tan(T.MathUtils.degToRad(16))*1.5;
  const back=PARTS.accessory.includes(id);
  const profile=['head_rabo','head_trancas','head_degrade'].includes(id);
  const hearing=PARTS.hearing.includes(id);
  camera.position.copy(center).add(new T.Vector3(back?.5:profile?-.85:hearing?.8:-.25,.12,back?1:-1).normalize().multiplyScalar(distance));camera.lookAt(center);renderer.render(scene,camera);
  const url=renderer.domElement.toDataURL('image/png');cache.set(id,url);return url;
 },dispose(){renderer.dispose();}};
}
