import * as T from 'three';
export async function addLandmark(loader,scene,solids,file,x,z,rotation=0){
 const {scene:root}=await loader.loadAsync('/models/landmarks/'+file+'.glb');
 root.position.set(x,0,z);root.rotation.y=rotation;scene.add(root);
 const bounds=new T.Box3().setFromObject(root),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
 solids.push({x:center.x,z:center.z,w:size.x/2+.4,d:size.z/2+.4});
}
