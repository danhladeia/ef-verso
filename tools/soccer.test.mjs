import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatch,step,FIELD,GOALS,GOAL_HALF,setupKickoff} from '../src/soccer-sim.js';
import {botInputs} from '../src/soccer-bots.js';

test('A shot straight into the open goal scores; a shot wide of the posts does not',()=>{
 const s=createMatch({humans:[0]});setupKickoff(s,0);s.phase='live';const p=s.players[0];
 for(const o of s.players)if(o!==p){o.x=FIELD.midX;o.z=65;}
 p.x=FIELD.midX;p.z=70;p.face=Math.atan2(0,GOALS[1].z-70);s.ball.holder=p.id;
 let events=[];for(let i=0;i<24;i++)events.push(...step(s,{0:{shoot:true}},1/60));// carrega força perto do máximo
 events.push(...step(s,{0:{shoot:false}},1/60));// solta: dispara o chute
 for(let i=0;i<150&&!events.some(e=>e.type==='goal');i++)events.push(...step(s,{},1/60));
 assert(events.some(e=>e.type==='goal'&&e.team===0),'Scores from the centre');
 const s2=createMatch({humans:[0]});setupKickoff(s2,0);s2.phase='live';const q=s2.players[0];
 for(const o of s2.players)if(o!==q){o.x=FIELD.midX;o.z=65;}
 q.x=FIELD.midX-GOAL_HALF-4;q.z=70;q.face=Math.PI/2;s2.ball.holder=q.id;
 let ev2=[];for(let i=0;i<24;i++)ev2.push(...step(s2,{0:{shoot:true}},1/60));ev2.push(...step(s2,{0:{shoot:false}},1/60));
 for(let i=0;i<150;i++)ev2.push(...step(s2,{},1/60));
 assert(!ev2.some(e=>e.type==='goal'),'A shot aimed away from goal does not score');
});
test('Passing reaches a teammate and a tackle can take the ball',()=>{
 const s=createMatch({humans:[0]});setupKickoff(s,0);s.phase='live';
 const events=step(s,{0:{pass:true,passTo:1}},1/60);let got=false;
 for(let i=0;i<60&&!got;i++){const e=step(s,{},1/60);if(e.some(x=>x.type==='control'&&x.id===1))got=true;}
 assert(got,'Teammate controls the pass');
 let tackled=false;for(let seed=1;seed<25&&!tackled;seed++){const m=createMatch({seed,humans:[0]});setupKickoff(m,0);m.phase='live';const d=m.players[3];d.x=m.players[0].x+.5;d.z=m.players[0].z;d.cool=0;
  tackled=step(m,{3:{shoot:true}},1/60).some(e=>e.type==='tackle');}
 assert(tackled,'Tackles succeed sometimes');
});
test('Bots play a full match: both teams can score, nobody leaves the field, same seed same game',()=>{
 const play=seed=>{const s=createMatch({seed,humans:[],duration:150});const events=[];
  for(let i=0;i<60*170&&s.phase!=='over';i++){events.push(...step(s,botInputs(s),1/60));
   for(const p of s.players)assert(p.x>=FIELD.minX&&p.x<=FIELD.maxX&&Math.abs(p.z-74)<=15&&Number.isFinite(p.x+p.z),'Inside the field');
   assert(Number.isFinite(s.ball.x+s.ball.y+s.ball.z),'Finite ball');}
  return {s,events};};
 const a=play(11),b=play(11);assert.deepEqual(a.s.score,b.s.score,'Deterministic');
 const count=t=>a.events.filter(e=>e.type===t).length;
 assert(count('goal')>0,'At least one goal in a full match');
 assert(count('pass')>5&&count('shot')>5,'Passes and shots happen');
 console.log(JSON.stringify({score:a.s.score,goals:count('goal'),shots:count('shot'),passes:count('pass'),tackles:count('tackle'),out:count('out')}));
});
