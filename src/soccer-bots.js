// Bots do futebol 3x3: mesma ideia dos bots do basquete — só devolvem entradas de jogador.
import {attackGoal,defendGoal,FIELD} from './soccer-sim.js';
const hyp=Math.hypot,clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
function random(s){s.seed=(s.seed+0x6D2B79F5)|0;let t=s.seed;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;}
function toward(p,x,z,stop=.25){const dx=x-p.x,dz=z-p.z,d=hyp(dx,dz);return d<stop?{mx:0,mz:0,d}:{mx:dx/d*Math.min(1,d/.8),mz:dz/d*Math.min(1,d/.8),d};}
const nearest=(s,p,team)=>{let best=null,dist=Infinity;for(const o of s.players)if(o.team===team&&o!==p){const d=hyp(o.x-p.x,o.z-p.z);if(d<dist){dist=d;best=o;}}return {player:best,dist};};

export function botInputs(s,{skill=.5,ids=s.players.filter(p=>!p.human).map(p=>p.id)}={}){const out={};for(const id of ids)out[id]=botInput(s,s.players[id],skill);return out;}
function botInput(s,p,skill){
 const ai=s.ai??={};const mem=ai[p.id]??={next:0,mx:0,mz:0,charge:.6,shoot:false,pass:false,passTo:null,sprint:false};
 const b=s.ball;if(s.phase!=='live'&&s.phase!=='scored')return {mx:0,mz:0};
 if(b.holder===p.id&&p.charging){return {mx:mem.mx,mz:mem.mz,shoot:p.charge<mem.charge};}
 if(s.time<mem.next)return {mx:mem.mx,mz:mem.mz,sprint:mem.sprint,shoot:mem.shoot,pass:mem.pass,passTo:mem.passTo};
 mem.next=s.time+.16+random(s)*.12;mem.shoot=mem.pass=false;mem.passTo=null;
 const holder=b.holder!=null?s.players[b.holder]:null,G=attackGoal(p.team),D=defendGoal(p.team);
 let move={mx:0,mz:0};
 if(s.phase==='scored')move=toward(p,75,p.team===0?65:83);
 else if(holder===p){
  const d=hyp(G.z-p.z,0),guard=nearest(s,p,1-p.team),open=guard.dist>1.6,close=d<9;
  if((close&&random(s)<.7)||(d<16&&open&&random(s)<.4)){mem.charge=clamp(Math.min(1,(26-d)/20)+(random(s)-.5)*(.4-skill*.2),.1,1);mem.shoot=true;
   const ax=75-p.x,az=G.z-p.z,al=hyp(ax,az)||1;move={mx:ax/al,mz:az/al};}
  else if(random(s)<.3){const mates=s.players.filter(o=>o.team===p.team&&o!==p).sort((a,b2)=>nearest(s,b2,1-p.team).dist-nearest(s,a,1-p.team).dist);if(mates[0]){mem.pass=true;mem.passTo=mates[0].id;}}
  if(!mem.shoot&&!mem.pass){move=toward(p,75+(random(s)-.5)*6,G.z+( -Math.sign(G.z-74))*2,.1);mem.sprint=d>10;}
 }else if(holder&&holder.team===p.team){
  const spots=[[-6,-6],[6,-6],[0,3]],i=s.players.filter(o=>o.team===p.team&&o!==holder).indexOf(p);
  move=toward(p,75+(spots[i]?.[0]||0),G.z+(spots[i]?.[1]||0)*Math.sign(G.z-74)*-1);mem.sprint=move.d>6;
 }else if(holder){
  const mark=s.players.find(o=>o.team!==p.team&&o.slot===p.slot)||holder,onBall=mark===holder,dz=D.z-mark.z,gap=onBall?.9:2.4;
  move=toward(p,mark.x,mark.z+Math.sign(dz)*gap,.15);mem.sprint=move.d>3;
  if(onBall&&hyp(holder.x-p.x,holder.z-p.z)<1&&p.cool<=0&&random(s)<.12+skill*.1)mem.pass=true;
 }else{
  const mates=s.players.filter(o=>o.team===p.team).sort((a,c)=>hyp(a.x-b.x,a.z-b.z)-hyp(c.x-b.x,c.z-b.z));
  if(mates[0]===p){move=toward(p,b.x+b.vx*.25,b.z+b.vz*.25,.05);mem.sprint=true;}
  else move=toward(p,75+(p.slot-1)*5,D.z+Math.sign(74-D.z)*4);
 }
 mem.mx=move.mx;mem.mz=move.mz;return {mx:move.mx,mz:move.mz,sprint:mem.sprint,shoot:mem.shoot,pass:mem.pass,passTo:mem.passTo};
}
