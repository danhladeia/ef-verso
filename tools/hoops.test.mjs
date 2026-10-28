import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatch,step,HOOPS,BALL_R,RIM,COURT,shotStart,idealCharge,attackHoop,setupPossession} from '../src/hoops-sim.js';
import {botInputs} from '../src/hoops-bots.js';

const H=HOOPS[1];
function freeBall(s,ball){s.phase='live';s.clock=99;Object.assign(s.ball,{holder:null,state:'shot',shooter:0,points:2,touched:false,noPick:5,age:0,lastTeam:0},ball);}
function run(s,seconds,inputs=()=>({})){const all=[];for(let t=0;t<seconds;t+=1/60){all.push(...step(s,inputs(s),1/60));}return all;}
// Tira os jogadores do caminho da bola nos testes de física.
function clearCourt(s){for(const p of s.players){p.x=COURT.midX;p.z=-6+p.id*.8;}}

test('Ball dropped through the middle of the rim scores; on the rim edge it bounces off',()=>{
 let s=createMatch();clearCourt(s);freeBall(s,{x:H.x,y:4.6,z:0,vx:0,vy:0,vz:0});
 let events=run(s,1.5);assert(events.some(e=>e.type==='score'),'Swish scores');assert.equal(s.score[0],2);
 s=createMatch();clearCourt(s);freeBall(s,{x:H.x,y:4.6,z:RIM.radius,vx:0,vy:0,vz:0});
 events=run(s,.8);assert(events.some(e=>e.type==='rim'),'Touches the rim');assert(!events.some(e=>e.type==='score'),'Edge does not score');
});
test('Backboard is solid: a ball thrown at it comes back',()=>{
 const s=createMatch();clearCourt(s);freeBall(s,{x:H.x-1.5,y:3.7,z:.2,vx:9,vy:1.5,vz:0});let maxX=-Infinity;
 const events=run(s,.6);for(let i=0;i<60;i++){step(s,{},1/60);maxX=Math.max(maxX,s.ball.x);}
 assert(events.some(e=>e.type==='board'),'Hits the board');assert(s.ball.vx<0||s.ball.x<H.board,'Bounces back');assert(maxX<H.board+.2,'Never passes through');
});
test('A perfect shot from several spots goes in; a weak or strong one does not',()=>{
 for(const [x,z] of [[33,0],[31,-3],[34.5,4],[30,1.5]]){
  for(const [offset,scores] of [[0,true],[-.2,false],[.2,false]]){
   const s=createMatch();const p=s.players[0];setupPossession(s,0);s.phase='live';for(const o of s.players)if(o!==p){o.x=COURT.midX-5;o.z=-6+o.id;}
   p.x=x;p.z=z;p.face=Math.atan2(H.x-x,H.z-z);const target=idealCharge(p)+offset;let holding=true;
   const events=run(s,3.5,st=>{if(st.players[0].charging&&st.players[0].charge>=target)holding=false;return {0:{shoot:holding&&st.ball.holder===0}};});
   assert.equal(events.some(e=>e.type==='score'),scores,`(${x},${z}) offset ${offset}`);
  }
 }
});
test('Passing reaches a teammate; steals and rebounds change possession',()=>{
 const s=createMatch();setupPossession(s,0);s.phase='live';const mate=s.players[1];
 const events=run(s,1.5,st=>({0:{pass:st.time<.2,passTo:1}}));assert(events.some(e=>e.type==='catch'&&e.id===1),'Teammate catches');assert.equal(s.ball.holder,1);
 let stolen=false;for(let seed=1;seed<20&&!stolen;seed++){const m=createMatch({seed});setupPossession(m,0);m.phase='live';const d=m.players[3];d.x=m.players[0].x+.6;d.z=m.players[0].z;d.cool=0;
  stolen=step(m,{3:{pass:true}},1/60).some(e=>e.type==='steal');}
 assert(stolen,'Steals succeed sometimes');
});
test('Bots play a full 3x3 game: both teams score, nobody leaves the court, same seed same game',()=>{
 const play=seed=>{const s=createMatch({seed,humans:[],duration:150,target:11});const events=[];for(let i=0;i<60*170&&s.phase!=='over';i++){events.push(...step(s,botInputs(s,{skill:.5}),1/60));
  for(const p of s.players)assert(p.x>=COURT.minX&&p.x<=COURT.maxX&&Math.abs(p.z)<=COURT.maxZ&&Number.isFinite(p.x+p.z),'Inside court');assert(Number.isFinite(s.ball.x+s.ball.y+s.ball.z),'Finite ball');assert(s.ball.y>=BALL_R-1e-6);}
  return {s,events};};
 const a=play(7),b=play(7),count=t=>a.events.filter(e=>e.type===t).length;
 assert.deepEqual(a.s.score,b.s.score,'Deterministic');assert(a.s.score[0]>0&&a.s.score[1]>0,'Both teams score: '+a.s.score);
 assert(count('pass')>5&&count('shot')>8&&count('rebound')>2,'Passes, shots and rebounds happen');
 const shots=count('shot'),made=count('score');assert(made/shots>.2&&made/shots<.85,`Reasonable accuracy ${made}/${shots}`);
 console.log(JSON.stringify({score:a.s.score,clock:Math.round(a.s.clock),phase:a.s.phase,shots,made,passes:count('pass'),steals:count('steal'),rebounds:count('rebound'),rim:count('rim'),board:count('board'),out:count('out')}));
});
