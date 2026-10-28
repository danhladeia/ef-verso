import * as T from 'three';
export async function createTravel({loader,player,canChange,stopMovement}){
 const root=new T.Group();root.name='Transporte do aluno';player.add(root);
 const [boardFile,bikeFile]=await Promise.all([loader.loadAsync('/models/skate/skateboard.glb'),loader.loadAsync('/models/props/bicicleta.glb')]);
 function fit(file,length){const item=file.scene.clone(true),box=new T.Box3().setFromObject(item),size=box.getSize(new T.Vector3());item.scale.multiplyScalar(length/Math.max(size.x,size.z));item.updateMatrixWorld(true);const b=new T.Box3().setFromObject(item),c=b.getCenter(new T.Vector3());item.position.set(-c.x,.06-b.min.y,-c.z);const holder=new T.Group();holder.add(item);if(size.x>size.z)holder.rotation.y=Math.PI/2;root.add(holder);return holder;}
 const board=fit(boardFile,1.1),bike=fit(bikeFile,1.7);board.visible=bike.visible=false;
 let mode='walk';
 const panel=document.createElement('div');panel.className='travel-controls';panel.setAttribute('aria-label','Meio de transporte');
 panel.innerHTML='<button data-travel="walk">A pé</button><button data-travel="skate">Skate</button><button data-travel="bike">Bicicleta</button>';document.body.append(panel);
 function select(next){if(!canChange())return false;stopMovement();mode=next;board.visible=mode==='skate';bike.visible=mode==='bike';panel.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.travel===mode)));return true;}
 panel.querySelectorAll('button').forEach(b=>b.onclick=()=>select(b.dataset.travel));select('walk');
 return {get mode(){return mode;},get speed(){return mode==='bike'?18:mode==='skate'?13:6;},cycle(){select(mode==='walk'?'skate':mode==='skate'?'bike':'walk');},select,update(avatar,speed){root.visible=canChange();if(avatar){avatar.visual.position.y=mode==='skate'?.13:0;avatar.visual.rotation.z=mode==='skate'&&speed>.2?-.09:0;}},get root(){return root;}};
}
