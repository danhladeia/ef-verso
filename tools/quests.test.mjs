import test from 'node:test';
import assert from 'node:assert/strict';
import {createWallet,createCounterMission} from '../src/quests.js';

function memoryStorage(){const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,v)};}

test('Wallet: coins add up, a badge is awarded once, and state survives a reload',()=>{
 const storage=memoryStorage();const wallet=createWallet(storage);
 assert.equal(wallet.coins,0);assert.deepEqual(wallet.badges,[]);
 wallet.award(20);assert.equal(wallet.coins,20);
 wallet.award(10,'Primeiro Gol');assert.equal(wallet.coins,30);assert.deepEqual(wallet.badges,['Primeiro Gol']);
 wallet.award(10,'Primeiro Gol');assert.equal(wallet.coins,30,'Awarding the same badge again gives nothing');
 wallet.award(0,'Outra Insígnia');assert.equal(wallet.coins,30);assert.deepEqual(wallet.badges,['Primeiro Gol','Outra Insígnia']);
 const reloaded=createWallet(storage);assert.equal(reloaded.coins,30);assert.deepEqual(reloaded.badges,['Primeiro Gol','Outra Insígnia']);
});
test('Wallet tolerates storage that throws (private browsing) without crashing',()=>{
 const storage={getItem(){throw Error();},setItem(){throw Error();}};
 const wallet=createWallet(storage);wallet.award(5);assert.equal(wallet.coins,5);assert.equal(wallet.saved,false);
});

test('Counter mission: completes at the target, rewards the shared wallet once, and persists',()=>{
 const storage=memoryStorage(),wallet=createWallet(storage);
 const mission=createCounterMission({id:'teste-contador',target:3,coinsOnComplete:15,badge:'Testador'},storage,wallet);
 assert.equal(mission.done,false);assert.equal(mission.count,0);
 assert.equal(mission.progress(),false);assert.equal(mission.count,1);assert.equal(wallet.coins,0);
 assert.equal(mission.progress(),false);
 assert.equal(mission.progress(),true,'Reaching the target reports completion once');
 assert.equal(mission.done,true);assert.equal(wallet.coins,15);assert.deepEqual(wallet.badges,['Testador']);
 assert.equal(mission.progress(),false,'No further reward after completion');assert.equal(wallet.coins,15);
 const reloadedWallet=createWallet(storage);
 const reloaded=createCounterMission({id:'teste-contador',target:3,coinsOnComplete:15,badge:'Testador'},storage,reloadedWallet);
 assert.equal(reloaded.done,true);assert.equal(reloaded.count,3);
});
test('Two counter missions for different activities keep separate progress but share the same wallet',()=>{
 const storage=memoryStorage(),wallet=createWallet(storage);
 const goal=createCounterMission({id:'futebol-primeiro-gol',target:1,coinsOnComplete:20,badge:'Primeiro Gol'},storage,wallet);
 const point=createCounterMission({id:'volei-primeiro-ponto',target:1,coinsOnComplete:20,badge:'Primeiro Ponto'},storage,wallet);
 goal.progress();assert.equal(wallet.coins,20);assert.equal(point.done,false);
 point.progress();assert.equal(wallet.coins,40);assert.deepEqual(wallet.badges,['Primeiro Gol','Primeiro Ponto']);
});
