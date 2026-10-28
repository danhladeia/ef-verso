import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatch,step,COURT,NET_HEIGHT,setupServe} from '../src/volley-sim.js';
import {botInputs} from '../src/volley-bots.js';

function clearCourt(s){for(const p of s.players)p.z=71.5-p.id;} // tira todo mundo do caminho da bola, mas ainda dentro da quadra
test('The net blocks a flat shot; the ball falling on a side scores for the other side',()=>{
 const s=createMatch({humans:[0]});s.phase='live';clearCourt(s);
 Object.assign(s.ball,{holder:null,x:20,y:1.2,z:76,vx:6,vy:0,vz:0,lastTeam:0,touches:0,noPick:5,age:0});
 let crossed=false;for(let i=0;i<80;i++){step(s,{},1/60);if(s.ball.x>COURT.netX)crossed=true;}
 assert(!crossed,'A flat shot below net height does not cross');
 const s2=createMatch({humans:[0]});s2.phase='live';clearCourt(s2);
 Object.assign(s2.ball,{holder:null,x:20,y:.22,z:76,vx:0,vy:0,vz:0,lastTeam:0,touches:0,noPick:5,age:0});
 const events=step(s2,{},1/60);assert(events.some(e=>e.type==='point'&&e.team===1),'Ball on team 0 side scores for team 1');
});
test('A serve clears the net and lands in play; a hit sends the ball back over',()=>{
 const s=createMatch({humans:[0],seed:4});setupServe(s,0);const server=s.players.find(p=>p.id===s.ball.holder);
 let events=[];for(let i=0;i<70;i++)events.push(...step(s,{[server.id]:{hit:true}},1/60));
 assert(events.some(e=>e.type==='serve'),'Serves');
 let maxH=0;for(let i=0;i<200&&s.ball.holder==null;i++){events.push(...step(s,{},1/60));maxH=Math.max(maxH,s.ball.y);}
 assert(maxH>NET_HEIGHT,'Clears the net height');
 assert(events.some(e=>e.type==='touch'||e.type==='point'),'Something happens on the far side');
});
test('Bots play a full match: it ends with a score, nobody leaves their half, same seed same game',()=>{
 const play=seed=>{const s=createMatch({seed,humans:[],duration:150,target:11});const events=[];
  for(let i=0;i<60*170&&s.phase!=='over';i++){events.push(...step(s,botInputs(s),1/60));
   for(const p of s.players){assert(p.team===0?p.x<=COURT.netX+.4:p.x>=COURT.netX-.4,'Stays on own side');assert(Number.isFinite(p.x+p.z));}
   assert(Number.isFinite(s.ball.x+s.ball.y+s.ball.z),'Finite ball');}
  return {s,events};};
 const a=play(6),b=play(6);assert.deepEqual(a.s.score,b.s.score,'Deterministic');
 assert(a.s.phase==='over','Match reaches an end');assert(a.s.score[0]>0||a.s.score[1]>0,'Someone scores');
 const count=t=>a.events.filter(e=>e.type===t).length;
 console.log(JSON.stringify({score:a.s.score,serves:count('serve'),touches:count('touch'),hits:count('hit'),points:count('point')}));
});
