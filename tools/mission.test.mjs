import test from 'node:test';
import assert from 'node:assert/strict';
import {initialProgress,reduceProgress,normalizeProgress,createProgress} from '../src/quest-state.js';
import {launchShot,rimCrossing,shotPosition,throwShot,idealPower,SHOT} from '../src/basketball.js';
test('Mission requires acceptance, three baskets and a single reward claim',()=>{
 let s=initialProgress();assert.equal(reduceProgress(s,{type:'claim'}).coins,0);assert.equal(reduceProgress(s,{type:'shot',scored:true}).baskets,0);
 s=reduceProgress(s,{type:'accept'});s=reduceProgress(s,{type:'shot',scored:false});assert.equal(s.baskets,0);
 for(let i=0;i<3;i++)s=reduceProgress(s,{type:'shot',scored:true});assert.equal(s.stage,'return');assert.equal(s.attempts,4);
 s=reduceProgress(s,{type:'claim'});assert.equal(s.coins,100);assert.equal(reduceProgress(s,{type:'claim'}).coins,100);assert.equal(s.badges.length,1);
});
test('Saves survive reload, normalize malformed state and tolerate unavailable storage',()=>{
 const memory=new Map(),storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};const p=createProgress(storage);p.dispatch({type:'accept'});p.dispatch({type:'shot',scored:true});assert.equal(createProgress(storage).state.baskets,1);
 assert.equal(normalizeProgress({version:42}).stage,'school');assert.equal(normalizeProgress({version:1,stage:'school',baskets:3,coins:9000}).baskets,0);
 const bad=createProgress({getItem(){throw Error();},setItem(){throw Error();}});bad.dispatch({type:'accept'});assert.equal(bad.saved,false);assert.equal(bad.state.stage,'court');
});
test('Ball scores only when descending through the rim; direction and power matter',()=>{
 const hoop={x:37,y:3.22,z:0};
 for(const z of [0,-1.5,1.5]){
  const shot=launchShot({x:31.5,y:1.65,z},hoop,-z/3,.5),cross=rimCrossing(shot,hoop);assert(cross.scored);assert(shotPosition(shot,cross.time+.01).y<hoop.y);
 }
 for(const [aim,power] of [[1,.5],[0,0],[0,1]])assert(!rimCrossing(launchShot({x:31.5,y:1.65,z:0},hoop,aim,power),hoop).scored);
});
test('Free throw: holding longer throws farther; a subtle help only near the right aim and force',()=>{
 const hoop={x:37,y:3.22,z:0},facing=(from,deg=0)=>{const a=Math.atan2(hoop.x-from.x,hoop.z-from.z)+deg*Math.PI/180;return {x:Math.sin(a),z:Math.cos(a)};};
 for(const start of [{x:33,y:1.2,z:0},{x:31,y:1.2,z:-2.5},{x:29,y:1.2,z:3}]){
  const ideal=idealPower(start,hoop);assert(ideal>0&&ideal<1,'Reachable from the court');
  for(const [deg,error] of [[0,0],[8,0],[-10,0],[0,.07],[0,-.07]])assert(rimCrossing(throwShot(start,hoop,facing(start,deg),ideal+error),hoop,.3).scored,`Scores near the ideal (${deg}°, ${error})`);
  for(const [deg,error] of [[0,-.32],[0,.3],[40,0],[-60,0]])assert(!rimCrossing(throwShot(start,hoop,facing(start,deg),ideal+error),hoop,.3).scored,`Misses when far off (${deg}°, ${error})`);
 }
 const a=throwShot({x:33,y:1.2,z:0},hoop,{x:1,z:0},.2),b=throwShot({x:33,y:1.2,z:0},hoop,{x:1,z:0},.8);
 assert(Math.hypot(b.velocity.x,b.velocity.y,b.velocity.z)>Math.hypot(a.velocity.x,a.velocity.y,a.velocity.z),'More charge, more speed');
 assert.equal(SHOT.chargeTime>1,true);
});
