import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const out='art-source/wardrobe-collection-review';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[],report={};
// Check the exported bindings too: a selectable garment without a skin would stay in T-pose.
const glb=fs.readFileSync('public/models/students/kenney-alunos.glb');
const asset=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)).toString());
function meshNodes(node){return [...(node.mesh!=null?[node]:[]),...(node.children||[]).flatMap(i=>meshNodes(asset.nodes[i]))];}
for(const node of asset.nodes.filter(n=>/^(body_|head_)/.test(n.name||''))){
 for(const mesh of meshNodes(node))assert.notEqual(mesh.skin,undefined,`${node.name}: mesh lacks skeleton binding`);
}
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 // Pula a abertura/cadastro/moradia/personagem (testados à parte em verify-onboarding.mjs) pré-preenchendo o aluno salvo.
 await page.addInitScript(()=>localStorage.setItem('ef-verso-student-v1',JSON.stringify({name:'Teste',className:'7A',home:'praca',version:1})));
 await page.goto('http://localhost:5173/');
 await page.waitForFunction(()=>window.cityReady,{},{timeout:90000});
 assert.equal(await page.evaluate(()=>window.cityStats().failures),0);
 report.headRegression=await page.evaluate(async()=>{
  const {createCharacter,PARTS,DEFAULT_APPEARANCE}=await import('/src/student-character.js');
  const {GLTFLoader}=await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
  const actor=await createCharacter(new GLTFLoader(),'catalogue');
  function checkHead(){
   const root=actor.visual.getObjectByName(actor.appearance.head);let visible=0;
   root.traverseVisible(o=>{if(o.isMesh)visible++;});
   if(!visible)throw Error('Head disappeared: '+actor.appearance.head);
   actor.visual.updateMatrixWorld(true);
   root.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();o.computeBoundingBox();
    const box=o.boundingBox;if(!Number.isFinite(box.min.y)||box.max.y-box.min.y<.01)throw Error('Invalid animated head');
   }});
  }
  for(const body of PARTS.body){actor.showItem(body);checkHead();}
  let checked=0;
  for(const head of PARTS.head)for(const body of PARTS.body){
   actor.setAppearance({...DEFAULT_APPEARANCE,head,body});
   for(const pose of [{},{speed:4},{speed:10},{holding:true,charge:.6},{throwing:true},{airborne:true}]){
    for(let frame=0;frame<20;frame++)actor.update(1/60,pose);
    checkHead();checked++;
   }
  }
  return {combinations:PARTS.head.length*PARTS.body.length,animatedChecks:checked,clothingCards:PARTS.body.length};
 });
 await page.locator('#customize').click();
 await page.waitForFunction(()=>!document.querySelector('#avatar-save').disabled);
 // Cabeça e roupa só mostram as opções do personagem (menino/menina) selecionado — as outras
 // categorias (óculos, mochila…) continuam as mesmas para os dois, por isso o mínimo é menor para elas.
 for(const category of ['head','body','glasses','hearing','accessory','mobility']){
  await page.locator('#wardrobe-tab-'+category).click();
  await page.waitForFunction(()=>[...document.querySelectorAll('#wardrobe-items img')].every(i=>i.complete&&i.naturalWidth>0));
  const items=await page.locator('.wardrobe-item').evaluateAll(els=>els.map(e=>({id:e.dataset.item,label:e.textContent})));
  report[category]=items.filter(i=>i.id!=='none');assert(report[category].length>=(['head','body'].includes(category)?3:1),category);
  // Every option must be selectable and reflected in the preview/editor selection.
  for(const item of report[category]){
   await page.locator(`button[data-item="${item.id}"]`).click();
   assert.equal(await page.locator(`button[data-item="${item.id}"]`).getAttribute('aria-pressed'),'true');
  }
  await page.locator('#avatar-editor').screenshot({path:`${out}/${category}.png`});
 }
 await page.locator('#avatar-save').click();
 report.saved=await page.evaluate(()=>window.missionReview().appearance);
 await page.reload();await page.waitForFunction(()=>window.cityReady,{},{timeout:90000});
 assert.equal(await page.evaluate(()=>window.missionReview().appearance.body),'body_male-f');
 assert.equal(await page.evaluate(()=>window.missionReview().appearance.head),'head_male-f');
 await page.goto('http://localhost:5173/art-source/wardrobe-collection-review.html');
 await page.waitForFunction(()=>window.reviewReady,{},{timeout:90000});
 await page.screenshot({path:`${out}/collection.png`,fullPage:true});
 report.errors=errors;fs.writeFileSync(`${out}/verification.json`,JSON.stringify(report,null,2));
 assert.deepEqual(errors,[]);console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
