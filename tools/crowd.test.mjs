import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createNavigation} from '../src/navigation.js';
import {createCrowd} from '../src/crowd.js';
import {createCharacter,PARTS,DEFAULT_APPEARANCE,normalizeAppearance,residentAppearance} from '../src/student-character.js';
// Alunos KayKit: cabeças, roupas e acessórios num só esqueleto; animações em arquivos separados, ligadas pelo nome do osso.
globalThis.document={hidden:false};
// O Node não decodifica imagens: remove a textura do GLB e devolve uma textura vazia aos materiais.
function withoutImages(buffer){
 const length=buffer.readUInt32LE(12),json=JSON.parse(buffer.subarray(20,20+length).toString());
 for(const m of json.materials||[])delete m.pbrMetallicRoughness?.baseColorTexture;delete json.images;delete json.textures;delete json.samplers;
 const text=Buffer.from(JSON.stringify(json)),padded=Buffer.concat([text,Buffer.alloc((4-text.length%4)%4,0x20)]),rest=buffer.subarray(20+length);
 const header=Buffer.alloc(20);header.write('glTF',0);header.writeUInt32LE(2,4);header.writeUInt32LE(20+padded.length+rest.length,8);header.writeUInt32LE(padded.length,12);header.write('JSON',16);
 const out=Buffer.concat([header,padded,rest]);return out.buffer.slice(out.byteOffset,out.byteOffset+out.byteLength);
}
const parse=path=>new GLTFLoader().parseAsync(withoutImages(fs.readFileSync('public'+path)),'');
const files=new Map();
const loader={loadAsync:async path=>{if(!files.has(path))files.set(path,parse(path).then(f=>{f.scene.traverse(o=>{if(o.isMesh&&/^(rogue|ranger|mage|knight|barbarian)/.test(o.material.name))o.material.map=new T.Texture();});return f;}));return files.get(path);}};
const catalogue=await createCharacter(loader,'catalogue');
for(const id of Object.values(PARTS).flat().filter(n=>n!=='none')){const bounds=catalogue.showItem(id);assert(!bounds.isEmpty()&&[...bounds.min,...bounds.max].every(Number.isFinite),'Valid bounds: '+id);}
// Cores por categoria do atlas (pele, cabelo, roupa…): só mudam uniformes do shader.
for(const tone of PARTS.tone){catalogue.setAppearance({...DEFAULT_APPEARANCE,tone});assert.equal(catalogue.appearance.tone,tone);}
for(const [input,state] of [[{speed:6},'walk'],[{speed:11},'sprint'],[{airborne:true},'jump'],[{holding:true,charge:.5},'holding-both'],[{throwing:true},'holding-both-shoot'],[{},'idle']]){
 catalogue.update(.2,input);assert.equal(catalogue.state,state);assert(Object.values(catalogue.poseSample).flat().every(Number.isFinite),'Finite pose '+state);
}
// Cadeira de rodas: a mesma lógica de estados funciona sentada.
catalogue.setAppearance({...DEFAULT_APPEARANCE,mobility:'acc_wheelchair'});for(const input of [{speed:4},{holding:true},{throwing:true},{}]){catalogue.update(.2,input);assert(Object.values(catalogue.poseSample).flat().every(Number.isFinite));}
assert(catalogue.handPosition.y>0,'Hands above the ground');
const teacher=await createCharacter(loader,'teacherLia');assert.equal(teacher.appearance.head,'head_cabelo_preto');assert.equal(teacher.appearance.whistle,true);
assert.deepEqual(normalizeAppearance({head:'head_adulto_barba',body:'body_adulto_colete'}),{...DEFAULT_APPEARANCE,whistle:false},'Adult parts are not offered to students');
const navigation=createNavigation([{x:0,z:0,w:5,d:5}],172),scene=new T.Scene();
const crowd=await createCrowd({scene,loader,navigation});assert.equal(crowd.count,24);
for(let i=0;i<1200;i++)crowd.update(1/60,{x:0,z:35});
const snapshot=crowd.snapshot();assert(snapshot.every(r=>!r.blocked));assert(snapshot.filter(r=>r.travelled>1).length>=20);
const adults=[...Array(24).keys()].filter(i=>residentAppearance(i).adult).length;assert(adults>=6&&adults<=10,'Mix of adults and children');
const frozen=crowd.snapshot();for(let i=0;i<60;i++)crowd.update(1/60,{x:0,z:35},{paused:true});assert.deepEqual(crowd.snapshot(),frozen);
const mobile=await createCrowd({scene:new T.Scene(),loader,navigation,compact:true});assert.equal(mobile.count,11);
console.log(JSON.stringify({residents:crowd.count,adults,moving:snapshot.filter(r=>r.travelled>1).length,mobile:mobile.count,pieces:'passed',tones:'passed',wheelchair:'passed',collision:'passed',pause:'passed'}));
